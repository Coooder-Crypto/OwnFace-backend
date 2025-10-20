# Circuits

本目录包含距离阈值验证 Circom 电路。

## 构建步骤

```bash
cd ownface-backend
npm install
npm run circuits:build
```

脚本会自动：

1. 生成 `circuits/pot12_final.ptau`（若不存在）。
2. 编译 `distance.circom`，输出 R1CS、WASM、符号文件到 `artifacts/`。
3. 执行 Groth16 setup，生成 `distance.zkey` 以及 `distance_verification_key.json`。

构建成功后，`artifacts/` 目录应包含：

- `distance.r1cs`
- `distance_js/distance.wasm`
- `distance.zkey`
- `distance_verification_key.json`

后端在生成 Groth16 证明与验证时会直接读取上述文件；若缺失将导致 `generateProof`/`verifyProof` 报错。

### 公共信号

更新后的 `distance.circom` 会额外输出以下公共信号（依次为）：

1. `distance`：平方欧氏距离。
2. `thresholdOut`：阈值副本，用于链上对比。
3. `withinThreshold`：是否满足距离阈值（1/0）。
4. `referenceHash`：注册向量的 Poseidon 零知识承诺。
5. `candidateHash`：候选向量的 Poseidon 承诺。
6. `transcriptHash`：`Poseidon(referenceHash, candidateHash, threshold, distance)` 组成的证明摘要。

链上验证器可使用这些公共信号与注册存档比对，确保证明与注册记录绑定。
