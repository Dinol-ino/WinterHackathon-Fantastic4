// backend/src/controllers/admin.controller.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

exports.uploadToIPFS = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 1. Prepare file for Pinata
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path));
    
    // 2. Upload to Pinata
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
        },
      }
    );

    // 3. Return the public IPFS URL
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    res.json({ success: true, url: ipfsUrl });

  } catch (error) {
    console.error("IPFS Upload Error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};