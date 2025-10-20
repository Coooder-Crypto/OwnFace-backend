declare module "snarkjs" {
  export const groth16: {
    fullProve(
      input: Record<string, unknown>,
      wasmPath: string,
      zkeyPath: string,
    ): Promise<{ proof: Record<string, unknown>; publicSignals: Array<string | number | bigint> }>;
    verify(
      verificationKey: unknown,
      publicSignals: Array<string | number | bigint>,
      proof: Record<string, unknown>,
    ): Promise<boolean>;
  };
}
