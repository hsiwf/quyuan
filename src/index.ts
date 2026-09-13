// ============================================================
// 屈原 · 可移植模块公共入口
//   从 TALOS for Obsidian 插件 src/quyuan 提取的去 Obsidian 化版本。
//   - 核心合同/治理/人格：纯逻辑，可直接在 Node 与浏览器运行；
//   - 语音面板/实时语音：面向标准 Web API（DOM/WebRTC/WebAudio）；
//   - 宿主能力（存储、通知、Markdown、Agent 工作台）经 src/host 端口注入。
//   嵌入步骤见 README.md。
// ============================================================

// —— 宿主端口与默认实现 ——
export type {
	QuyuanTextStore,
	QuyuanVaultPaths,
	QuyuanHostUi,
	QuyuanHostEnv,
	QuyuanHost,
} from "./host/ports";
export { InMemoryTextStore, NullHostUi } from "./host/ports";
export { DEFAULT_QUYUAN_SETTINGS } from "./host/settings";
export type { QuyuanSettings } from "./host/settings";
export { installQuyuanDomExtensions } from "./host/dom";
export type { QuyuanDomElementInfo } from "./host/dom";
export { setIcon, registerQuyuanIcon, hasQuyuanIcon } from "./host/icons";
export type {
	QuyuanAgentWorkbenchService,
	QuyuanVoiceRuntimeHost,
	QuyuanRuntimeFactoryInput,
	QuyuanAuthorizeToolInput,
	QuyuanApprovalPromptContext,
} from "./host/agent-workbench-port";
export {
	createAgentEvent,
	AGENT_EVENT_SCHEMA_VERSION,
	type AgentEvent,
	type AgentEventType,
} from "./vendor/runtime-contracts/agent-events";
export {
	unavailableCapabilities,
	type RuntimeCapabilities,
	type CapabilitySupport,
} from "./vendor/runtime-contracts/runtime-capabilities";
export type {
	AgentRuntimeAdapter,
	RuntimeId,
	RuntimeHistoryItem,
	RuntimeInputBlock,
	NativeSessionBinding,
	CreateSessionInput,
	RuntimeTurn,
	RuntimeToolPolicy,
	RuntimeProbe,
	ModelDescriptor,
} from "./vendor/runtime-contracts/runtime-adapter";

// —— 人格合同与治理 ——
export {
	checkQuyuanCapabilityContract,
	type QuyuanCapability,
	type QuyuanCapabilitySnapshot,
	type QuyuanContractResult,
	type QuyuanProviderId,
} from "./contract";
export {
	evaluateQuyuanGovernance,
	type QuyuanGovernanceResult,
	type QuyuanToolRequest,
} from "./governance";
export {
	loadQuyuanSoulContext,
	loadQuyuanSoulContextWithFallback,
	QUYUAN_REQUIRED_CONTEXT,
	QuyuanSoulBootstrapError,
	type QuyuanContextSource,
	type QuyuanSoulContext,
} from "./persona-context";
export { QuyuanModule } from "./module";

// —— 工作台适配与语音驱动 ——
export {
	snapshotAdapterCapabilities,
	type QuyuanStreamChunk,
	type QuyuanTurn,
	type QuyuanWorkbenchAdapter,
} from "./workbench-adapter";
export {
	QuyuanVoiceDriver,
	type InteractionChannel,
	type TalosVoiceRuntimeHost,
	type VoiceToolEvent,
	type VoiceTurnCallbacks,
} from "./native-voice-driver";

// —— 语音 UI 与会话 ——
export { QuyuanVoicePanel } from "./voice-panel";
export {
	QwenRealtimeVoiceSession,
	type QwenRealtimeAuditEvent,
	type QwenRealtimeConfig,
	type QwenRealtimeHandlers,
	type RealtimeVoiceState,
} from "./qwen-realtime-voice";
export {
	VoiceSessionStore,
	VOICE_SESSION_NAMESPACE,
	type VoiceSessionMessage,
	type VoiceSessionPersistence,
	type VoiceSessionSnapshot,
} from "./voice-session-store";
export {
	VoiceModeController,
	type VoiceInputMode,
} from "./voice-mode-controller";
export { buildTalosDataMap } from "./voice-data-map";
export {
	executeVoiceVaultTool,
	VOICE_VAULT_TOOL_NAMES,
	isVoiceVaultToolName,
	type VoiceVaultToolName,
	type VoiceVaultToolOptions,
	type VoiceVaultToolResult,
} from "./voice-vault-tools";
export {
	formatVoiceVaultSearchResult,
	searchVoiceVault,
	type VoiceVaultSearchOptions,
	type VoiceVaultSearchPort,
} from "./voice-vault-search";
export {
	VOICE_QWEN_WEB_SEARCH_ALLOWED,
	resolveEffectiveRuntimePolicy,
	type EffectiveRuntimePolicy,
	type TalosRuntimeChannel,
} from "./runtime-policy";
export {
	QWEN_VOICE_WEB_SEARCH_MODEL,
	qwenWebSearchEndpoint,
	buildQwenWebSearchRequest,
	parseQwenWebSearchResponse,
	type QwenVoiceWebSearchRegion,
	type QwenWebSearchResult,
} from "./qwen-web-search";
export { StreamTts, normalizeForSpeech } from "./vendor/voiceio";
export type {
	ProviderCapability,
	ProviderUsageMetrics,
} from "./vendor/provider-capabilities";
