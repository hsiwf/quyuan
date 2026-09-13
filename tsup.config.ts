import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: false,
	sourcemap: true,
	clean: true,
	// 屈原本地语音运行时把 sherpa-onnx 的 WASM 加载器以文本资产随包分发,
	// 沿用 TALOS 插件 esbuild 配置的 text loader 语义。
	loader: { ".txt": "text" },
});
