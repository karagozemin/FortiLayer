import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * PolicyRegistry — Comprehensive Test Suite
 */
describe("PolicyRegistry", function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    const registry = await PolicyRegistry.deploy();
    await registry.waitForDeployment();

    // Deploy a real policy for testing (needs to implement IPolicy.policyName())
    const WhitelistPolicy = await ethers.getContractFactory("WhitelistPolicy");
    const policy1 = await WhitelistPolicy.deploy(await engine.getAddress());
    await policy1.waitForDeployment();

    const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
    const policy2 = await SpendingLimitPolicy.deploy(
      await engine.getAddress(),
      ethers.parseUnits("10000", 6),
      ethers.parseUnits("5000", 6)
    );
    await policy2.waitForDeployment();

    return { registry, engine, policy1, policy2, owner, otherUser };
  }

  describe("Deployment", function () {
    it("should start with zero policies", async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.getPolicyCount()).to.equal(0);
    });
  });

  describe("Registration", function () {
    it("should register a policy", async function () {
      const { registry, policy1, owner } = await loadFixture(deployFixture);
      const addr = await policy1.getAddress();

      await expect(registry.connect(owner).registerPolicy(addr))
        .to.emit(registry, "PolicyRegistered")
        .withArgs(addr, "WhitelistPolicy");

      expect(await registry.isRegistered(addr)).to.be.true;
      expect(await registry.getPolicyCount()).to.equal(1);
    });

    it("should register multiple policies", async function () {
      const { registry, policy1, policy2, owner } = await loadFixture(deployFixture);

      await registry.connect(owner).registerPolicy(await policy1.getAddress());
      await registry.connect(owner).registerPolicy(await policy2.getAddress());

      expect(await registry.getPolicyCount()).to.equal(2);
    });

    it("should revert on zero address", async function () {
      const { registry } = await loadFixture(deployFixture);
      await expect(registry.registerPolicy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("should revert on duplicate registration", async function () {
      const { registry, policy1, owner } = await loadFixture(deployFixture);
      const addr = await policy1.getAddress();

      await registry.connect(owner).registerPolicy(addr);
      await expect(registry.connect(owner).registerPolicy(addr))
        .to.be.revertedWithCustomError(registry, "PolicyAlreadyRegistered");
    });

    it("should only allow owner to register", async function () {
      const { registry, policy1, otherUser } = await loadFixture(deployFixture);

      await expect(
        registry.connect(otherUser).registerPolicy(await policy1.getAddress())
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Unregistration", function () {
    it("should unregister a policy", async function () {
      const { registry, policy1, owner } = await loadFixture(deployFixture);
      const addr = await policy1.getAddress();

      await registry.connect(owner).registerPolicy(addr);
      await expect(registry.connect(owner).unregisterPolicy(addr))
        .to.emit(registry, "PolicyUnregistered")
        .withArgs(addr);

      expect(await registry.isRegistered(addr)).to.be.false;
      expect(await registry.getPolicyCount()).to.equal(0);
    });

    it("should revert on unregistering non-registered policy", async function () {
      const { registry, policy1 } = await loadFixture(deployFixture);

      await expect(registry.unregisterPolicy(await policy1.getAddress()))
        .to.be.revertedWithCustomError(registry, "PolicyNotRegistered");
    });
  });

  describe("View Functions", function () {
    it("should return all registered policies", async function () {
      const { registry, policy1, policy2, owner } = await loadFixture(deployFixture);

      await registry.connect(owner).registerPolicy(await policy1.getAddress());
      await registry.connect(owner).registerPolicy(await policy2.getAddress());

      const all = await registry.getAllPolicies();
      expect(all.length).to.equal(2);
      expect(all).to.include(await policy1.getAddress());
      expect(all).to.include(await policy2.getAddress());
    });
  });
});
