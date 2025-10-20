import { ethers } from "ethers";
import { keccak_256 } from "@noble/hashes/sha3";

const REGISTRY_ABI = [
  "function register(bytes32 userIdHash, bytes32 commitmentHash, bytes32 nonceHash, bytes commitmentPoint, bytes32 blinding) external",
  "function authenticate(bytes32 userIdHash, bool accepted, uint256 distance, uint256 threshold, bytes32 transcriptDigest, bytes32 proofHash) external"
];

type HexString = `0x${string}`;

function toBytes32(value: HexString): string {
  if (value.length !== 66) {
    throw new Error(`Expected 32-byte hex string, received length ${value.length}`);
  }
  return value;
}

function hashToBytes32(input: string): string {
  const digest = keccak_256(Buffer.from(input, "utf8"));
  return `0x${Buffer.from(digest).toString("hex")}`;
}

export interface RegistryClient {
  register(input: {
    userId: string;
    commitmentHash: string;
    commitmentPoint: string;
    blinding: string;
    nonceHash: string;
  }): Promise<void>;
  authenticate(input: {
    userId: string;
    accepted: boolean;
    distance: number;
    threshold: number;
    transcriptDigest: string;
    proofHash: string;
  }): Promise<void>;
}

let cachedClient: RegistryClient | null = null;

export function getRegistryClient(): RegistryClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const rpcUrl = process.env.CHAIN_RPC_URL;
  const privateKey = process.env.CHAIN_PRIVATE_KEY;
  const contractAddress = process.env.REGISTRY_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, REGISTRY_ABI, wallet);

  cachedClient = {
    async register({ userId, commitmentHash, commitmentPoint, blinding, nonceHash }) {
      const userIdHash = hashToBytes32(userId);
      await contract.register(
        userIdHash,
        toBytes32(commitmentHash as HexString),
        toBytes32(nonceHash as HexString),
        ethers.getBytes(commitmentPoint),
        toBytes32(blinding as HexString),
      );
    },

    async authenticate({ userId, accepted, distance, threshold, transcriptDigest, proofHash }) {
      const userIdHash = hashToBytes32(userId);
      await contract.authenticate(
        userIdHash,
        accepted,
        distance,
        threshold,
        toBytes32(transcriptDigest as HexString),
        toBytes32(proofHash as HexString),
      );
    },
  };

  return cachedClient;
}
