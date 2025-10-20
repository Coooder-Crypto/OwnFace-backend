export interface RegistrationRecord {
  userId: string;
  note?: string;
  quantizedVector: number[];
  vectorHash: string;
  commitmentHash: string;
  commitmentPoint: string;
  blinding: string;
  nonce: string;
  nonceHash: string;
  createdAt: string;
}

export interface ProofRecord {
  proofId: string;
  userId: string;
  status: "accepted" | "rejected";
  distance: number;
  threshold: number;
  referenceHash: string;
  candidateHash: string;
  transcriptHash: string;
  createdAt: string;
}

export interface MetricsSnapshot {
  totalRegistered: number;
  totalAuthentications: number;
  averageProofMs: number | null;
  lastProof?: ProofRecord;
}
