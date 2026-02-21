import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Querying live contracts on Arbitrum Sepolia...\n");

  const pe = await ethers.getContractAt("PolicyEngine", "0x3280d347389d68ebf628dAd21f1E5FBEeD20E39F");
  console.log("📦 PolicyEngine:");
  console.log("   Total Vaults:", (await pe.totalVaults()).toString());
  console.log("   Total Txs Validated:", (await pe.totalTransactionsValidated()).toString());
  console.log("   Paused:", await pe.paused());

  const treasuryAddr = "0xb0F7E000A6052eEf0e909e4Af73FD77D95B4e76C";
  const policies = await pe.getVaultPolicies(treasuryAddr);
  console.log("   Treasury Policies:", policies.length);

  const fw = await ethers.getContractAt("TreasuryFirewall", "0x00AE3a51149CF9256cC0fd3b1b1eC1c3D60728cc");
  console.log("\n🛡 TreasuryFirewall:");
  console.log("   Total Screened:", (await fw.totalScreened()).toString());
  console.log("   Treasury Authorized:", await fw.isVaultAuthorized(treasuryAddr));

  const usdc = await ethers.getContractAt("MockUSDC", "0x00a4D929e1FB4B34c2F11977bdCD5E9989Bd79aE");
  const [deployer] = await ethers.getSigners();
  const bal = await usdc.balanceOf(await deployer.getAddress());
  console.log("\n💰 MockUSDC:");
  console.log("   Symbol:", await usdc.symbol());
  console.log("   Deployer Balance:", ethers.formatUnits(bal, 6), "USDC");

  const reg = await ethers.getContractAt("PolicyRegistry", "0x834e5b85d4C3ed0E1E3C5fe46eb97f5B962D956D");
  console.log("\n📋 PolicyRegistry:");
  console.log("   Approved Policies:", (await reg.getPolicyCount()).toString());

  console.log("\n✅ All contracts operational on Arbitrum Sepolia!");
}

main().catch(console.error);
