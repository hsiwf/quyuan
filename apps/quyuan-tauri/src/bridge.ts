// ============================================================
// 屈原 Tauri · 宿主桥实现
//   可信侧 = Rust 进程:密钥经 appData 配置文件持有,外部请求经
//   tauri-plugin-http(能力清单限定 dashscope 域),文件 I/O 经
//   tauri-plugin-fs(能力清单限定知识库范围),目录选择经 dialog 插件。
//   页面其余装配逻辑(main.ts)与 POC/Electron 完全一致。
// ============================================================
import { appDataDir, join } from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
	buildQwenWebSearchRequest,
	parseQwenWebSearchResponse,
	qwenWebSearchEndpoint,
} from "quyuan";
import type { QuyuanSettings } from "quyuan";

// —— 与 quyuan-poc/src/bridge.ts 保持一致的公共类型 ——
export interface QuyuanAppConfig {
	/** 百炼 API Key(只在可信侧使用) */
	dashscopeApiKey: string;
	workspaceId: string;
	region: "cn-beijing" | "ap-southeast-1";
	knowledgeDir: string;
	personaText: string;
	llmBaseUrl: string;
	llmApiKey: string;
	llmModel: string;
	quyuan: Partial<QuyuanSettings>;
}

export interface HostBridge {
	loadConfig(): Promise<QuyuanAppConfig>;
	saveConfig(config: QuyuanAppConfig): Promise<void>;
	sdpExchange(input: {
		model: string;
		instructions: string;
		offerSdp: string;
	}): Promise<{ answerSdp: string }>;
	webSearch(input: { query: string; callId?: string }): Promise<{ output: string }>;
	appendUsage(entry: unknown): Promise<void>;
	listMarkdown(): Promise<string[]>;
	readFile(relPath: string): Promise<string>;
	pickFolder?(): Promise<string | null>;
}

const DEFAULT_CONFIG: QuyuanAppConfig = {
	dashscopeApiKey: "",
	workspaceId: "",
	region: "cn-beijing",
	knowledgeDir: "",
	personaText: "",
	llmBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
	llmApiKey: "",
	llmModel: "qwen-plus",
	quyuan: {},
};

let configPathPromise: Promise<string> | null = null;
function configPath(): Promise<string> {
	configPathPromise ??= (async () =>
		join(await appDataDir(), "quyuan.config.json"))();
	return configPathPromise;
}

function requireQuyuanConfig(config: QuyuanAppConfig): {
	apiKey: string;
	workspace: string;
	region: "cn-beijing" | "ap-southeast-1";
} {
	const apiKey = String(config.dashscopeApiKey || "").trim();
	if (!apiKey) throw new Error("请先在设置中填写百炼 API Key");
	const workspace = String(config.workspaceId || "").trim();
	if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,127}$/.test(workspace)) {
		throw new Error("请先在设置中填写有效的百炼业务空间 ID");
	}
	const region = config.region === "ap-southeast-1" ? "ap-southeast-1" : "cn-beijing";
	return { apiKey, workspace, region };
}

async function loadConfig(): Promise<QuyuanAppConfig> {
	try {
		const raw = await fs.readTextFile(await configPath());
		return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

function relPath(root: string, full: string): string {
	const normalized = full.replace(/\\/g, "/");
	const prefix = root.replace(/\\/g, "/").replace(/\/+$/, "") + "/";
	return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
}

async function walkMarkdown(dir: string, depth: number, out: string[], root: string): Promise<void> {
	if (depth > 8 || out.length >= 5000) return;
	let entries;
	try {
		entries = await fs.readDir(dir);
	} catch {
		return;
	}
	for (const entry of entries) {
		if (out.length >= 5000) return;
		if (entry.name.startsWith(".")) continue;
		if (entry.isDirectory) await walkMarkdown(await join(dir, entry.name), depth + 1, out, root);
		else if (/\.(md|markdown|canvas)$/i.test(entry.name)) out.push(relPath(root, await join(dir, entry.name)));
	}
}

export const bridge: HostBridge = {
	loadConfig,
	saveConfig: async (config) => {
		// appData 目录在首次运行前不保证存在,写入前先兜底创建
		await fs.mkdir(await appDataDir(), { recursive: true }).catch(() => {});
		await fs.writeTextFile(await configPath(), JSON.stringify(config, null, 2));
	},
	sdpExchange: async (input) => {
		const config = await loadConfig();
		const { apiKey, workspace, region } = requireQuyuanConfig(config);
		if (!["qwen3.5-omni-flash-realtime", "qwen3.5-omni-plus-realtime"].includes(input.model)) {
			throw new Error("不支持的千问 Realtime 模型");
		}
		if (!input.offerSdp.startsWith("v=0")) throw new Error("无效的 WebRTC Offer SDP");
		const response = await tauriFetch(
			`https://${workspace}.${region}.maas.aliyuncs.com/api/v1/webrtc/realtime?model=${encodeURIComponent(input.model)}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/sdp",
				},
				body: input.offerSdp,
			}
		);
		const text = await response.text();
		if (!response.ok) {
			throw new Error(`百炼 WebRTC SDP 交换失败(HTTP ${response.status}):${text.slice(0, 240)}`);
		}
		if (!text.trim()) throw new Error("百炼 WebRTC SDP 交换返回空响应");
		return { answerSdp: text };
	},
	webSearch: async (input) => {
		const config = await loadConfig();
		const { apiKey, workspace, region } = requireQuyuanConfig(config);
		const endpoint = qwenWebSearchEndpoint(workspace, region);
		const requestBody = buildQwenWebSearchRequest(String(input.query || ""));
		const response = await tauriFetch(endpoint, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});
		const text = await response.text();
		if (!response.ok) throw new Error(`百炼联网搜索失败(HTTP ${response.status})`);
		const result = parseQwenWebSearchResponse(JSON.parse(text));
		await bridge.appendUsage({
			namespace: "voice",
			providerId: "aliyun-qwen-search",
			operation: "web-search",
			usage: result.usage,
		});
		return { output: result.output };
	},
	appendUsage: async (entry) => {
		try {
			await fs.mkdir(await appDataDir(), { recursive: true }).catch(() => {});
			const usagePath = await join(await appDataDir(), "quyuan-usage.jsonl");
			const existing = await fs.readTextFile(usagePath).catch(() => "");
			const line = JSON.stringify({ ...(entry as object), at: Date.now() }) + "\n";
			await fs.writeTextFile(usagePath, existing + line);
		} catch {
			// 用量记账失败不阻断主流程
		}
	},
	listMarkdown: async () => {
		const config = await loadConfig();
		if (!config.knowledgeDir) return [];
		const out: string[] = [];
		await walkMarkdown(config.knowledgeDir, 0, out, config.knowledgeDir);
		return out.sort();
	},
	readFile: async (relPath) => {
		const config = await loadConfig();
		if (!config.knowledgeDir) throw new Error("知识库未配置");
		return fs.readTextFile(await join(config.knowledgeDir, relPath));
	},
	pickFolder: async () => {
		const selected = await open({ directory: true, title: "选择屈原告知识库目录" });
		return typeof selected === "string" ? selected : null;
	},
};
