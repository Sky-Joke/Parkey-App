import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http, createConfig } from 'wagmi';
import { hardhat, mainnet, sepolia } from 'wagmi/chains';

const projectId = process.env.REACT_APP_WC_PROJECT_ID || 'PARKEY_DEV_FALLBACK';

// On n'utilise PAS metaMaskWallet (qui tire @metamask/sdk et casse CRA/webpack).
// injectedWallet gere tres bien l'extension MetaMask sur desktop.
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommande',
      wallets: [injectedWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  { appName: 'Parkey', projectId }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [sepolia, hardhat, mainnet],
  transports: {
    [sepolia.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [mainnet.id]: http(),
  },
  ssr: false,
});
