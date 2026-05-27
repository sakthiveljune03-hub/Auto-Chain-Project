const hre = require("hardhat");

async function main() {
  console.log("Deploying CarAuction contract...");

  const carAuction = await hre.ethers.deployContract("CarAuction");

  await carAuction.waitForDeployment();

  console.log(`CarAuction deployed to: ${carAuction.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
