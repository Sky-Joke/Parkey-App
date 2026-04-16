import artifact from './ParkeyNFT.json';

/**
 * ABI + adresse du contrat ParkeyNFT.
 *
 * Le fichier ParkeyNFT.json est genere par `npm run export` cote parkey-contracts
 * (ou copie via `npm run sync-abi` cote parkey-app).
 */
export const PARKEY_ABI = artifact.abi;

const chainId = Number(process.env.REACT_APP_CHAIN_ID || 11155111);

export const CHAIN_ID = chainId;

export const PARKEY_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS ||
  artifact.addresses?.[String(chainId)] ||
  '0x0000000000000000000000000000000000000000';
