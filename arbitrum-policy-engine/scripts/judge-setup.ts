/**
 * Judge Demo Setup — Makes the system accessible for any wallet
 * 
 * Removes MultiSigPolicy from vault so judges don't need to be
 * pre-registered signers. Keeps 4 policies active for full demo.
 * 
 * Run: npx hardhat run scripts/judge-setup.ts --network arbitrumSepolia
 */

import { ethers } from "hardhat";

const POLICY_ENGINE   = "0x245118Fba999F1ed338174933f83bdD6e08327D9";
const TREASURY        = "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E";
const MULTISIG_POLICY = "0x88010789fF9109A00912F9a9a62414D819ffc624";
const WHITELIST       = "0x1EdaAD6c6F5C8d5fb901e83f73b3BD0D29d2d6df";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Demo setup with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const pe = await ethers.getContractAt("PolicyEngine", POLICY_ENGINE, deployer);
  const wl = await ethers.getContractAt("WhitelistPolicy", WHITELIST, deployer);

  // ── Step 1: Remove MultiSig from vault ────────────────────
  const currentPolicies: string[] = await pe.getVaultPolicies(TREASURY);
  console.log("=== Current Vault Policies ===");
  for (const p of currentPolicies) {
    const label = p.toLowerCase() === MULTISIG_POLICY.toLowerCase() ? " ← REMOVING" : "";
    console.log(`  ${p}${label}`);
  }

  const hasMS = currentPolicies.some(p => p.toLowerCase() === MULTISIG_POLICY.toLowerCase());
  if (hasMS) {
    console.log("\n🔄 Removing MultiSigPolicy from vault...");
    const tx1 = await pe.removePolicy(TREASURY, MULTISIG_POLICY);
    await tx1.wait();
    console.log("   ✅ Removed — judges don't need to be pre-registered signers");
  } else {
    console.log("\n✅ MultiSigPolicy already removed");
  }

  // ── Step 2: Verify remaining policies ─────────────────────
  const updated: string[] = await pe.getVaultPolicies(TREASURY);
  console.log("\n=== Active Vault Policies ===");
  for (const p of updated) console.log(`  ✓ ${p}`);
  console.log(`  Total: ${updated.length} policies active`);

  // ── Step 3: Show whitelist ────────────────────────────────
  const whitelisted = await wl.getVaultWhitelist(TREASURY);
  console.log("\n=== Whitelisted Addresses ===");
  for (const a of whitelisted) console.log(`  ${a}`);

  console.log("\n✅ Demo ready — any wallet can:");
  console.log("   1. Mint test USDC");
  console.log("   2. Deposit to Treasury");
  console.log("   3. Transfer to a whitelisted address");
  console.log("   4. See SpendingLimit / Whitelist / Timelock / RiskScore enforcement");
}

main().catch(console.error);
