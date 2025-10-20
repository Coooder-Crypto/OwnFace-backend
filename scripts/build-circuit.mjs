#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CIRCUIT_NAME = "distance";
const ROOT = path.resolve(__dirname, ".." );
const CIRCUIT_DIR = path.join(ROOT, "circuits");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const POT_FILE = path.join(CIRCUIT_DIR, "pot12_final.ptau");
const R1CS = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}.r1cs`);
const WASM_DIR = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_js`);
const ZKEY = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}.zkey`);
const VK = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_verification_key.json`);

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function ensurePowersOfTau() {
  if (existsSync(POT_FILE)) {
    return;
  }

  console.log("[circuits] generating powers of tau...");
  await run("npx", ["snarkjs", "powersoftau", "new", "bn128", "12", POT_FILE, "-v"]);
  await run("npx", ["snarkjs", "powersoftau", "contribute", POT_FILE, POT_FILE, "--name", "initial", "-v"], {
    env: { ...process.env, ENTROPY: "ownface" },
  });
}

async function compileCircuit() {
  console.log("[circuits] compiling circom circuit...");
  await run("npx", [
    "circom",
    path.join(CIRCUIT_DIR, `${CIRCUIT_NAME}.circom`),
    "--r1cs",
    "--wasm",
    "--sym",
    "-o",
    ARTIFACTS_DIR,
  ]);
}

async function setupGroth16() {
  console.log("[circuits] running groth16 setup...");
  await run("npx", ["snarkjs", "groth16", "setup", R1CS, POT_FILE, ZKEY]);
  await run("npx", ["snarkjs", "zkey", "export", "verificationkey", ZKEY, VK]);
}

async function main() {
  if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  await ensurePowersOfTau();
  await compileCircuit();
  await setupGroth16();

  console.log("[circuits] build complete");
  console.log(`  r1cs: ${R1CS}`);
  console.log(`  wasm: ${path.join(WASM_DIR, `${CIRCUIT_NAME}.wasm`)}`);
  console.log(`  zkey: ${ZKEY}`);
  console.log(`  verification key: ${VK}`);
}

main().catch((error) => {
  console.error("[circuits] build failed", error);
  process.exit(1);
});
