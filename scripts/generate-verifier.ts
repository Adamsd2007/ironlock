import { ethers } from "ethers";

const wallet = ethers.Wallet.createRandom();
console.log("Verifier Address:", wallet.address);
console.log("Verifier Private Key:", wallet.privateKey);
console.log("");
console.log("Add to .env.local:");
console.log("VERIFIER_PRIVATE_KEY=" + wallet.privateKey);
console.log("NEXT_PUBLIC_VERIFIER_ADDRESS=" + wallet.address);
