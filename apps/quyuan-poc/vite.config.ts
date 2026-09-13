import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 5188,
		// 可信侧 API 由本机 Node 服务提供(见 server.mjs)
		proxy: {
			"/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
		},
	},
});
