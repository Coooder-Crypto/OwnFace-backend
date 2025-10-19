import { RegistrationRecord, ProofRecord } from "./types.js";

class InMemoryDatabase {
  private registrations = new Map<string, RegistrationRecord>();
  private proofs: ProofRecord[] = [];
  private totalProofMs = 0;

  upsertRegistration(record: RegistrationRecord) {
    this.registrations.set(record.userId, record);
  }

  getRegistration(userId: string) {
    return this.registrations.get(userId);
  }

  listRegistrations() {
    return Array.from(this.registrations.values());
  }

  pushProof(record: ProofRecord, proofMs: number) {
    this.proofs.push(record);
    this.totalProofMs += proofMs;
  }

  getProofs() {
    return this.proofs;
  }

  getAverageProofMs() {
    if (this.proofs.length === 0) {
      return null;
    }
    return Math.round(this.totalProofMs / this.proofs.length);
  }

  getLastProof() {
    return this.proofs.at(-1);
  }
}

export const db = new InMemoryDatabase();
