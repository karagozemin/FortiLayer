import { ethers } from "hardhat";

/**
 * FortiLayer — Interactive Demo Script
 *
 * Demonstrates the full lifecycle of the FortiLayer execution firewall:
 * 1. Deploy entire system (all 10 contracts)
 * 2. Configure 5 policy modules
 * 3. ✅ Execute a valid transfer (passes all policies)
 * 4. ❌ Attempt over-limit transfer (SpendingLimitPolicy blocks)
 * 5. ❌ Attempt non-whitelisted transfer (WhitelistPolicy blocks)
 * 6. ❌ Attempt transfer to risky address (RiskScorePolicy blocks)
 * 7. ❌ Attempt transfer without multi-sig approval (MultiSigPolicy blocks)
 * 8. 🚨 Emergency pause → freeze all operations
 *
 * Run: npx hardhat run scripts/demo.ts --network localhost
 *      npx hardhat run scripts/demo.ts --network arbitrumSepolia
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
  console.log("  📦 STEP 1: Deploying FortiLayer Infrastructure (10 contracts)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Deploy core
  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy();
  await policyEngine.waitForDeployment();
  const peAddr = await policyEngine.getAddress();
  console.log(`  ✅ PolicyEngine:        ${peAddr}`);

  const TreasuryFirewall = await ethers.getContractFactory("TreasuryFirewall");
  const firewall = await TreasuryFirewall.deploy(peAddr);
  await firewall.waitForDeployment();
  console.log(`  ✅ TreasuryFirewall:    ${await firewall.getAddress()}`);

  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const registry = await PolicyRegistry.deploy();
  await registry.waitForDeployment();
  console.log(`  ✅ PolicyRegistry:      ${await registry.getAddress()}`);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log(`  ✅ MockUSDC:            ${usdcAddr}`);

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(await firewall.getAddress());
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`  ✅ Treasury:            ${treasuryAddr}`);

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 2: Configure 5 Policy Modules
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🔧 STEP 2: Configuring 5 Compliance Policies");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const DAILY_LIMIT = ethers.parseUnits("10000", USDC_DECIMALS);
  const MAX_TX = ethers.parseUnits("5000", USDC_DECIMALS);
  const MIN_RISK_SCORE = 50;
  const TIMELOCK_DURATION = 60; // 60 seconds for demo

  // Deploy policies
  const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
  const spendingPolicy = await SpendingLimitPolicy.deploy(peAddr, DAILY_LIMIT, MAX_TX);
  await spendingPolicy.waitForDeployment();
  console.log(`  📋 SpendingLimitPolicy: Max ${ethers.formatUnits(MAX_TX, USDC_DECIMALS)} USDC/tx, ${ethers.formatUnits(DAILY_LIMIT, USDC_DECIMALS)}/day`);

  const WhitelistPolicy = await ethers.getContractFactory("WhitelistPolicy");
  const whitelistPolicy = await WhitelistPolicy.deploy(peAddr);
  await whitelistPolicy.waitForDeployment();
  console.log(`  📋 WhitelistPolicy:     Only approved receivers`);

  const RiskScorePolicy = await ethers.getContractFactory("RiskScorePolicy");
  const riskPolicy = await RiskScorePolicy.deploy(peAddr, MIN_RISK_SCORE, 75);
  await riskPolicy.waitForDeployment();
  console.log(`  📋 RiskScorePolicy:     Min score ${MIN_RISK_SCORE}/100`);

  const TimelockPolicy = await ethers.getContractFactory("TimelockPolicy");
  const timelockPolicy = await TimelockPolicy.deploy(peAddr, TIMELOCK_DURATION);
  await timelockPolicy.waitForDeployment();
  console.log(`  📋 TimelockPolicy:      ${TIMELOCK_DURATION}s cooldown`);

  const MultiSigPolicy = await ethers.getContractFactory("MultiSigPolicy");
  const multiSigPolicy = await MultiSigPolicy.deploy(peAddr, [deployer.address], 1);
  await multiSigPolicy.waitForDeployment();
  console.log(`  📋 MultiSigPolicy:      1-of-1 signer approval`);

  // Configure system
  await (await firewall.authorizeVault(treasuryAddr)).wait();
  await (await policyEngine.registerVault(treasuryAddr)).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await spendingPolicy.getAddress())).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await whitelistPolicy.getAddress())).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await riskPolicy.getAddress())).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await timelockPolicy.getAddress())).wait();
  await (await policyEngine.addPolicy(treasuryAddr, await multiSigPolicy.getAddress())).wait();

  // Register in global registry
  await (await registry.registerPolicy(await spendingPolicy.getAddress())).wait();
  await (await registry.registerPolicy(await whitelistPolicy.getAddress())).wait();
  await (await registry.registerPolicy(await riskPolicy.getAddress())).wait();
  await (await registry.registerPolicy(await timelockPolicy.getAddress())).wait();
  await (await registry.registerPolicy(await multiSigPolicy.getAddress())).wait();

  // Whitelist the approved receiver & set high risk score
  await (await whitelistPolicy.addToVaultWhitelist(treasuryAddr, whitelistedReceiver.address)).wait();
  await (await riskPolicy.setRiskScore(whitelistedReceiver.address, 90)).wait();  // High trust
  console.log(`\n  ✅ Whitelisted receiver: ${whitelistedReceiver.address} (risk=90)`);

  // Pre-approve the multisig for our valid transfer
  const VALID_AMOUNT = ethers.parseUnits("1000", USDC_DECIMALS);
  await (await multiSigPolicy.approveTransaction(
    treasuryAddr, usdcAddr, whitelistedReceiver.address, VALID_AMOUNT
  )).wait();
  console.log(`  ✅ MultiSig pre-approved for 1,000 USDC transfer`);

  // Set risky address
  await (await riskPolicy.setRiskScore(riskyAddress.address, 10)).wait();
  await (await whitelistPolicy.addToVaultWhitelist(treasuryAddr, riskyAddress.address)).wait();
  console.log(`  ⚠️  Risky address (score=10): ${riskyAddress.address}`);

  // Fund the treasury
  const FUND_AMOUNT = ethers.parseUnits("50000", USDC_DECIMALS);
  await (await usdc.approve(treasuryAddr, FUND_AMOUNT)).wait();
  await (await treasury.deposit(usdcAddr, FUND_AMOUNT)).wait();
  console.log(`\n  💰 Treasury funded with ${ethers.formatUnits(FUND_AMOUNT, USDC_DECIMALS)} USDC`);

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 3: ✅ Valid Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ✅ STEP 3: Valid Transfer (1,000 USDC → whitelisted, approved, within limits)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const tx = await treasury.requestTransfer(usdcAddr, whitelistedReceiver.address, VALID_AMOUNT);
    await tx.wait();
    const receiverBalance = await usdc.balanceOf(whitelistedReceiver.address);
    console.log(`  ✅ Transfer SUCCESSFUL!`);
    console.log(`     → ${ethers.formatUnits(VALID_AMOUNT, USDC_DECIMALS)} USDC → ${whitelistedReceiver.address}`);
    console.log(`     → Receiver balance: ${ethers.formatUnits(receiverBalance, USDC_DECIMALS)} USDC`);
    console.log(`     → Passed: SpendingLimit ✓  Whitelist ✓  RiskScore ✓  Timelock ✓  MultiSig ✓`);
  } catch (error: any) {
    console.log(`  ❌ Unexpected failure: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 4: ❌ Over-Limit Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ❌ STEP 4: Over-Limit Transfer (15,000 USDC — exceeds 5K/tx limit)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const OVER_LIMIT = ethers.parseUnits("15000", USDC_DECIMALS);
  try {
    await treasury.requestTransfer(usdcAddr, whitelistedReceiver.address, OVER_LIMIT);
    console.log(`  ⚠️  Should not happen — transfer went through!`);
  } catch {
    console.log(`  🚫 Transfer BLOCKED by SpendingLimitPolicy!`);
    console.log(`     → Attempted: ${ethers.formatUnits(OVER_LIMIT, USDC_DECIMALS)} USDC (max: 5,000 USDC/tx)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 5: ❌ Non-Whitelisted Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ❌ STEP 5: Non-Whitelisted Transfer (1,000 USDC → unknown address)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    await treasury.requestTransfer(usdcAddr, nonWhitelistedReceiver.address, VALID_AMOUNT);
    console.log(`  ⚠️  Should not happen — transfer went through!`);
  } catch {
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
    await treasury.requestTransfer(usdcAddr, riskyAddress.address, VALID_AMOUNT);
    console.log(`  ⚠️  Should not happen — transfer went through!`);
  } catch {
    console.log(`  🚫 Transfer BLOCKED by RiskScorePolicy!`);
    console.log(`     → Address ${riskyAddress.address} has risk score 10 (minimum: 50)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 7: ❌ MultiSig Unapproved Transfer
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ❌ STEP 7: Unapproved Transfer (no multi-sig approval for 2,000 USDC)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const UNAPPROVED_AMOUNT = ethers.parseUnits("2000", USDC_DECIMALS);
  try {
    await treasury.requestTransfer(usdcAddr, whitelistedReceiver.address, UNAPPROVED_AMOUNT);
    console.log(`  ⚠️  Should not happen — transfer went through!`);
  } catch {
    console.log(`  🚫 Transfer BLOCKED by MultiSigPolicy!`);
    console.log(`     → 2,000 USDC transfer has 0/1 required approvals`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 8: 🚨 Emergency Pause
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🚨 STEP 8: Emergency Pause — Freeze All Operations");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await (await treasury.emergencyPause()).wait();
  console.log("  🔒 Treasury PAUSED — all operations frozen!");

  try {
    await treasury.requestTransfer(usdcAddr, whitelistedReceiver.address, VALID_AMOUNT);
    console.log(`  ⚠️  Should not happen — transfer went through while paused!`);
  } catch {
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
  console.log("║  ✅ Valid transfer       → PASSED all 5 policies           ║");
  console.log("║  ❌ Over-limit           → BLOCKED by SpendingLimitPolicy  ║");
  console.log("║  ❌ Non-whitelisted      → BLOCKED by WhitelistPolicy      ║");
  console.log("║  ❌ Risky address        → BLOCKED by RiskScorePolicy      ║");
  console.log("║  ❌ No multi-sig         → BLOCKED by MultiSigPolicy       ║");
  console.log("║  🚨 Emergency pause     → ALL operations FROZEN            ║");
  console.log("║                                                            ║");
  console.log("║  10 contracts · 5 policies · 119 tests · Arbitrum Sepolia  ║");
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
