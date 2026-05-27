import { ethers } from "ethers";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "11155111"); 

// Minimal ABI just for placing bids. If we need more, we can add it.
const ABI = [
  "function placeBid(uint256 tokenId) external payable",
  "function listCar(uint256 startPrice) external returns (uint256)",
  "function endAuction(uint256 tokenId) external"
];

export async function getProvider() {
  if (!window.ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask.");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function placeBid(tokenId, amountEth) {
  // ─── Simulation Mode logic ────────────────────────────────────────────────
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("⚠️  Simulation Mode Active: Missing smart contract address. Transactions are mocked.");
    
    // Simulate mining delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { 
      txHash: `0xmock_${Math.random().toString(16).slice(2)}`, 
      blockNumber: 1234567 
    };
  }
  // ──────────────────────────────────────────────────────────────────────────

  const provider = await getProvider();
  
  // Request account connection if not connected
  await provider.send("eth_requestAccounts", []);
  
  const network = await provider.getNetwork();
  if (BigInt(network.chainId) !== BigInt(CHAIN_ID)) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (err) {
      if (err.code === 4902) {
        throw new Error(`Chain ID ${CHAIN_ID} not found in MetaMask. Please add it first.`);
      }
      throw new Error(`Please switch MetaMask to network chain ID ${CHAIN_ID}`);
    }
  }

  // Get signer and contract after potential network switch
  const freshProvider = new ethers.BrowserProvider(window.ethereum);
  const signer = await freshProvider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  // Convert exact ETH amount to WEI string
  const amountWei = ethers.parseEther(amountEth.toString());
  
  // Call smart contract
  const tx = await contract.placeBid(tokenId, { value: amountWei });
  
  // Wait for confirmation
  const receipt = await tx.wait();
  
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function endAuctionOnChain(tokenId) {
  // ─── Simulation Mode logic ────────────────────────────────────────────────
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("⚠️  Simulation Mode: Completing transfer on-chain (mocked).");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { txHash: `0xtransfer_${Math.random().toString(16).slice(2)}` };
  }
  // ──────────────────────────────────────────────────────────────────────────

  const provider = await getProvider();
  await provider.send("eth_requestAccounts", []);
  
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const tx = await contract.endAuction(tokenId);
  const receipt = await tx.wait();
  
  return { txHash: receipt.hash };
}
