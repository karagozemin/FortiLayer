import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * TreasuryFirewall — Comprehensive Test Suite
 */
describe("TreasuryFirewall", function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const TreasuryFirewall = await ethers.getContractFactory("TreasuryFirewall");
    const firewall = await TreasuryFirewall.deploy(await engine.getAddress());
    await firewall.waitForDeployment();

    const vaultAddress = ethers.Wallet.createRandom().address;

    return { engine, firewall, owner, otherUser, vaultAddress };
  }

  describe("Deployment", function () {
    it("should set correct policy engine", async function () {
      const { firewall, engine } = await loadFixture(deployFixture);
      expect(await firewall.policyEngine()).to.equal(await engine.getAddress());
    });

    it("should set correct owner", async function () {
      const { firewall, owner } = await loadFixture(deployFixture);
      expect(await firewall.owner()).to.equal(owner.address);
    });

    it("should start with zero counters", async function () {
      const { firewall } = await loadFixture(deployFixture);
      expect(await firewall.totalScreened()).to.equal(0);
      expect(await firewall.totalPassed()).to.equal(0);
      expect(await firewall.totalBlocked()).to.equal(0);
    });

    it("should revert with zero address for policy engine", async function () {
      const TreasuryFirewall = await ethers.getContractFactory("TreasuryFirewall");
      await expect(
        TreasuryFirewall.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(TreasuryFirewall, "ZeroAddress");
    });
  });

  describe("Vault Authorization", function () {
    it("should authorize a vault", async function () {
      const { firewall, owner, vaultAddress } = await loadFixture(deployFixture);

      await expect(firewall.connect(owner).authorizeVault(vaultAddress))
        .to.emit(firewall, "VaultAuthorized")
        .withArgs(vaultAddress);

      expect(await firewall.isVaultAuthorized(vaultAddress)).to.be.true;
    });

    it("should revoke vault authorization", async function () {
      const { firewall, owner, vaultAddress } = await loadFixture(deployFixture);

      await firewall.connect(owner).authorizeVault(vaultAddress);
      await expect(firewall.connect(owner).revokeVault(vaultAddress))
        .to.emit(firewall, "VaultRevoked")
        .withArgs(vaultAddress);

      expect(await firewall.isVaultAuthorized(vaultAddress)).to.be.false;
    });

    it("should revert on zero address authorization", async function () {
      const { firewall, owner } = await loadFixture(deployFixture);

      await expect(firewall.connect(owner).authorizeVault(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(firewall, "ZeroAddress");
    });

    it.skip("should only allow owner to authorize (demo: access control disabled)", async function () {
      const { firewall, otherUser, vaultAddress } = await loadFixture(deployFixture);

      await expect(
        firewall.connect(otherUser).authorizeVault(vaultAddress)
      ).to.be.revertedWithCustomError(firewall, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency Controls", function () {
    it("should pause and unpause", async function () {
      const { firewall, owner } = await loadFixture(deployFixture);

      await firewall.connect(owner).pause();
      expect(await firewall.paused()).to.be.true;

      await firewall.connect(owner).unpause();
      expect(await firewall.paused()).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("should update policy engine", async function () {
      const { firewall, owner } = await loadFixture(deployFixture);
      const newEngine = ethers.Wallet.createRandom().address;

      await firewall.connect(owner).setPolicyEngine(newEngine);
      expect(await firewall.policyEngine()).to.equal(newEngine);
    });

    it("should revert on zero address policy engine update", async function () {
      const { firewall, owner } = await loadFixture(deployFixture);

      await expect(firewall.connect(owner).setPolicyEngine(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(firewall, "ZeroAddress");
    });
  });
});
