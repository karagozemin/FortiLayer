import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Full Integration Test — End-to-End FortiLayer Pipeline
 *
 * Tests the complete flow:
 *   Treasury → TreasuryFirewall → PolicyEngine → Policy Modules → Execution
 */
describe("Integration: Full Pipeline", function () {
  const USDC_DECIMALS = 6;

  async function deployFullSystemFixture() {
    const [owner, whitelistedReceiver, nonWhitelistedReceiver, riskyReceiver] = await ethers.getSigners();

    // 1. Deploy PolicyEngine
    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    // 2. Deploy TreasuryFirewall
    const TreasuryFirewall = await ethers.getContractFactory("TreasuryFirewall");
    const firewall = await TreasuryFirewall.deploy(await engine.getAddress());
    await firewall.waitForDeployment();

    // 3. Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // 4. Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(await firewall.getAddress());
    await treasury.waitForDeployment();
    const treasuryAddr = await treasury.getAddress();

    // 5. Deploy Policies
    const DAILY_LIMIT = ethers.parseUnits("10000", USDC_DECIMALS);
    const MAX_TX = ethers.parseUnits("5000", USDC_DECIMALS);

    const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
    const spendingPolicy = await SpendingLimitPolicy.deploy(await engine.getAddress(), DAILY_LIMIT, MAX_TX);
    await spendingPolicy.waitForDeployment();

    const WhitelistPolicy = await ethers.getContractFactory("WhitelistPolicy");
    const whitelistPolicy = await WhitelistPolicy.deploy(await engine.getAddress());
    await whitelistPolicy.waitForDeployment();

    const RiskScorePolicy = await ethers.getContractFactory("RiskScorePolicy");
    const riskPolicy = await RiskScorePolicy.deploy(await engine.getAddress(), 50, 75);
    await riskPolicy.waitForDeployment();

    // 6. Configure system
    await firewall.authorizeVault(treasuryAddr);
    await engine.registerVault(treasuryAddr);
    await engine.addPolicy(treasuryAddr, await spendingPolicy.getAddress());
    await engine.addPolicy(treasuryAddr, await whitelistPolicy.getAddress());
    await engine.addPolicy(treasuryAddr, await riskPolicy.getAddress());

    // 7. Whitelist the approved receiver
    await whitelistPolicy.addToVaultWhitelist(treasuryAddr, whitelistedReceiver.address);

    // 8. Set risky address score to 10 (below threshold of 50)
    // Also whitelist them to test risk score independently
    await riskPolicy.setRiskScore(riskyReceiver.address, 10);
    await whitelistPolicy.addToVaultWhitelist(treasuryAddr, riskyReceiver.address);

    // 9. Fund the treasury with 50K USDC
    const FUND_AMOUNT = ethers.parseUnits("50000", USDC_DECIMALS);
    await usdc.approve(treasuryAddr, FUND_AMOUNT);
    await treasury.deposit(await usdc.getAddress(), FUND_AMOUNT);

    return {
      engine, firewall, usdc, treasury,
      spendingPolicy, whitelistPolicy, riskPolicy,
      owner, whitelistedReceiver, nonWhitelistedReceiver, riskyReceiver,
      treasuryAddr,
    };
  }

  describe("Valid Transfers", function () {
    it("should execute a valid transfer (whitelisted + within limits + safe address)", async function () {
      const { treasury, usdc, whitelistedReceiver } = await loadFixture(deployFullSystemFixture);
      const amount = ethers.parseUnits("1000", USDC_DECIMALS);

      await expect(
        treasury.requestTransfer(await usdc.getAddress(), whitelistedReceiver.address, amount)
      ).to.emit(treasury, "TransferExecuted");

      expect(await usdc.balanceOf(whitelistedReceiver.address)).to.equal(amount);
    });

    it("should execute multiple valid transfers within daily limit", async function () {
      const { treasury, usdc, whitelistedReceiver } = await loadFixture(deployFullSystemFixture);
      const amount = ethers.parseUnits("2000", USDC_DECIMALS);

      // Transfer 1
      await treasury.requestTransfer(await usdc.getAddress(), whitelistedReceiver.address, amount);
      // Transfer 2
      await treasury.requestTransfer(await usdc.getAddress(), whitelistedReceiver.address, amount);

      expect(await usdc.balanceOf(whitelistedReceiver.address))
        .to.equal(ethers.parseUnits("4000", USDC_DECIMALS));
    });
  });

  describe("Blocked Transfers", function () {
    it("should block transfer exceeding max transaction amount", async function () {
      const { treasury, usdc, whitelistedReceiver } = await loadFixture(deployFullSystemFixture);
      const amount = ethers.parseUnits("6000", USDC_DECIMALS); // > 5000 max tx

      await expect(
        treasury.requestTransfer(await usdc.getAddress(), whitelistedReceiver.address, amount)
      ).to.be.reverted;
    });

    it("should block transfer to non-whitelisted address", async function () {
      const { treasury, usdc, nonWhitelistedReceiver } = await loadFixture(deployFullSystemFixture);
      const amount = ethers.parseUnits("1000", USDC_DECIMALS);

      await expect(
        treasury.requestTransfer(await usdc.getAddress(), nonWhitelistedReceiver.address, amount)
      ).to.be.reverted;
    });

    it("should block transfer to high-risk address", async function () {
      const { treasury, usdc, riskyReceiver } = await loadFixture(deployFullSystemFixture);
      const amount = ethers.parseUnits("1000", USDC_DECIMALS);

      await expect(
        treasury.requestTransfer(await usdc.getAddress(), riskyReceiver.address, amount)
      ).to.be.reverted;
    });

    it("should block transfer exceeding daily limit (cumulative)", async function () {
      const { treasury, usdc, whitelistedReceiver } = await loadFixture(deployFullSystemFixture);

      // Transfer 4000 + 4000 = 8000
      await treasury.requestTransfer(
        await usdc.getAddress(), whitelistedReceiver.address,
        ethers.parseUnits("4000", USDC_DECIMALS)
      );
      await treasury.requestTransfer(
        await usdc.getAddress(), whitelistedReceiver.address,
        ethers.parseUnits("4000", USDC_DECIMALS)
      );

      // Next 3000 would be 11000 > 10000 daily limit
      await expect(
        treasury.requestTransfer(
          await usdc.getAddress(), whitelistedReceiver.address,
          ethers.parseUnits("3000", USDC_DECIMALS)
        )
      ).to.be.reverted;
    });
  });

  describe("Emergency Pause", function () {
    it("should block all transfers when treasury is paused", async function () {
      const { treasury, usdc, whitelistedReceiver, owner } = await loadFixture(deployFullSystemFixture);

      await treasury.connect(owner).emergencyPause();

      await expect(
        treasury.requestTransfer(
          await usdc.getAddress(), whitelistedReceiver.address,
          ethers.parseUnits("100", USDC_DECIMALS)
        )
      ).to.be.revertedWithCustomError(treasury, "EnforcedPause");
    });

    it("should resume after unpause", async function () {
      const { treasury, usdc, whitelistedReceiver, owner } = await loadFixture(deployFullSystemFixture);

      await treasury.connect(owner).emergencyPause();
      await treasury.connect(owner).emergencyUnpause();

      await expect(
        treasury.requestTransfer(
          await usdc.getAddress(), whitelistedReceiver.address,
          ethers.parseUnits("100", USDC_DECIMALS)
        )
      ).to.emit(treasury, "TransferExecuted");
    });
  });

  describe("Policy Engine Pause", function () {
    it("should block transfers when policy engine is paused", async function () {
      const { treasury, engine, usdc, whitelistedReceiver, owner } = await loadFixture(deployFullSystemFixture);

      await engine.connect(owner).pause();

      await expect(
        treasury.requestTransfer(
          await usdc.getAddress(), whitelistedReceiver.address,
          ethers.parseUnits("100", USDC_DECIMALS)
        )
      ).to.be.reverted;
    });
  });

  describe("Analytics", function () {
    it("should track total transfers executed", async function () {
      const { treasury, usdc, whitelistedReceiver } = await loadFixture(deployFullSystemFixture);
      const amount = ethers.parseUnits("100", USDC_DECIMALS);

      await treasury.requestTransfer(await usdc.getAddress(), whitelistedReceiver.address, amount);
      await treasury.requestTransfer(await usdc.getAddress(), whitelistedReceiver.address, amount);

      expect(await treasury.totalTransfersExecuted()).to.equal(2);
    });
  });
});
