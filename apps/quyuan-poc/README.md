# 屈原 POC · 浏览器全功能验证(路线 A)

不套任何桌面壳,用最快的方式跑通屈原全部语音链路:**本机 Node 可信侧服务**(`server.mjs`,零依赖)+ **浏览器语音工作台页面**。半天可验证,是 [quyuan-app](../quyuan-app)(Electron)与 [quyuan-tauri](../quyuan-tauri)(Tauri)的链路基线。

## 运行

```bash
npm install

# 开发:可信侧服务(8787)+ Vite(5188,代理 /api)
npm run dev

# 或生产形态:构建静态页,由可信侧服务直接托管
npm run build
npm start        # http://127.0.0.1:8787
```

打开页面后,点右上角 **⚙** 填写:

| 字段 | 说明 |
|---|---|
| `dashscopeApiKey` | 百炼 API Key(实时语音 SDP 交换 + 联网搜索共用) |
| `workspaceId` | 百炼业务空间 ID |
| `region` | `cn-beijing` 或 `ap-southeast-1` |
| `knowledgeDir` | 本地知识库目录(绝对路径),库内只读工具的工作范围 |
| `personaText` | 人格文本(对应原 TALOS 的 `灵魂/PERSONA.md`) |
| `llmBaseUrl` / `llmApiKey` / `llmModel` | 文字通道的 OpenAI 兼容端点(默认 DashScope 兼容模式) |

## 架构

```
浏览器页面(同 quyuan-app 渲染端)
  ├─ quyuan 模块:语音面板/实时语音/治理/DOM 兼容层
  ├─ bridge ── 相对 /api fetch ──▶ server.mjs(127.0.0.1:8787,可信侧)
  │                                ├─ /api/sdp       百炼 WebRTC SDP 交换(持 Key)
  │                                ├─ /api/websearch 百炼联网搜索(持 Key)
  │                                ├─ /api/config    配置读写
  │                                └─ /api/fs/*      知识库列举/读取(防路径越界)
  └─ DirectApiAgentRuntime ── 流式 ──▶ OpenAI 兼容 LLM(文字通道)
```

实时语音媒体流在浏览器与百炼之间**直连**(WebRTC),服务端只交换信令。

## 已验证 / 未验证

- ✅ typecheck、vite 构建、全部 /api 接口冒烟(配置、SDP 缺 Key 报错、静态页、文件列举)
- ✅ 屈原模块自身 141 个测试
- ⏳ 真实语音对话需自备百炼 Key 与麦克风环境,属人工验收项

## 已知边界(MVP)

1. 配置含明文 Key,写在 `quyuan.config.json`(已 gitignore);正式分发请用 quyuan-app 的 UserData 隔离,并进一步接系统密钥链。
2. 文字通道为纯对话(无工具/审批);语音通道保留只读库工具与口令制联网搜索的完整治理。
3. 服务只监听回环地址,无鉴权;不要把端口暴露到局域网。
