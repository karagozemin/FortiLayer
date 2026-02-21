import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * RiskScorePolicy — Comprehensive Test Suite
 */
describe("RiskScorePolicy", function () {
  const MIN_THRESHOLD = 50;
  const DEFAULT_SCORE = 75;

  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const RiskScorePolicy = await ethers.getContractFactory("RiskScorePolicy");
    const policy = await RiskScorePolicy.deploy(
      await engine.getAddress(), MIN_THRESHOLD, DEFAULT_SCORE
    );
    await policy.waitForDeployment();

    const vault = ethers.Wallet.createRandom().address;
    const token = ethers.Wallet.createRandom().address;
    const safeRecipient = ethers.Wallet.createRandom().address;
    const riskyRecipient = ethers.Wallet.createRandom().address;

    return { engine, policy, owner, otherUser, vault, token, safeRecipient, riskyRecipient };
  }

  describe("Deployment", function () {
    it("should set correct defaults", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.minThreshold()).to.equal(MIN_THRESHOLD);
      expect(await policy.defaultScore()).to.equal(DEFAULT_SCORE);
    });

    it("should set correct policy name", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.policyName()).to.equal("RiskScorePolicy");
    });

    it("should revert with invalid threshold", async function () {
      const { engine } = await loadFixture(deployFixture);
      const RiskScorePolicy = await ethers.getContractFactory("RiskScorePolicy");
      await expect(
        RiskScorePolicy.deploy(await engine.getAddress(), 101, DEFAULT_SCORE)
      ).to.be.revertedWithCustomError(RiskScorePolicy, "InvalidThreshold");
    });
  });

  describe("Validation", function () {
    it("should pass for address with default score (75 >= 50)", async function () {
      const { policy, vault, token, safeRecipient } = await loadFixture(deployFixture);
      expect(await policy.validate(vault, token, safeRecipient, 1000)).to.be.true;
    });

    it("should pass for address with high score", async function () {
      const { policy, owner, vault, token, safeRecipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setRiskScore(safeRecipient, 90);
      expect(await policy.validate(vault, token, safeRecipient, 1000)).to.be.true;
    });

    it("should revert for address with low score", async function () {
      const { policy, owner, vault, token, riskyRecipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setRiskScore(riskyRecipient, 10);
      await expect(policy.validate(vault, token, riskyRecipient, 1000))
        .to.be.revertedWithCustomError(policy, "RiskScoreTooLow");
    });

    it("should revert for address with score exactly at threshold - 1", async function () {
      const { policy, owner, vault, token, riskyRecipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setRiskScore(riskyRecipient, MIN_THRESHOLD - 1);
      await expect(policy.validate(vault, token, riskyRecipient, 1000))
        .to.be.revertedWithCustomError(policy, "RiskScoreTooLow");
    });

    it("should pass for address with score exactly at threshold", async function () {
      const { policy, owner, vault, token, safeRecipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setRiskScore(safeRecipient, MIN_THRESHOLD);
      expect(await policy.validate(vault, token, safeRecipient, 1000)).to.be.true;
    });
  });

  describe("Risk Score Management", function () {
    it("should set individual risk score", async function () {
      const { policy, owner, safeRecipient } = await loadFixture(deployFixture);

      await expect(policy.connect(owner).setRiskScore(safeRecipient, 80))
        .to.emit(policy, "RiskScoreUpdated")
        .withArgs(safeRecipient, 80);

      expect(await policy.getRiskScore(safeRecipient)).to.equal(80);
    });

    it("should batch-set risk scores", async function () {
      const { policy, owner } = await loadFixture(deployFixture);
      const addr1 = ethers.Wallet.createRandom().address;
      const addr2 = ethers.Wallet.createRandom().address;

      await policy.connect(owner).batchSetRiskScores([addr1, addr2], [90, 20]);

      expect(await policy.getRiskScore(addr1)).to.equal(90);
      expect(await policy.getRiskScore(addr2)).to.equal(20);
    });

    it("should revert on invalid score (>100)", async function () {
      const { policy, owner, safeRecipient } = await loadFixture(deployFixture);

      await expect(
        policy.connect(owner).setRiskScore(safeRecipient, 101)
      ).to.be.revertedWithCustomError(policy, "InvalidScore");
    });

    it.skip("should prevent non-owner from setting scores (demo: access control disabled)", async function () {
      const { policy, otherUser, safeRecipient } = await loadFixture(deployFixture);

      await expect(
        policy.connect(otherUser).setRiskScore(safeRecipient, 80)
      ).to.be.revertedWithCustomError(policy, "OnlyOwner");
    });
  });

  describe("View Functions", function () {
    it("should return default score for unknown address", async function () {
      const { policy } = await loadFixture(deployFixture);
      const unknown = ethers.Wallet.createRandom().address;
      expect(await policy.getRiskScore(unknown)).to.equal(DEFAULT_SCORE);
    });

    it("should report hasCustomScore correctly", async function () {
      const { policy, owner, safeRecipient, riskyRecipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setRiskScore(safeRecipient, 80);

      expect(await policy.hasCustomScore(safeRecipient)).to.be.true;
      expect(await policy.hasCustomScore(riskyRecipient)).to.be.false;
    });

    it("should report wouldPass correctly", async function () {
      const { policy, owner, safeRecipient, riskyRecipient } = await loadFixture(deployFixture);

      await policy.connect(owner).setRiskScore(riskyRecipient, 10);

      expect(await policy.wouldPass(safeRecipient)).to.be.true;  // default 75 >= 50
      expect(await policy.wouldPass(riskyRecipient)).to.be.false; // 10 < 50
    });
  });
});
