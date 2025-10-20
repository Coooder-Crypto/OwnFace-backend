import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { groth16 } from "snarkjs";

const SNARK_FIELD = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = path.resolve(__dirname, "../../artifacts");
const WASM_PATH = path.join(ARTIFACTS_DIR, "distance_js", "distance.wasm");
const ZKEY_PATH = path.join(ARTIFACTS_DIR, "distance.zkey");
const VKEY_PATH = path.join(ARTIFACTS_DIR, "distance_verification_key.json");

type Groth16Proof = {
  proof: Record<string, unknown>;
  publicSignals: string[];
};

interface DistanceProofInput {
  reference: number[];
  candidate: number[];
  threshold: number;
}

let verificationKeyPromise: Promise<unknown> | null = null;

async function ensureArtifacts(): Promise<void> {
  const required = [WASM_PATH, ZKEY_PATH, VKEY_PATH];
  await Promise.all(
    required.map(async (filepath) => {
      try {
        await fs.access(filepath);
      } catch {
        throw new Error(
          `Missing Groth16 artifact at ${filepath}. Run "npm run circuits:build" in the backend repo.`,
        );
      }
    }),
  );
}

function toFieldElement(value: number): string {
  const mod = ((BigInt(Math.trunc(value)) % SNARK_FIELD) + SNARK_FIELD) % SNARK_FIELD;
  return mod.toString();
}

async function loadVerificationKey(): Promise<unknown> {
  if (!verificationKeyPromise) {
    verificationKeyPromise = fs.readFile(VKEY_PATH, "utf8").then((contents) => JSON.parse(contents));
  }
  return verificationKeyPromise;
}

export async function generateProof(input: DistanceProofInput): Promise<Groth16Proof> {
  if (input.reference.length !== input.candidate.length) {
    throw new Error("Reference and candidate vectors must have equal length");
  }

  await ensureArtifacts();

  const circuitInput = {
    a: input.reference.map(toFieldElement),
    b: input.candidate.map(toFieldElement),
    threshold: toFieldElement(input.threshold),
  };

  const { proof, publicSignals } = await groth16.fullProve(circuitInput, WASM_PATH, ZKEY_PATH);
  return {
    proof,
    publicSignals: publicSignals.map((signal) => signal.toString()),
  };
}

export async function verifyProof(proofBundle: Groth16Proof): Promise<boolean> {
  await ensureArtifacts();
  const vKey = await loadVerificationKey();
  return groth16.verify(vKey, proofBundle.publicSignals, proofBundle.proof);
}
