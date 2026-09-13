// ============================================================
// 智能体工作台端口（原 AgentWorkbenchService 的结构子集）
//   native-voice-driver 只消费工作台服务的 5 个能力。宿主要么自带
//   完整工作台（如 TALOS），要么按本接口桥接任意 Agent 运行时
//   （Claude Agent SDK / Codex / 自研），屈原不关心具体实现。
// ============================================================
import type { AgentRuntimeAdapter } from "../vendor/runtime-contracts/runtime-adapter";
import type { RuntimeId } from "../vendor/runtime-contracts/runtime-adapter";

/** 运行时工厂入参（与 AgentWorkbenchServiceOptions.createRuntime 的 input 对齐）。 */
export interface QuyuanRuntimeFactoryInput {
	vaultRoot: string;
	permissionMode?: "ask" | "scoped" | "vault-full";
	model?: string;
	approve: (
		toolName: string,
		input: Record<string, unknown>,
		metadata?: Record<string, unknown>
	) => Promise<"allow" | "allow-always" | "deny">;
}

/** 审批提示回调入参（原 approval 契约的最小子集）。 */
export interface QuyuanApprovalPromptContext {
	phase: string;
}

/** 工具授权入参（原 authorizeTool 的结构子集）。 */
export interface QuyuanAuthorizeToolInput {
	runtimeId: RuntimeId;
	conversationId: string;
	vaultRoot: string;
	toolName: string;
	toolInput: Record<string, unknown>;
	toolMetadata?: Record<string, unknown>;
	channel?: "voice" | "text";
	approvalUiAttached?: boolean;
	prompt?: (
		approval: QuyuanApprovalPromptContext
	) => Promise<"allow" | "allow-always" | "deny">;
}

/**
 * 语音驱动所需的最小工作台服务面。
 * 宿主实现本接口即可把屈原接入任意 Agent 执行后端。
 */
export interface QuyuanAgentWorkbenchService {
	getSelectedRuntimeId(): RuntimeId;
	getVaultRoot(): string;
	getWorkflowMode(): "plan" | "execute";
	createRuntime(
		runtimeId: RuntimeId,
		input: QuyuanRuntimeFactoryInput
	): Promise<AgentRuntimeAdapter>;
	authorizeTool(
		input: QuyuanAuthorizeToolInput
	): Promise<"allow" | "allow-always" | "deny">;
}

/** 屈原语音驱动与实时语音会话共同的宿主契约。 */
export interface QuyuanVoiceRuntimeHost {
	getAgentWorkbenchService(): QuyuanAgentWorkbenchService;
	/** Provider 出库隐私审计：拒绝时返回 allowed=false 并给出原因。 */
	auditQuyuanProviderEgress(input: {
		namespace: "chat" | "voice";
		kind: "prompt" | "voice-data-map";
		providerId: string;
		prompt: string;
		historyText?: string;
		sourceKinds: Array<"prompt" | "history" | "voice-data-map">;
		sessionId?: string;
	}): Promise<{ allowed: boolean; message?: string }>;
}
