# Parkey — monorepo

Deux dossiers indépendants, reliés via un export d'ABI :

```
Parkey/
├── parkey-contracts/    ← Hardhat + Solidity
│   ├── contracts/ParkeyNFT.sol
│   ├── hardhat.config.ts
│   ├── ignition/modules/ParkeyNFT.ts
│   ├── scripts/export-abi.ts
│   ├── test/ParkeyNFT.ts
│   └── exports/ParkeyNFT.json       ← généré
└── parkey-app/          ← React + wagmi + viem + RainbowKit
    └── src/contracts/ParkeyNFT.json ← copié depuis parkey-contracts
```

## Lien entre les deux projets

Le script `scripts/export-abi.ts` (côté contracts) est lancé automatiquement après chaque `hardhat compile` via le hook `postcompile`. Il :

1. Lit l'artifact `artifacts/contracts/ParkeyNFT.sol/ParkeyNFT.json`
2. Lit les adresses déployées dans `ignition/deployments/chain-*/deployed_addresses.json`
3. Écrit un fichier consolidé `{ abi, addresses }` :
   - dans `parkey-contracts/exports/ParkeyNFT.json`
   - **et** dans `parkey-app/src/contracts/ParkeyNFT.json` si le dossier existe

L'app lit ce JSON via `src/contracts/index.js` et expose `PARKEY_ABI` + `PARKEY_ADDRESS` à wagmi.

## Quickstart

```bash
# 1) Contracts
cd parkey-contracts
cp .env.example .env        # SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY
npm install
npm run compile             # compile + exporte l'ABI vers l'app
npm test

# 2) (Optionnel) Déploiement
npm run node                # dans un terminal à part
npm run deploy:localhost
# ou :
npm run deploy:sepolia

# 3) App
cd ../parkey-app
cp .env.example .env        # REACT_APP_WC_PROJECT_ID (obligatoire pour WalletConnect)
npm install
npm start
```

## Principaux changements

### Contrat (`ParkeyNFT.sol`)
- Migration OpenZeppelin v5 : `Counters` supprimé → `uint256 _nextTokenId`.
- `Ownable(msg.sender)` (nouvelle signature).
- `_exists()` remplacé par `_ownerOf(id) != address(0)`.
- `_burn` override supprimé (inutile en v5).
- Paiements via `.call{value:}` + `nonReentrant` (pattern CEI), refund du surplus.
- Frais en **basis points** (`platformFeeBps`, 200 = 2 %, plafond 10 %).
- Transferts externes (`transferFrom` / `safeTransferFrom`) bloqués avec `TransferDisabled` — tout passe par `buyParkingSpot`.
- Custom errors (moins cher que `require("...")`).
- Index O(1) dans `_removeTokenFromOwner` via mapping `_tokenIndexInOwner`.

### App
- `ethers.BrowserProvider` → **wagmi + viem + RainbowKit**.
- `Web3Provider` custom → `WagmiProvider` + `QueryClientProvider` + `RainbowKitProvider` dans `index.js`.
- `useContract.js` → `hooks/useParkey.js` (hooks `useCreateParking`, `useBuyParking`, `useListParking`, `useOwnerTokens`, `useParkingSpot`).
- `WalletConnect` → `<ConnectButton />` de RainbowKit (MetaMask, WalletConnect, Coinbase out-of-the-box).
- Multicall automatique dans `MyTokens` via `useReadContracts`.
