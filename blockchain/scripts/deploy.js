// blockchain/scripts/deploy.js
import pkg from 'hardhat';
const { ethers } = pkg;

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("🚀 Starting deployment to Polygon Amoy...\n");

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("📍 Deployer address:", deployer.address);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", ethers.formatEther(balance), "MATIC\n");

    if (balance < ethers.parseEther("0.01")) {
        console.error("❌ Insufficient balance! Need at least 0.01 MATIC for deployment.");
        console.log("   Get test MATIC from: https://faucet.polygon.technology/");
        process.exit(1);
    }

    // Deploy RealEstateMarketplace contract (new enhanced contract)
    console.log("📦 Deploying RealEstateMarketplace contract...");
    const RealEstateMarketplace = await ethers.getContractFactory("RealEstateMarketplace");
    const marketplace = await RealEstateMarketplace.deploy();

    await marketplace.waitForDeployment();
    const contractAddress = await marketplace.getAddress();

    console.log("✅ RealEstateMarketplace deployed to:", contractAddress);
    console.log("   Transaction hash:", marketplace.deploymentTransaction().hash);

    // Save deployment info
    const deploymentInfo = {
        network: "polygon-amoy",
        chainId: 80002,
        contractName: "RealEstateMarketplace",
        contractAddress: contractAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        txHash: marketplace.deploymentTransaction().hash,
        features: [
            "Primary property listing",
            "Fractional share purchases",
            "Resale marketplace",
            "Dynamic pricing (last resale)",
            "Average price calculation (last 10)",
            "Implied market value"
        ]
    };

    // Save to deployments folder
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, "amoy-deployment.json"),
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("📄 Deployment info saved to deployments/amoy-deployment.json");

    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("\n📝 Update these files with the new contract address:\n");
    console.log("   frontend/.env:");
    console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n   backend/.env:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n🔍 View on PolygonScan:");
    console.log(`   https://amoy.polygonscan.com/address/${contractAddress}`);
    console.log("\n📖 Contract Features:");
    console.log("   - listProperty() - Admin lists new properties");
    console.log("   - buyShares() - Primary market purchase");
    console.log("   - listSharesForResale() - List owned shares");
    console.log("   - buyFromResale() - Secondary market purchase (updates price!)");
    console.log("   - getMarketPrice() - Current price per share");
    console.log("   - getAverageResalePrice() - Average of last 10 resales");
    console.log("   - getImpliedMarketValue() - Total property value");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
