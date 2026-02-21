import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Treasury — Comprehensive Test Suite
 */
describe("Treasury", function () {
  const USDC_DECIMALS = 6;

  async function deployFixture() {
    const [owner, executor, recipient, otherUser] = await ethers.getSigners();

    // Deploy PolicyEngine
    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    // Deploy TreasuryFirewall
    const TreasuryFirewall = await ethers.getContractFactory("TreasuryFirewall");
    const firewall = await TreasuryFirewall.deploy(await engine.getAddress());
    await firewall.waitForDeployment();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(await firewall.getAddress());
    await treasury.waitForDeployment();

    return { engine, firewall, usdc, treasury, owner, executor, recipient, otherUser };
  }

  describe("Deployment", function () {
    it("should set correct firewall", async function () {
      const { treasury, firewall } = await loadFixture(deployFixture);
      expect(await treasury.firewall()).to.equal(await firewall.getAddress());
    });

    it("should grant all roles to deployer", async function () {
      const { treasury, owner } = await loadFixture(deployFixture);
      const ADMIN_ROLE = await treasury.ADMIN_ROLE();
      const EXECUTOR_ROLE = await treasury.EXECUTOR_ROLE();
      const PAUSER_ROLE = await treasury.PAUSER_ROLE();

      expect(await treasury.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await treasury.hasRole(EXECUTOR_ROLE, owner.address)).to.be.true;
      expect(await treasury.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("should revert with zero address firewall", async function () {
      const Treasury = await ethers.getContractFactory("Treasury");
      await expect(Treasury.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Treasury, "ZeroAddress");
    });
  });

  describe("Deposits", function () {
    it("should accept token deposits", async function () {
      const { treasury, usdc, owner } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("10000", USDC_DECIMALS);

      await usdc.connect(owner).approve(await treasury.getAddress(), amount);
      await expect(treasury.connect(owner).deposit(await usdc.getAddress(), amount))
        .to.emit(treasury, "Deposited")
        .withArgs(await usdc.getAddress(), owner.address, amount);

      expect(await treasury.getBalance(await usdc.getAddress())).to.equal(amount);
    });

    it("should revert on zero amount deposit", async function () {
      const { treasury, usdc } = await loadFixture(deployFixture);
      await expect(treasury.deposit(await usdc.getAddress(), 0))
        .to.be.revertedWithCustomError(treasury, "ZeroAmount");
    });

    it("should revert on zero address token", async function () {
      const { treasury } = await loadFixture(deployFixture);
      await expect(treasury.deposit(ethers.ZeroAddress, 1000))
        .to.be.revertedWithCustomError(treasury, "ZeroAddress");
    });
  });

  describe("Emergency Controls", function () {
    it("should pause and unpause", async function () {
      const { treasury, owner } = await loadFixture(deployFixture);

      await expect(treasury.connect(owner).emergencyPause())
        .to.emit(treasury, "EmergencyPaused")
        .withArgs(owner.address);

      await expect(treasury.connect(owner).emergencyUnpause())
        .to.emit(treasury, "EmergencyUnpaused")
        .withArgs(owner.address);
    });

    it("should block deposits when paused", async function () {
      const { treasury, usdc, owner } = await loadFixture(deployFixture);

      await treasury.connect(owner).emergencyPause();
      await expect(treasury.deposit(await usdc.getAddress(), 1000))
        .to.be.revertedWithCustomError(treasury, "EnforcedPause");
    });

    it("should allow emergency withdrawal when paused", async function () {
      const { treasury, usdc, owner, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("5000", USDC_DECIMALS);

      // Fund treasury
      await usdc.connect(owner).approve(await treasury.getAddress(), amount);
      await treasury.connect(owner).deposit(await usdc.getAddress(), amount);

      // Pause and emergency withdraw
      await treasury.connect(owner).emergencyPause();
      await treasury.connect(owner).emergencyWithdraw(
        await usdc.getAddress(), recipient.address, amount
      );

      expect(await usdc.balanceOf(recipient.address)).to.equal(amount);
    });

    it("should not allow emergency withdrawal when not paused", async function () {
      const { treasury, usdc, owner, recipient } = await loadFixture(deployFixture);

      await expect(
        treasury.connect(owner).emergencyWithdraw(
          await usdc.getAddress(), recipient.address, 1000
        )
      ).to.be.revertedWithCustomError(treasury, "ExpectedPause");
    });

    it("should restrict pause to PAUSER_ROLE", async function () {
      const { treasury, otherUser } = await loadFixture(deployFixture);

      await expect(treasury.connect(otherUser).emergencyPause())
        .to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Admin Functions", function () {
    it("should update firewall address", async function () {
      const { treasury, owner } = await loadFixture(deployFixture);
      const newFirewall = ethers.Wallet.createRandom().address;

      await treasury.connect(owner).setFirewall(newFirewall);
      expect(await treasury.firewall()).to.equal(newFirewall);
    });

    it("should revert on zero address firewall update", async function () {
      const { treasury, owner } = await loadFixture(deployFixture);

      await expect(treasury.connect(owner).setFirewall(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(treasury, "ZeroAddress");
    });
  });
});
