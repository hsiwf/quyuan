// ============================================================
// 屈原宿主 · 页面公共类型
// QuyuanAppConfig 是宿主持久化的全部状态:密钥/目录/LLM 端点,
// 以及屈原设置子集(quyuan 字段,原样透传给 QuyuanSettings)。
// ============================================================
import type { QuyuanSettings } from "quyuan";

export interface QuyuanAppConfig {
	/** 百炼 API Key(只在可信侧使用) */
	dashscopeApiKey: string;
	/** 百炼业务空间 ID */
	workspaceId: string;
	region: "cn-beijing" | "ap-southeast-1";
	/** 知识库根目录(绝对路径) */
	knowledgeDir: string;
	/** 人格文本(原 TALOS 里 灵魂/PERSONA.md 的角色) */
	personaText: string;
	/** OpenAI 兼容文字通道端点(默认 DashScope 兼容模式,同 key 可用 qwen 系列) */
	llmBaseUrl: string;
	llmApiKey: string;
	llmModel: string;
	/** 屈原设置持久化子集(语音会话 JSON 等) */
	quyuan: Partial<QuyuanSettings>;
}

/**
 * 宿主桥:页面里所有越出浏览器沙箱的能力都走它。
 * 路线 A/B 的实现 = 相对 /api 的 fetch(可信侧本机服务);
 * 路线 C(Tauri)的实现 = tauri 插件 API。页面其余代码完全一致。
 */
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

export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
	});
	const data = (await response.json()) as T & { error?: string };
	if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
	return data;
}

/**
 * 路线 B(Electron)的宿主桥实现:可信侧是主进程的回环服务,
 * 全部能力走相对 /api;回环接口要求经 URL 参数下发的随机 nonce。
 */
const LOOPBACK_TOKEN = new URLSearchParams(window.location.search).get("token") ?? "";

function authHeaders(): Record<string, string> {
	return LOOPBACK_TOKEN ? { "X-Quyuan-Token": LOOPBACK_TOKEN } : {};
}

export const bridge: HostBridge = {
	loadConfig: () =>
		jsonFetch<QuyuanAppConfig>("/api/config", { headers: authHeaders() }),
	saveConfig: async (config) => {
		await jsonFetch<QuyuanAppConfig>("/api/config", {
			method: "PUT",
			headers: authHeaders(),
			body: JSON.stringify(config),
		});
	},
	sdpExchange: (input) =>
		jsonFetch<{ answerSdp: string }>("/api/sdp", {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify(input),
		}),
	webSearch: (input) =>
		jsonFetch<{ output: string }>("/api/websearch", {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify(input),
		}),
	appendUsage: async (entry) => {
		await jsonFetch("/api/usage", {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify(entry),
		});
	},
	listMarkdown: async () =>
		(await jsonFetch<{ paths: string[] }>("/api/fs/list", { headers: authHeaders() })).paths,
	readFile: async (relPath) => {
		const data = await jsonFetch<{ content: string }>(
			`/api/fs/read?path=${encodeURIComponent(relPath)}`,
			{ headers: authHeaders() }
		);
		return data.content;
	},
	pickFolder: async () => {
		const data = await jsonFetch<{ path: string | null }>("/api/dialog/pickFolder", {
			method: "POST",
			headers: authHeaders(),
			body: "{}",
		});
		return data.path;
	},
};
