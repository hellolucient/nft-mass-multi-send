import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createPortal } from 'react-dom';

const imageCache = new Map();
const metadataCache = new Map();

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
];

const ARCHIVE_GATEWAYS = [
  'https://web.archive.org/web/',
  'https://archive.is/',
  'https://archive.ph/'
];

const getImageUrl = async (nft) => {
  if (imageCache.has(nft.id)) {
    return imageCache.get(nft.id);
  }

  try {
    const possibleUrls = [
      nft.content?.metadata?.image,
      nft.content?.files?.[0]?.uri,
      nft.content?.metadata?.animation_url,
      ...(nft.content?.files?.map(f => typeof f === 'string' ? f : f?.uri) || []),
      nft.content?.links?.image
    ].filter(Boolean);

    // Try first URL without validation
    const url = possibleUrls[0];
    if (!url) return 'placeholder.png';

    const httpsUrl = url.startsWith('ipfs://')
      ? url.replace('ipfs://', 'https://ipfs.io/ipfs/')
      : url;

    imageCache.set(nft.id, httpsUrl);
    return httpsUrl;
  } catch (error) {
    console.warn('Error getting image URL:', error);
    return 'placeholder.png';
  }
};

const WindowsLogo = () => (
  <div style={{
    display: 'inline-block',
    marginRight: '5px',
    position: 'relative',
    top: '2px',
    width: '16px',
    height: '16px',
    transform: 'perspective(200px) rotateY(20deg)'  // Add perspective tilt
  }}>
    {/* Main squares */}
    <div style={{
      position: 'absolute',
      width: '8px',
      height: '8px',
      background: '#FF6B6B',
      top: 0,
      left: 0,
      transform: 'skew(-20deg, 0)'  // Add skew for perspective
    }}/>
    <div style={{
      position: 'absolute',
      width: '8px',
      height: '8px',
      background: '#4ECB71',
      top: 0,
      right: 0,
      transform: 'skew(-10deg, 0)'
    }}/>
    <div style={{
      position: 'absolute',
      width: '8px',
      height: '8px',
      background: '#4A9EFF',
      bottom: 0,
      left: 0,
      transform: 'skew(-10deg, 0)'
    }}/>
    <div style={{
      position: 'absolute',
      width: '8px',
      height: '8px',
      background: '#FFD93D',
      bottom: 0,
      right: 0,
      transform: 'skew(-10deg, 0)'
    }}/>
    {/* Trailing squares */}
    {[...Array(8)].map((_, i) => (
      <div key={i} style={{
        position: 'absolute',
        width: '2px',
        height: '2px',
        background: '#000',
        opacity: 0.2 - (i * 0.02),
        right: -6 - (i * 2),
        top: 6 + Math.sin(i * 0.8) * 2,
        transform: `skew(-${10 + i * 2}deg, 0)`,
      }}/>
    ))}
  </div>
);

const WindowsErrorStyle = () => (
  <div style={{
    background: '#F0F1F1',
    border: '2px solid #0055EA',
    borderRadius: '7px',
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    imageRendering: 'pixelated',
    overflow: 'hidden'
  }}>
    {/* Blue title bar */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(180deg, #0058E6 0%, #3890FF 100%)',
      color: 'white',
      padding: '4px 8px',
      height: '24px',
      fontSize: '11px',
      letterSpacing: '1px',
      borderRadius: '5px 5px 0 0',
      display: 'flex',
      alignItems: 'center'
    }}>
      <WindowsLogo />
      <span style={{ fontFamily: 'Tahoma, sans-serif' }}>Windows</span>
    </div>

    {/* Content - Adjusted spacing */}
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      marginTop: '24px',
      marginBottom: '60px' // Increased bottom margin
    }}>
      <div style={{
        fontSize: '32px',
        color: '#0055EA',
        marginBottom: '7px' // Increased space between icon and text
      }}>
        ℹ️
      </div>
      <div style={{
        fontFamily: 'Silkscreen, monospace',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#000',
        letterSpacing: '1px',
        lineHeight: '2.2', // Slightly increased line height
        textAlign: 'center'
      }}>
        Image successfully
        <br />
        failed to load
      </div>
    </div>
  </div>
);

const NFTImage = ({ nft }) => {
  const [imageUrl, setImageUrl] = useState(imageCache.get(nft.id) || null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(!imageCache.has(nft.id));

  useEffect(() => {
    if (!imageUrl && !imageError) {
      const loadImage = async () => {
        try {
          const url = await getImageUrl(nft);
          setImageUrl(url);
        } catch (error) {
          console.error('Error loading image:', error);
          setImageError(true);
        } finally {
          setIsLoading(false);
        }
      };

      loadImage();
    }
  }, [nft, imageUrl, imageError]);

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: '#25262B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Loading...
      </div>
    );
  }

  if (imageError || !imageUrl) {
    return <WindowsErrorStyle />;
  }

  return (
    <img
      src={imageUrl}
      alt={nft.content?.metadata?.name || 'NFT'}
      style={{
        width: '100%',
        aspectRatio: '1',
        objectFit: 'cover',
        display: 'block'
      }}
      onError={() => setImageError(true)}
    />
  );
};

const getMetadataFromUri = async (uri) => {
  try {
    // If it's an IPFS URI, convert to HTTPS
    const httpsUri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    const response = await fetch(httpsUri);
    return await response.json();
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
};

const fetchNFTMetadata = async (nft) => {
  // Check cache first
  if (metadataCache.has(nft.id)) {
    return metadataCache.get(nft.id);
  }

  try {
    if (nft.interface === 'Custom' && nft.content?.json_uri) {
      let uri = nft.content.json_uri;
      
      // If it's an IPFS URI, try multiple gateways
      if (uri.includes('ipfs://')) {
        const cid = uri.replace('ipfs://', '');
        // Try each gateway until one works
        for (const gateway of IPFS_GATEWAYS) {
          try {
            const response = await fetch(gateway + cid);
            if (response.ok) {
              const metadata = await response.json();
              metadataCache.set(nft.id, metadata);
              return metadata;
            }
          } catch (e) {
            console.log(`Gateway ${gateway} failed, trying next...`);
          }
        }
      } else {
        // Direct HTTP URL
        const response = await fetch(uri);
        if (response.ok) {
          const metadata = await response.json();
          metadataCache.set(nft.id, metadata);
          return metadata;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching metadata:', error);
  }

  // Fallback to on-chain metadata
  return {
    name: nft.content?.metadata?.name || nft.name,
    image: nft.content?.metadata?.image
  };
};

const getCollectionInfo = (nft) => {
  // Try to get collection name from grouping first
  const groupingName = nft.grouping?.[0]?.group_value;
  
  // Try to get collection name from metadata
  const collectionName = nft.content?.metadata?.collection?.name || 
                        nft.content?.metadata?.symbol ||
                        groupingName;

  if (collectionName) {
    return {
      collectionName: collectionName,
      displayName: collectionName
    };
  }

  // Get the NFT name
  const nftName = nft.content?.metadata?.name || nft.data?.name || '';
  
  // Try to extract collection name by common patterns
  const nameParts = nftName.split(' ');
  if (nameParts.length > 1) {
    // Look for common collection identifiers
    const commonWords = ['Chad', 'Squidz', 'Nostalgia'];
    for (const word of commonWords) {
      if (nftName.includes(word)) {
        return {
          collectionName: word,
          displayName: word + ' Collection'
        };
      }
    }
  }

  // Fallback to using the full name
  return {
    collectionName: nftName,
    displayName: nftName || 'Unnamed Collection'
  };
};

const getCollectionName = (nft) => {
  return getCollectionInfo(nft).collectionName;
};

const getNFTName = async (nft) => {
  // For V1_NFT interface
  if (nft.interface === 'V1_NFT') {
    return nft.content?.metadata?.name ||
           nft.content?.json?.name ||
           nft.content?.metadata?.symbol ||
           'Unnamed NFT';
  }
  
  // For Custom interface
  if (nft.interface === 'Custom') {
    // Try to get metadata from json_uri
    const metadata = await fetchNFTMetadata(nft);
    return metadata?.name ||                    // Try fetched metadata name
           nft.content?.metadata?.data?.name || // Try metadata data name
           nft.content?.metadata?.name ||       // Try metadata name
           nft.content?.metadata?.symbol ||     // Add this line
           nft.name ||                          // Try direct name
           'Unnamed NFT';
  }
  
  return 'Unnamed NFT';
};

const getNFTNumber = (nft) => {
  // For LaunchMyNFT NFTs, extract number from URI
  if (nft.content?.metadata?.uri) {
    const uri = nft.content.metadata.uri;
    // Look for the number that comes right before .json
    const match = uri.match(/\/(\d+)\.json$/);
    if (match) {
      return `#${match[1]}`;
    }
  }
  return '';
};

// For debugging
const logNFTDetails = (nft) => {
  console.log('NFT URI:', nft.content?.metadata?.uri);
  const number = getNFTNumber(nft);
  console.log('Extracted number:', number);
};

const NFTDisplay = ({ nft, selectedNfts, onSelect, isCompact }) => {
  const [name, setName] = useState('Loading...');
  const nftNumber = getNFTNumber(nft);

  useEffect(() => {
    getNFTName(nft).then(setName);
  }, [nft]);

  const handleSolscanClick = (e) => {
    e.stopPropagation();
    window.open(`https://solscan.io/token/${nft.id}`, '_blank');
  };

  return (
    <div
      key={nft.id}
      className={`nft-item ${selectedNfts.has(nft.id) ? 'selected' : ''}`}
      onClick={() => onSelect(nft)}
      style={isCompact ? {
        fontSize: '0.7em',
        padding: '2px'
      } : {}}
    >
      <NFTImage nft={nft} />
      <div className="nft-info" style={isCompact ? { 
        padding: '2px',
        textAlign: 'center'
      } : {}}>
        <h3 style={isCompact ? { 
          fontSize: '0.8em', 
          margin: '2px 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        } : {}}>
          {name}
          {nftNumber && (
            <span style={{ color: '#888', marginLeft: '2px' }}>
              {nftNumber}
            </span>
          )}
        </h3>
        {!isCompact && (
          <div 
            onClick={handleSolscanClick}
            style={{
              cursor: 'pointer',
              color: '#4287f5',
              fontSize: '0.8em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🔍</span>
            <span style={{ textDecoration: 'underline' }}>
              solscan.io/token/{nft.id.slice(0, 4)}...{nft.id.slice(-4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Add CSS to handle modal styles
const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#1A1B1E',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'white'
  },
  modalBody: {
    padding: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
    maxHeight: 'calc(90vh - 70px)',
    overflow: 'auto'
  },
  expandedCollection: {
    width: '100%',
    background: '#1A1B1E',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },
  expandedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    color: 'white'
  },
  expandedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
    maxHeight: '600px',
    overflowY: 'auto',
    padding: '10px'
  },
  nftItem: {
    background: '#25262B',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative'
  },
  collectionCard: {
    cursor: 'pointer',
    background: '#25262B',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  collectionInfo: {
    padding: '10px',
    color: 'white'
  }
};

const CollectionCard = ({ 
  collectionName, 
  nfts, 
  selectedNfts, 
  onSelectCollection, 
  onSelectNFT,
  isExpanded,
  onToggleExpand,
  setSelectedNfts
}) => {
  if (isExpanded) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3>{collectionName} ({nfts.length})</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Select all NFTs in this collection
                  setSelectedNfts(prev => {
                    const next = new Set(prev);
                    nfts.forEach(nft => next.add(nft.id));
                    return next;
                  });
                }}
                style={{
                  padding: '4px 12px',
                  background: '#4287f5',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Select All
              </button>
              <button 
                onClick={onToggleExpand}
                style={{
                  padding: '4px 12px',
                  background: '#25262B',
                  border: '1px solid #4287f5',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
          <div style={styles.modalBody}>
            {nfts.map(nft => (
              <div key={nft.id} className="nft-card">
                <div style={{ position: 'relative' }}>
                  <input
                    type="checkbox"
                    checked={selectedNfts.has(nft.id)}
                    onChange={() => onSelectNFT(nft)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      zIndex: 2
                    }}
                  />
                  <NFTImage nft={nft} />
                </div>
                <div style={{ padding: '10px', color: 'white' }}>
                  <div>{nft.content?.metadata?.name || 'Unnamed NFT'}</div>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://solscan.io/token/${nft.id}`, '_blank');
                    }}
                    style={{
                      cursor: 'pointer',
                      color: '#4287f5',
                      fontSize: '0.8em',
                      marginTop: '5px'
                    }}
                  >
                    View on Solscan
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="collection-card" 
      onClick={onToggleExpand}
    >
      <NFTImage nft={nfts[0]} />
      <div className="collection-info">
        <div>{collectionName}</div>
        <div>{nfts.length} NFTs</div>
      </div>
    </div>
  );
};

const BulkSendModal = ({ isOpen, onClose, selectedNfts, onSend }) => {
  const [destinationWallet, setDestinationWallet] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsValidating(true);
    setError('');

    try {
      // Validate Solana address
      const pubKey = new PublicKey(destinationWallet);
      
      // Call parent's onSend with destination
      await onSend(destinationWallet);
      onClose();
    } catch (err) {
      setError('Error: ' + err.message);
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

const MultiSendModal = ({ isOpen, onClose, selectedNfts, nfts, onSend }) => {
  const [destinations, setDestinations] = useState({});  // Map of nftId -> wallet address
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState({});  // Map of nftId -> error message

  const handleSubmit = async () => {
    setIsValidating(true);
    setErrors({});

    try {
      // Validate all addresses
      const validatedDestinations = {};
      for (const nftId of selectedNfts) {
        const address = destinations[nftId];
        if (!address) {
          setErrors(prev => ({ ...prev, [nftId]: 'Address required' }));
          continue;
        }
        try {
          const pubKey = new PublicKey(address);
          validatedDestinations[nftId] = pubKey.toString();
        } catch (err) {
          setErrors(prev => ({ ...prev, [nftId]: 'Invalid address' }));
        }
      }

      if (Object.keys(errors).length === 0) {
        await onSend(validatedDestinations);
        onClose();
      }
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

  // Filter out any undefined NFTs
  const selectedNftDetails = Array.from(selectedNfts)
    .map(id => nfts.find(nft => nft.id === id))
    .filter(nft => nft !== undefined);

  const getNFTDisplayName = (nft) => {
    const { displayName } = getCollectionInfo(nft);
    return displayName;
  };

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
                {getNFTDisplayName(nft)}
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

const NFTCard = ({ nft, selected, onSelect }) => {
  return (
    <div 
      className="nft-card"
      style={{
        background: '#25262B',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        border: selected ? '2px solid #4287f5' : '2px solid transparent'
      }}
      onClick={onSelect}
    >
      <div style={{ position: 'relative' }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 2
          }}
        />
        {nft.compression?.compressed && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#4287f5',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            color: 'white',
            zIndex: 2
          }}>
            cNFT
          </div>
        )}
        <NFTImage nft={nft} />
      </div>
      <div style={{ padding: '10px', color: 'white' }}>
        <div>{nft.content?.metadata?.name || 'Unnamed NFT'}</div>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://solscan.io/token/${nft.id}`, '_blank');
          }}
          style={{
            cursor: 'pointer',
            color: '#4287f5',
            fontSize: '0.8em',
            marginTop: '5px'
          }}
        >
          View on Solscan
        </div>
      </div>
    </div>
  );
};

const NFTGrid = ({ nfts, loading, selectedNfts, setSelectedNfts, isWalletConnected }) => {
  // Group NFTs by collection
  const collections = useMemo(() => {
    const groups = {};
    nfts.forEach(nft => {
      // Use the existing getCollectionInfo function
      const { collectionName } = getCollectionInfo(nft);
      
      if (!groups[collectionName]) {
        groups[collectionName] = {
          nfts: [],
          collectionImage: nft.content?.links?.image,
          previewNft: nft,
          displayName: collectionName // Store the display name
        };
      }
      groups[collectionName].nfts.push(nft);
    });
    return groups;
  }, [nfts]);

  const [expandedCollection, setExpandedCollection] = useState(null);

  if (loading) return <div>Loading...</div>;
  if (!isWalletConnected) return <div>Connect your wallet to view NFTs</div>;
  if (nfts.length === 0) return <div>No NFTs found</div>;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '16px',
      padding: '16px'
    }}>
      {Object.entries(collections).map(([collectionName, collection]) => {
        // Calculate selection states
        const selectedInCollection = collection.nfts.filter(nft => selectedNfts.has(nft.id)).length;
        const isCollectionFullySelected = selectedInCollection === collection.nfts.length;
        const isCollectionPartiallySelected = selectedInCollection > 0;
        const isCollectionSelected = isCollectionFullySelected;

        return (
          expandedCollection === collectionName ? (
            // Expanded view of collection's NFTs
            <div key={collectionName} style={{
              gridColumn: '1 / -1',
              background: '#25262B',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                color: 'white'
              }}>
                <h3>{collectionName} ({collection.nfts.length})</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Select all NFTs in this collection
                      setSelectedNfts(prev => {
                        const next = new Set(prev);
                        collection.nfts.forEach(nft => next.add(nft.id));
                        return next;
                      });
                    }}
                    style={{
                      padding: '4px 12px',
                      background: '#4287f5',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => setExpandedCollection(null)}
                    style={{
                      padding: '4px 12px',
                      background: '#25262B',
                      border: '1px solid #4287f5',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                {collection.nfts.map(nft => (
                  <NFTCard
                    key={nft.id}
                    nft={nft}
                    selected={selectedNfts.has(nft.id)}
                    onSelect={() => {
                      setSelectedNfts(prev => {
                        const next = new Set(prev);
                        if (next.has(nft.id)) {
                          next.delete(nft.id);
                        } else {
                          next.add(nft.id);
                        }
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Collection card in grid
            <div 
              key={collectionName}
              style={{
                background: '#25262B',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                border: isCollectionSelected ? '2px solid #4287f5' : '2px solid transparent'
              }}
            >
              {/* Checkbox for collection selection */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const collectionNftIds = new Set(collection.nfts.map(nft => nft.id));
                  const isFullySelected = collection.nfts.every(nft => selectedNfts.has(nft.id));
                  
                  setSelectedNfts(prev => {
                    const next = new Set(prev);
                    collection.nfts.forEach(nft => {
                      if (isFullySelected) {
                        next.delete(nft.id);
                      } else {
                        next.add(nft.id);
                      }
                    });
                    return next;
                  });
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  zIndex: 2,
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  padding: '4px'
                }}
              >
                <input
                  type="checkbox"
                  checked={isCollectionFullySelected}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              {/* Selection indicator */}
              {isCollectionPartiallySelected && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#4287f5',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: 'white',
                  zIndex: 2
                }}>
                  {selectedInCollection}/{collection.nfts.length} Selected
                </div>
              )}

              <div onClick={() => setExpandedCollection(collectionName)}>
                <NFTImage nft={collection.previewNft} />
                <div style={{ 
                  padding: '10px', 
                  color: 'white',
                  background: '#1A1B1E'
                }}>
                  <div style={{ 
                    fontSize: '1.1em',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {collection.displayName}
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#888' }}>
                    {collection.nfts.length} NFTs
                  </div>
                </div>
              </div>
            </div>
          )
        );
      })}
    </div>
  );
};

export default NFTGrid; 