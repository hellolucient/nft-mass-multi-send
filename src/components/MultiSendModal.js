import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import NFTImage from './NFTImage';

const MultiSendModal = ({ isOpen, onClose, selectedNfts, nfts, onSend }) => {
  const [destinations, setDestinations] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    setIsValidating(true);
    setErrors({});
    const newErrors = {};

    try {
      const validDestinations = {};
      
      // Validate all addresses
      for (const nftId of selectedNfts) {
        const address = destinations[nftId];
        if (!address) {
          newErrors[nftId] = 'Address required';
          continue;
        }

        try {
          new PublicKey(address);
          validDestinations[nftId] = address;
        } catch (err) {
          newErrors[nftId] = 'Invalid address';
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      await onSend(validDestinations);
      onClose();
    } finally {
      setIsValidating(false);
    }
  };

  const handleBatchPaste = () => {
    const input = prompt('Paste wallet addresses (one per line)');
    if (!input) return;

    const addresses = input.split('\n').filter(a => a.trim());
    const nftIds = Array.from(selectedNfts);
    
    const newDestinations = { ...destinations };
    nftIds.forEach((nftId, index) => {
      if (addresses[index]) {
        newDestinations[nftId] = addresses[index].trim();
      }
    });
    
    setDestinations(newDestinations);
  };

  if (!isOpen) return null;

  const selectedNftDetails = Array.from(selectedNfts)
    .map(id => nfts.find(nft => nft.id === id))
    .filter(Boolean);

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
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0 }}>Send NFTs to Different Wallets</h3>
          <button
            onClick={handleBatchPaste}
            style={{
              padding: '8px 16px',
              background: '#25262B',
              color: 'white',
              border: '1px solid #4287f5',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Paste Multiple Addresses
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          {selectedNftDetails.map(nft => (
            <div key={nft.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              padding: '12px',
              background: '#25262B',
              borderRadius: '4px'
            }}>
              <div style={{ width: '40px', height: '40px' }}>
                <NFTImage nft={nft} />
              </div>
              <div style={{ flex: 1 }}>
                {nft.content?.metadata?.name || 'Unnamed NFT'}
              </div>
              <div style={{ flex: 2 }}>
                <input
                  type="text"
                  value={destinations[nft.id] || ''}
                  onChange={(e) => setDestinations(prev => ({
                    ...prev,
                    [nft.id]: e.target.value
                  }))}
                  placeholder="Destination wallet address"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#1A1B1E',
                    border: errors[nft.id] ? '1px solid red' : '1px solid #4287f5',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
                {errors[nft.id] && (
                  <div style={{ color: 'red', fontSize: '12px' }}>
                    {errors[nft.id]}
                  </div>
                )}
              </div>
            </div>
          ))}
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

export default MultiSendModal; 