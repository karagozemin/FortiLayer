import { ethers } from "hardhat";

/**
 * FortiLayer — Live Contract Status Query
 *
 * Reads the current state of all deployed contracts on Arbitrum Sepolia.
 * Run: npx hardhat run scripts/status.ts --network arbitrumSepolia
 */

// ── Current Deployed Addresses (Arbitrum Sepolia) ──────────────
const ADDRESSES = {
  policyEngine:       "0x245118Fba999F1ed338174933f83bdD6e08327D9",
  treasuryFirewall:   "0xE3Be337BdC98Af11D3C8bcaB9149356Ac013EE98",
  policyRegistry:     "0x5f36947d6d829616bAd785Be7eCb13cf9370DAff",
  spendingLimitPolicy:"0x17580a550087C55CF68AD9Cc19F56862d8F35AEf",
  whitelistPolicy:    "0x1EdaAD6c6F5C8d5fb901e83f73b3BD0D29d2d6df",
  timelockPolicy:     "0xa9BB981a309DEf9b74A390f2170fE56C2085062d",
  riskScorePolicy:    "0x54305829743e301ebF8D868037B4081c90848924",
  multiSigPolicy:     "0x1bA1BAC217cB0EeC50CCA40A4d83FAE9602c6244",
  mockUSDC:           "0xee71e4d5b0D6588FFdf5713f9791eD63e66Ee1e9",
  treasury:           "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E",
};

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🛡  FortiLayer — Live Status");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Querier:  ${deployer.address}`);
  console.log(`  Network:  Arbitrum Sepolia`);
  console.log("══════════════════════════════════════════════════════════\n");

  // PolicyEngine
  const pe = await ethers.getContractAt("PolicyEngine", ADDRESSES.policyEngine);
  const totalVaults = await pe.totalVaults();
  const totalValidated = await pe.totalTransactionsValidated();
  const pePaused = await pe.paused();
  const policies = await pe.getVaultPolicies(ADDRESSES.treasury);

  console.log("📦 PolicyEngine:", ADDRESSES.policyEngine);
  console.log(`   Total Vaults:          ${totalVaults}`);
  console.log(`   Total Txs Validated:   ${totalValidated}`);
  console.log(`   Paused:                ${pePaused}`);
  console.log(`   Treasury Policies:     ${policies.length}`);
  for (const p of policies) {
    try {
      const policy = await ethers.getContractAt("BasePolicy", p);
      const name = await policy.policyName();
      console.log(`     → ${name}: ${p}`);
    } catch {
      console.log(`     → Unknown: ${p}`);
    }
  }

  // TreasuryFirewall
  const fw = await ethers.getContractAt("TreasuryFirewall", ADDRESSES.treasuryFirewall);
  const screened = await fw.totalScreened();
  const passed = await fw.totalPassed();
  const blocked = await fw.totalBlocked();
  const fwPaused = await fw.paused();
  const vaultAuth = await fw.isVaultAuthorized(ADDRESSES.treasury);

  console.log("\n🛡  TreasuryFirewall:", ADDRESSES.treasuryFirewall);
  console.log(`   Total Screened:        ${screened}`);
  console.log(`   Passed:                ${passed}`);
  console.log(`   Blocked:               ${blocked}`);
  console.log(`   Paused:                ${fwPaused}`);
  console.log(`   Treasury Authorized:   ${vaultAuth}`);

  // PolicyRegistry
  const reg = await ethers.getContractAt("PolicyRegistry", ADDRESSES.policyRegistry);
  const policyCount = await reg.getPolicyCount();
  console.log("\n📋 PolicyRegistry:", ADDRESSES.policyRegistry);
  console.log(`   Registered Policies:   ${policyCount}`);

  // MockUSDC
  const usdc = await ethers.getContractAt("MockUSDC", ADDRESSES.mockUSDC);
  const treasuryBal = await usdc.balanceOf(ADDRESSES.treasury);
  const deployerBal = await usdc.balanceOf(deployer.address);

  console.log("\n💰 MockUSDC:", ADDRESSES.mockUSDC);
  console.log(`   Treasury Balance:      ${ethers.formatUnits(treasuryBal, 6)} USDC`);
  console.log(`   Deployer Balance:      ${ethers.formatUnits(deployerBal, 6)} USDC`);

  // Treasury
  const treasury = await ethers.getContractAt("Treasury", ADDRESSES.treasury);
  const tPaused = await treasury.paused();
  const totalExecuted = await treasury.totalTransfersExecuted();

  console.log("\n🏦 Treasury:", ADDRESSES.treasury);
  console.log(`   Paused:                ${tPaused}`);
  console.log(`   Total Executed:        ${totalExecuted}`);

  // Summary
  const passRate = Number(screened) > 0 ? ((Number(passed) / Number(screened)) * 100).toFixed(1) : "100.0";

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  System:     ${!pePaused && !fwPaused && !tPaused ? '✅ OPERATIONAL' : '⚠️  DEGRADED'}`);
  console.log(`  Policies:   ${policies.length} active on vault`);
  console.log(`  Pass Rate:  ${passRate}%`);
  console.log(`  Treasury:   ${ethers.formatUnits(treasuryBal, 6)} USDC`);
  console.log("══════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
