import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const FEE_PER_NFT = process.env.REACT_APP_FEE_PER_NFT || 0.001;
export const FEE_COLLECTOR = new PublicKey(process.env.REACT_APP_FEE_COLLECTOR_ADDRESS);

export const calculateFee = (nftCount) => {
    return nftCount * FEE_PER_NFT;
};

export const createFeeInstruction = (fromPubkey, nftCount) => {
    const totalFee = calculateFee(nftCount);
    return SystemProgram.transfer({
        fromPubkey,
        toPubkey: FEE_COLLECTOR,
        lamports: totalFee * LAMPORTS_PER_SOL
    });
}; 