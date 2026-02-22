import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * MultiSigPolicy — Comprehensive Test Suite
 */
describe("MultiSigPolicy", function () {
  async function deployFixture() {
    const [owner, signer1, signer2, signer3, nonSigner] = await ethers.getSigners();

    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const engine = await PolicyEngine.deploy();
    await engine.waitForDeployment();

    const signers = [signer1.address, signer2.address, signer3.address];
    const requiredApprovals = 2;

    const MultiSigPolicy = await ethers.getContractFactory("MultiSigPolicy");
    const policy = await MultiSigPolicy.deploy(
      await engine.getAddress(), signers, requiredApprovals
    );
    await policy.waitForDeployment();

    const vault = ethers.Wallet.createRandom().address;
    const token = ethers.Wallet.createRandom().address;
    const recipient = ethers.Wallet.createRandom().address;
    const amount = ethers.parseUnits("1000", 6);

    return { engine, policy, owner, signer1, signer2, signer3, nonSigner, vault, token, recipient, amount };
  }

  describe("Deployment", function () {
    it("should set correct required approvals", async function () {
      const { policy } = await loadFixture(deployFixture);
      expect(await policy.requiredApprovals()).to.equal(2);
    });

    it("should register all signers", async function () {
      const { policy, signer1, signer2, signer3 } = await loadFixture(deployFixture);
      expect(await policy.isSigner(signer1.address)).to.be.true;
      expect(await policy.isSigner(signer2.address)).to.be.true;
      expect(await policy.isSigner(signer3.address)).to.be.true;
    });

    it("should revert with empty signers", async function () {
      const { engine } = await loadFixture(deployFixture);
      const MultiSigPolicy = await ethers.getContractFactory("MultiSigPolicy");
      await expect(
        MultiSigPolicy.deploy(await engine.getAddress(), [], 1)
      ).to.be.revertedWithCustomError(MultiSigPolicy, "EmptySigners");
    });

    it("should revert with invalid threshold", async function () {
      const { engine, signer1 } = await loadFixture(deployFixture);
      const MultiSigPolicy = await ethers.getContractFactory("MultiSigPolicy");
      await expect(
        MultiSigPolicy.deploy(await engine.getAddress(), [signer1.address], 5)
      ).to.be.revertedWithCustomError(MultiSigPolicy, "InvalidThreshold");
    });
  });

  describe("Approval Flow", function () {
    it("should allow signer to approve a transaction", async function () {
      const { policy, signer1, vault, token, recipient, amount } = await loadFixture(deployFixture);
      const txHash = await policy.getTransactionHash(vault, token, recipient, amount);

      await expect(policy.connect(signer1).approveTransaction(vault, token, recipient, amount))
        .to.emit(policy, "TransactionApproved")
        .withArgs(txHash, signer1.address, 1);

      expect(await policy.approvalCount(txHash)).to.equal(1);
    });

    it("should revert when non-signer tries to approve", async function () {
      const { policy, nonSigner, vault, token, recipient, amount } = await loadFixture(deployFixture);

      expect(await policy.isSigner(nonSigner.address)).to.be.false;
      await expect(
        policy.connect(nonSigner).approveTransaction(vault, token, recipient, amount)
      ).to.be.revertedWithCustomError(policy, "NotASigner");
    });

    it("should reject duplicate approval", async function () {
      const { policy, signer1, vault, token, recipient, amount } = await loadFixture(deployFixture);

      await policy.connect(signer1).approveTransaction(vault, token, recipient, amount);
      await expect(
        policy.connect(signer1).approveTransaction(vault, token, recipient, amount)
      ).to.be.revertedWithCustomError(policy, "AlreadyApproved");
    });

    it("should allow revoking approval", async function () {
      const { policy, signer1, vault, token, recipient, amount } = await loadFixture(deployFixture);

      await policy.connect(signer1).approveTransaction(vault, token, recipient, amount);
      await policy.connect(signer1).revokeApproval(vault, token, recipient, amount);

      const txHash = await policy.getTransactionHash(vault, token, recipient, amount);
      expect(await policy.approvalCount(txHash)).to.equal(0);
    });
  });

  describe("Validation", function () {
    it("should fail validation without enough approvals", async function () {
      const { policy, signer1, vault, token, recipient, amount } = await loadFixture(deployFixture);

      await policy.connect(signer1).approveTransaction(vault, token, recipient, amount);

      await expect(policy.validate(vault, token, recipient, amount))
        .to.be.revertedWithCustomError(policy, "InsufficientApprovals");
    });

    it("should pass validation with enough approvals", async function () {
      const { policy, signer1, signer2, vault, token, recipient, amount } = await loadFixture(deployFixture);

      await policy.connect(signer1).approveTransaction(vault, token, recipient, amount);
      await policy.connect(signer2).approveTransaction(vault, token, recipient, amount);

      expect(await policy.validate(vault, token, recipient, amount)).to.be.true;
    });
  });

  describe("Admin Functions", function () {
    it("should add a new signer", async function () {
      const { policy, owner, nonSigner } = await loadFixture(deployFixture);

      await expect(policy.connect(owner).addSigner(nonSigner.address))
        .to.emit(policy, "SignerAdded")
        .withArgs(nonSigner.address);

      expect(await policy.isSigner(nonSigner.address)).to.be.true;
    });

    it("should remove a signer", async function () {
      const { policy, owner, signer3 } = await loadFixture(deployFixture);

      await expect(policy.connect(owner).removeSigner(signer3.address))
        .to.emit(policy, "SignerRemoved")
        .withArgs(signer3.address);

      expect(await policy.isSigner(signer3.address)).to.be.false;
    });

    it("should not remove signer if it would break threshold", async function () {
      const { policy, owner, signer1, signer2 } = await loadFixture(deployFixture);

      // Remove one signer (3 → 2, threshold = 2, ok)
      await policy.connect(owner).removeSigner(signer1.address);

      // Try to remove another (2 → 1, threshold = 2, fail)
      await expect(
        policy.connect(owner).removeSigner(signer2.address)
      ).to.be.revertedWithCustomError(policy, "InvalidThreshold");
    });

    it("should update required approvals", async function () {
      const { policy, owner } = await loadFixture(deployFixture);

      await expect(policy.connect(owner).setRequiredApprovals(3))
        .to.emit(policy, "ThresholdUpdated")
        .withArgs(3);

      expect(await policy.requiredApprovals()).to.equal(3);
    });
  });
});
