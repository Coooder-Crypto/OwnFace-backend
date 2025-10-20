import { keccak_256 } from "@noble/hashes/sha3";

const SCALE_FACTOR = 10_000;
const VECTOR_LENGTH = 16;

function parseNumericList(raw: string): number[] {
  const candidates = raw
    .replace(/\r/g, "\n")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (candidates.length === 0) {
    throw new Error("Embedding payload must contain numeric values");
  }

  return candidates;
}

export function quantizeEmbedding(embeddingBase64: string): number[] {
  if (!embeddingBase64) {
    throw new Error("Embedding payload is required");
  }

  const buffer = Buffer.from(embeddingBase64, "base64");
  const text = buffer.toString("utf8");

  let values: number[] | undefined;

  if (text.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        values = parsed
          .map(Number)
          .filter((value) => Number.isFinite(value));
      }
    } catch {
      values = undefined;
    }
  }

  if (!values || values.length === 0) {
    const numeric = parseNumericList(text);
    if (numeric.length > 0) {
      values = numeric;
    }
  }

  if (!values || values.length === 0) {
    values = deriveVectorFromBuffer(buffer);
  }

  const scaled = values.map((value) => Math.round(value * SCALE_FACTOR));

  const trimmed = scaled.slice(0, VECTOR_LENGTH);
  while (trimmed.length < VECTOR_LENGTH) {
    trimmed.push(0);
  }

  return trimmed;
}

function deriveVectorFromBuffer(buffer: Buffer): number[] {
  if (buffer.length === 0) {
    throw new Error("Embedding payload is empty");
  }

  const vector: number[] = [];
  let offset = 0;
  while (vector.length < VECTOR_LENGTH) {
    const chunk = buffer.subarray(offset, offset + 32);
    if (chunk.length === 0) {
      offset = 0;
      continue;
    }
    const hash = Buffer.from(keccak_256(chunk));
    for (let i = 0; i < hash.length && vector.length < VECTOR_LENGTH; i += 2) {
      const value = hash.readUInt16BE(i % (hash.length - 1));
      vector.push(value);
    }
    offset += 32;
  }
  return vector;
}
