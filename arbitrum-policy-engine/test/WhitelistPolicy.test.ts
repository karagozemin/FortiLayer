import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * WhitelistPolicy — Comprehensive Test Suite
 */
describe("WhitelistPolicy", function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const WhitelistPolicy = await ethers.getContractFactory("WhitelistPolicy");
    const policy = await WhitelistPolicy.deploy(await engine.getAddress());
    await policy.waitForDeployment();

    const vault = ethers.Wallet.createRandom().address;
    const token = ethers.Wallet.createRandom().address;
    const whitelisted = ethers.Wallet.createRandom().address;
    const notWhitelisted = ethers.Wallet.createRandom().address;

    return { engine, policy, owner, otherUser, vault, token, whitelisted, notWhitelisted };
  }

  describe("Deployment", function () {
    it("should set correct policy name", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.policyName()).to.equal("WhitelistPolicy");
    });
  });

  describe("Validation", function () {
    it("should pass for whitelisted recipient", async function () {
      const { policy, owner, vault, token, whitelisted } = await loadFixture(deployFixture);

      await policy.connect(owner).addToVaultWhitelist(vault, whitelisted);
      expect(await policy.validate(vault, token, whitelisted, 1000)).to.be.true;
    });

    it("should revert for non-whitelisted recipient", async function () {
      const { policy, vault, token, notWhitelisted } = await loadFixture(deployFixture);

      await expect(policy.validate(vault, token, notWhitelisted, 1000))
        .to.be.revertedWithCustomError(policy, "RecipientNotWhitelisted");
    });

    it("should pass for globally whitelisted address", async function () {
      const { policy, owner, vault, token, whitelisted } = await loadFixture(deployFixture);

      await policy.connect(owner).addToGlobalWhitelist(whitelisted);
      expect(await policy.validate(vault, token, whitelisted, 1000)).to.be.true;
    });
  });

  describe("Vault Whitelist Management", function () {
    it("should add address to vault whitelist", async function () {
      const { policy, owner, vault, whitelisted } = await loadFixture(deployFixture);

      await expect(policy.connect(owner).addToVaultWhitelist(vault, whitelisted))
        .to.emit(policy, "AddressWhitelisted")
        .withArgs(vault, whitelisted);

      expect(await policy.isWhitelisted(vault, whitelisted)).to.be.true;
    });

    it("should remove address from vault whitelist", async function () {
      const { policy, owner, vault, whitelisted } = await loadFixture(deployFixture);

      await policy.connect(owner).addToVaultWhitelist(vault, whitelisted);
      await policy.connect(owner).removeFromVaultWhitelist(vault, whitelisted);

      expect(await policy.isWhitelisted(vault, whitelisted)).to.be.false;
    });

    it("should batch-add addresses", async function () {
      const { policy, owner, vault } = await loadFixture(deployFixture);
      const addresses = [
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address,
      ];

      await policy.connect(owner).batchAddToVaultWhitelist(vault, addresses);

      for (const addr of addresses) {
        expect(await policy.isWhitelisted(vault, addr)).to.be.true;
      }
    });

    it("should revert when adding zero address", async function () {
      const { policy, owner, vault } = await loadFixture(deployFixture);

      await expect(
        policy.connect(owner).addToVaultWhitelist(vault, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(policy, "ZeroAddress");
    });

    it("should revert when non-owner manages whitelist", async function () {
      const { policy, otherUser, vault, whitelisted } = await loadFixture(deployFixture);

      await expect(
        policy.connect(otherUser).addToVaultWhitelist(vault, whitelisted)
      ).to.be.revertedWithCustomError(policy, "OnlyOwner");
    });
  });

  describe("Global Whitelist", function () {
    it("should add to global whitelist", async function () {
      const { policy, owner, whitelisted } = await loadFixture(deployFixture);

      await expect(policy.connect(owner).addToGlobalWhitelist(whitelisted))
        .to.emit(policy, "GlobalAddressWhitelisted")
        .withArgs(whitelisted);

      expect(await policy.isGloballyWhitelisted(whitelisted)).to.be.true;
    });

    it("should remove from global whitelist", async function () {
      const { policy, owner, whitelisted } = await loadFixture(deployFixture);

      await policy.connect(owner).addToGlobalWhitelist(whitelisted);
      await policy.connect(owner).removeFromGlobalWhitelist(whitelisted);

      expect(await policy.isGloballyWhitelisted(whitelisted)).to.be.false;
    });
  });

  describe("View Functions", function () {
    it("should return vault whitelist array", async function () {
      const { policy, owner, vault, whitelisted } = await loadFixture(deployFixture);

      await policy.connect(owner).addToVaultWhitelist(vault, whitelisted);
      const list = await policy.getVaultWhitelist(vault);

      expect(list).to.include(whitelisted);
    });
  });
});
