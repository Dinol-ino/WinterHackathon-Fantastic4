// backend/src/services/resaleUtils.js
/**
 * Resale Marketplace Utility Functions
 * 
 * Calculates pricing metrics for the secondary market:
 * - Last resale price (current market price)
 * - Average of last N resales (market trends)
 * - Implied market value (price × total shares)
 */

import { ethers } from 'ethers';
import { getProvider } from './blockchain.js';

// ABI for pricing functions (matches RealEstateMarketplace contract)
const PRICING_ABI = [
    {
        "inputs": [{ "name": "_propertyId", "type": "uint256" }],
        "name": "getMarketPrice",
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_propertyId", "type": "uint256" }],
        "name": "getInitialPrice",
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_propertyId", "type": "uint256" }],
        "name": "getAverageResalePrice",
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_propertyId", "type": "uint256" }],
        "name": "getImpliedMarketValue",
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_propertyId", "type": "uint256" }],
        "name": "getResaleCount",
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
];

/**
 * Get the last resale price (current market price)
 * This is the price from the most recent completed resale transaction.
 * If no resales have occurred, returns the initial listing price.
 * 
 * @param {string} contractAddress - Deployed contract address
 * @param {number} propertyId - Property ID to query
 * @returns {Promise<{priceWei: string, priceMatic: string, isInitialPrice: boolean}>}
 */
export async function getLastResalePrice(contractAddress, propertyId) {
    const provider = getProvider();
    const contract = new ethers.Contract(contractAddress, PRICING_ABI, provider);

    // Get current market price (last resale or initial)
    const marketPriceWei = await contract.getMarketPrice(propertyId);
    const initialPriceWei = await contract.getInitialPrice(propertyId);
    const resaleCount = await contract.getResaleCount(propertyId);

    const isInitialPrice = resaleCount.toString() === '0';

    return {
        priceWei: marketPriceWei.toString(),
        priceMatic: ethers.formatEther(marketPriceWei),
        initialPriceWei: initialPriceWei.toString(),
        initialPriceMatic: ethers.formatEther(initialPriceWei),
        resaleCount: parseInt(resaleCount.toString()),
        isInitialPrice: isInitialPrice,
        priceSource: isInitialPrice ? 'Initial Listing' : 'Last Resale'
    };
}

/**
 * Get average price based on last N completed resales
 * Shows market trends over recent transactions.
 * 
 * @param {string} contractAddress - Deployed contract address
 * @param {number} propertyId - Property ID to query
 * @returns {Promise<{averageWei: string, averageMatic: string, sampleSize: number}>}
 */
export async function getAveragePrice(contractAddress, propertyId) {
    const provider = getProvider();
    const contract = new ethers.Contract(contractAddress, PRICING_ABI, provider);

    const averagePriceWei = await contract.getAverageResalePrice(propertyId);
    const resaleCount = await contract.getResaleCount(propertyId);

    // The contract tracks up to 10 resales for average calculation
    const sampleSize = Math.min(parseInt(resaleCount.toString()), 10);

    return {
        averageWei: averagePriceWei.toString(),
        averageMatic: ethers.formatEther(averagePriceWei),
        sampleSize: sampleSize,
        note: sampleSize === 0
            ? 'No resales yet, using initial price'
            : `Average of last ${sampleSize} resale(s)`
    };
}

/**
 * Calculate implied market value of the entire property
 * Formula: currentPrice × totalShares
 * 
 * @param {string} contractAddress - Deployed contract address
 * @param {number} propertyId - Property ID to query
 * @returns {Promise<{valueWei: string, valueMatic: string}>}
 */
export async function getImpliedMarketValue(contractAddress, propertyId) {
    const provider = getProvider();
    const contract = new ethers.Contract(contractAddress, PRICING_ABI, provider);

    const valueWei = await contract.getImpliedMarketValue(propertyId);

    return {
        valueWei: valueWei.toString(),
        valueMatic: ethers.formatEther(valueWei)
    };
}

/**
 * Get complete pricing summary for a property
 * Combines all pricing metrics in one call
 * 
 * @param {string} contractAddress - Deployed contract address
 * @param {number} propertyId - Property ID to query
 * @returns {Promise<Object>} Complete pricing data
 */
export async function getPropertyPricingSummary(contractAddress, propertyId) {
    const [lastPrice, avgPrice, marketValue] = await Promise.all([
        getLastResalePrice(contractAddress, propertyId),
        getAveragePrice(contractAddress, propertyId),
        getImpliedMarketValue(contractAddress, propertyId)
    ]);

    // Calculate price change from initial
    const currentPrice = parseFloat(lastPrice.priceMatic);
    const initialPrice = parseFloat(lastPrice.initialPriceMatic);
    const priceChange = currentPrice - initialPrice;
    const priceChangePercent = initialPrice > 0
        ? ((priceChange / initialPrice) * 100).toFixed(2)
        : 0;

    return {
        propertyId: propertyId,

        // Current pricing
        currentPrice: {
            wei: lastPrice.priceWei,
            matic: lastPrice.priceMatic,
            source: lastPrice.priceSource
        },

        // Reference pricing
        initialPrice: {
            wei: lastPrice.initialPriceWei,
            matic: lastPrice.initialPriceMatic
        },

        // Market trends
        averagePrice: {
            wei: avgPrice.averageWei,
            matic: avgPrice.averageMatic,
            sampleSize: avgPrice.sampleSize,
            note: avgPrice.note
        },

        // Total property value
        impliedMarketValue: {
            wei: marketValue.valueWei,
            matic: marketValue.valueMatic
        },

        // Price movement
        priceChange: {
            absolute: priceChange.toFixed(6),
            percent: priceChangePercent,
            direction: priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'unchanged'
        },

        // Metadata
        resaleCount: lastPrice.resaleCount,
        timestamp: new Date().toISOString()
    };
}

/**
 * Calculate price from Firestore resale history (offline calculation)
 * Useful when contract is not deployed or for caching
 * 
 * @param {Array} resaleHistory - Array of {price, timestamp} objects
 * @param {number} n - Number of recent sales to average
 * @returns {Object} Calculated pricing metrics
 */
export function calculateOfflinePricing(resaleHistory, n = 10) {
    if (!resaleHistory || resaleHistory.length === 0) {
        return {
            lastPrice: null,
            averagePrice: null,
            priceCount: 0
        };
    }

    // Sort by timestamp descending (most recent first)
    const sorted = [...resaleHistory].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Last N for average
    const lastN = sorted.slice(0, n);
    const sum = lastN.reduce((acc, sale) => acc + parseFloat(sale.price), 0);
    const average = sum / lastN.length;

    return {
        lastPrice: parseFloat(sorted[0].price),
        averagePrice: average,
        priceCount: resaleHistory.length,
        sampleSize: lastN.length
    };
}

export default {
    getLastResalePrice,
    getAveragePrice,
    getImpliedMarketValue,
    getPropertyPricingSummary,
    calculateOfflinePricing
};
