# 屈原 App · Electron 桌面应用(路线 B)

把 POC 链路装进桌面壳:Electron 主进程承担 TALOS 插件里 `main.ts` 的"可信宿主"角色——Key 保管、SDP 交换、联网搜索、知识库文件 I/O、原生目录选择对话框;渲染页与 [quyuan-poc](../quyuan-poc) 同源同构。

## 运行

```bash
npm install        # 国内网络请保留 .npmrc(electron 镜像)
npm start          # = vite build + electron .(构建并打开桌面窗口)
```

若 electron 二进制安装失败(下载中断),手动补:

```bash
curl -L -o electron.zip https://npmmirror.com/mirrors/electron/v33.4.11/electron-v33.4.11-win32-x64.zip
# 解压到 node_modules/electron/dist/,并把 "electron.exe" 写入 node_modules/electron/path.txt
```

设置入口同 POC(右上角 ⚙),额外多一个**原生目录选择**按钮;配置保存在 `UserData/quyuan.config.json`,与开发仓库隔离。

## 架构

```
Electron 渲染页(与 POC 同一份装配代码)
  └─ bridge ── 相对 /api + X-Quyuan-Token ──▶ 主进程回环服务(127.0.0.1:随机端口)
                                              ├─ /api/sdp、/api/websearch(持 Key)
                                              ├─ /api/fs/*、/api/usage
                                              ├─ /api/dialog/pickFolder(原生对话框)
                                              └─ 静态托管 dist/
```

安全设计:

- 百炼 Key 只存在主进程(UserData 配置文件),渲染页经可信接口使用,**永不进入页面**
- 回环接口逐请求校验随机 nonce(页面经 URL 参数获得);服务只绑 127.0.0.1
- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`
- 麦克风权限处理器仅对 `media` 放行

## 已验证 / 未验证

- ✅ 主进程语法检查;渲染端 typecheck + vite 构建;electron v33.4.11 安装
- ✅ 接口层逻辑与 POC 冒烟同构(SDP/搜索/文件)
- ⏳ 桌面窗口内真实语音对话属人工验收(需百炼 Key + 麦克风)

## 已知边界(MVP)

1. 配置文件仍为明文 Key;下一步可接 Electron `safeStorage` 加密。
2. 文字通道为纯对话(无工具/审批);语音通道治理完整。
3. 未做自动更新与代码签名(个人使用可忽略 SmartScreen 提示)。
