export interface RegistrationRecord {
  userId: string;
  note?: string;
  quantizedVector: number[];
  commitment: string;
  nonce: string;
  createdAt: string;
}

export interface ProofRecord {
  proofId: string;
  userId: string;
  status: "accepted" | "rejected";
  distance: number;
  threshold: number;
  createdAt: string;
}

export interface MetricsSnapshot {
  totalRegistered: number;
  totalAuthentications: number;
  averageProofMs: number | null;
  lastProof?: ProofRecord;
}
