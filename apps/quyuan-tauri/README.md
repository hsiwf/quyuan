# 屈原 Tauri · 轻量桌面应用(路线 C)

用 Tauri 2 把同一条语音链路压进 WebView:安装包体积比 Electron 小一个数量级。可信侧由 **Rust 官方插件**承担(fs / dialog / http),**零自定义 Rust 命令**——前端 `bridge.ts` 直接组合插件 API,页面装配代码与 POC/Electron 完全一致。

## 前置条件(本机已就绪)

Rust 工具链(rustup 1.98 stable-msvc)、MSVC Build Tools 14.44(含 Windows 11 SDK 10.0.26100)、WebView2 运行时 152.x 均已安装;cargo 已配置 USTC crates 镜像(`~/.cargo/config.toml`)。

⚠️ **在 Git Bash / MSYS 环境下编译必须走 vcvars 环境**,否则 rustc 会误用 Git 自带的 `link.exe`。本项目提供现成脚本(GBK 编码的批处理,中文路径必需):

```bash
cd src-tauri && cmd //c _vsbuild.cmd     # = vcvars64 + cargo check/build
```

## 运行

```bash
npm install
npm run build            # 前端 dist(exe 内嵌该产物,改前端后需重跑)
cd src-tauri && cmd //c _vsrelease.cmd   # 编译正式版(独立运行,日常用这个)
./target/release/quyuan-tauri.exe      # 双击/命令行启动,无需任何服务器
# ⚠ debug 版(cargo build 默认产物)必须先 npm run dev 启动 Vite 5190
#   才能显示界面(debug 按约定加载 devUrl);release 版内嵌前端无此依赖。
#   vite.config.ts 已排除 src-tauri/target 监视,避免与 cargo 并发崩溃。
# 或整体走 tauri CLI:
npm run app:dev          # 开发窗口
npm run app:build        # 发布包(需先在 tauri.conf.json 配置 bundle.icons 并激活 bundle)
```

## 架构

```
WebView 渲染页(与 POC 同一份装配代码)
  └─ bridge.ts(tauri 版)
      ├─ plugin-fs      配置/知识库/用量文件 I/O(能力清单限定范围)
      ├─ plugin-http    百炼 SDP 交换 + 联网搜索(能力清单仅放行 dashscope 两域)
      ├─ plugin-dialog  原生目录选择
      └─ quyuan 模块    qwenWebSearchEndpoint 等请求构造直接复用
```

安全模型:外部请求经 `capabilities/default.json` 白名单(仅 `*.maas.aliyuncs.com` 与 `dashscope.aliyuncs.com`),密钥存 `appData/quyuan.config.json`,页面无法绕过能力清单访问其他域。

## 已验证 / 未验证

- ✅ Rust + MSVC 环境装齐;`cargo check`/`cargo build` 零错误(tauri 2.11.5 + fs/dialog/http 三插件)
- ✅ 可执行文件真机启动:窗口创建、WebView2 四子进程拉起、前端资源内嵌加载
- ✅ 渲染端 typecheck + vite 构建;tauri.conf 与 capabilities JSON 合法
- ⏳ 真机语音对话(麦克风 + 听声)待人工确认
- ⏳ 发布打包(`tauri build`)未执行,需要时激活 bundle 并配齐签名

## 已知边界(MVP)

1. 配置为明文 Key;可接 keyring/stronghold 加固。
2. `bundle.active = false`,发布打包前需 `npm run tauri icon` 生成图标并启用 bundle。
3. 文字通道为纯对话;语音通道治理完整(与另两条路线一致)。
