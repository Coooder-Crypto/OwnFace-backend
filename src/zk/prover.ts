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

  const scaled = values.map((value) => Math.round(value * SCALE_FACTOR));

  const trimmed = scaled.slice(0, VECTOR_LENGTH);
  while (trimmed.length < VECTOR_LENGTH) {
    trimmed.push(0);
  }

  return trimmed;
}
