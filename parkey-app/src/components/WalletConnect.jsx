import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * Bouton de connexion base sur RainbowKit.
 * Gere MetaMask, WalletConnect, Coinbase Wallet, etc. out-of-the-box.
 */
function WalletConnect() {
  return <ConnectButton showBalance={false} chainStatus="icon" />;
}

export default WalletConnect;
