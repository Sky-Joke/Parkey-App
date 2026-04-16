import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ParkeyNFT", () => {
  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ParkeyNFT");
    const nft = await Factory.deploy();
    await nft.waitForDeployment();
    return { nft, owner, alice, bob };
  }

  it("mint : cree une place et l'associe au proprietaire", async () => {
    const { nft, alice } = await deploy();
    const price = ethers.parseEther("0.05");

    await expect(
      nft.connect(alice).createParkingSpot(
        "12 rue Test",
        "covered",
        "standard",
        price,
        true,
        "ipfs://dummy"
      )
    )
      .to.emit(nft, "ParkingSpotCreated")
      .withArgs(0n, alice.address, "12 rue Test", price);

    expect(await nft.ownerOf(0)).to.equal(alice.address);
    expect(await nft.totalMinted()).to.equal(1n);

    const tokens = await nft.getOwnerTokens(alice.address);
    expect(tokens.map((t) => Number(t))).to.deep.equal([0]);
  });

  it("buy : transfert + frais + refund du surplus", async () => {
    const { nft, alice, bob, owner } = await deploy();
    const price = ethers.parseEther("1");

    await nft.connect(alice).createParkingSpot(
      "addr", "covered", "standard", price, true, "ipfs://x"
    );

    const feeCollectorBefore = await ethers.provider.getBalance(owner.address);
    const sellerBefore = await ethers.provider.getBalance(alice.address);

    // Bob envoie 1.5 ETH, doit recevoir 0.5 en refund
    const tx = await nft.connect(bob).buyParkingSpot(0, {
      value: ethers.parseEther("1.5"),
    });
    await tx.wait();

    expect(await nft.ownerOf(0)).to.equal(bob.address);

    const spot = await nft.getParkingSpot(0);
    expect(spot.isAvailable).to.equal(false);
    expect(spot.currentOwner).to.equal(bob.address);

    // Frais = 2% de 1 ETH = 0.02
    const feeCollectorAfter = await ethers.provider.getBalance(owner.address);
    expect(feeCollectorAfter - feeCollectorBefore).to.equal(
      ethers.parseEther("0.02")
    );

    const sellerAfter = await ethers.provider.getBalance(alice.address);
    expect(sellerAfter - sellerBefore).to.equal(ethers.parseEther("0.98"));
  });

  it("transferFrom externe : revert", async () => {
    const { nft, alice, bob } = await deploy();
    await nft.connect(alice).createParkingSpot(
      "a", "covered", "standard", ethers.parseEther("0.1"), true, ""
    );
    await expect(
      nft.connect(alice).transferFrom(alice.address, bob.address, 0)
    ).to.be.revertedWithCustomError(nft, "TransferDisabled");
  });

  it("buy : impossible de racheter sa propre place", async () => {
    const { nft, alice } = await deploy();
    await nft.connect(alice).createParkingSpot(
      "a", "covered", "standard", ethers.parseEther("0.1"), true, ""
    );
    await expect(
      nft.connect(alice).buyParkingSpot(0, { value: ethers.parseEther("0.1") })
    ).to.be.revertedWithCustomError(nft, "CannotBuyOwn");
  });

  it("admin : setPlatformFee plafonne a 10%", async () => {
    const { nft, owner } = await deploy();
    await expect(
      nft.connect(owner).setPlatformFee(1500)
    ).to.be.revertedWithCustomError(nft, "FeeTooHigh");

    await nft.connect(owner).setPlatformFee(500);
    expect(await nft.platformFeeBps()).to.equal(500n);
  });
});
