# NFT Mass Multi Send - API City Service

Part of the API City ecosystem, this service provides a user interface and API endpoints for mass sending Solana NFTs to multiple wallet addresses.

## Features
- Bulk send NFTs to a single wallet
- Multi-send NFTs to different wallets
- Support for regular and compressed NFTs
- Collection grouping and management
- Helius RPC integration

## Tech Stack
- React (Frontend)
- Solana Web3.js
- Helius API
- Railway (Deployment)

## Environment Variables
```env
REACT_APP_HELIUS_API_KEY=your_helius_api_key
REACT_APP_HELIUS_RPC_URL=your_helius_rpc_url
```

## API Endpoints
This service will expose the following API endpoints:
- `POST /api/send-bulk` - Send multiple NFTs to one address
- `POST /api/send-multi` - Send NFTs to multiple addresses

## Development
```bash
npm install
npm start
```

## Deployment
Automatically deployed via Railway on push to main branch.
