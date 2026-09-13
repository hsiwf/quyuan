// ============================================================
// 屈原宿主页 · 三条路线共用的装配逻辑
//   1. installQuyuanDomExtensions():Obsidian DOM 扩展兼容层(必须最先)
//   2. 组装 QuyuanHost(通知/Markdown/设置)与面板依赖(SDP/库工具/搜索)
//   3. DirectApiAgentRuntime:文字通道的 OpenAI 兼容流式适配器
//      (对应 TALOS 里 AgentWorkbenchService + 各运行时适配器的最小替身)
//   4. QuyuanVoicePanel.mount():六态语音舞台、唤醒门控、打断全部来自模块
// ============================================================
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
	DEFAULT_QUYUAN_SETTINGS,
	QuyuanVoicePanel,
	createAgentEvent,
	executeVoiceVaultTool,
	installQuyuanDomExtensions,
	unavailableCapabilities,
	type AgentEvent,
	type AgentRuntimeAdapter,
	type ModelDescriptor,
	type NativeSessionBinding,
	type QuyuanAgentWorkbenchService,
	type QuyuanHost,
	type QuyuanSettings,
	type RuntimeProbe,
	type RuntimeTurn,
	type VoiceVaultSearchPort,
} from "quyuan";
import "quyuan/styles.css";
import "quyuan/styles/workspace-chrome.css";
import "./hostpage.css";
import { bridge, type QuyuanAppConfig } from "./bridge";

installQuyuanDomExtensions();

/** 原data/schema 的 13 个模块键;独立知识库场景下全部映射到同一个根目录 */
const MODULE_KEYS = [
	"inbox", "logs", "insights", "assets", "projects", "archive", "identity",
	"soul", "output", "system", "templates", "automation", "config",
] as const;

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

// ---------- 页面级 UI:toast 与设置浮层 ----------
function toast(message: string, timeoutMs = 5000): void {
	const root = document.getElementById("toast-root");
	if (!root) return;
	const item = document.createElement("div");
	item.className = "qp-toast";
	item.textContent = message;
	root.appendChild(item);
	window.setTimeout(() => item.remove(), timeoutMs);
}

function wireSettingsOverlay(config: QuyuanAppConfig): void {
	const overlay = document.getElementById("settings-overlay");
	const button = document.getElementById("open-settings");
	const textarea = document.getElementById("settings-json") as HTMLTextAreaElement | null;
	const save = document.getElementById("settings-save");
	const cancel = document.getElementById("settings-cancel");
	const pick = document.getElementById("settings-pick") as HTMLButtonElement | null;
	if (!overlay || !button || !textarea || !save || !cancel) return;
	const openOverlay = () => {
		textarea.value = JSON.stringify(
			{ ...config, dashscopeApiKey: config.dashscopeApiKey ? "(已保存,留空即保持不变)" : "" },
			null,
			2
		);
		overlay.hidden = false;
	};
	button.addEventListener("click", openOverlay);
	if (pick) {
		if (bridge.pickFolder) {
			pick.hidden = false;
			pick.addEventListener("click", () => {
				void (async () => {
					const dir = await bridge.pickFolder?.();
					if (!dir) return;
					const current = JSON.parse(textarea.value) as QuyuanAppConfig;
					textarea.value = JSON.stringify({ ...current, knowledgeDir: dir }, null, 2);
				})();
			});
		}
	}
	// host.openSettings 也会走到这里
	(window as unknown as { __quyuanOpenSettings?: () => void }).__quyuanOpenSettings = openOverlay;
	cancel.addEventListener("click", () => { overlay.hidden = true; });
	save.addEventListener("click", () => {
		void (async () => {
			try {
				const incoming = JSON.parse(textarea.value) as QuyuanAppConfig;
				if (typeof incoming.dashscopeApiKey === "string" && incoming.dashscopeApiKey.includes("已保存")) {
					incoming.dashscopeApiKey = config.dashscopeApiKey; // 占位符还原
				}
				Object.assign(config, incoming);
				await bridge.saveConfig(config);
				window.location.reload();
			} catch (error) {
				toast(`设置无效:${error instanceof Error ? error.message : String(error)}`);
			}
		})();
	});
}

// ---------- 文字通道:Direct API 运行时适配器 ----------
/** OpenAI 兼容流式聊天 → vendored AgentRuntimeAdapter 契约。 */
class DirectApiAgentRuntime implements AgentRuntimeAdapter {
	/**
	 * vendored RuntimeId 是封闭联合("claude"|"codex"|"ohmypi")。
	 * Direct API 语义上最接近 claude 通道(驱动会把 model 字段透传)。
	 */
	readonly id = "claude" as const;

	private readonly sessions = new Map<string, { initialContext?: string }>();
	private readonly aborts = new Set<AbortController>();

	constructor(
		private readonly config: { baseUrl: string; apiKey: string; model: string }
	) {}

	private event(
		conversationId: string,
		turnId: string,
		type: AgentEvent["type"],
		payload: Record<string, unknown>
	): AgentEvent {
		return createAgentEvent({
			eventId: crypto.randomUUID(),
			conversationId,
			turnId,
			runtimeId: this.id,
			type,
			timestamp: new Date().toISOString(),
			payload,
		});
	}

	async probe(): Promise<RuntimeProbe> {
		return {
			runtimeId: this.id,
			status: this.config.apiKey ? "ready" : "unauthenticated",
			version: "direct-api",
		};
	}

	async listModels(): Promise<ModelDescriptor[]> {
		return [{ id: this.config.model, label: this.config.model, isDefault: true }];
	}

	async createSession(input: {
		conversationId: string;
		initialContext?: string;
	}): Promise<NativeSessionBinding> {
		this.sessions.set(input.conversationId, { initialContext: input.initialContext });
		return { runtimeId: this.id, sessionId: input.conversationId };
	}

	async resumeSession(): Promise<void> {}

	async *send(turn: RuntimeTurn): AsyncGenerator<AgentEvent> {
		const session = this.sessions.get(turn.conversationId);
		const messages: Array<{ role: string; content: string }> = [];
		const system = session?.initialContext?.trim();
		if (system) messages.push({ role: "system", content: system });
		for (const item of turn.history ?? []) {
			messages.push({ role: item.role, content: item.text });
		}
		const blocks = (turn.input ?? [])
			.filter((block) => block.type === "text")
			.map((block) => block.text);
		// 驱动把同一内容同时填进 input.blocks 与 text(契约兼容字段):
		// 优先结构化 input、回退 text,避免每轮提示词重复发送。
		messages.push({
			role: "user",
			content: (blocks.length ? blocks : [turn.text]).filter(Boolean).join("\n\n"),
		});

		const controller = new AbortController();
		this.aborts.add(controller);
		const ev = (type: AgentEvent["type"], payload: Record<string, unknown>) =>
			this.event(turn.conversationId, turn.turnId, type, payload);
		try {
			const url = `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ model: this.config.model, messages, stream: true }),
				signal: turn.signal ?? controller.signal,
			});
			if (!response.ok || !response.body) {
				const detail = (await response.text()).slice(0, 240);
				throw new Error(`文字通道 HTTP ${response.status}:${detail}`);
			}
			yield ev("assistant.start", {});
			let full = "";
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				let newline = buffer.indexOf("\n");
				while (newline >= 0) {
					const line = buffer.slice(0, newline).trim();
					buffer = buffer.slice(newline + 1);
					newline = buffer.indexOf("\n");
					if (!line.startsWith("data:")) continue;
					const data = line.slice(5).trim();
					if (data === "[DONE]") continue;
					try {
						const chunk = JSON.parse(data) as {
							choices?: Array<{ delta?: { content?: string } }>;
						};
						const delta = chunk.choices?.[0]?.delta?.content;
						if (delta) {
							full += delta;
							yield ev("assistant.delta", { text: delta, delta });
						}
					} catch {
						// 心跳/非 JSON 行,忽略
					}
				}
			}
			if (full) yield ev("assistant.final", { text: full });
			yield ev("turn.finished", {});
		} catch (error) {
			const aborted =
				error instanceof DOMException && error.name === "AbortError";
			if (aborted) yield ev("notice", { message: "已取消" });
			else {
				yield ev("error", {
					message: error instanceof Error ? error.message : String(error),
				});
			}
		} finally {
			this.aborts.delete(controller);
		}
	}

	async cancel(): Promise<void> {
		for (const controller of this.aborts) controller.abort();
	}

	async dispose(): Promise<void> {
		await this.cancel();
		this.sessions.clear();
	}

	capabilities() {
		// 文字通道 MVP:纯文本对话,不含工具/审批/沙箱能力
		return unavailableCapabilities();
	}
}

// ---------- 装配 ----------
async function main(): Promise<void> {
	const config: QuyuanAppConfig = {
		...DEFAULT_CONFIG,
		...(await bridge.loadConfig()),
	};
	wireSettingsOverlay(config);

	const host: QuyuanHost = {
		configDir: ".quyuan-host",
		notify: (message, timeoutMs) => toast(message, timeoutMs ?? undefined),
		renderMarkdown: async (markdown, el) => {
			// 屈原治理要求把库内/模型内容视为不可信数据:marked 不做消毒,
			// 回显的 <script>/<img onerror> 会直接注入页面,必须过 DOMPurify。
			el.innerHTML = DOMPurify.sanitize(await marked.parse(markdown));
		},
		openSettings: () => {
			(window as unknown as { __quyuanOpenSettings?: () => void }).__quyuanOpenSettings?.();
		},
	};

	const settings: QuyuanSettings = {
		...DEFAULT_QUYUAN_SETTINGS,
		...config.quyuan,
		voicePersona:
			config.personaText.trim() || config.quyuan.voicePersona || "",
	};

	const fsPort: VoiceVaultSearchPort = {
		listPaths: async () =>
			config.knowledgeDir ? bridge.listMarkdown() : [],
		read: async (path) => bridge.readFile(path),
	};
	const modulePaths = Object.fromEntries(
		MODULE_KEYS.map((key) => [key, config.knowledgeDir || "."])
	);

	const runtime = new DirectApiAgentRuntime({
		baseUrl: config.llmBaseUrl,
		apiKey: config.llmApiKey,
		model: config.llmModel,
	});
	const workbench: QuyuanAgentWorkbenchService = {
		getSelectedRuntimeId: () => "claude",
		getVaultRoot: () => config.knowledgeDir || "未配置知识库目录",
		getWorkflowMode: () => "plan",
		createRuntime: async () => runtime,
		// MVP:本地单用户场景,库内工具本身已是硬只读白名单,不设二次审批;
		// 需要审批流时在这里接宿主 UI(参考 QuyuanApprovalPromptContext)。
		authorizeTool: async () => "allow",
	};

	const plugin = {
		getAgentWorkbenchService: () => workbench,
		auditQuyuanProviderEgress: async () => ({ allowed: true }),
		activateQuyuanV2View: async () => {
			toast("独立版:文字对话就在下方输入框,与语音共用治理规则");
		},
		exchangeQuyuanRealtimeSdp: (input: {
			model: string;
			instructions: string;
			offerSdp: string;
		}) => bridge.sdpExchange(input),
		executeQuyuanVoiceVaultTool: async (input: {
			name: Parameters<typeof executeVoiceVaultTool>[1];
			args: Record<string, unknown>;
		}) => {
			const result = await executeVoiceVaultTool(fsPort, input.name, input.args, {
				configDir: host.configDir,
				modulePaths,
				maxHits: 4,
				maxExcerptChars: 900,
				maxFiles: 3000,
				maxFileChars: 400_000,
				maxConcurrency: 12,
				maxListResults: 100,
				maxReadLines: 200,
				maxGrepHits: 40,
				maxOutputChars: 6000,
			});
			void bridge.appendUsage({
				namespace: "voice",
				operation: "vault-tool",
				tool: input.name,
			});
			return result.output;
		},
		executeQuyuanVoiceWebSearch: async (input: { query: string }) =>
			(await bridge.webSearch(input)).output,
		recordQuyuanProviderUsage: async (input: unknown) => {
			await bridge.appendUsage(input);
		},
		paths: {},
	};

	const panel = new QuyuanVoicePanel(
		host,
		plugin,
		settings,
		async () => {
			config.quyuan = { ...settings };
			await bridge.saveConfig(config);
		},
		() => {}
	);
	panel.mount(document.getElementById("app") as HTMLElement);

	if (!config.dashscopeApiKey) {
		toast("先点右上角 ⚙ 填写百炼 API Key 与知识库目录,再开启语音", 10000);
	}
}

void main();
