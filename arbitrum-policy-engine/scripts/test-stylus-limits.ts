import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  
  const stylus = new ethers.Contract("0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e", [
    "function validate(address vault, address token, address to, uint256 amount) view returns (bool)",
  ], signer);

  const treasury = "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E";
  const usdc = "0xee71e4d5b0D6588FFdf5713f9791eD63e66Ee1e9";
  const to = "0x0cb8C5b1760AAeeef35c1a32b89F3b1f8CA21D9F";

  console.log("=== Stylus SpendingLimit — Limit Breach Test ===\n");

  // Test 1: 100 USDC (well within limits)
  try {
    const r = await stylus.validate(treasury, usdc, to, ethers.parseUnits("100", 6));
    console.log("✅ 100 USDC   → PASS (validate returned:", r, ")");
  } catch(e: any) { console.log("❌ 100 USDC   → ERROR:", e.message?.slice(0,120)); }

  // Test 2: 4999 USDC (just under 5000 max-per-tx)
  try {
    const r = await stylus.validate(treasury, usdc, to, ethers.parseUnits("4999", 6));
    console.log("✅ 4999 USDC  → PASS (validate returned:", r, ")");
  } catch(e: any) { console.log("❌ 4999 USDC  → ERROR:", e.message?.slice(0,120)); }

  // Test 3: 5001 USDC (over max-per-tx limit of 5000)
  try {
    const r = await stylus.validate(treasury, usdc, to, ethers.parseUnits("5001", 6));
    console.log("⚠️  5001 USDC  → UNEXPECTED PASS:", r);
  } catch(e: any) { console.log("🛑 5001 USDC  → BLOCKED (over max-per-tx):", e.message?.slice(0,120)); }

  // Test 4: 10001 USDC (over daily limit of 10000)
  try {
    const r = await stylus.validate(treasury, usdc, to, ethers.parseUnits("10001", 6));
    console.log("⚠️  10001 USDC → UNEXPECTED PASS:", r);
  } catch(e: any) { console.log("🛑 10001 USDC → BLOCKED (over daily limit):", e.message?.slice(0,120)); }

  console.log("\nDone.");
}

main().catch(console.error);
