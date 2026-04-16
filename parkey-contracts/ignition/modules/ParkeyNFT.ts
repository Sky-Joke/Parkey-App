import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ParkeyNFTModule", (m) => {
  const parkeyNFT = m.contract("ParkeyNFT", []);
  return { parkeyNFT };
});
