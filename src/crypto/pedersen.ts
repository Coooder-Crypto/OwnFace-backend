import { randomBytes } from "node:crypto";
import { keccak_256 } from "@noble/hashes/sha3";
import { bn254 } from "@noble/curves/bn254";

const ORDER = bn254.CURVE.n;
const G = bn254.G1.ProjectivePoint.BASE;
const H = bn254.G1.ProjectivePoint.hashToCurve("biozero-pedersen-h");

function modScalar(value: bigint): bigint {
  const result = value % ORDER;
  return result >= 0n ? result : result + ORDER;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return bytes.reduce((acc, byte) => (acc << 8n) + BigInt(byte), 0n);
}

export function hashVectorToScalar(vector: number[]): bigint {
  const buffer = Buffer.from(vector.join(","), "utf8");
  return modScalar(bytesToBigInt(buffer));
}

export function pedersenCommit(vector: number[]): {
  commitmentHash: string;
  commitmentPoint: string;
  blinding: string;
} {
  const messageScalar = hashVectorToScalar(vector);
  const blindingScalar = modScalar(bytesToBigInt(randomBytes(32)));

  const commitmentPoint = G.multiply(messageScalar).add(H.multiply(blindingScalar));
  const compressed = commitmentPoint.toRawBytes(true);
  const commitmentHash = `0x${Buffer.from(keccak_256(compressed)).toString("hex")}`;

  return {
    commitmentHash,
    commitmentPoint: `0x${Buffer.from(compressed).toString("hex")}`,
    blinding: `0x${blindingScalar.toString(16).padStart(64, "0")}`,
  };
}
