/**
 * On-chain Policy Upgrade Script
 * 
 * 1. Swap SpendingLimitPolicy: Remove Solidity → Add Stylus (vault uses WASM)
 * 2. MultiSig: Add deployer as explicit signer + set requiredApprovals = 2
 * 
 * Run: npx hardhat run scripts/upgrade-policies.ts --network arbitrumSepolia
 */

import { ethers } from "hardhat";

// ── Addresses ──────────────────────────────────────────────────
const POLICY_ENGINE = "0x245118Fba999F1ed338174933f83bdD6e08327D9";
const TREASURY = "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E";

const SOLIDITY_SPENDING_LIMIT = "0x17580a550087C55CF68AD9Cc19F56862d8F35AEf";
const STYLUS_SPENDING_LIMIT = "0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e";

const MULTISIG_POLICY = "0x88010789fF9109A00912F9a9a62414D819ffc624";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ── PolicyEngine contract ──────────────────────────────────
  const pe = new ethers.Contract(POLICY_ENGINE, [
    "function addPolicy(address vault, address policy) external",
    "function removePolicy(address vault, address policy) external",
    "function getVaultPolicies(address vault) view returns (address[])",
  ], deployer);

  // ── Step 1: Check current policies ─────────────────────────
  console.log("=== Current Vault Policies ===");
  const currentPolicies: string[] = await pe.getVaultPolicies(TREASURY);
  for (const p of currentPolicies) {
    const label = p.toLowerCase() === SOLIDITY_SPENDING_LIMIT.toLowerCase() ? " (Solidity SpendingLimit)" :
                  p.toLowerCase() === STYLUS_SPENDING_LIMIT.toLowerCase() ? " (Stylus SpendingLimit)" : "";
    console.log(`  ${p}${label}`);
  }

  // ── Step 2: Swap SpendingLimit — Solidity → Stylus ─────────
  const hasSolidity = currentPolicies.some(p => p.toLowerCase() === SOLIDITY_SPENDING_LIMIT.toLowerCase());
  const hasStylus = currentPolicies.some(p => p.toLowerCase() === STYLUS_SPENDING_LIMIT.toLowerCase());

  if (hasSolidity) {
    console.log("\n🔄 Removing Solidity SpendingLimitPolicy...");
    const tx1 = await pe.removePolicy(TREASURY, SOLIDITY_SPENDING_LIMIT);
    await tx1.wait();
    console.log("   ✅ Removed:", SOLIDITY_SPENDING_LIMIT);
  }

  if (!hasStylus) {
    console.log("🔄 Adding Stylus SpendingLimitPolicy...");
    const tx2 = await pe.addPolicy(TREASURY, STYLUS_SPENDING_LIMIT);
    await tx2.wait();
    console.log("   ✅ Added:", STYLUS_SPENDING_LIMIT);
  } else {
    console.log("   Stylus SpendingLimit already active ✓");
  }

  // ── Step 3: Configure Stylus SpendingLimit ─────────────────
  // Set same limits as Solidity version: dailyLimit=10000, maxPerTx=5000
  console.log("\n🔧 Configuring Stylus SpendingLimit...");
  const stylusPolicy = new ethers.Contract(STYLUS_SPENDING_LIMIT, [
    "function setDailyLimit(address vault, uint256 limit) external",
    "function setMaxPerTransaction(address vault, uint256 maxTx) external",
    "function getDailyLimit(address vault) view returns (uint256)",
    "function getMaxPerTransaction(address vault) view returns (uint256)",
  ], deployer);

  try {
    const dailyLimit = ethers.parseUnits("10000", 6); // 10,000 USDC
    const maxPerTx = ethers.parseUnits("5000", 6);    // 5,000 USDC

    const tx3 = await stylusPolicy.setDailyLimit(TREASURY, dailyLimit);
    await tx3.wait();
    console.log("   ✅ Daily limit: 10,000 USDC");

    const tx4 = await stylusPolicy.setMaxPerTransaction(TREASURY, maxPerTx);
    await tx4.wait();
    console.log("   ✅ Max per tx: 5,000 USDC");
  } catch (err: any) {
    console.log("   ⚠️ Stylus config skipped (may need different ABI):", err.message?.slice(0, 80));
  }

  // ── Step 4: MultiSig — ensure deployer is signer ──────────
  console.log("\n=== MultiSig Configuration ===");
  const ms = new ethers.Contract(MULTISIG_POLICY, [
    "function getSigners() view returns (address[])",
    "function requiredApprovals() view returns (uint256)",
    "function isSigner(address) view returns (bool)",
    "function addSigner(address signer) external",
    "function setRequiredApprovals(uint256) external",
  ], deployer);

  const signersBefore: string[] = await ms.getSigners();
  const reqBefore = await ms.requiredApprovals();
  console.log("  Signers:", signersBefore.length, signersBefore.map(s => s.slice(0, 10) + "..."));
  console.log("  Required:", reqBefore.toString());

  // Add deployer if not already signer
  const deployerIsSigner = await ms.isSigner(deployer.address);
  if (!deployerIsSigner) {
    console.log("🔄 Adding deployer as signer...");
    const tx5 = await ms.addSigner(deployer.address);
    await tx5.wait();
    console.log("   ✅ Deployer added as signer");
  }

  // We need at least 2 signers for requiredApprovals=2
  const signersAfter: string[] = await ms.getSigners();
  if (signersAfter.length >= 2) {
    const currentReq = await ms.requiredApprovals();
    if (Number(currentReq) < 2) {
      console.log("🔄 Setting requiredApprovals = 2...");
      const tx6 = await ms.setRequiredApprovals(2);
      await tx6.wait();
      console.log("   ✅ Required approvals set to 2");
    }
  } else {
    console.log("   ⚠️ Only", signersAfter.length, "signer(s) — need ≥2 for threshold=2");
    console.log("   Keeping requiredApprovals =", (await ms.requiredApprovals()).toString());
  }

  // ── Step 5: Verify final state ─────────────────────────────
  console.log("\n=== Final Vault Policies ===");
  const finalPolicies: string[] = await pe.getVaultPolicies(TREASURY);
  for (const p of finalPolicies) {
    const label = p.toLowerCase() === SOLIDITY_SPENDING_LIMIT.toLowerCase() ? " (Solidity SpendingLimit)" :
                  p.toLowerCase() === STYLUS_SPENDING_LIMIT.toLowerCase() ? " (Stylus SpendingLimit ⚡)" : "";
    console.log(`  ${p}${label}`);
  }

  const finalSigners: string[] = await ms.getSigners();
  const finalReq = await ms.requiredApprovals();
  console.log("\n=== Final MultiSig State ===");
  console.log("  Signers:", finalSigners.length);
  for (const s of finalSigners) {
    console.log(`    ${s}`);
  }
  console.log("  Required approvals:", finalReq.toString());

  console.log("\n🎉 Upgrade complete!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
