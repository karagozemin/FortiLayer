import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Configuring Stylus SpendingLimit with:", signer.address);

  const stylus = new ethers.Contract("0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e", [
    "function setVaultDailyLimit(address vault, uint256 limit) external",
    "function setVaultMaxTxAmount(address vault, uint256 maxAmount) external",
    "function getDailyLimit(address vault) view returns (uint256)",
    "function getMaxTxAmount(address vault) view returns (uint256)",
    "function defaultDailyLimit() view returns (uint256)",
    "function defaultMaxTxAmount() view returns (uint256)",
  ], signer);

  const treasury = "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E";

  // Read current state
  try {
    const dl = await stylus.defaultDailyLimit();
    const mt = await stylus.defaultMaxTxAmount();
    console.log("Default daily limit:", ethers.formatUnits(dl, 6), "USDC");
    console.log("Default max tx:", ethers.formatUnits(mt, 6), "USDC");
  } catch(e: any) { console.log("Defaults read:", e.message?.slice(0,100)); }

  try {
    const vdl = await stylus.getDailyLimit(treasury);
    const vmt = await stylus.getMaxTxAmount(treasury);
    console.log("Vault daily limit:", ethers.formatUnits(vdl, 6), "USDC");
    console.log("Vault max tx:", ethers.formatUnits(vmt, 6), "USDC");
  } catch(e: any) { console.log("Vault read:", e.message?.slice(0,100)); }

  // Set vault limits
  try {
    const dailyLimit = ethers.parseUnits("10000", 6);
    console.log("Setting vault daily limit to 10,000 USDC...");
    const tx1 = await stylus.setVaultDailyLimit(treasury, dailyLimit);
    await tx1.wait();
    console.log("✅ Done");
  } catch(e: any) { console.log("Set daily limit:", e.message?.slice(0,120)); }

  try {
    const maxTx = ethers.parseUnits("5000", 6);
    console.log("Setting vault max tx to 5,000 USDC...");
    const tx2 = await stylus.setVaultMaxTxAmount(treasury, maxTx);
    await tx2.wait();
    console.log("✅ Done");
  } catch(e: any) { console.log("Set max tx:", e.message?.slice(0,120)); }

  // Verify
  try {
    const vdl = await stylus.getDailyLimit(treasury);
    const vmt = await stylus.getMaxTxAmount(treasury);
    console.log("\nFinal vault daily limit:", ethers.formatUnits(vdl, 6), "USDC");
    console.log("Final vault max tx:", ethers.formatUnits(vmt, 6), "USDC");
  } catch(e: any) { console.log("Final read:", e.message?.slice(0,100)); }
}

main().catch(console.error);
