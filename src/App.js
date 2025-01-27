import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { useMemo, useState, useEffect } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';
import NFTGrid from './components/NFTGrid';
import { PublicKey, Transaction, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import BulkSendModal from './components/BulkSendModal';
import MultiSendModal from './components/MultiSendModal';
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { getAssetWithProof, transfer } from '@metaplex-foundation/mpl-bubblegum';
import { createFeeInstruction } from './utils/fees';

function App() {
  // Use REACT_APP_HELIUS_RPC_URL directly
  const endpoint = process.env.REACT_APP_HELIUS_RPC_URL;
  
  if (!endpoint) {
    throw new Error('Missing RPC endpoint! Check your .env file');
  }

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({ detached: true }),
      new SolflareWalletAdapter()
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Separate component to use wallet hooks
function AppContent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNfts, setSelectedNfts] = useState(new Set());
  const [showBulkSendModal, setShowBulkSendModal] = useState(false);
  const [showMultiSendModal, setShowMultiSendModal] = useState(false);
  const [hideCNFTs, setHideCNFTs] = useState(true); // Default to hiding cNFTs

  const publicKey = wallet?.publicKey;
  const isWalletConnected = wallet?.connected;

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!publicKey) return;
      
      setLoading(true);
      try {
        let allNfts = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            process.env.REACT_APP_HELIUS_RPC_URL,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: `my-id-${page}`,
                method: 'getAssetsByOwner',
                params: {
                  ownerAddress: publicKey.toString(),
                  page: page,
                  limit: 1000,
                }
              })
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.result?.items) {
            allNfts = [...allNfts, ...data.result.items];
            hasMore = data.result.items.length === 1000;
            page++;
          } else {
            hasMore = false;
          }
        }

        setNfts(allNfts);
      } catch (error) {
        console.error('Error fetching NFTs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [publicKey]);

  const handleSendNFTs = async (destinationAddress) => {
    if (!wallet?.connected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const isMultiSend = typeof destinationAddress === 'object';
      const transaction = new Transaction();
      const errors = [];

      const hexToUint8Array = (hex) => {
        if (!hex) return null;
        // remove '0x' if present
        hex = hex.replace('0x', '');
        // ensure even length
        if (hex.length % 2 !== 0) hex = '0' + hex;
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          arr[i/2] = parseInt(hex.substr(i, 2), 16);
        }
        return arr;
      };

      const padArray = (arr, length, fill) => {
        if (arr.length >= length) return arr;
        return [...arr, ...Array(length - arr.length).fill(fill)];
      };

      const processNFT = async (nftId, destAddress) => {
        const nft = nfts.find(n => n.id === nftId);
        if (!nft) {
          errors.push(`NFT ${nftId} not found`);
          return;
        }

        const destination = new PublicKey(destAddress);

        try {
          if (nft.compression?.compressed) {
            try {
              // Get transfer instructions from Helius
              const response = await fetch(
                process.env.REACT_APP_HELIUS_RPC_URL,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'my-id',
                    method: 'transferCompressedNft',
                    params: {
                      assetId: nftId,
                      sourceOwner: wallet.publicKey.toString(),
                      destinationOwner: destination.toString(),
                      compressionProgram: 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK',
                    },
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to get transfer instructions: ${response.status}`);
              }

              const { result } = await response.json();
              
              if (!result) {
                throw new Error('No transfer instructions returned');
              }

              // Convert base64 instructions to Transaction
              const transferIx = Transaction.from(Buffer.from(result, 'base64'));
              
              // Add all instructions from the returned transaction
              transferIx.instructions.forEach(ix => {
                transaction.add(ix);
              });

            } catch (err) {
              console.error('Error details:', err);
              errors.push(`Error processing NFT ${nftId}: ${err.message}`);
            }
          } else {
            // For regular NFTs
            const mint = new PublicKey(nftId);
            const sourceATA = await getAssociatedTokenAddress(mint, wallet.publicKey);
            const destinationATA = await getAssociatedTokenAddress(mint, destination);

            const sourceAccount = await connection.getAccountInfo(sourceATA);
            if (!sourceAccount) {
              errors.push(`Source token account not found for NFT ${nftId}`);
              return;
            }

            const destinationAccount = await connection.getAccountInfo(destinationATA);
            if (!destinationAccount) {
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  wallet.publicKey,
                  destinationATA,
                  destination,
                  mint
                )
              );
            }

            transaction.add(
              createTransferInstruction(
                sourceATA,
                destinationATA,
                wallet.publicKey,
                1
              )
            );
          }
        } catch (err) {
          console.error('Error details:', err);
          errors.push(`Error processing NFT ${nftId}: ${err.message}`);
        }
      };

      // Just process NFTs directly
      if (isMultiSend) {
        for (const [nftId, destAddress] of Object.entries(destinationAddress)) {
          await processNFT(nftId, destAddress);
        }
      } else {
        for (const nftId of selectedNfts) {
          await processNFT(nftId, destinationAddress);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Failed to process some NFTs:\n${errors.join('\n')}`);
      }

      if (transaction.instructions.length === 0) {
        throw new Error('No valid NFTs to transfer');
      }

      // Add fee instruction at the beginning of transaction
      const feeInstruction = createFeeInstruction(
        wallet.publicKey,
        selectedNfts.size
      );
      transaction.instructions.unshift(feeInstruction);

      // Get blockhash and set fee payer last
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signature = await wallet.sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);
      
      const confirmation = await connection.confirmTransaction(signature, {
        commitment: 'confirmed',
        maxRetries: 3
      });
      
      console.log('Transaction confirmation:', confirmation);

      if (confirmation.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      } else if (!confirmation.context?.slot) {
        throw new Error('Transaction confirmation failed');
      } else {
        // Transaction succeeded
        setSelectedNfts(new Set());
        setShowBulkSendModal(false);
        setShowMultiSendModal(false);
        alert(`NFTs transferred successfully! Signature: ${signature}`);
      }

    } catch (error) {
      console.error('Error sending NFTs:', error);
      alert(`Failed to transfer NFTs: ${error.message}`);
    }
  };

  // Filter NFTs based on hideCNFTs setting
  const filteredNfts = useMemo(() => {
    return nfts.filter(nft => !hideCNFTs || !nft.compression?.compressed);
  }, [nfts, hideCNFTs]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Solana NFT Sender</h1>
        <WalletMultiButton />
      </header>

      <div id="send-actions" style={{
        maxWidth: '600px',
        margin: '20px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#1A1B1E',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{ color: 'white' }}>
            {selectedNfts.size > 0 ? `${selectedNfts.size} NFTs selected` : 'No NFTs selected'}
          </div>
          <button 
            onClick={() => {
              if (selectedNfts.size > 0 && wallet?.connected) {
                setShowBulkSendModal(true);
              } else if (!wallet?.connected) {
                alert('Please connect your wallet first');
              }
            }}
            disabled={selectedNfts.size === 0 || !wallet?.connected}
            style={{
              padding: '8px 16px',
              background: (selectedNfts.size === 0 || !wallet?.connected) ? '#1A1B1E' : '#4287f5',
              color: 'white',
              border: (selectedNfts.size === 0 || !wallet?.connected) ? '1px solid #333' : 'none',
              borderRadius: '4px',
              cursor: (selectedNfts.size === 0 || !wallet?.connected) ? 'not-allowed' : 'pointer',
              opacity: (selectedNfts.size === 0 || !wallet?.connected) ? 0.5 : 1
            }}
          >
            Send All to One Wallet
          </button>
          <button
            onClick={() => {
              if (selectedNfts.size > 0 && wallet?.connected) {
                setShowMultiSendModal(true);
              } else if (!wallet?.connected) {
                alert('Please connect your wallet first');
              }
            }}
            disabled={selectedNfts.size === 0 || !wallet?.connected}
            style={{
              padding: '8px 16px',
              background: '#25262B',
              color: 'white',
              border: '1px solid #4287f5',
              borderRadius: '4px',
              cursor: (selectedNfts.size === 0 || !wallet?.connected) ? 'not-allowed' : 'pointer',
              opacity: (selectedNfts.size === 0 || !wallet?.connected) ? 0.5 : 1
            }}
          >
            Send to Multiple Wallets
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '8px',
          color: '#888',
          fontSize: '0.85em',
          marginTop: '4px'
        }}>
          <input
            type="checkbox"
            checked={hideCNFTs}
            onChange={(e) => setHideCNFTs(e.target.checked)}
            id="hideCNFTs"
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="hideCNFTs" style={{ cursor: 'pointer' }}>
            Hide Compressed NFTs
          </label>
        </div>
      </div>

      <main>
        <NFTGrid 
          nfts={filteredNfts}
          loading={loading}
          selectedNfts={selectedNfts}
          setSelectedNfts={setSelectedNfts}
          onSendNFTs={handleSendNFTs}
          connection={connection}
          publicKey={publicKey}
          isWalletConnected={isWalletConnected}
        />
      </main>

      {showBulkSendModal && isWalletConnected && (
        <BulkSendModal
          isOpen={showBulkSendModal}
          onClose={() => setShowBulkSendModal(false)}
          selectedNfts={selectedNfts}
          onSend={handleSendNFTs}
        />
      )}

      {showMultiSendModal && (
        <MultiSendModal
          isOpen={showMultiSendModal}
          onClose={() => setShowMultiSendModal(false)}
          selectedNfts={selectedNfts}
          nfts={nfts}
          onSend={handleSendNFTs}
        />
      )}
    </div>
  );
}

export default App;
