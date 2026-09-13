// ============================================================
// Provider 能力与用量类型（vendor 自 TALOS 插件，未修改）
//   - ProviderCapability 取自 src/ai/provider/types.ts
//   - ProviderUsageMetrics 取自 src/ai/privacy/provider-usage-audit-store.ts
//   两处均为纯类型，提取时合并于此以避免为两个类型引入两条外部依赖。
// ============================================================

export type ProviderCapability =
	| "chat"
	| "stream"
	| "tools"
	| "usage"
	| "cancel"
	| "resume"
	| "fork";

/** Provider 单轮用量指标（实时语音的 usage 回调使用）。 */
export interface ProviderUsageMetrics {
	inputTextTokens?: number;
	inputAudioTokens?: number;
	outputTextTokens?: number;
	outputAudioTokens?: number;
	totalTokens?: number;
	searchRequests?: number;
	sourceCount?: number;
}
