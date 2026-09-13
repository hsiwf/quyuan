# 屈原 Quyuan · 可移植语音人格运行时

> 从 [TALOS for Obsidian](https://github.com/WAINAO-Haaper/talos-plugin) 插件完整提取、**去 Obsidian 化**的屈原告语音子系统:人格合同、写库治理、强制人格上下文、Qwen Omni Realtime 实时语音、本地 VAD/ASR 语音链、TalosBall 动画舞台与语音工作台 UI。
>
> 本仓库包含 **1 个可移植模块**(`src/`)与 **3 条开箱即用的运行路线**(`apps/`):浏览器 POC、Electron 桌面应用、Tauri 桌面应用。

## 仓库结构

```
quyuan/
├── src/                  # 屈原可移植模块(纯 TS,零运行时依赖)
│   ├── host/             #   宿主端口:文本存储/UI/Agent 工作台/DOM 兼容层/图标
│   ├── vendor/           #   随迁的 TALOS 纯文件与第三方资产
│   └── ...               #   语音面板/实时语音/治理/人格/会话存储
├── apps/
│   ├── quyuan-poc/       # 路线 A · 浏览器 POC(Node 可信侧 + 网页)
│   ├── quyuan-app/       # 路线 B · Electron 桌面应用(推荐自用)
│   └── quyuan-tauri/     # 路线 C · Tauri 2 桌面应用(轻量备选)
└── styles/               # 屈原工作台样式(shell + 宿主 chrome)
```

## 版本

| 版本 | 内容 |
|---|---|
| **v1.0.0** | 屈原可移植模块:提取、去 Obsidian 化、宿主端口化、141 项测试全绿 |
| **v2.0.0** | 新增三条运行路线(apps/),凭证配置化,开箱即用 |

## 三条路线怎么选

| 场景 | 推荐 | 理由 |
|---|---|---|
| **日常自用、要稳定** | B · Electron | 系统级音频/麦克风最可靠;原生目录选择;UserData 隔离配置 |
| **在意体积、想分发** | C · Tauri | 安装包小一个量级;Rust 插件白名单网络域;需 Rust 工具链 |
| **快速验证、二次开发参考** | A · 浏览器 POC | 零桌面依赖,半天看懂全部接线;改动即时生效 |

三条路线共用同一份页面装配代码与同一套宿主端口,配置格式完全一致——从一个路线迁到另一个,只需换桥接实现。

## 快速开始

### 0. 准备凭证(三条路线通用)

1. [阿里云百炼](https://bailian.console.aliyun.com) 创建 API-KEY(`sk-` 开头)
2. 百炼控制台"业务空间"页复制业务空间 ID
3. (可选)准备一个放 Markdown 笔记的文件夹作为"屈原告知识库"

### A · 浏览器 POC

```bash
cd apps/quyuan-poc
npm install
npm run dev        # 可信侧服务(8787)+ Vite(5188);浏览器打开 http://localhost:5188
# 或生产形态:npm run build && npm start(由可信侧服务托管,http://127.0.0.1:8787)
```

页面右上角 ⚙ 填入 Key、业务空间 ID、知识库目录 → 点"开启语音"。详见 [apps/quyuan-poc/README.md](apps/quyuan-poc/README.md)。

### B · Electron 桌面应用(推荐)

```bash
cd apps/quyuan-app
npm install        # 国内网络保留 .npmrc(electron 镜像)
npm start          # 构建并打开桌面窗口
```

窗口右上角 ⚙ 设置(支持原生目录选择)。详见 [apps/quyuan-app/README.md](apps/quyuan-app/README.md)。

### C · Tauri 桌面应用

```bash
cd apps/quyuan-tauri
npm install
npm run build                                  # 前端 dist(被 exe 内嵌)
cd src-tauri && cmd //c _vsrelease.cmd         # 编译正式版(Git Bash/MSYS 必须走 vcvars,见该目录 README)
./target/release/quyuan-tauri.exe              # 独立运行,无需任何服务器
```

详见 [apps/quyuan-tauri/README.md](apps/quyuan-tauri/README.md)。

### 语音怎么玩(三条路线一致)

1. 点红色"**开启语音**",允许麦克风
2. 说「**屈原**」唤醒 → 30 秒内连续对话;说「退下」休眠;「退出语音」关麦
3. 试试:「现在几点了?」(对话)/「知识库里有哪些文件?」(库内只读工具)/「**联网搜索**一下今天的新闻」(带口令才出网,安全设计)

文字输入框始终可用,与语音共享治理规则。

## 模块嵌入指南(二次开发)

把 `src/` 当作普通 npm 包使用(本仓库内 apps 通过 `file:../..` 引用):

```bash
npm install        # 根目录;prepare 脚本会自动构建 dist
```

### 1. 安装 DOM 兼容层(必须最先调用)

TALOS 的 UI 代码依赖 Obsidian 预挂在 `HTMLElement` 原型上的扩展方法,本模块提供同语义实现:

```ts
import { installQuyuanDomExtensions } from "quyuan";

installQuyuanDomExtensions(); // 幂等;任何页面/DOM 测试中调用一次即可
```

覆盖:`createEl/createDiv/createSpan`(`cls/text/attr`)、`setText`、`empty`、`addClass/removeClass/toggleClass`(支持空格分隔多类名)、`setCssProps`,以及 `setIcon`(内置 14 个 Lucide 系内联 SVG + talos-logo,`registerQuyuanIcon` 可扩展)。

### 2. 实现宿主端口

```ts
import {
  QuyuanVoicePanel, InMemoryTextStore, DEFAULT_QUYUAN_SETTINGS,
  type QuyuanHost, type QuyuanVoiceRuntimeHost,
} from "quyuan";
import "quyuan/styles.css";
import "quyuan/styles/workspace-chrome.css";

const host: QuyuanHost = {
  configDir: ".config",                        // 原 Obsidian 的 .obsidian,用于库路径禁区判断
  notify: (msg, timeoutMs) => ui.toast(msg),   // 原 new Notice(...)
  renderMarkdown: async (md, el) => { el.innerHTML = DOMPurify.sanitize(marked.parse(md)); },
  openSettings: () => myApp.openSettings(),    // 可选
};

const runtimeHost: QuyuanVoiceRuntimeHost = {
  getAgentWorkbenchService: () => myAgentService,        // QuyuanAgentWorkbenchService 结构接口
  auditQuyuanProviderEgress: async (input) => myPrivacyAudit(input),
};
```

### 3. 装配语音面板

```ts
const plugin = {
  ...runtimeHost,
  paths: {},                                   // QuyuanVaultPaths:宿主路径快照
  activateQuyuanV2View: async () => {},        // "转到 AI 对话"导航钩子
  exchangeQuyuanRealtimeSdp: async (input) => trusted.sdp(input),   // 信令必须在可信侧(持百炼 Key)
  executeQuyuanVoiceVaultTool: async (input) => myVaultTools.run(input), // 应路由经 authorizeTool
  executeQuyuanVoiceWebSearch: async (input) => trusted.webSearch(input),// 同上
  recordQuyuanProviderUsage: async (input) => myUsageStore.record(input),
};

const panel = new QuyuanVoicePanel(
  host,                        // ① 宿主 UI 端口(原 Obsidian App 的替代)
  plugin,                      // ② 面板依赖(TalosQuyuanPlugin 接口)
  { ...DEFAULT_QUYUAN_SETTINGS },
  async () => saveSettings(),  // ④ 可选:设置持久化回调
  (pageKey) => router.go(pageKey), // ⑤ 可选:页面导航
);
panel.mount(document.querySelector("#quyuan-root"));
```

> 三条路线的完整装配实现就在 `apps/*/src/main.ts`,是最好的参考样本(各约 400 行)。

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
| `vendor/local-voice-runtime/`、`src/talos-ball/runtime/vendor/` | 固定版本第三方资产(见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)) |

## 与 TALOS 原实现的有意差异

1. **`App` → 端口**:`persona-context`/`module.ts` 消费 `QuyuanTextStore`;`voice-panel` 消费 `QuyuanHost`。构造签名从 `(app, plugin, settings, …)` 变为 `(host, plugin, settings, …)`。
2. **`activeDocument` → `document`**:不再支持 Obsidian 的多窗口(逆变弹窗)语义。
3. **`VaultPaths` 类 → `QuyuanVaultPaths`**:面板只透传,宿主给任意路径映射对象。
4. **`paths` 排序钉死为码点序**:原实现用裸 `localeCompare`,输出顺序随运行环境 ICU 漂移(中文 Windows 按拼音、Linux CI 按码点);现统一为 `compareCodepoint`,跨环境确定。
5. **宿主装配断言移除**:钉在 `view.ts`/`main.ts` 上的装配合同测试归 talos-plugin 原仓库;模块内的安全/只读/单引擎合同全部保留并适配。
6. **测试基础设施加固**:`talos-ball` 完整性哈希在归一化 LF 后比对(Windows autocrlf 检出不致误报);pose 等价测试用 `fileURLToPath` 修了 Windows 路径。

## 测试

根目录 18 个测试文件、141 个用例,与 talos-plugin 同源:治理、人格上下文、语音会话隔离、只读策略(源码级合同)、Qwen 实时语音、本地语音供应链、TalosBall 运行时完整性/姿态等价。纯 Node 环境运行(DOM 相关测试使用 `tests/helpers/mini-dom`)。

```bash
npm test        # 141 用例
npm run build   # dist/ ESM + CJS + 声明文件
```

## 出处与许可( provenance )

- **上游项目**:TALOS for Obsidian,作者 外脑玩家 Haaper([@WAINAO-Haaper](https://github.com/WAINAO-Haaper)),仓库 [WAINAO-Haaper/talos-plugin](https://github.com/WAINAO-Haaper/talos-plugin)
- **本仓库性质**:对 TALOS Materials 的修改版再分发,依据 [LICENSE](./LICENSE)(TALOS Personal Use Source License 1.0)第 2 条"个人非商业用途"条款进行:完整源码公开、原许可与版权声明完整保留、不收取任何费用、接收方获得不劣于原许可的限制
- **修改标识**:全部源码相对上游做了结构性适配(去 Obsidian 化端口化,详见上文《与 TALOS 原实现的有意差异》);第三方资产许可见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
- 本项目不是 TALOS 官方发布物,也**不得**将本模块或其修改版声称为自己的原创作品;商用需按 LICENSE 第 3 条向版权人获得书面授权
