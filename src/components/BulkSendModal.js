import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import FeeDisplay from './FeeDisplay';

const BulkSendModal = ({ isOpen, onClose, selectedNfts, onSend }) => {
  const [destinationWallet, setDestinationWallet] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsValidating(true);
    setError('');

    try {
      // Validate Solana address
      new PublicKey(destinationWallet);
      
      // Call parent's onSend with destination
      await onSend(destinationWallet);
      onClose();
    } catch (err) {
      setError('Invalid Solana address');
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1A1B1E',
        padding: '24px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0 }}>Send {selectedNfts.size} NFTs</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >×</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Destination Wallet
          </label>
          <input
            type="text"
            value={destinationWallet}
            onChange={(e) => setDestinationWallet(e.target.value)}
            placeholder="Enter Solana wallet address"
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#25262B',
              border: '1px solid #4287f5',
              borderRadius: '4px',
              color: 'white'
            }}
          />
          {error && (
            <div style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>
              {error}
            </div>
          )}
          <FeeDisplay nftCount={selectedNfts.size} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#25262B',
              color: 'white',
              border: '1px solid #4287f5',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isValidating}
            style={{
              padding: '8px 16px',
              background: '#4287f5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: isValidating ? 0.7 : 1
            }}
          >
            {isValidating ? 'Validating...' : 'Send NFTs'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkSendModal; 