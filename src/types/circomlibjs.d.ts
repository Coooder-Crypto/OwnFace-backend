declare module "circomlibjs" {
  export type Poseidon = {
    (inputs: Array<bigint | number>): bigint;
    F: {
      normalize(value: bigint): bigint;
    };
  };

  export function buildPoseidon(): Promise<Poseidon>;
}
