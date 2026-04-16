import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useCreateParking } from '../hooks/useParkey';
import Notification from './Notification';

function CreateParkingForm() {
  const { isConnected } = useAccount();
  const { createParking, isPending, isConfirming, isConfirmed, error } =
    useCreateParking();

  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    address: '',
    type: 'covered',
    size: 'standard',
    price: '',
    description: '',
    available247: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setNotification({ message: 'Veuillez connecter votre wallet', type: 'error' });
      return;
    }
    try {
      setNotification({ message: 'Signature de la transaction...', type: 'info' });
      await createParking(formData);
      setNotification({ message: 'Transaction envoyee, attente de confirmation...', type: 'info' });
    } catch (err) {
      console.error(err);
      setNotification({
        message: err?.shortMessage || err?.message || 'Erreur lors de la creation',
        type: 'error',
      });
    }
  };

  React.useEffect(() => {
    if (isConfirmed) {
      setNotification({ message: 'Token cree avec succes !', type: 'success' });
      setFormData({
        address: '',
        type: 'covered',
        size: 'standard',
        price: '',
        description: '',
        available247: false,
      });
    }
  }, [isConfirmed]);

  React.useEffect(() => {
    if (error) {
      setNotification({
        message: error?.shortMessage || error?.message || 'Erreur',
        type: 'error',
      });
    }
  }, [error]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const busy = isPending || isConfirming;

  return (
    <>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Adresse</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-white"
            placeholder="123 Rue de la Paix, Paris"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-white"
            >
              <option value="covered">Couvert</option>
              <option value="outdoor">Exterieur</option>
              <option value="underground">Souterrain</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Taille</label>
            <select
              name="size"
              value={formData.size}
              onChange={handleChange}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-white"
            >
              <option value="standard">Standard</option>
              <option value="large">Large</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Prix (ETH)</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.001"
            min="0"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-white"
            placeholder="0.05"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-white"
            placeholder="Decrivez votre place de parking..."
          />
        </div>

        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            name="available247"
            checked={formData.available247}
            onChange={handleChange}
            className="w-5 h-5 text-primary bg-white/10 border-white/20 rounded focus:ring-primary"
          />
          <label className="text-sm">Disponible 24/7</label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-gradient-to-r from-primary to-secondary py-4 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50"
        >
          {busy ? 'Transaction en cours...' : 'Creer le Token'}
        </button>
      </form>
    </>
  );
}

export default CreateParkingForm;
