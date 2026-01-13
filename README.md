# AURELIAN - Realty Stocks On-Chain

## Description

AURELIAN is a blockchain-powered real estate tokenization platform that democratizes property investment by enabling fractional ownership through NFTs. The platform allows property owners to tokenize their real estate assets into tradable shares on the Polygon blockchain, while investors can purchase fractional ownership with amounts as low as 0.5 MATIC, eliminating traditional barriers like high capital requirements and illiquidity.

**Problem Solved:**
- High entry barriers in traditional real estate (requires lakhs of rupees)
- Illiquidity of real estate assets (takes months to sell)
- Limited access for retail investors to premium properties
- Lack of transparency in ownership verification

**Target Audience:**
- Young professionals seeking real estate exposure with limited capital
- Property owners wanting to unlock liquidity from their assets
- Investors looking for fractional, liquid real estate investments

---

## Demo Video Link

**[Watch Full Demo on Google Drive](https://drive.google.com/drive/folders/1xBBCFVAnQrmkR2Tve34ou4CSGzn9Wiam?usp=sharing)**

---

## Features

- **Fractional Property Ownership** – Buy shares of premium real estate starting from 0.5 MATIC
- **NFT-Based Verification** – Each property tokenized as ERC-721 NFT with fractional share tracking
- **IPFS Document Storage** – Property documents stored immutably on decentralized storage via Pinata
- **Secondary Marketplace** – Resell your shares to other investors with dynamic pricing
- **Real-time Portfolio Dashboard** – Track investments, shares owned, and current valuations
- **AI-Powered Chatbot** – Get instant answers about properties and blockchain using Gemini
- **Interactive Property Maps** – Google Maps integration for location-based discovery
- **Ownership Certificates** – Generate verifiable PDF certificates with blockchain proof
- **Admin Property Management** – Full workflow for property approval and minting
- **MetaMask Integration** – Secure wallet-based authentication and transactions
- **Low Gas Fees** – Polygon Amoy testnet transactions cost less than $0.01
- **Blockchain Transparency** – All transactions verifiable on PolygonScan

---

## Tech Stack

**Frontend:** React, Vite, TailwindCSS, Ethers.js, React Router, Leaflet

**Backend:** Node.js, Express.js, Multer, Axios

**Blockchain:** Solidity, Hardhat, OpenZeppelin, Polygon Amoy Testnet

**Storage & Database:** Firebase Firestore, Firebase Authentication, IPFS (Pinata), Google Cloud Storage

**Additional Tools:** Google Maps JavaScript API, jsPDF, Gemini API

---

## Google Technologies Used

> ⚠️ Using Google products is **mandatory** for this hackathon.

### Firebase Authentication
**Why we chose it:** Seamless integration with MetaMask wallet addresses for Web3 authentication. Provides built-in user management with secure UID system, eliminating the need for custom backend authentication. Supports email/password for non-crypto users and role-based access control for admin vs. investor user types.

### Firebase Firestore
**Why we chose it:** Real-time synchronization keeps property availability updated instantly across all clients when shares are purchased. Scalable NoSQL queries allow efficient filtering by location, price, and property type without complex backend logic. Offline support enables users to browse properties even without internet. Zero backend database setup reduces hackathon development time significantly.

### Google Maps JavaScript API
**Why we chose it:** Accurate geocoding converts property addresses to precise latitude/longitude coordinates. Interactive maps display property locations with custom markers for better visualization. Location picker component allows admins to visually select property locations during listing creation. Reverse geocoding converts coordinates back to human-readable addresses for display.

### Google Cloud Platform (GCP)
**Why we chose it:** Firebase Authentication and Firestore run on Google Cloud infrastructure, providing 99.95% uptime guarantee. Automatic scaling handles traffic spikes during hackathon demo presentations. Global CDN ensures fast property image loading from any geographic location. Integrated security includes DDoS protection and automatic SSL certificates.

---

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm installed
- MetaMask browser extension
- Polygon Amoy testnet MATIC (get from https://faucet.polygon.technology/)
- Firebase account (free tier)
- Pinata account (free tier)

### 1. Clone the repository
```bash
git clone https://github.com/Dinol-ino/WinterHackathon-FANTASTIC_4.git
cd WinterHackathon-FANTASTIC_4
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
```

Start backend:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
```

Start frontend:
```bash
npm run dev
```

### 4. Blockchain Deployment (Optional)
```bash
cd blockchain
npm install
npx hardhat run scripts/deploy.js --network amoy
```

### 5. Configure MetaMask
- Add Polygon Amoy Network (Chain ID: 80002, RPC: https://rpc-amoy.polygon.technology)
- Get test MATIC from https://faucet.polygon.technology/

### 6. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

---

## Team Members

- **Salim**
- **Shaman**
- **Rian**
- **Dinol**

---

**Built for Winter Hackathon 2026 | Team FANTASTIC4**