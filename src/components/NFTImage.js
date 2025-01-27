import React, { useState, useEffect } from 'react';

const imageCache = new Map();
const metadataCache = new Map();

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
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

    // Instead of fetching to validate, just try to load the image
    const url = possibleUrls[0]; // Try first URL
    if (!url) return 'placeholder.png';

    const httpsUrl = url.startsWith('ipfs://')
      ? url.replace('ipfs://', 'https://ipfs.io/ipfs/')
      : url;

    imageCache.set(nft.id, httpsUrl);
    return httpsUrl;

  } catch (error) {
    console.error('Error getting image URL:', error);
    return 'placeholder.png';
  }
};

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
    return (
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: '#25262B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Error
      </div>
    );
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

export default NFTImage; 