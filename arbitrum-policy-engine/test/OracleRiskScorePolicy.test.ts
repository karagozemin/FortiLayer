import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * OracleRiskScorePolicy — Comprehensive Test Suite
 *
 * Tests dual-mode risk scoring: Chainlink oracle + manual override.
 * Uses a MockChainlinkFeed for deterministic testing.
 */
describe("OracleRiskScorePolicy", function () {
  const MIN_THRESHOLD = 50;
  const DEFAULT_SCORE = 75;
  const STALENESS_THRESHOLD = 86400; // 1 day
  const INITIAL_PRICE = 200000000000n; // $2,000.00 (8 decimals)

  async function deployMockFeed() {
    // Deploy a minimal mock Chainlink feed for testing
    const MockFeed = await ethers.getContractFactory("MockChainlinkFeed");
    const feed = await MockFeed.deploy(INITIAL_PRICE, 8);
    await feed.waitForDeployment();
    return feed;
  }

  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const feed = await deployMockFeed();

    const OracleRiskScorePolicy = await ethers.getContractFactory("OracleRiskScorePolicy");
    const policy = await OracleRiskScorePolicy.deploy(
      await engine.getAddress(),
      await feed.getAddress(),
      MIN_THRESHOLD,
      DEFAULT_SCORE,
      STALENESS_THRESHOLD
    );
    await policy.waitForDeployment();

    const vault = ethers.Wallet.createRandom().address;
    const token = ethers.Wallet.createRandom().address;
    const safeRecipient = ethers.Wallet.createRandom().address;
    const riskyRecipient = ethers.Wallet.createRandom().address;

    return { engine, policy, feed, owner, otherUser, vault, token, safeRecipient, riskyRecipient };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                            DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Deployment", function () {
    it("should set correct defaults", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.minThreshold()).to.equal(MIN_THRESHOLD);
      expect(await policy.defaultScore()).to.equal(DEFAULT_SCORE);
      expect(await policy.oracleEnabled()).to.equal(true);
      expect(await policy.stalenessThreshold()).to.equal(STALENESS_THRESHOLD);
    });

    it("should set correct policy name", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.policyName()).to.equal("OracleRiskScorePolicy");
    });

    it("should set anchor price from live feed", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.anchorPrice()).to.equal(INITIAL_PRICE);
    });

    it("should revert with zero price feed address", async function () {
      const { engine } = await loadFixture(deployFixture);
      const OracleRiskScorePolicy = await ethers.getContractFactory("OracleRiskScorePolicy");
      await expect(
        OracleRiskScorePolicy.deploy(
          await engine.getAddress(), ethers.ZeroAddress, MIN_THRESHOLD, DEFAULT_SCORE, STALENESS_THRESHOLD
        )
      ).to.be.revertedWithCustomError(OracleRiskScorePolicy, "ZeroAddress");
    });

    it("should revert with invalid threshold", async function () {
      const { engine, feed } = await loadFixture(deployFixture);
      const OracleRiskScorePolicy = await ethers.getContractFactory("OracleRiskScorePolicy");
      await expect(
        OracleRiskScorePolicy.deploy(
          await engine.getAddress(), await feed.getAddress(), 101, DEFAULT_SCORE, STALENESS_THRESHOLD
        )
      ).to.be.revertedWithCustomError(OracleRiskScorePolicy, "InvalidThreshold");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                         ORACLE SCORING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Oracle Score Calculation", function () {
    it("should return score 100 for normal market (< 2% deviation)", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      // Price moves 1% up: $2,020 (within 2% band)
      await feed.setPrice(202000000000n);
      const [score, isStale] = await policy.getOracleScore();
      expect(score).to.equal(100);
      expect(isStale).to.equal(false);
    });

    it("should return score 70 for mild volatility (2-5%)", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      // Price moves 3% down: $1,940
      await feed.setPrice(194000000000n);
      const [score, isStale] = await policy.getOracleScore();
      expect(score).to.equal(70);
      expect(isStale).to.equal(false);
    });

    it("should return score 40 for high volatility (5-10%)", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      // Price moves 7% down: $1,860
      await feed.setPrice(186000000000n);
      const [score, isStale] = await policy.getOracleScore();
      expect(score).to.equal(40);
      expect(isStale).to.equal(false);
    });

    it("should return score 10 for extreme volatility (> 10%)", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      // Price crashes 15%: $1,700
      await feed.setPrice(170000000000n);
      const [score, isStale] = await policy.getOracleScore();
      expect(score).to.equal(10);
      expect(isStale).to.equal(false);
    });

    it("should detect stale oracle data", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      // Make oracle stale
      await feed.setStale(true);
      const [, isStale] = await policy.getOracleScore();
      expect(isStale).to.equal(true);
    });

    it("should return deviation in basis points", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      // 5% move: $2,100
      await feed.setPrice(210000000000n);
      const deviation = await policy.getCurrentDeviation();
      expect(deviation).to.equal(500); // 500 bp = 5%
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                        DUAL MODE SCORING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Effective Score (dual mode)", function () {
    it("should use manual score when oracle is normal and manual is lower", async function () {
      const { policy, safeRecipient } = await loadFixture(deployFixture);
      // Oracle = 100 (normal), manual = 60
      await policy.setRiskScore(safeRecipient, 60);
      const score = await policy.getEffectiveScore(safeRecipient);
      expect(score).to.equal(60); // min(100, 60) = 60
    });

    it("should use oracle score when it is lower than manual", async function () {
      const { policy, feed, safeRecipient } = await loadFixture(deployFixture);
      // Oracle = 40 (high volatility), manual = 90
      await feed.setPrice(186000000000n); // 7% deviation
      await policy.setRiskScore(safeRecipient, 90);
      const score = await policy.getEffectiveScore(safeRecipient);
      expect(score).to.equal(40); // min(40, 90) = 40
    });

    it("should fall back to manual score when oracle is stale", async function () {
      const { policy, feed, safeRecipient } = await loadFixture(deployFixture);
      await feed.setStale(true);
      await policy.setRiskScore(safeRecipient, 80);
      const score = await policy.getEffectiveScore(safeRecipient);
      expect(score).to.equal(80);
    });

    it("should fall back to manual score when oracle is disabled", async function () {
      const { policy, feed, safeRecipient } = await loadFixture(deployFixture);
      await feed.setPrice(170000000000n); // extreme
      await policy.setOracleEnabled(false);
      await policy.setRiskScore(safeRecipient, 85);
      const score = await policy.getEffectiveScore(safeRecipient);
      expect(score).to.equal(85); // manual only, oracle disabled
    });

    it("should use default score for unknown addresses", async function () {
      const { policy } = await loadFixture(deployFixture);
      const unknown = ethers.Wallet.createRandom().address;
      const score = await policy.getEffectiveScore(unknown);
      expect(score).to.equal(DEFAULT_SCORE); // default 75, oracle 100 → min = 75
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                          VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Validation", function () {
    it("should pass when score >= threshold", async function () {
      const { policy, vault, token, safeRecipient } = await loadFixture(deployFixture);
      // Default score 75 >= threshold 50
      const result = await policy.validate(vault, token, safeRecipient, 1000);
      expect(result).to.equal(true);
    });

    it("should revert when manual score is below threshold", async function () {
      const { policy, vault, token, riskyRecipient } = await loadFixture(deployFixture);
      await policy.setRiskScore(riskyRecipient, 30); // Below threshold 50
      await expect(
        policy.validate(vault, token, riskyRecipient, 1000)
      ).to.be.revertedWithCustomError(policy, "RiskScoreTooLow");
    });

    it("should revert when oracle score drops below threshold", async function () {
      const { policy, feed, vault, token, safeRecipient } = await loadFixture(deployFixture);
      // Set manual score high (90), but oracle crashes to 40
      await policy.setRiskScore(safeRecipient, 90);
      await feed.setPrice(186000000000n); // 7% deviation → oracle score 40
      await expect(
        policy.validate(vault, token, safeRecipient, 1000)
      ).to.be.revertedWithCustomError(policy, "RiskScoreTooLow");
    });

    it("should pass during extreme volatility if oracle is disabled", async function () {
      const { policy, feed, vault, token, safeRecipient } = await loadFixture(deployFixture);
      await feed.setPrice(170000000000n); // 15% crash
      await policy.setOracleEnabled(false);
      // Default score 75 >= threshold 50 → passes (oracle disabled)
      const result = await policy.validate(vault, token, safeRecipient, 1000);
      expect(result).to.equal(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     MANUAL SCORE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Manual Score Management", function () {
    it("should set and get risk score", async function () {
      const { policy, safeRecipient } = await loadFixture(deployFixture);
      await policy.setRiskScore(safeRecipient, 95);
      expect(await policy.getManualScore(safeRecipient)).to.equal(95);
      expect(await policy.hasCustomScore(safeRecipient)).to.equal(true);
    });

    it("should batch set risk scores", async function () {
      const { policy, safeRecipient, riskyRecipient } = await loadFixture(deployFixture);
      await policy.batchSetRiskScores(
        [safeRecipient, riskyRecipient],
        [90, 20]
      );
      expect(await policy.getManualScore(safeRecipient)).to.equal(90);
      expect(await policy.getManualScore(riskyRecipient)).to.equal(20);
    });

    it("should revert with invalid score > 100", async function () {
      const { policy, safeRecipient } = await loadFixture(deployFixture);
      await expect(
        policy.setRiskScore(safeRecipient, 101)
      ).to.be.revertedWithCustomError(policy, "InvalidScore");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                       ADMIN CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Admin Configuration", function () {
    it("should update min threshold", async function () {
      const { policy } = await loadFixture(deployFixture);
      await policy.setMinThreshold(80);
      expect(await policy.minThreshold()).to.equal(80);
    });

    it("should update default score", async function () {
      const { policy } = await loadFixture(deployFixture);
      await policy.setDefaultScore(60);
      expect(await policy.defaultScore()).to.equal(60);
    });

    it("should update staleness threshold", async function () {
      const { policy } = await loadFixture(deployFixture);
      await policy.setStalenessThreshold(3600);
      expect(await policy.stalenessThreshold()).to.equal(3600);
    });

    it("should toggle oracle enabled", async function () {
      const { policy } = await loadFixture(deployFixture);
      await policy.setOracleEnabled(false);
      expect(await policy.oracleEnabled()).to.equal(false);
      await policy.setOracleEnabled(true);
      expect(await policy.oracleEnabled()).to.equal(true);
    });

    it("should refresh anchor price", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      await feed.setPrice(210000000000n);
      await policy.refreshAnchorPrice();
      expect(await policy.anchorPrice()).to.equal(210000000000n);
    });

    it("should get latest price from feed", async function () {
      const { policy, feed } = await loadFixture(deployFixture);
      await feed.setPrice(195000000000n);
      const [price] = await policy.getLatestPrice();
      expect(price).to.equal(195000000000n);
    });

    it("should report wouldPass correctly", async function () {
      const { policy, safeRecipient, riskyRecipient } = await loadFixture(deployFixture);
      await policy.setRiskScore(safeRecipient, 90);
      await policy.setRiskScore(riskyRecipient, 20);
      expect(await policy.wouldPass(safeRecipient)).to.equal(true);
      expect(await policy.wouldPass(riskyRecipient)).to.equal(false);
    });
  });
});
