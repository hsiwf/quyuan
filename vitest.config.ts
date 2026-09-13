import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// 测试文件放在 tests/ 目录,文件名 *.test.ts / *.test.mjs
		include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
		// 沿用 TALOS 的 node 环境:DOM 相关测试用 tests/helpers/mini-dom 假 DOM,
		// 不依赖浏览器实现;jsdom 反而会破坏 import.meta.url 的 file:// 语义。
		environment: "node",
	},
});
