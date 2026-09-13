// ============================================================
// 屈原设置子集（宿主端口）
//   原型为 TALOS 插件 src/settings.ts 的 TalosSettings(此处命名为 QuyuanSettings)；此处只保留
//   屈原语音/人格/数据地图实际读取的字段，字段类型与默认值与原插件
//   保持一致。宿主按自身形态存储设置，只需在装配时提供该子集。
// ============================================================

/** 屈原模块需要的设置子集（源自 TALOS TalosSettings，字段语义一致）。 */
export interface QuyuanSettings {
	// —— 库结构路径：C-3 语音数据地图的只读意图路由 ——
	inboxFolder: string;
	dailyFolder: string;
	tasksPath: string;
	talosTasksPath: string;
	pendingApprovalsPath: string;
	candidatesPath: string;
	healthLogPath: string;
	reportsFolder: string;

	// —— 旧引擎语音入口（vendor/voiceio 的 TTS 与兼容字段）——
	voiceAgentCommand: string;
	voicePermission: string;
	voicePersona: string;
	voiceLang: string;
	ttsVoice: string;
	ttsRate: number;
	ttsPitch: number;
	ttsEngine: string;
	jarvisPermissionMode: string;
	jarvisSttEngine: string;
	jarvisTabsJson: string;

	// —— 屈原语音 ——
	quyuanAsrEngine: string;
	quyuanLocalAsrNetworkConsent: boolean;
	quyuanVadEnabled: boolean;
	quyuanVadNetworkConsent: boolean;
	quyuanVoiceModel: string;
	quyuanVoiceEffort: string;
	quyuanRealtimeModel: string;
	quyuanRealtimeVoice: string;
	quyuanVoiceRecognitionEnabled: boolean;
	quyuanVoiceInputMode: "continuous" | "push-to-talk";
	quyuanVoiceSessionJson: string;
}

/** 默认值与 TALOS DEFAULT_SETTINGS 保持一致，宿主可覆盖。 */
export const DEFAULT_QUYUAN_SETTINGS: QuyuanSettings = {
	inboxFolder: "00-收件箱",
	dailyFolder: "01-日志",
	tasksPath: "System/working-memory/tasks.md",
	talosTasksPath: "04-项目/TALOS系统/tasks.md",
	pendingApprovalsPath: "System/pending-approvals.md",
	candidatesPath: "System/working-memory/candidates.md",
	healthLogPath: "System/working-memory/health-log.md",
	reportsFolder: "System/reports",

	voiceAgentCommand: "",
	voicePermission: "off",
	voicePersona: "",
	voiceLang: "zh-CN",
	ttsVoice: "",
	ttsRate: 1.02,
	ttsPitch: 1,
	ttsEngine: "system",
	jarvisPermissionMode: "default",
	jarvisSttEngine: "off",
	jarvisTabsJson: "",

	quyuanAsrEngine: "local",
	quyuanLocalAsrNetworkConsent: false,
	quyuanVadEnabled: false,
	quyuanVadNetworkConsent: false,
	quyuanVoiceModel: "haiku",
	quyuanVoiceEffort: "low",
	quyuanRealtimeModel: "qwen3.5-omni-flash-realtime",
	quyuanRealtimeVoice: "Tina",
	quyuanVoiceRecognitionEnabled: true,
	quyuanVoiceInputMode: "continuous",
	quyuanVoiceSessionJson: "",
};
