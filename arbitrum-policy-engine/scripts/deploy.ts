import { ethers } from "hardhat";

/**
 * FortiLayer — Full Deployment Script
 *
 * Deploys the entire FortiLayer infrastructure:
 * 1. PolicyEngine (core validation orchestrator)
 * 2. TreasuryFirewall (execution control layer)
 * 3. PolicyRegistry (approved policy whitelist)
 * 4. Policy Modules (SpendingLimit, Whitelist, Timelock, RiskScore)
 * 5. MockUSDC (for demo/testing)
 * 6. Treasury (institutional vault)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🛡  FortiLayer — Deployment Script");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Network:  ${(await ethers.provider.getNetwork()).name}`);
  console.log(`  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("══════════════════════════════════════════════════════════\n");

  // ─── 1. Deploy PolicyEngine ────────────────────────────────────────────
  console.log("📦 Deploying PolicyEngine...");
  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy();
  await policyEngine.waitForDeployment();
  const policyEngineAddr = await policyEngine.getAddress();
  console.log(`   ✅ PolicyEngine deployed to: ${policyEngineAddr}`);

  // ─── 2. Deploy TreasuryFirewall ────────────────────────────────────────
  console.log("📦 Deploying TreasuryFirewall...");
  const TreasuryFirewall = await ethers.getContractFactory("TreasuryFirewall");
  const firewall = await TreasuryFirewall.deploy(policyEngineAddr);
  await firewall.waitForDeployment();
  const firewallAddr = await firewall.getAddress();
  console.log(`   ✅ TreasuryFirewall deployed to: ${firewallAddr}`);

  // ─── 3. Deploy PolicyRegistry ──────────────────────────────────────────
  console.log("📦 Deploying PolicyRegistry...");
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const registry = await PolicyRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`   ✅ PolicyRegistry deployed to: ${registryAddr}`);

  // ─── 4. Deploy Policy Modules ──────────────────────────────────────────
  const USDC_DECIMALS = 6;
  const DAILY_LIMIT = ethers.parseUnits("10000", USDC_DECIMALS);   // 10,000 USDC/day
  const MAX_TX_AMOUNT = ethers.parseUnits("5000", USDC_DECIMALS);  // 5,000 USDC per tx
  const TIMELOCK_DURATION = 3600; // 1 hour
  const MIN_RISK_SCORE = 50;     // Minimum risk score (0-100)
  const DEFAULT_RISK_SCORE = 75; // Default score for unknown addresses

  console.log("📦 Deploying SpendingLimitPolicy...");
  const SpendingLimitPolicy = await ethers.getContractFactory("SpendingLimitPolicy");
  const spendingLimit = await SpendingLimitPolicy.deploy(policyEngineAddr, DAILY_LIMIT, MAX_TX_AMOUNT);
  await spendingLimit.waitForDeployment();
  const spendingLimitAddr = await spendingLimit.getAddress();
  console.log(`   ✅ SpendingLimitPolicy deployed to: ${spendingLimitAddr}`);

  console.log("📦 Deploying WhitelistPolicy...");
  const WhitelistPolicy = await ethers.getContractFactory("WhitelistPolicy");
  const whitelist = await WhitelistPolicy.deploy(policyEngineAddr);
  await whitelist.waitForDeployment();
  const whitelistAddr = await whitelist.getAddress();
  console.log(`   ✅ WhitelistPolicy deployed to: ${whitelistAddr}`);

  console.log("📦 Deploying TimelockPolicy...");
  const TimelockPolicy = await ethers.getContractFactory("TimelockPolicy");
  const timelock = await TimelockPolicy.deploy(policyEngineAddr, TIMELOCK_DURATION);
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();
  console.log(`   ✅ TimelockPolicy deployed to: ${timelockAddr}`);

  console.log("📦 Deploying RiskScorePolicy...");
  const RiskScorePolicy = await ethers.getContractFactory("RiskScorePolicy");
  const riskScore = await RiskScorePolicy.deploy(policyEngineAddr, MIN_RISK_SCORE, DEFAULT_RISK_SCORE);
  await riskScore.waitForDeployment();
  const riskScoreAddr = await riskScore.getAddress();
  console.log(`   ✅ RiskScorePolicy deployed to: ${riskScoreAddr}`);

  // ─── 5. Deploy MockUSDC ────────────────────────────────────────────────
  console.log("📦 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log(`   ✅ MockUSDC deployed to: ${usdcAddr}`);

  // ─── 6. Deploy Treasury ────────────────────────────────────────────────
  console.log("📦 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(firewallAddr);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`   ✅ Treasury deployed to: ${treasuryAddr}`);

  // ─── 7. Configuration ─────────────────────────────────────────────────
  console.log("\n🔧 Configuring system...");

  // Authorize treasury in firewall
  console.log("   → Authorizing Treasury in Firewall...");
  await (await firewall.authorizeVault(treasuryAddr)).wait();

  // Register treasury as vault in PolicyEngine
  console.log("   → Registering Treasury vault in PolicyEngine...");
  await (await policyEngine.registerVault(treasuryAddr)).wait();

  // Add policies to the vault
  console.log("   → Adding SpendingLimitPolicy to vault...");
  await (await policyEngine.addPolicy(treasuryAddr, spendingLimitAddr)).wait();

  console.log("   → Adding WhitelistPolicy to vault...");
  await (await policyEngine.addPolicy(treasuryAddr, whitelistAddr)).wait();

  console.log("   → Adding RiskScorePolicy to vault...");
  await (await policyEngine.addPolicy(treasuryAddr, riskScoreAddr)).wait();

  // Register policies in the global registry
  console.log("   → Registering policies in PolicyRegistry...");
  await (await registry.registerPolicy(spendingLimitAddr)).wait();
  await (await registry.registerPolicy(whitelistAddr)).wait();
  await (await registry.registerPolicy(timelockAddr)).wait();
  await (await registry.registerPolicy(riskScoreAddr)).wait();

  console.log("   ✅ Configuration complete!");

  // ─── 8. Summary ───────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🛡  FortiLayer — Deployment Summary");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  PolicyEngine:       ${policyEngineAddr}`);
  console.log(`  TreasuryFirewall:   ${firewallAddr}`);
  console.log(`  PolicyRegistry:     ${registryAddr}`);
  console.log(`  SpendingLimitPolicy:${spendingLimitAddr}`);
  console.log(`  WhitelistPolicy:    ${whitelistAddr}`);
  console.log(`  TimelockPolicy:     ${timelockAddr}`);
  console.log(`  RiskScorePolicy:    ${riskScoreAddr}`);
  console.log(`  MockUSDC:           ${usdcAddr}`);
  console.log(`  Treasury:           ${treasuryAddr}`);
  console.log("══════════════════════════════════════════════════════════");
  console.log("  ✅ Deployment complete! System is ready.");
  console.log("══════════════════════════════════════════════════════════\n");

  return {
    policyEngine: policyEngineAddr,
    firewall: firewallAddr,
    registry: registryAddr,
    spendingLimit: spendingLimitAddr,
    whitelist: whitelistAddr,
    timelock: timelockAddr,
    riskScore: riskScoreAddr,
    usdc: usdcAddr,
    treasury: treasuryAddr,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
