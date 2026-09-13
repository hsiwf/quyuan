import { defineConfig } from "vite";

// Tauri 前端构建;可信侧能力由 Rust 插件提供,无需代理。
export default defineConfig({
	server: {
		port: 5190,
		strictPort: true,
		// debug 版 Tauri 走 devUrl 时才需要本服务器;
		// 监视器必须忽略 Rust 构建目录,否则 cargo build 写 target/ 时
		// chokidar 会因文件锁崩溃,连带杀死 dev server。
		watch: {
			ignored: ["**/src-tauri/target/**"],
		},
	},
	clearScreen: false,
	envPrefix: ["VITE_", "TAURI_"],
	build: {
		target: "chrome110",
		minify: "esbuild",
		sourcemap: true,
	},
});
