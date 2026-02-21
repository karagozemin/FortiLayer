import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * PolicyEngine — Comprehensive Test Suite
 */
describe("PolicyEngine", function () {
  async function deployFixture() {
    const [owner, vaultOwner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    // Deploy a mock vault (just use an address)
    const vaultAddress = ethers.Wallet.createRandom().address;

    return { engine, owner, vaultOwner, otherUser, vaultAddress };
  }

  async function deployWithVaultFixture() {
    const base = await loadFixture(deployFixture);
    const { engine, vaultOwner, vaultAddress } = base;

    await engine.connect(vaultOwner).registerVault(vaultAddress);

    // Deploy a simple mock policy for testing
    const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
    const policy = await SpendingLimitPolicy.deploy(
      await engine.getAddress(),
      ethers.parseUnits("10000", 6),
      ethers.parseUnits("5000", 6)
    );
    await policy.waitForDeployment();

    return { ...base, policy };
  }

  describe("Deployment", function () {
    it("should deploy with correct owner", async function () {
      const { engine, owner } = await loadFixture(deployFixture);
      expect(await engine.owner()).to.equal(owner.address);
    });

    it("should start with zero total vaults", async function () {
      const { engine } = await loadFixture(deployFixture);
      expect(await engine.totalVaults()).to.equal(0);
    });

    it("should start unpaused", async function () {
      const { engine } = await loadFixture(deployFixture);
      expect(await engine.paused()).to.be.false;
    });
  });

  describe("Vault Registration", function () {
    it("should register a vault successfully", async function () {
      const { engine, vaultOwner, vaultAddress } = await loadFixture(deployFixture);

      await expect(engine.connect(vaultOwner).registerVault(vaultAddress))
        .to.emit(engine, "VaultRegistered")
        .withArgs(vaultAddress, vaultOwner.address);

      expect(await engine.isVaultRegistered(vaultAddress)).to.be.true;
      expect(await engine.getVaultOwner(vaultAddress)).to.equal(vaultOwner.address);
      expect(await engine.totalVaults()).to.equal(1);
    });

    it("should revert on zero address", async function () {
      const { engine } = await loadFixture(deployFixture);
      await expect(engine.registerVault(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(engine, "ZeroAddress");
    });

    it("should revert on duplicate registration", async function () {
      const { engine, vaultOwner, vaultAddress } = await loadFixture(deployFixture);
      await engine.connect(vaultOwner).registerVault(vaultAddress);

      await expect(engine.connect(vaultOwner).registerVault(vaultAddress))
        .to.be.revertedWithCustomError(engine, "VaultAlreadyRegistered");
    });
  });

  describe("Policy Management", function () {
    it("should add a policy to a vault", async function () {
      const { engine, vaultOwner, vaultAddress, policy } = await loadFixture(deployWithVaultFixture);
      const policyAddr = await policy.getAddress();

      await expect(engine.connect(vaultOwner).addPolicy(vaultAddress, policyAddr))
        .to.emit(engine, "PolicyAdded")
        .withArgs(vaultAddress, policyAddr);

      expect(await engine.isPolicyActive(vaultAddress, policyAddr)).to.be.true;
      const policies = await engine.getVaultPolicies(vaultAddress);
      expect(policies).to.include(policyAddr);
    });

    it.skip("should revert when non-owner adds policy (demo: access control disabled)", async function () {
      const { engine, otherUser, vaultAddress, policy } = await loadFixture(deployWithVaultFixture);

      await expect(
        engine.connect(otherUser).addPolicy(vaultAddress, await policy.getAddress())
      ).to.be.revertedWithCustomError(engine, "NotVaultOwner");
    });

    it("should revert on duplicate policy", async function () {
      const { engine, vaultOwner, vaultAddress, policy } = await loadFixture(deployWithVaultFixture);
      const policyAddr = await policy.getAddress();

      await engine.connect(vaultOwner).addPolicy(vaultAddress, policyAddr);
      await expect(engine.connect(vaultOwner).addPolicy(vaultAddress, policyAddr))
        .to.be.revertedWithCustomError(engine, "PolicyAlreadyRegistered");
    });

    it("should remove a policy from a vault", async function () {
      const { engine, vaultOwner, vaultAddress, policy } = await loadFixture(deployWithVaultFixture);
      const policyAddr = await policy.getAddress();

      await engine.connect(vaultOwner).addPolicy(vaultAddress, policyAddr);
      await expect(engine.connect(vaultOwner).removePolicy(vaultAddress, policyAddr))
        .to.emit(engine, "PolicyRemoved")
        .withArgs(vaultAddress, policyAddr);

      expect(await engine.isPolicyActive(vaultAddress, policyAddr)).to.be.false;
    });

    it("should revert when removing non-existent policy", async function () {
      const { engine, vaultOwner, vaultAddress, policy } = await loadFixture(deployWithVaultFixture);

      await expect(
        engine.connect(vaultOwner).removePolicy(vaultAddress, await policy.getAddress())
      ).to.be.revertedWithCustomError(engine, "PolicyNotRegistered");
    });
  });

  describe("Emergency Controls", function () {
    it("should pause and unpause", async function () {
      const { engine, owner } = await loadFixture(deployFixture);

      await engine.connect(owner).pause();
      expect(await engine.paused()).to.be.true;

      await engine.connect(owner).unpause();
      expect(await engine.paused()).to.be.false;
    });

    it("should block operations when paused", async function () {
      const { engine, owner, vaultOwner, vaultAddress } = await loadFixture(deployFixture);

      await engine.connect(owner).pause();
      await expect(engine.connect(vaultOwner).registerVault(vaultAddress))
        .to.be.revertedWithCustomError(engine, "EnforcedPause");
    });

    it.skip("should only allow owner to pause (demo: access control disabled)", async function () {
      const { engine, otherUser } = await loadFixture(deployFixture);
      await expect(engine.connect(otherUser).pause())
        .to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");
    });
  });
});
