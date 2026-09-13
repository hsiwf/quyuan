// ============================================================
// 屈原 Tauri · Rust 侧入口
//   故意保持零自定义命令:可信侧能力全部由官方插件承担——
//   - fs:人格/配置/知识库文件 I/O(范围在 capabilities 里限定)
//   - dialog:知识库目录选择
//   - http:百炼 SDP 交换与联网搜索(仅放行 dashscope 域)
//   前端 bridge.ts 组合这些插件实现与 POC/Electron 相同的 HostBridge。
// ============================================================
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_http::init())
		.build(tauri::generate_context!())
		.expect("屈原告 Tauri 应用启动失败")
		// 保险:最后一个窗口关闭后必须退出进程。
		// 实测关窗后进程会残留(只剩 16x16 隐形辅助窗口),任务栏里
		// 留下一个打不开的僵尸实例。
		.run(|app, event| {
			if let tauri::RunEvent::WindowEvent {
				event: tauri::WindowEvent::Destroyed,
				..
			} = event
			{
				if app.webview_windows().is_empty() {
					app.exit(0);
				}
			}
		});
}
