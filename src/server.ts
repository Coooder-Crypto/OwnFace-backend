import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { keccak_256 } from "@noble/hashes/sha3";
import { db } from "./storage.js";
import { quantizeEmbedding } from "./zk/prover.js";
import { pedersenCommit } from "./crypto/pedersen.js";
import { generateProof, verifyProof } from "./zk/snark.js";

const registerSchema = z.object({
  userId: z.string().trim().min(3).max(128),
  note: z.string().max(240).optional(),
  embedding: z.string().min(8),
  embeddingName: z.string().max(120).optional(),
  embeddingType: z.string().max(120).optional(),
});

const authenticateSchema = z.object({
  userId: z.string().trim().min(3).max(128),
  nonce: z.string().max(64).optional(),
  note: z.string().max(240).optional(),
  embedding: z.string().min(8),
});

const app = express();
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/register", (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const vector = quantizeEmbedding(payload.embedding);
    const { commitmentHash, commitmentPoint, blinding } = pedersenCommit(vector);
    const nonce = randomBytes(16).toString("hex");
    const nonceHash = createHash("sha256").update(nonce).digest("hex");

    const record = {
      userId: payload.userId,
      note: payload.note,
      quantizedVector: vector,
      commitmentHash,
      commitmentPoint,
      blinding,
      nonce,
      nonceHash: `0x${nonceHash}`,
      createdAt: new Date().toISOString(),
    };

    db.upsertRegistration(record);

    res.json({
      userId: record.userId,
      commitmentHash: record.commitmentHash,
      commitmentPoint: record.commitmentPoint,
      nonce: record.nonce,
      nonceHash: record.nonceHash,
      blinding: record.blinding,
      vectorLength: record.quantizedVector.length,
      vectorChecksum: createVectorChecksum(record.quantizedVector),
      createdAt: record.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/authenticate", (req, res, next) => {
  const started = performance.now();
  try {
    const payload = authenticateSchema.parse(req.body);
    const registered = db.getRegistration(payload.userId);

    if (!registered) {
      res.status(404).json({ error: "User not registered" });
      return;
    }

    const candidateVector = quantizeEmbedding(payload.embedding);

    const threshold = registered.quantizedVector.length * 2_500_000;
    const proof = await generateProof({
      reference: registered.quantizedVector,
      candidate: candidateVector,
      threshold,
    });

    const verified = await verifyProof(proof);
    if (!verified) {
      throw new Error("Proof verification failed");
    }

    const [distanceSignal, thresholdSignal, withinSignal] = proof.publicSignals.map((value) => BigInt(value));
    const status = withinSignal === 1n ? "accepted" : "rejected";

    const proofRecord = {
      proofId: createProofIdentifier({
        userId: payload.userId,
        squaredDistance: Number(distanceSignal),
        threshold: Number(thresholdSignal),
        timestamp: Date.now(),
      }),
      userId: payload.userId,
      status,
      distance: Number(distanceSignal),
      threshold: Number(thresholdSignal),
      createdAt: new Date().toISOString(),
    };

    const elapsed = performance.now() - started;
    db.pushProof(proofRecord, elapsed);

    const { commitmentHash, commitmentPoint } = pedersenCommit(candidateVector);
    const transcriptDigest = createTranscriptDigest(
      registered.quantizedVector,
      candidateVector,
      threshold,
      proofRecord.distance,
    );

    res.json({
      userId: payload.userId,
      status: proofRecord.status,
      distance: proofRecord.distance,
      threshold: proofRecord.threshold,
      transcriptDigest,
      commitmentHash,
      commitmentPoint,
      proof: proof.proof,
      publicSignals: proof.publicSignals,
      withinThreshold: withinSignal === 1n,
      metadata: {
        proofId: proofRecord.proofId,
        latencyMs: Math.round(elapsed),
        vectorLength: candidateVector.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/metrics", (_req, res) => {
  const registrations = db.listRegistrations();
  const lastProof = db.getLastProof();

  const snapshot = {
    totalRegistered: registrations.length,
    totalAuthentications: db.getProofs().length,
    averageProofMs: db.getAverageProofMs(),
    lastProof,
  };

  res.json(snapshot);
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: "Invalid request payload",
      issues: error.issues,
    });
    return;
  }

  console.error("Unhandled backend error", error);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`[biozero-backend] listening on http://localhost:${PORT}`);
});

function createVectorChecksum(vector: number[]): string {
  return createHash("sha1")
    .update(Buffer.from(vector.join(","), "utf8"))
    .digest("hex")
    .slice(0, 16);
}

function createProofIdentifier(payload: {
  userId: string;
  squaredDistance: number;
  threshold: number;
  timestamp: number;
}): string {
  return createHash("sha1")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
}

function createTranscriptDigest(
  referenceVector: number[],
  candidateVector: number[],
  threshold: number,
  distance: number,
): string {
  const payload = JSON.stringify({ referenceVector, candidateVector, threshold, distance });
  return `0x${Buffer.from(keccak_256(Buffer.from(payload, "utf8"))).toString("hex")}`;
}
