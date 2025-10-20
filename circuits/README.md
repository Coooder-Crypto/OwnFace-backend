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

后端在生成证明时会使用上述文件。
