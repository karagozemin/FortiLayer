import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  const ms = await ethers.getContractAt("MultiSigPolicy", "0x88010789fF9109A00912F9a9a62414D819ffc624", deployer);
  
  console.log("Current requiredApprovals:", (await ms.requiredApprovals()).toString());
  console.log("Setting to 1...");
  
  const tx = await ms.setRequiredApprovals(1);
  await tx.wait();
  
  console.log("✅ New requiredApprovals:", (await ms.requiredApprovals()).toString());
}

main().catch(console.error);
