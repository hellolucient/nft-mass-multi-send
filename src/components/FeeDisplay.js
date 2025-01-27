import React from 'react';
import { calculateFee, FEE_PER_NFT } from '../utils/fees';

const FeeDisplay = ({ nftCount }) => {
    const fee = calculateFee(nftCount);
    
    return (
        <div style={{ 
            marginTop: '12px',
            fontSize: '14px',
            color: '#888'
        }}>
            Fee: {fee} SOL ({FEE_PER_NFT} × {nftCount} NFTs)
        </div>
    );
};

export default FeeDisplay; 