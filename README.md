# 屈原 Quyuan · 可移植语音人格模块

> 从 [TALOS for Obsidian](https://github.com/WAINAO-Haaper/talos-plugin) 插件 `src/quyuan/`(56 个文件,约 9500 行)完整提取的**去 Obsidian 化可移植模块**。屈原是 TALOS 的"屈原"语音人格子系统:人格合同、写库治理、强制人格上下文、Qwen Omni Realtime 实时语音、本地 VAD/ASR 语音链、TalosBall 动画舞台与语音工作台 UI。
>
> 提取原则:**talos-plugin 原仓库保持不动**;本模块是独立副本,源码级合同测试钉住行为不漂移。

## 出处与许可( provenance )

- **上游项目**:TALOS for Obsidian,作者 外脑玩家 Haaper([@WAINAO-Haaper](https://github.com/WAINAO-Haaper)),仓库 [WAINAO-Haaper/talos-plugin](https://github.com/WAINAO-Haaper/talos-plugin)
- **本仓库性质**:对 TALOS Materials 的修改版再分发,依据 [LICENSE](./LICENSE)(TALOS Personal Use Source License 1.0)第 2 条"个人非商业用途"条款进行:完整源码公开、原许可与版权声明完整保留、不收取任何费用、接收方获得不劣于原许可的限制
- **修改标识**:全部源码相对上游做了结构性适配(去 Obsidian 化端口化,详见下文《与 TALOS 原实现的有意差异》);第三方资产许可见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)
- 本项目不是 TALOS 官方发布物,也**不得**将本模块或其修改版声称为自己的原创作品;商用需按 LICENSE 第 3 条向版权人获得书面授权

## 能力地图

| 层 | 内容 | 依赖形态 |
|---|---|---|
| 核心 | `contract.ts` 能力合同、`governance.ts` 写库铁律、`persona-context.ts` 强制三文件人格上下文、`native-voice-driver.ts` 语音/文字双通道驱动 | 纯逻辑,Node/浏览器通用 |
| 引擎 | `qwen-realtime-voice.ts` 实时语音状态机(11 态)、`vad-mic.ts`/`silero-vad.ts` 本地 VAD、`sherpa-local-asr-runtime.ts` 本地 ASR、`cloud-asr.ts` 失败关闭桩 | 标准 Web API(WebRTC/WebAudio/WASM) |
| UI | `voice-panel.ts` 语音工作台(六态舞台、唤醒词门控、打断、TTS)、`talos-ball/` 动画球、粒子磁场 | DOM,经 `src/host/dom.ts` 兼容层 |
| 端口 | `src/host/` 宿主接口 + 默认实现 | 由宿主注入 |
| vendor | `src/vendor/` 随迁的零依赖纯文件(见下) | 无 |

## 快速开始

```bash
npm install
npm run typecheck   # tsc --noEmit,全绿
npm test            # vitest,18 文件 / 141 用例
npm run build       # dist/ ESM + CJS + 54 个 .d.ts
```

## 嵌入指南(以 Web 前端为例)

### 1. 安装 DOM 兼容层(必须最先调用)

TALOS 的 UI 代码依赖 Obsidian 挂在 `HTMLElement` 原型上的扩展方法。本模块提供同语义实现:

```ts
import { installQuyuanDomExtensions } from "quyuan";

installQuyuanDomExtensions(); // 幂等;在任何页面/DOM 测试中调用一次即可
```

覆盖:`createEl/createDiv/createSpan`(支持 `cls/text/attr` 等)、`setText`、`empty`、`addClass/removeClass/toggleClass`、`setCssProps`,以及 `setIcon`(内置 14 个 Lucide 系内联 SVG + talos-logo,可用 `registerQuyuanIcon` 扩展)。

### 2. 实现宿主端口

```ts
import {
  QuyuanVoicePanel, InMemoryTextStore, DEFAULT_QUYUAN_SETTINGS,
  type QuyuanHost, type QuyuanVoiceRuntimeHost,
} from "quyuan";
import "quyuan/styles.css"; // 或直接引入 styles/quyuan-shell.css

// —— 通用 UI 端口(Notice / MarkdownRenderer / 设置入口 的替代)——
const host: QuyuanHost = {
  configDir: ".config",                       // 原 Obsidian 的 .obsidian,用于库路径禁区判断
  notify: (msg, timeoutMs) => ui.toast(msg),  // 原 new Notice(...)
  renderMarkdown: async (md, el) => { el.innerHTML = myMarkdown.render(md); },
  openSettings: () => myApp.openSettings(),   // 可选
};

// —— 智能体工作台端口(语音/文字通道的大脑)——
const runtimeHost: QuyuanVoiceRuntimeHost = {
  getAgentWorkbenchService: () => myAgentService, // QuyuanAgentWorkbenchService 结构接口
  auditQuyuanProviderEgress: async (input) => myPrivacyAudit(input),
};
```

### 3. 装配语音面板

```ts
const plugin = {
  ...runtimeHost,
  paths: {},                                   // QuyuanVaultPaths:宿主路径快照
  activateQuyuanV2View: async () => {},        // "转到 AI 对话" 导航钩子
  exchangeQuyuanRealtimeSdp: async (input) => myServer.negotiate(input), // 信令必须在可信宿主侧(持百炼 Key)
  executeQuyuanVoiceVaultTool: async (input) => myVaultTools.run(input), // 应路由经 authorizeTool
  executeQuyuanVoiceWebSearch: async (input) => myWebSearch.run(input),  // 同上
  recordQuyuanProviderUsage: async (input) => myUsageStore.record(input),
};

const panel = new QuyuanVoicePanel(
  host,                        // ① 宿主 UI 端口(原 Obsidian App 的替代)
  plugin,                      // ② 面板依赖(TalosQuyuanPlugin 接口)
  { ...DEFAULT_QUYUAN_SETTINGS, /* 覆盖设置字段 */ },
  async () => saveSettings(),  // ④ 可选:设置持久化回调
  (pageKey) => router.go(pageKey), // ⑤ 可选:页面导航
);
panel.mount(document.querySelector("#quyuan-root"));
```

其余能力按需直接导入:`QuyuanModule`(人格+治理组合根,构造参数为 `QuyuanTextStore` + 工作台适配器)、`VoiceSessionStore`(注入 `VoiceSessionPersistence` 即可接 localStorage/IndexedDB)、`buildTalosDataMap`、`StreamTts` 等。

## 宿主端口一览

| 端口 | 替代的 Obsidian API | 用途 |
|---|---|---|
| `QuyuanTextStore` | `app.vault.adapter` | 人格三文件加载(exists/read) |
| `QuyuanHostUi.notify` | `Notice` | 轻量通知 |
| `QuyuanHostUi.renderMarkdown` | `MarkdownRenderer.render` | AI 回复的 Markdown 渲染 |
| `QuyuanHostUi.openSettings?` | `app.setting.openTabById` | 打开宿主设置 |
| `QuyuanHostEnv.configDir?` | `app.vault.configDir` | 库路径禁区判断 |
| `QuyuanVoiceRuntimeHost` | `AgentWorkbenchService` + 出库审计 | 语音/文字通道的 Agent 执行与隐私审计 |
| `TalosQuyuanPlugin`(面板 deps) | 原插件 `main.ts` 桥 | SDP 信令、库内只读工具、联网搜索、用量记账 |

密钥边界:**百炼 API Key 等凭据只存在于可信宿主侧**(SDP 交换与联网检索的执行方),模块源码不持有、不传输任何密钥——合同测试钉死了这一点。

## vendor 清单(随迁的 TALOS 纯文件)

| 文件 | 出处 |
|---|---|
| `vendor/talos-mark.ts` | `src/talos-mark.ts`(TALOS 标志粒子生成 + talos-logo SVG) |
| `vendor/secret-policy.ts`、`vendor/tool-path-policy.ts` | `src/ai/context/` |
| `vendor/action-types.ts`、`vendor/action-risk-policy.ts` | `src/action-core/` |
| `vendor/provider-capabilities.ts` | `src/ai/provider/types.ts` + `src/ai/privacy/provider-usage-audit-store.ts` 的纯类型部分 |
| `vendor/runtime-contracts/` | `src/agent-workbench/contracts/`(agent-events、runtime-adapter、runtime-capabilities) |
| `vendor/voiceio.ts` | `src/jarvis/voiceio.ts`(系统 TTS;WebSpeech STT 保持失败关闭桩) |
| `vendor/local-voice-runtime/`、`talos-ball/runtime/vendor/` | 固定版本第三方资产(见 `THIRD-PARTY-NOTICES.md`) |

## 与 TALOS 原实现的有意差异

1. **`App` → 端口**:`persona-context`/`module.ts` 消费 `QuyuanTextStore`;`voice-panel` 消费 `QuyuanHost`。构造签名从 `(app, plugin, settings, …)` 变为 `(host, plugin, settings, …)`。
2. **`activeDocument` → `document`**:不再支持 Obsidian 的多窗口(逆变弹窗)语义。
3. **`VaultPaths` 类 → `QuyuanVaultPaths`**:面板只透传,宿主给任意路径映射对象。
4. **`paths` 排序钉死为码点序**:原实现用裸 `localeCompare`,输出顺序随运行环境 ICU 漂移(中文 Windows 按拼音、Linux CI 按码点);现统一为 `compareCodepoint`,跨环境确定。
5. **宿主装配断言移除**:钉在 `view.ts`/`main.ts` 上的装配合同测试归 talos-plugin 原仓库;模块内的安全/只读/单引擎合同全部保留并适配。
6. **测试基础设施加固**:`talos-ball` 完整性哈希在归一化 LF 后比对(Windows autocrlf 检出不致误报);pose 等价测试用 `fileURLToPath` 修了 Windows 路径。

## 测试

18 个测试文件、141 个用例,与 talos-plugin 同源:治理、人格上下文、语音会话隔离、只读策略(源码级合同)、Qwen 实时语音、本地语音供应链、TalosBall 运行时完整性/姿态等价。在纯 Node 环境运行(DOM 相关测试使用 `tests/helpers/mini-dom`)。

## 许可

本模块是 TALOS Materials 的修改版,完整许可文本随仓库分发,见 [LICENSE](./LICENSE)(TALOS Personal Use Source License 1.0,个人非商业使用;商用须按其第 3 条获得版权人书面授权);第三方资产许可见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。
