// backend/src/services/pinata.js
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

const PINATA_BASE_URL = 'https://api.pinata.cloud';

/**
 * Upload a file to IPFS via Pinata
 * @param {string} filePath - Path to the file to upload
 * @param {string} fileName - Original filename
 * @returns {Promise<{success: boolean, ipfsHash: string, gatewayUrl: string}>}
 */
export async function uploadFileToPinata(filePath, fileName) {
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error('Pinata API keys not configured');
    }

    const formData = new FormData();

    // Add file
    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream, {
        filename: fileName,
        contentType: 'application/octet-stream'
    });

    // Add metadata
    const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
            uploadedAt: new Date().toISOString(),
            app: 'real-estate-tokenization'
        }
    });
    formData.append('pinataMetadata', metadata);

    // Pinning options
    const options = JSON.stringify({
        cidVersion: 1
    });
    formData.append('pinataOptions', options);

    try {
        const response = await axios.post(
            `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
            formData,
            {
                maxBodyLength: Infinity,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_KEY
                }
            }
        );

        const ipfsHash = response.data.IpfsHash;

        return {
            success: true,
            ipfsHash: ipfsHash,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            pinataUrl: `https://ipfs.io/ipfs/${ipfsHash}`
        };
    } catch (error) {
        console.error('Pinata upload error:', error.response?.data || error.message);
        throw new Error('Failed to upload to IPFS: ' + (error.response?.data?.message || error.message));
    }
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * @param {Object} jsonData - JSON object to upload
 * @param {string} name - Name for the metadata
 * @returns {Promise<{success: boolean, ipfsHash: string, gatewayUrl: string}>}
 */
export async function uploadJSONToPinata(jsonData, name = 'metadata') {
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error('Pinata API keys not configured');
    }

    try {
        const response = await axios.post(
            `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
            {
                pinataContent: jsonData,
                pinataMetadata: {
                    name: name,
                    keyvalues: {
                        uploadedAt: new Date().toISOString(),
                        app: 'real-estate-tokenization'
                    }
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_KEY
                }
            }
        );

        const ipfsHash = response.data.IpfsHash;

        return {
            success: true,
            ipfsHash: ipfsHash,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            pinataUrl: `https://ipfs.io/ipfs/${ipfsHash}`
        };
    } catch (error) {
        console.error('Pinata JSON upload error:', error.response?.data || error.message);
        throw new Error('Failed to upload JSON to IPFS: ' + (error.response?.data?.message || error.message));
    }
}

/**
 * Create and upload NFT metadata following ERC-721 standard
 * @param {Object} propertyData - Property data
 * @param {string} imageIpfsHash - IPFS hash of the property image
 * @returns {Promise<{success: boolean, metadataUrl: string}>}
 */
export async function createPropertyMetadata(propertyData, imageIpfsHash) {
    const metadata = {
        name: propertyData.title,
        description: propertyData.description,
        image: `ipfs://${imageIpfsHash}`,
        external_url: `https://blockestate.app/property/${propertyData.propertyId}`,
        attributes: [
            { trait_type: "Location", value: propertyData.location },
            { trait_type: "Property Type", value: propertyData.propertyType || "Residential" },
            { trait_type: "Total Shares", value: propertyData.totalShares.toString() },
            { trait_type: "Price Per Share", value: `${propertyData.pricePerShare} MATIC` },
            { trait_type: "Area", value: propertyData.area || "N/A" }
        ]
    };

    const result = await uploadJSONToPinata(metadata, `${propertyData.title}-metadata`);

    return {
        success: true,
        metadataUrl: result.gatewayUrl,
        metadataIpfsHash: result.ipfsHash,
        ipfsUri: `ipfs://${result.ipfsHash}`
    };
}

/**
 * Test Pinata connection
 */
export async function testPinataConnection() {
    try {
        const response = await axios.get(
            `${PINATA_BASE_URL}/data/testAuthentication`,
            {
                headers: {
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_KEY
                }
            }
        );
        return { success: true, message: response.data.message };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export default {
    uploadFileToPinata,
    uploadJSONToPinata,
    createPropertyMetadata,
    testPinataConnection
};
