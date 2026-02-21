import { ethers } from "hardhat";

/**
 * FortiLayer — Interactive Demo Script
 *
 * Demonstrates the full lifecycle of the FortiLayer execution firewall:
 * 1. Deploy entire system
 * 2. Configure policies (10K USDC/day, whitelist, risk scores)
 * 3. ✅ Execute a valid transfer (whitelisted + within limits)
 * 4. ❌ Attempt over-limit transfer (should fail)
 * 5. ❌ Attempt non-whitelisted transfer (should fail)
 * 6. ❌ Attempt transfer to risky address (should fail)
 * 7. 🚨 Emergency pause → freeze all operations
 *
 * "Institutions don't need another DeFi app. They need control."
 */
async function main() {
  const [deployer, whitelistedReceiver, nonWhitelistedReceiver, riskyAddress] = await ethers.getSigners();

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║       🛡  FortiLayer — Live Demo                            ║");
  console.log("║       Programmable Treasury Execution Firewall              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const USDC_DECIMALS = 6;

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 1: Deploy System
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  📦 STEP 1: Deploying FortiLayer Infrastructure");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Deploy PolicyEngine
  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy();
  await policyEngine.waitForDeployment();
  console.log(`  ✅ PolicyEngine:        ${await policyEngine.getAddress()}`);

  // Deploy TreasuryFirewall
  const TreasuryFirewall = await ethers.getContractFactory("TreasuryFirewall");
  const firewall = await TreasuryFirewall.deploy(await policyEngine.getAddress());
  await firewall.waitForDeployment();
  console.log(`  ✅ TreasuryFirewall:    ${await firewall.getAddress()}`);

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log(`  ✅ MockUSDC:            ${await usdc.getAddress()}`);

  // Deploy Treasury
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(await firewall.getAddress());
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`  ✅ Treasury:            ${treasuryAddr}`);

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 2: Configure Policies
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🔧 STEP 2: Configuring Compliance Policies");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const DAILY_LIMIT = ethers.parseUnits("10000", USDC_DECIMALS);   // 10,000 USDC/day
  const MAX_TX = ethers.parseUnits("5000", USDC_DECIMALS);         // 5,000 USDC per tx
  const MIN_RISK_SCORE = 50;

  // Deploy policies
  const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
  const spendingPolicy = await SpendingLimitPolicy.deploy(
    await policyEngine.getAddress(), DAILY_LIMIT, MAX_TX
  );
  await spendingPolicy.waitForDeployment();
  console.log(`  📋 SpendingLimitPolicy: Max ${ethers.formatUnits(DAILY_LIMIT, USDC_DECIMALS)} USDC/day, Max ${ethers.formatUnits(MAX_TX, USDC_DECIMALS)} USDC/tx`);

  const WhitelistPolicy = await ethers.getContractFactory("WhitelistPolicy");
  const whitelistPolicy = await WhitelistPolicy.deploy(await policyEngine.getAddress());
  await whitelistPolicy.waitForDeployment();
  console.log(`  📋 WhitelistPolicy:     Only approved receivers`);

  const RiskScorePolicy = await ethers.getContractFactory("RiskScorePolicy");
  const riskPolicy = await RiskScorePolicy.deploy(
    await policyEngine.getAddress(), MIN_RISK_SCORE, 75
  );
  await riskPolicy.waitForDeployment();
  console.log(`  📋 RiskScorePolicy:     Min score ${MIN_RISK_SCORE}/100`);

  // Configure system
  await (await firewall.authorizeVault(treasuryAddr)).wait();
  await (await policyEngine.registerVault(treasuryAddr)).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await spendingPolicy.getAddress())).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await whitelistPolicy.getAddress())).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await riskPolicy.getAddress())).wait();

  // Whitelist the approved receiver
  await (await whitelistPolicy.addToVaultWhitelist(treasuryAddr, whitelistedReceiver.address)).wait();
  console.log(`\n  ✅ Whitelisted receiver: ${whitelistedReceiver.address}`);

  // Set risk score for risky address
  await (await riskPolicy.setRiskScore(riskyAddress.address, 10)).wait(); // Very risky
  // Whitelist risky address to test risk score independently
  await (await whitelistPolicy.addToVaultWhitelist(treasuryAddr, riskyAddress.address)).wait();
  console.log(`  ⚠️  Risky address (score=10): ${riskyAddress.address}`);

  // Fund the treasury
  const FUND_AMOUNT = ethers.parseUnits("50000", USDC_DECIMALS); // 50K USDC
  await (await usdc.approve(treasuryAddr, FUND_AMOUNT)).wait();
  await (await treasury.deposit(await usdc.getAddress(), FUND_AMOUNT)).wait();
  console.log(`\n  💰 Treasury funded with ${ethers.formatUnits(FUND_AMOUNT, USDC_DECIMALS)} USDC`);

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 3: ✅ Valid Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ✅ STEP 3: Valid Transfer (1,000 USDC to whitelisted address)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const VALID_AMOUNT = ethers.parseUnits("1000", USDC_DECIMALS);
  try {
    const tx = await treasury.requestTransfer(
      await usdc.getAddress(),
      whitelistedReceiver.address,
      VALID_AMOUNT
    );
    await tx.wait();
    const receiverBalance = await usdc.balanceOf(whitelistedReceiver.address);
    console.log(`  ✅ Transfer SUCCESSFUL!`);
    console.log(`     → ${ethers.formatUnits(VALID_AMOUNT, USDC_DECIMALS)} USDC sent to ${whitelistedReceiver.address}`);
    console.log(`     → Receiver balance: ${ethers.formatUnits(receiverBalance, USDC_DECIMALS)} USDC`);
  } catch (error: any) {
    console.log(`  ❌ Unexpected failure: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 4: ❌ Over-Limit Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ❌ STEP 4: Over-Limit Transfer (15,000 USDC — exceeds 10K/day)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const OVER_LIMIT = ethers.parseUnits("15000", USDC_DECIMALS);
  try {
    await treasury.requestTransfer(
      await usdc.getAddress(),
      whitelistedReceiver.address,
      OVER_LIMIT
    );
    console.log(`  ⚠️  This should not happen — transfer went through!`);
  } catch (error: any) {
    console.log(`  🚫 Transfer BLOCKED by SpendingLimitPolicy!`);
    console.log(`     → Attempted: ${ethers.formatUnits(OVER_LIMIT, USDC_DECIMALS)} USDC`);
    console.log(`     → Reason: Exceeds max transaction amount (5,000 USDC/tx)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 5: ❌ Non-Whitelisted Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ❌ STEP 5: Non-Whitelisted Transfer (1,000 USDC to unknown address)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    await treasury.requestTransfer(
      await usdc.getAddress(),
      nonWhitelistedReceiver.address,
      VALID_AMOUNT
    );
    console.log(`  ⚠️  This should not happen — transfer went through!`);
  } catch (error: any) {
    console.log(`  🚫 Transfer BLOCKED by WhitelistPolicy!`);
    console.log(`     → Recipient ${nonWhitelistedReceiver.address} is NOT whitelisted`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 6: ❌ Risky Address Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ❌ STEP 6: Risky Address Transfer (risk score: 10/100, threshold: 50)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    await treasury.requestTransfer(
      await usdc.getAddress(),
      riskyAddress.address,
      VALID_AMOUNT
    );
    console.log(`  ⚠️  This should not happen — transfer went through!`);
  } catch (error: any) {
    console.log(`  🚫 Transfer BLOCKED by RiskScorePolicy!`);
    console.log(`     → Address ${riskyAddress.address} has risk score 10 (minimum: 50)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 7: 🚨 Emergency Pause
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🚨 STEP 7: Emergency Pause — Freeze All Operations");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await (await treasury.emergencyPause()).wait();
  console.log("  🔒 Treasury PAUSED — all operations frozen!");

  try {
    await treasury.requestTransfer(
      await usdc.getAddress(),
      whitelistedReceiver.address,
      VALID_AMOUNT
    );
    console.log(`  ⚠️  This should not happen — transfer went through while paused!`);
  } catch (error: any) {
    console.log(`  🚫 Transfer BLOCKED — Treasury is in emergency pause state!`);
  }

  // Unpause
  await (await treasury.emergencyUnpause()).wait();
  console.log("  🔓 Treasury UNPAUSED — operations resumed.\n");

  // ═══════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════════════
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    🛡  Demo Complete                        ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║                                                            ║");
  console.log("║  ✅ Valid transfer     → PASSED all 3 policies             ║");
  console.log("║  ❌ Over-limit         → BLOCKED by SpendingLimitPolicy    ║");
  console.log("║  ❌ Non-whitelisted    → BLOCKED by WhitelistPolicy        ║");
  console.log("║  ❌ Risky address      → BLOCKED by RiskScorePolicy        ║");
  console.log("║  🚨 Emergency pause   → ALL operations FROZEN              ║");
  console.log("║                                                            ║");
  console.log("║  \"Institutions don't need another DeFi app.                ║");
  console.log("║   They need control.\"                                      ║");
  console.log("║                                                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });
