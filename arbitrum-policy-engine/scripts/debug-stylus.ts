import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  
  const stylus = new ethers.Contract("0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e", [
    "function owner() view returns (address)",
    "function getDailyLimit(address vault) view returns (uint256)",
    "function getMaxTxAmount(address vault) view returns (uint256)",
    "function defaultDailyLimit() view returns (uint256)",
    "function defaultMaxTxAmount() view returns (uint256)",
    "function policyName() view returns (string)",
    "function policyEngineAddress() view returns (address)",
    "function setDefaultDailyLimit(uint256 limit) external",
    "function setDefaultMaxTxAmount(uint256 maxAmount) external",
    "function setVaultDailyLimit(address vault, uint256 limit) external",
    "function setVaultMaxTxAmount(address vault, uint256 maxAmount) external",
    "function setPolicyEngine(address engine) external",
    "function transferOwnership(address newOwner) external",
    "function validate(address vault, address token, address to, uint256 amount) view returns (bool)",
  ], signer);

  console.log("Signer:", signer.address);
  
  try { console.log("Owner:", await stylus.owner()); } catch(e: any) { console.log("owner() error:", e.message?.slice(0,100)); }
  try { console.log("Policy name:", await stylus.policyName()); } catch(e: any) { console.log("policyName() error:", e.message?.slice(0,100)); }
  try { console.log("Policy engine:", await stylus.policyEngineAddress()); } catch(e: any) { console.log("policyEngineAddress() error:", e.message?.slice(0,100)); }
  
  const treasury = "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E";
  try {
    console.log("getDailyLimit:", (await stylus.getDailyLimit(treasury)).toString());
    console.log("getMaxTxAmount:", (await stylus.getMaxTxAmount(treasury)).toString());
  } catch(e: any) { console.log("get error:", e.message?.slice(0,100)); }
  
  // Try validate with a test amount
  try {
    const result = await stylus.validate(treasury, "0xee71e4d5b0D6588FFdf5713f9791eD63e66Ee1e9", signer.address, ethers.parseUnits("100", 6));
    console.log("validate(100 USDC):", result);
  } catch(e: any) { console.log("validate error:", e.message?.slice(0,150)); }
}

main().catch(console.error);
