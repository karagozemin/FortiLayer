import { ethers } from "hardhat";

async function main() {
  const vault = "0x9BcF0E126b82C8E7cC5151C77025b052732eC52E";
  
  // Whitelist
  const wl = await ethers.getContractAt("WhitelistPolicy", "0x1EdaAD6c6F5C8d5fb901e83f73b3BD0D29d2d6df");
  const list = await wl.getVaultWhitelist(vault);
  console.log("=== WhitelistPolicy ===");
  console.log("Whitelisted addresses:", list.length);
  for (const a of list) console.log("  ", a);

  // MultiSig
  const ms = await ethers.getContractAt("MultiSigPolicy", "0x88010789fF9109A00912F9a9a62414D819ffc624");
  const req = await ms.requiredApprovals();
  const signers = await ms.getSigners();
  console.log("\n=== MultiSigPolicy ===");
  console.log("Required:", req.toString(), "of", signers.length);
  for (const s of signers) console.log("  Signer:", s);
  
  // Check if 0x0cb8... is a signer
  const testAddr = "0x0cb8C5b1760AAeeef35c1a32b89F3b1f8CA21D9F";
  const isSigner = signers.some((s: string) => s.toLowerCase() === testAddr.toLowerCase());
  console.log(`\n${testAddr} is signer: ${isSigner}`);
}

main().catch(console.error);
