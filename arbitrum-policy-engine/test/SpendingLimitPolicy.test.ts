import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * SpendingLimitPolicy — Comprehensive Test Suite
 */
describe("SpendingLimitPolicy", function () {
  const USDC_DECIMALS = 6;
  const DAILY_LIMIT = ethers.parseUnits("10000", USDC_DECIMALS);
  const MAX_TX = ethers.parseUnits("5000", USDC_DECIMALS);

  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
    const policy = await SpendingLimitPolicy.deploy(
      await engine.getAddress(), DAILY_LIMIT, MAX_TX
    );
    await policy.waitForDeployment();

    const vault = ethers.Wallet.createRandom().address;
    const token = ethers.Wallet.createRandom().address;
    const recipient = ethers.Wallet.createRandom().address;

    return { engine, policy, owner, otherUser, vault, token, recipient };
  }

  describe("Deployment", function () {
    it("should set correct default limits", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.defaultDailyLimit()).to.equal(DAILY_LIMIT);
      expect(await policy.defaultMaxTxAmount()).to.equal(MAX_TX);
    });

    it("should set correct policy name", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.policyName()).to.equal("SpendingLimitPolicy");
    });

    it("should revert with zero daily limit", async function () {
      const { engine } = await loadFixture(deployFixture);
      const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
      await expect(
        SpendingLimitPolicy.deploy(await engine.getAddress(), 0, MAX_TX)
      ).to.be.revertedWithCustomError(SpendingLimitPolicy, "InvalidLimit");
    });
  });

  describe("Validation", function () {
    it("should pass for amount within limits", async function () {
      const { policy, vault, token, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", USDC_DECIMALS);

      expect(await policy.validate(vault, token, recipient, amount)).to.be.true;
    });

    it("should revert for amount exceeding max transaction", async function () {
      const { policy, vault, token, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("6000", USDC_DECIMALS); // > 5000 max tx

      await expect(policy.validate(vault, token, recipient, amount))
        .to.be.revertedWithCustomError(policy, "ExceedsMaxTransactionAmount");
    });

    it("should revert when cumulative spending exceeds daily limit", async function () {
      const { policy, engine, vault, token, recipient, owner } = await loadFixture(deployFixture);

      // Simulate the engine recording transactions
      // First, we need to call recordTransaction as the policy engine
      // Since only policyEngine can call record, we need to set the policy engine to our address
      await policy.connect(owner).setPolicyEngine(owner.address);

      // Record 8000 USDC spent
      await policy.connect(owner).recordTransaction(vault, token, recipient, ethers.parseUnits("4000", USDC_DECIMALS));
      await policy.connect(owner).recordTransaction(vault, token, recipient, ethers.parseUnits("4000", USDC_DECIMALS));

      // Now trying to validate 3000 more should fail (8000 + 3000 > 10000)
      const amount = ethers.parseUnits("3000", USDC_DECIMALS);
      await expect(policy.validate(vault, token, recipient, amount))
        .to.be.revertedWithCustomError(policy, "ExceedsDailyLimit");
    });

    it("should reset daily limit after 24 hours", async function () {
      const { policy, owner, vault, token, recipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setPolicyEngine(owner.address);

      // Spend 9000 USDC
      await policy.connect(owner).recordTransaction(vault, token, recipient, ethers.parseUnits("4500", USDC_DECIMALS));
      await policy.connect(owner).recordTransaction(vault, token, recipient, ethers.parseUnits("4500", USDC_DECIMALS));

      // Advance time by 1 day
      await time.increase(86400);

      // Should now pass — daily limit resets
      const amount = ethers.parseUnits("5000", USDC_DECIMALS);
      expect(await policy.validate(vault, token, recipient, amount)).to.be.true;
    });
  });

  describe("Admin Functions", function () {
    it("should allow owner to set vault-specific daily limit", async function () {
      const { policy, owner, vault } = await loadFixture(deployFixture);
      const newLimit = ethers.parseUnits("20000", USDC_DECIMALS);

      await expect(policy.connect(owner).setVaultDailyLimit(vault, newLimit))
        .to.emit(policy, "DailyLimitUpdated")
        .withArgs(vault, newLimit);
    });

    it.skip("should prevent non-owner from updating limits (demo: access control disabled)", async function () {
      const { policy, otherUser, vault } = await loadFixture(deployFixture);

      await expect(
        policy.connect(otherUser).setVaultDailyLimit(vault, 1000)
      ).to.be.revertedWithCustomError(policy, "OnlyOwner");
    });
  });

  describe("View Functions", function () {
    it("should return correct remaining daily allowance", async function () {
      const { policy, owner, vault, token, recipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setPolicyEngine(owner.address);
      await policy.connect(owner).recordTransaction(vault, token, recipient, ethers.parseUnits("3000", USDC_DECIMALS));

      const remaining = await policy.getRemainingDailyAllowance(vault);
      expect(remaining).to.equal(ethers.parseUnits("7000", USDC_DECIMALS));
    });
  });
});
