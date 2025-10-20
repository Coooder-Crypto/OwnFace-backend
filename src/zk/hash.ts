import { buildPoseidon } from "circomlibjs";
import { SNARK_FIELD } from "./constants.js";

const poseidonInstancePromise = buildPoseidon();

function normalizeToField(value: number | bigint): bigint {
  const bigintValue = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  const modded = bigintValue % SNARK_FIELD;
  return modded >= 0n ? modded : modded + SNARK_FIELD;
}

async function getPoseidon() {
  return poseidonInstancePromise;
}

export async function poseidonHashVector(values: number[] | bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon();
  let acc = 0n;
  for (const value of values) {
    acc = poseidon([acc, normalizeToField(value)]);
  }
  // poseidon already returns field element; normalize for safety
  return normalizeToField(acc);
}

export async function poseidonHashTranscript(options: {
  referenceHash: bigint;
  candidateHash: bigint;
  threshold: number | bigint;
  distance: number | bigint;
}): Promise<bigint> {
  const poseidon = await getPoseidon();
  const input = [
    normalizeToField(options.referenceHash),
    normalizeToField(options.candidateHash),
    normalizeToField(options.threshold),
    normalizeToField(options.distance),
  ];
  const result = poseidon(input);
  return normalizeToField(result);
}

export function fieldToHex(value: bigint): `0x${string}` {
  return `0x${normalizeToField(value).toString(16).padStart(64, "0")}`;
}

export function fieldToDecimal(value: bigint): string {
  return normalizeToField(value).toString();
}
