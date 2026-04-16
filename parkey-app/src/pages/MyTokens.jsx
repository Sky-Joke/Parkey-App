import React from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { useOwnerTokens } from '../hooks/useParkey';
import { PARKEY_ABI, PARKEY_ADDRESS } from '../contracts';
import ParkingCard from '../components/ParkingCard';

function MyTokens() {
  const { address, isConnected } = useAccount();
  const { data: tokenIds, isLoading } = useOwnerTokens(address);

  // Charge les details de chaque token en batch via multicall
  const { data: spots } = useReadContracts({
    contracts: (tokenIds || []).map((id) => ({
      address: PARKEY_ADDRESS,
      abi: PARKEY_ABI,
      functionName: 'getParkingSpot',
      args: [id],
    })),
    query: { enabled: Array.isArray(tokenIds) && tokenIds.length > 0 },
  });

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <i className="fas fa-wallet text-6xl text-primary mb-6"></i>
          <h1 className="text-4xl font-bold mb-4">Mes Tokens</h1>
          <p className="text-gray-400 mb-8">
            Veuillez connecter votre wallet pour voir vos tokens de parking
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <i className="fas fa-spinner fa-spin text-6xl text-primary mb-4"></i>
        <p className="text-gray-400">Chargement de vos tokens...</p>
      </div>
    );
  }

  const parkings = (tokenIds || []).map((id, i) => {
    const spot = spots?.[i]?.result;
    return {
      id: Number(id),
      address: spot?.parkingAddress || `Token #${id}`,
      type: spot?.parkingType || '-',
      size: spot?.size || '-',
      price: spot ? formatEther(spot.price) : '0',
      available: Boolean(spot?.isAvailable),
      image: `https://picsum.photos/400/300?random=${id}`,
    };
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Mes Tokens</h1>

      {parkings.length === 0 ? (
        <div className="text-center py-20">
          <i className="fas fa-parking text-6xl text-gray-600 mb-4"></i>
          <p className="text-gray-400 text-xl mb-4">Vous n'avez pas encore de tokens</p>
          <p className="text-gray-500 mb-8">
            Creez votre premier token de parking ou achetez-en un sur le marketplace
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parkings.map((p) => (
            <ParkingCard key={p.id} parking={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTokens;
