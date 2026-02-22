import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Initializing Stylus SpendingLimit with:", signer.address);

  const stylus = new ethers.Contract("0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e", [
    "function initialize(address engine, uint256 dailyLimit, uint256 maxTxAmount) external",
    "function owner() view returns (address)",
    "function policyEngineAddress() view returns (address)",
    "function defaultDailyLimit() view returns (uint256)",
    "function defaultMaxTxAmount() view returns (uint256)",
    "function getDailyLimit(address vault) view returns (uint256)",
    "function validate(address vault, address token, address to, uint256 amount) view returns (bool)",
  ], signer);

  const POLICY_ENGINE = "0x245118Fba999F1ed338174933f83bdD6e08327D9";
  const dailyLimit = ethers.parseUnits("10000", 6);  // 10,000 USDC
  const maxTxAmount = ethers.parseUnits("5000", 6);  // 5,000 USDC

  console.log("Calling initialize...");
  try {
    const tx = await stylus.initialize(POLICY_ENGINE, dailyLimit, maxTxAmount);
    await tx.wait();
    console.log("✅ Initialized!");
  } catch(e: any) {
    console.log("Initialize error:", e.message?.slice(0,150));
  }

  // Verify
  try { console.log("Owner:", await stylus.owner()); } catch(e: any) { console.log("owner error:", e.message?.slice(0,80)); }
  try { console.log("Policy Engine:", await stylus.policyEngineAddress()); } catch(e: any) { console.log("PE error:", e.message?.slice(0,80)); }
  try { console.log("Default daily limit:", ethers.formatUnits(await stylus.defaultDailyLimit(), 6), "USDC"); } catch(e: any) { console.log("DL error:", e.message?.slice(0,80)); }
  try { console.log("Default max tx:", ethers.formatUnits(await stylus.defaultMaxTxAmount(), 6), "USDC"); } catch(e: any) { console.log("MT error:", e.message?.slice(0,80)); }

  // Test validate
  const treasury = "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E";
  const usdc = "0xee71e4d5b0D6588FFdf5713f9791eD63e66Ee1e9";
  try {
    const result = await stylus.validate(treasury, usdc, signer.address, ethers.parseUnits("100", 6));
    console.log("validate(100 USDC):", result);
  } catch(e: any) { console.log("validate error:", e.message?.slice(0,150)); }
}

main().catch(console.error);
