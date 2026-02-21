import { ethers } from "hardhat";

/**
 * FortiLayer — OracleRiskScorePolicy Deployment Script
 *
 * Deploys OracleRiskScorePolicy with REAL Chainlink ETH/USD feed on Arbitrum Sepolia.
 * Feed address: 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🔮 FortiLayer — OracleRiskScorePolicy Deployment");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Network:  ${(await ethers.provider.getNetwork()).name}`);
  console.log(`  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("══════════════════════════════════════════════════════════\n");

  // ─── Configuration ─────────────────────────────────────────────────────
  const POLICY_ENGINE = "0x245118Fba999F1ed338174933f83bdD6e08327D9";
  const CHAINLINK_ETH_USD = "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165";
  const MIN_THRESHOLD = 50;        // Minimum risk score to pass
  const DEFAULT_SCORE = 75;        // Default score for unknown addresses
  const STALENESS_THRESHOLD = 86400; // 1 day oracle staleness limit

  // ─── Deploy OracleRiskScorePolicy ──────────────────────────────────────
  console.log("📦 Deploying OracleRiskScorePolicy...");
  console.log(`   Chainlink ETH/USD: ${CHAINLINK_ETH_USD}`);
  console.log(`   PolicyEngine:      ${POLICY_ENGINE}`);
  console.log(`   Min Threshold:     ${MIN_THRESHOLD}`);
  console.log(`   Default Score:     ${DEFAULT_SCORE}`);
  console.log(`   Staleness:         ${STALENESS_THRESHOLD}s (1 day)`);

  const OracleRiskScorePolicy = await ethers.getContractFactory("OracleRiskScorePolicy");
  const oracle = await OracleRiskScorePolicy.deploy(
    POLICY_ENGINE,
    CHAINLINK_ETH_USD,
    MIN_THRESHOLD,
    DEFAULT_SCORE,
    STALENESS_THRESHOLD
  );
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();

  console.log(`\n   ✅ OracleRiskScorePolicy deployed to: ${oracleAddr}`);

  // ─── Read anchor price ─────────────────────────────────────────────────
  const anchorPrice = await oracle.anchorPrice();
  console.log(`   📊 Anchor price set: $${Number(anchorPrice) / 1e8}`);
  console.log(`   🔗 Oracle enabled: ${await oracle.oracleEnabled()}`);

  // ─── Verification args ─────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Verify command:");
  console.log(`  npx hardhat verify --network arbitrumSepolia ${oracleAddr} \\`);
  console.log(`    ${POLICY_ENGINE} \\`);
  console.log(`    ${CHAINLINK_ETH_USD} \\`);
  console.log(`    ${MIN_THRESHOLD} \\`);
  console.log(`    ${DEFAULT_SCORE} \\`);
  console.log(`    ${STALENESS_THRESHOLD}`);
  console.log("══════════════════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
