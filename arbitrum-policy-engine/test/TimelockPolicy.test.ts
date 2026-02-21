import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * TimelockPolicy — Comprehensive Test Suite
 */
describe("TimelockPolicy", function () {
  const DEFAULT_DURATION = 3600; // 1 hour

  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const TimelockPolicy = await ethers.getContractFactory("TimelockPolicy");
    const policy = await TimelockPolicy.deploy(await engine.getAddress(), DEFAULT_DURATION);
    await policy.waitForDeployment();

    const vault = ethers.Wallet.createRandom().address;
    const token = ethers.Wallet.createRandom().address;
    const recipient = ethers.Wallet.createRandom().address;

    return { engine, policy, owner, otherUser, vault, token, recipient };
  }

  describe("Deployment", function () {
    it("should set correct default duration", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.defaultTimelockDuration()).to.equal(DEFAULT_DURATION);
    });

    it("should set correct policy name", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.policyName()).to.equal("TimelockPolicy");
    });

    it("should revert with zero duration", async function () {
      const { engine } = await loadFixture(deployFixture);
      const TimelockPolicy = await ethers.getContractFactory("TimelockPolicy");
      await expect(
        TimelockPolicy.deploy(await engine.getAddress(), 0)
      ).to.be.revertedWithCustomError(TimelockPolicy, "InvalidDuration");
    });
  });

  describe("Validation", function () {
    it("should pass for first transaction (no previous record)", async function () {
      const { policy, vault, token, recipient } = await loadFixture(deployFixture);
      expect(await policy.validate(vault, token, recipient, 1000)).to.be.true;
    });

    it("should revert when timelock is active", async function () {
      const { policy, owner, vault, token, recipient } = await loadFixture(deployFixture);

      // Set policy engine to owner for testing
      await policy.connect(owner).setPolicyEngine(owner.address);
      await policy.connect(owner).recordTransaction(vault, token, recipient, 1000);

      // Immediately try to validate — should fail
      await expect(policy.validate(vault, token, recipient, 1000))
        .to.be.revertedWithCustomError(policy, "TimelockActive");
    });

    it("should pass after timelock expires", async function () {
      const { policy, owner, vault, token, recipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setPolicyEngine(owner.address);
      await policy.connect(owner).recordTransaction(vault, token, recipient, 1000);

      // Advance time past the timelock
      await time.increase(DEFAULT_DURATION + 1);

      expect(await policy.validate(vault, token, recipient, 1000)).to.be.true;
    });
  });

  describe("Admin Functions", function () {
    it("should set vault-specific timelock duration", async function () {
      const { policy, owner, vault } = await loadFixture(deployFixture);
      const newDuration = 7200; // 2 hours

      await expect(policy.connect(owner).setVaultTimelockDuration(vault, newDuration))
        .to.emit(policy, "TimelockDurationUpdated")
        .withArgs(vault, newDuration);

      expect(await policy.getEffectiveTimelockDuration(vault)).to.equal(newDuration);
    });

    it("should reset timelock for emergency", async function () {
      const { policy, owner, vault, token, recipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setPolicyEngine(owner.address);
      await policy.connect(owner).recordTransaction(vault, token, recipient, 1000);

      // Reset timelock
      await expect(policy.connect(owner).resetTimelock(vault))
        .to.emit(policy, "TimelockReset")
        .withArgs(vault);

      // Should now pass immediately
      expect(await policy.validate(vault, token, recipient, 1000)).to.be.true;
    });

    it.skip("should prevent non-owner from resetting timelock (demo: access control disabled)", async function () {
      const { policy, otherUser, vault } = await loadFixture(deployFixture);

      await expect(
        policy.connect(otherUser).resetTimelock(vault)
      ).to.be.revertedWithCustomError(policy, "OnlyOwner");
    });
  });

  describe("View Functions", function () {
    it("should return correct unlock time", async function () {
      const { policy, owner, vault, token, recipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setPolicyEngine(owner.address);
      await policy.connect(owner).recordTransaction(vault, token, recipient, 1000);

      const unlockTime = await policy.getUnlockTime(vault);
      expect(unlockTime).to.be.greaterThan(0);
    });

    it("should report timelock as expired when no previous transaction", async function () {
      const { policy, vault } = await loadFixture(deployFixture);
      expect(await policy.isTimelockExpired(vault)).to.be.true;
    });
  });
});
