import { defineConfig } from "vite";

// Electron 路线:可信侧是主进程回环服务(electron/main.cjs),
// 渲染端构建产物由它托管,这里无代理;dev server 仅用于纯页面调试。
export default defineConfig({
	server: {
		port: 5189,
	},
});
