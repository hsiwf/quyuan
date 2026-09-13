# Third-party notices(屈原本移模块)

> 本模块从 TALOS for Obsidian 插件的 `src/quyuan/` 提取而来,继承 TALOS 的许可边界:模块自有部分沿用 TALOS Personal Use Source License 1.0(个人非商业用途开放,商业使用须书面授权);下列第三方材料继续受各自许可证和服务条款约束。

## TalosBall 0.3.0 runtime attribution

屈原语音中心的视觉舞台嵌入 TalosBall 0.3.0。产品目录、API 与运行时标识统一为 TalosBall;几何、32 态数据、SVG renderer 与动画参数保持授权固定来源的确定性等价。

- Local runtime: `src/talos-ball/runtime/`
- Source attribution and license materials: `src/talos-ball/runtime/vendor/talos-ball-runtime/`
- Fixed source repository: `https://github.com/sam70361/emotion-ball`
- Fixed source commit: `b406eeb20a1b1ae0084d4006e77cc74e28be009d`
- Verification: 32 states × 9 timestamps, 288 deterministic pose traces

TalosBall 包装、状态适配和生命周期代码属于 TALOS 新增层;来源几何、状态数据、renderer 与 animation engine 不声明为独立原创。

## 可选本地语音运行时与模型

本地 ASR 使用构建时静态嵌入的 Sherpa-ONNX 浏览器封装、独立 Web Worker、固定 WASM 与中英双语流式 Zipformer int8 模型。运行时不联网;宿主只读取随包固定资产,并在申请麦克风前逐文件校验字节数与 SHA-256。缺件或校验失败时失败关闭。

- Runtime: sherpa-onnx 1.13.6
- Runtime snapshot: `7c59b5225b857366f0a8c0cc1783ace8e9f193ac`
- Runtime license: Apache-2.0
- Embedded inference engine: ONNX Runtime 1.27.1, MIT
- Model: `csukuangfj/k2fsa-zipformer-bilingual-zh-en-t`
- Model revision: `e2382758de9a0219b4efe682b95af30b399db3b8`
- Model repository license declaration: Apache-2.0
- Complete asset hashes, attribution and bundled license texts:
  `src/vendor/local-voice-runtime/NOTICE.md`

模型卡只把训练集描述为数万小时内部数据;因此当前集成可用于本地技术验收,但在商业发布前仍须对训练数据来源披露与适用风险做独立复核。Silero VAD 仍维持独立失败关闭边界,未因 ASR 集成而自动引入第三方运行时或模型。

## 图标:Lucide 派生内联 SVG

`src/host/icons.ts` 以内联 SVG 自持 Obsidian 原本内置的 Lucide 图标子集(audio-lines、ear、loader、mic、mic-off、moon、volume-2、volume-x、shield-check、message-square、arrow-up、cpu、radio、mouse-pointer-click),路径数据来自 Lucide v0.x。

- Project: Lucide
- Repository: https://github.com/lucide-icons/lucide
- License: ISC

`talos-logo` 图标来自 TALOS 自有的 `src/vendor/talos-mark.ts`,不属于 Lucide。

## Uiverse.io 按钮交互

屈原语音界面的紧凑操作按钮借鉴并改写了 Uiverse.io 社区作者 `gharsh11032000` 的按钮交互:深色胶囊底、底部上涌填色与 hover 摇动。样式与颜色、尺寸、禁用态、键盘聚焦、reduced-motion 语义重新接入本地 `tq-btn` 体系。

- Project: Uiverse Galaxy
- Contributor attribution: `gharsh11032000`
- Repository: https://github.com/uiverse-io/galaxy
- License: MIT

## Ma Shan Zheng 字体

屈原文档约定状态主标题可使用 Ma Shan Zheng 中文毛笔字体。本模块不随包分发字体文件;宿主如需同名视觉,请自行获取并遵守其许可证。

- Project: Ma Shan Zheng
- Source: https://github.com/google/fonts/tree/main/ofl/mashanzheng
- Copyright: 2018 The Ma Shan Zheng Project Authors
- License: SIL Open Font License 1.1

## 模型和外部服务

模型、实时语音服务(Qwen Omni Realtime / 百炼)与联网检索不是本模块许可的一部分。使用者须分别遵守所选服务的最新条款;实时语音需要宿主在可信侧持有百炼 API Key 并经 SDP 交换端点注入,模块源码不持有任何密钥。
