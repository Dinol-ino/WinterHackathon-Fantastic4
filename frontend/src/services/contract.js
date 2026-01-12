// frontend/src/services/contract.js
import { ethers } from 'ethers';

// Contract ABI - matches RealEstateNFT.sol
export const REAL_ESTATE_ABI = [
    // Functions
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
        "inputs": [
            { "internalType": "uint256", "name": "_propertyId", "type": "uint256" },
            { "internalType": "uint256", "name": "_sharesToBuy", "type": "uint256" }
        ],
        "name": "buyShares",
        "outputs": [],
        "stateMutability": "payable",
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
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "name": "userShares",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
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
    // Events
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

// Contract address from environment
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// Polygon Amoy configuration
export const AMOY_CONFIG = {
    chainId: '0x13882', // 80002 in hex
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
    },
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/']
};

/**
 * Get contract instance with signer
 */
export function getContract(signer) {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0xYourDeployedContractAddressHere') {
        console.warn('Contract address not configured');
        return null;
    }
    return new ethers.Contract(CONTRACT_ADDRESS, REAL_ESTATE_ABI, signer);
}

/**
 * List new property on blockchain
 */
export async function listProperty(signer, pricePerShareMatic, totalShares, metadataUri) {
    const contract = getContract(signer);
    if (!contract) throw new Error('Contract not configured');

    const priceInWei = ethers.parseEther(pricePerShareMatic.toString());
    const tx = await contract.listProperty(priceInWei, totalShares, metadataUri);
    const receipt = await tx.wait();

    return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
    };
}

/**
 * Buy shares of a property
 */
export async function buyShares(signer, propertyId, sharesToBuy, totalCostMatic) {
    const contract = getContract(signer);
    if (!contract) throw new Error('Contract not configured');

    const costInWei = ethers.parseEther(totalCostMatic.toString());

    const tx = await contract.buyShares(propertyId, sharesToBuy, { value: costInWei });
    const receipt = await tx.wait();

    return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
    };
}

/**
 * Get property details from blockchain
 */
export async function getProperty(provider, propertyId) {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, REAL_ESTATE_ABI, provider);
    const property = await contract.properties(propertyId);

    return {
        id: property.id.toString(),
        pricePerShare: ethers.formatEther(property.pricePerShare),
        totalShares: property.totalShares.toString(),
        sharesSold: property.sharesSold.toString(),
        availableShares: (property.totalShares - property.sharesSold).toString(),
        owner: property.owner,
        isActive: property.isActive
    };
}

/**
 * Get user's shares for a property
 */
export async function getUserShares(provider, propertyId, userAddress) {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, REAL_ESTATE_ABI, provider);
    const shares = await contract.userShares(propertyId, userAddress);
    return shares.toString();
}

/**
 * Check if MetaMask is on correct network
 */
export async function checkNetwork() {
    if (!window.ethereum) return { correct: false, error: 'No wallet detected' };

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return {
        correct: chainId === AMOY_CONFIG.chainId,
        currentChainId: chainId,
        requiredChainId: AMOY_CONFIG.chainId
    };
}

/**
 * Switch to Polygon Amoy network
 */
export async function switchToAmoy() {
    if (!window.ethereum) throw new Error('No wallet detected');

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: AMOY_CONFIG.chainId }]
        });
        return { success: true };
    } catch (switchError) {
        if (switchError.code === 4902) {
            // Add network
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [AMOY_CONFIG]
            });
            return { success: true, added: true };
        }
        throw switchError;
    }
}

export default {
    REAL_ESTATE_ABI,
    CONTRACT_ADDRESS,
    AMOY_CONFIG,
    getContract,
    listProperty,
    buyShares,
    getProperty,
    getUserShares,
    checkNetwork,
    switchToAmoy
};
