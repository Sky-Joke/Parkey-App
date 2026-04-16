import { useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseEther } from 'viem';
import { PARKEY_ABI, PARKEY_ADDRESS } from '../contracts';

/**
 * Hooks metier autour du contrat ParkeyNFT, bases sur wagmi / viem.
 */

const contract = {
  address: PARKEY_ADDRESS,
  abi: PARKEY_ABI,
};

// --- Mutations ---

export function useCreateParking() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const createParking = useCallback(
    async (parkingData) => {
      return writeContractAsync({
        ...contract,
        functionName: 'createParkingSpot',
        args: [
          parkingData.address,
          parkingData.type,
          parkingData.size,
          parseEther(String(parkingData.price)),
          Boolean(parkingData.available247),
          parkingData.tokenURI || '',
        ],
      });
    },
    [writeContractAsync]
  );

  return {
    createParking,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error,
  };
}

export function useBuyParking() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const buyParking = useCallback(
    async (tokenId, priceEth) => {
      return writeContractAsync({
        ...contract,
        functionName: 'buyParkingSpot',
        args: [BigInt(tokenId)],
        value: parseEther(String(priceEth)),
      });
    },
    [writeContractAsync]
  );

  return {
    buyParking,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error,
  };
}

export function useListParking() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const listParking = useCallback(
    async (tokenId, priceEth) => {
      return writeContractAsync({
        ...contract,
        functionName: 'listParkingSpot',
        args: [BigInt(tokenId), parseEther(String(priceEth))],
      });
    },
    [writeContractAsync]
  );

  return {
    listParking,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error,
  };
}

// --- Reads ---

export function useOwnerTokens(address) {
  return useReadContract({
    ...contract,
    functionName: 'getOwnerTokens',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
}

export function useParkingSpot(tokenId) {
  return useReadContract({
    ...contract,
    functionName: 'getParkingSpot',
    args: tokenId !== undefined && tokenId !== null ? [BigInt(tokenId)] : undefined,
    query: { enabled: tokenId !== undefined && tokenId !== null },
  });
}

export function useTotalMinted() {
  return useReadContract({ ...contract, functionName: 'totalMinted' });
}

// --- Helpers ---

export function useCurrentAccount() {
  const { address, chainId, isConnected } = useAccount();
  return { address, chainId, isConnected };
}
