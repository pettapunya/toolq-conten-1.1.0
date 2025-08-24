

import React, { useState } from 'react';

interface VerificationPopupProps {
  onVerify: (phoneNumber: string) => void;
}

const VerificationPopup: React.FC<VerificationPopupProps> = ({ onVerify }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    // Simple validation: starts with '08' and is between 10 and 15 digits long.
    if (/^08\d{8,13}$/.test(phoneNumber)) {
      setError('');
      onVerify(phoneNumber);
    } else {
      setError('Nomor Whatsapp tidak valid. Contoh: 081234567890');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleVerify();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A202C] border border-green-500/50 rounded-lg shadow-2xl shadow-green-500/20 p-8 w-full max-w-md space-y-6 transform transition-all">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-400">Verifikasi Akses</h2>
          <p className="text-gray-400 mt-2">
            Silakan masukkan nomor Whatsapp yang terdaftar untuk melanjutkan.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300">
            Nomor Whatsapp
          </label>
          <input
            id="whatsapp"
            type="tel"
            autoFocus
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Contoh: 081234567890"
            className="w-full bg-[#2D3748] border border-green-700/50 rounded-md py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
           {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>
        <button
          onClick={handleVerify}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
        >
          Verifikasi
        </button>
      </div>
    </div>
  );
};

export default VerificationPopup;