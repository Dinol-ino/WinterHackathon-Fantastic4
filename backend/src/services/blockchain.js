// backend/src/services/blockchain.js
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// RealEstate Contract ABI (minimal for backend operations)
const REAL_ESTATE_ABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "_pricePerShare", "type": "uint256" },
            { "internalType": "uint256", "name": "_totalShares", "type": "uint256" },
            { "internalType": "string", "name": "_tokenURI", "type": "string" }
        ],
        "name": "listProperty",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "properties",
        "outputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "uint256", "name": "pricePerShare", "type": "uint256" },
            { "internalType": "uint256", "name": "totalShares", "type": "uint256" },
            { "internalType": "uint256", "name": "sharesSold", "type": "uint256" },
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "bool", "name": "isActive", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "nextPropertyId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "pricePerShare", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "totalShares", "type": "uint256" }
        ],
        "name": "PropertyListed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "shares", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amountSpent", "type": "uint256" }
        ],
        "name": "SharesPurchased",
        "type": "event"
    }
];

// Contract address - update after deployment
let CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || null;

/**
 * Get provider for Polygon Amoy
 */
export function getProvider() {
    const rpcUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
    return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get admin wallet (signer)
 */
export function getAdminWallet() {
    const provider = getProvider();
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error('Admin private key not configured');
    }

    return new ethers.Wallet(privateKey, provider);
}

/**
 * Get contract instance
 */
export function getContract(signerOrProvider = null) {
    if (!CONTRACT_ADDRESS) {
        throw new Error('Contract address not configured. Deploy the contract first.');
    }

    const provider = signerOrProvider || getProvider();
    return new ethers.Contract(CONTRACT_ADDRESS, REAL_ESTATE_ABI, provider);
}

/**
 * Set contract address (after deployment)
 */
export function setContractAddress(address) {
    CONTRACT_ADDRESS = address;
}

/**
 * List property on blockchain (admin only)
 */
export async function listPropertyOnChain(pricePerShareMatic, totalShares, metadataUri) {
    const wallet = getAdminWallet();
    const contract = getContract(wallet);

    // Convert MATIC to Wei
    const priceInWei = ethers.parseEther(pricePerShareMatic.toString());

    const tx = await contract.listProperty(priceInWei, totalShares, metadataUri);
    const receipt = await tx.wait();

    // Get property ID from event
    const event = receipt.logs.find(log => {
        try {
            const parsed = contract.interface.parseLog(log);
            return parsed.name === 'PropertyListed';
        } catch {
            return false;
        }
    });

    let propertyId = null;
    if (event) {
        const parsed = contract.interface.parseLog(event);
        propertyId = parsed.args.id.toString();
    }

    return {
        success: true,
        txHash: receipt.hash,
        propertyId: propertyId,
        blockNumber: receipt.blockNumber
    };
}

/**
 * Get property details from blockchain
 */
export async function getPropertyFromChain(propertyId) {
    const contract = getContract();
    const property = await contract.properties(propertyId);

    return {
        id: property.id.toString(),
        pricePerShare: ethers.formatEther(property.pricePerShare),
        totalShares: property.totalShares.toString(),
        sharesSold: property.sharesSold.toString(),
        owner: property.owner,
        isActive: property.isActive
    };
}

/**
 * Get total number of properties
 */
export async function getPropertyCount() {
    const contract = getContract();
    const count = await contract.nextPropertyId();
    return count.toString();
}

/**
 * Check network connection
 */
export async function checkConnection() {
    try {
        const provider = getProvider();
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();

        return {
            connected: true,
            network: network.name,
            chainId: network.chainId.toString(),
            blockNumber: blockNumber
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
}

export default {
    getProvider,
    getAdminWallet,
    getContract,
    setContractAddress,
    listPropertyOnChain,
    getPropertyFromChain,
    getPropertyCount,
    checkConnection,
    REAL_ESTATE_ABI
};
