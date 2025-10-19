import { createHash } from "node:crypto";

const SCALE_FACTOR = 10_000;

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
      if (!Array.isArray(parsed)) {
        throw new Error("Parsed embedding is not an array");
      }

      values = parsed
        .map(Number)
        .filter((value) => Number.isFinite(value));
    } catch (error) {
      throw new Error(
        `Failed to parse embedding JSON: ${(error as Error).message}`,
      );
    }
  } else {
    values = parseNumericList(text);
  }

  if (!values || values.length === 0) {
    throw new Error("Embedding payload is empty after parsing");
  }

  return values.map((value) => Math.round(value * SCALE_FACTOR));
}

export function computeCommitment(vector: number[]): string {
  if (vector.length === 0) {
    throw new Error("Vector must not be empty");
  }

  const digest = createHash("sha256")
    .update(Buffer.from(vector.join(","), "utf8"))
    .digest("hex");

  return digest;
}

export function evaluateAuthentication(
  referenceVector: number[],
  candidateVector: number[],
) {
  if (referenceVector.length !== candidateVector.length) {
    throw new Error("Embedding length mismatch between registration and candidate");
  }

  const squaredDistance = referenceVector.reduce((total, value, index) => {
    const diff = value - candidateVector[index];
    return total + diff * diff;
  }, 0);

  const threshold = referenceVector.length * 2_500_000;
  const accepted = squaredDistance <= threshold;

  const digest = createHash("sha256")
    .update(JSON.stringify({ referenceVector, candidateVector }))
    .digest("hex");

  return {
    accepted,
    squaredDistance,
    threshold,
    transcriptDigest: digest,
  };
}
