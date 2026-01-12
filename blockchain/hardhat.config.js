import { config } from "dotenv";
config();

import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    // Polygon Amoy Testnet (new testnet replacing Mumbai)
    amoy: {
      url: process.env.RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002
    },
    // Legacy Mumbai (deprecated but kept for reference)
    mumbai: {
      url: process.env.RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || ""
    }
  }
};
