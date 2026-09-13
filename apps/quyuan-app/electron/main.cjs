// ============================================================
// 屈原 Electron · 主进程
//   对应 TALOS 插件中 main.ts 的"可信宿主"角色:
//   - 百炼 API Key 只存在本进程(UserData/quyuan.config.json)
//   - SDP 交换/联网搜索/文件 I/O 经 127.0.0.1 回环 API 提供渲染页
//   - 回环接口带随机 nonce,渲染页经 URL 参数取到后随请求头回传
//   - 麦克风权限放行仅限本应用自身页面
// 渲染页构建后由本服务静态托管(dist/),无 file:// 协议问题。
// ============================================================
const { app, BrowserWindow, dialog, session } = require("electron");
const http = require("node:http");
const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");

const DIST = path.join(__dirname, "..", "dist");
const CONFIG_PATH = () => path.join(app.getPath("userData"), "quyuan.config.json");
const USAGE_PATH = () => path.join(app.getPath("userData"), "quyuan-usage.jsonl");

const DEFAULT_CONFIG = {
	dashscopeApiKey: "",
	workspaceId: "",
	region: "cn-beijing",
	knowledgeDir: "",
	personaText: "",
	llmBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
	llmApiKey: "",
	llmModel: "qwen-plus",
	quyuan: {},
};

const REALTIME_MODELS = new Set([
	"qwen3.5-omni-flash-realtime",
	"qwen3.5-omni-plus-realtime",
]);

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".woff2": "font/woff2",
};

// ---------- 配置 ----------
function loadConfig() {
	try {
		return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH(), "utf8")) };
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

function saveConfig(config) {
	fs.mkdirSync(path.dirname(CONFIG_PATH()), { recursive: true });
	fs.writeFileSync(CONFIG_PATH(), JSON.stringify(config, null, 2), "utf8");
}

function requireQuyuanConfig(config) {
	const apiKey = String(config.dashscopeApiKey || "").trim();
	if (!apiKey) throw new Error("请先在设置中填写百炼 API Key");
	const workspace = String(config.workspaceId || "").trim();
	if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,127}$/.test(workspace)) {
		throw new Error("请先在设置中填写有效的百炼业务空间 ID");
	}
	const region = config.region === "ap-southeast-1" ? "ap-southeast-1" : "cn-beijing";
	return { apiKey, workspace, region };
}

// ---------- 知识库文件 I/O ----------
async function listMarkdownFiles(knowledgeDir) {
	const root = path.resolve(knowledgeDir);
	const out = [];
	const walk = async (dir, depth) => {
		if (depth > 8 || out.length >= 5000) return;
		let entries;
		try {
			entries = await fs.promises.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (out.length >= 5000) return;
			if (entry.name.startsWith(".")) continue;
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(full, depth + 1);
			else if (/\.(md|markdown|canvas)$/i.test(entry.name)) {
				out.push(path.relative(root, full).split(path.sep).join("/"));
			}
		}
	};
	await walk(root, 0);
	return out.sort();
}

// ---------- 回环 API ----------
function sendJson(res, status, value) {
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(value));
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(chunk));
		req.on("end", () => {
			const text = Buffer.concat(chunks).toString("utf8");
			try {
				resolve(text ? JSON.parse(text) : {});
			} catch (error) {
				reject(new Error("请求体不是合法 JSON"));
			}
		});
		req.on("error", reject);
	});
}

async function readMarkdown(knowledgeDir, rel) {
	if (!knowledgeDir || !rel) throw new Error("知识库未配置或路径为空");
	const root = path.resolve(knowledgeDir);
	const full = path.resolve(root, rel);
	if (full !== root && !full.startsWith(root + path.sep)) throw new Error("路径越界");
	return fs.promises.readFile(full, "utf8");
}

async function handleApi(req, res, url, token) {
	if ((req.headers["x-quyuan-token"] || "") !== token) {
		return sendJson(res, 403, { error: "回环令牌不匹配" });
	}
	const route = `${req.method} ${url.pathname}`;
	try {
		if (route === "GET /api/config") return sendJson(res, 200, loadConfig());
		if (route === "PUT /api/config") {
			const merged = { ...loadConfig(), ...(await readBody(req)) };
			saveConfig(merged);
			return sendJson(res, 200, merged);
		}
		if (route === "POST /api/sdp") {
			const body = await readBody(req);
			const { apiKey, workspace, region } = requireQuyuanConfig(loadConfig());
			if (!REALTIME_MODELS.has(body.model)) throw new Error("不支持的千问 Realtime 模型");
			if (typeof body.offerSdp !== "string" || !body.offerSdp.startsWith("v=0")) {
				throw new Error("无效的 WebRTC Offer SDP");
			}
			const endpoint = new URL(
				`https://${workspace}.${region}.maas.aliyuncs.com/api/v1/webrtc/realtime`
			);
			endpoint.searchParams.set("model", body.model);
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/sdp",
				},
				body: body.offerSdp,
			});
			const text = await response.text();
			if (!response.ok) {
				throw new Error(`百炼 WebRTC SDP 交换失败(HTTP ${response.status}):${text.slice(0, 240)}`);
			}
			if (!text.trim()) throw new Error("百炼 WebRTC SDP 交换返回空响应");
			return sendJson(res, 200, { answerSdp: text });
		}
		if (route === "POST /api/websearch") {
			const body = await readBody(req);
			const { apiKey, workspace, region } = requireQuyuanConfig(loadConfig());
			// 与 quyuan 模块共用端点/请求构造/响应解析(经 dist ESM 导入)
			const quyuan = await import("quyuan");
			const endpoint = quyuan.qwenWebSearchEndpoint(workspace, region);
			const requestBody = quyuan.buildQwenWebSearchRequest(String(body.query || ""));
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});
			const text = await response.text();
			if (!response.ok) throw new Error(`百炼联网搜索失败(HTTP ${response.status})`);
			const result = quyuan.parseQwenWebSearchResponse(JSON.parse(text));
			fs.appendFileSync(
				USAGE_PATH(),
				JSON.stringify({
					namespace: "voice",
					providerId: "aliyun-qwen-search",
					operation: "web-search",
					usage: result.usage,
					at: Date.now(),
				}) + "\n"
			);
			return sendJson(res, 200, { output: result.output });
		}
		if (route === "POST /api/usage") {
			fs.appendFileSync(USAGE_PATH(), JSON.stringify({ ...(await readBody(req)), at: Date.now() }) + "\n");
			return sendJson(res, 200, {});
		}
		if (route === "GET /api/fs/list") {
			const config = loadConfig();
			if (!config.knowledgeDir) return sendJson(res, 200, { paths: [] });
			return sendJson(res, 200, { paths: await listMarkdownFiles(config.knowledgeDir) });
		}
		if (route === "GET /api/fs/read") {
			const config = loadConfig();
			const content = await readMarkdown(config.knowledgeDir, url.searchParams.get("path") || "");
			return sendJson(res, 200, { content });
		}
		if (route === "POST /api/dialog/pickFolder") {
			const result = await dialog.showOpenDialog({
				properties: ["openDirectory"],
				title: "选择屈原告知识库目录",
			});
			return sendJson(res, 200, { path: result.canceled ? null : result.filePaths[0] });
		}
		return sendJson(res, 404, { error: `未知接口:${route}` });
	} catch (error) {
		return sendJson(res, 400, {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

function serveStatic(res, pathname) {
	let filePath = path.join(DIST, path.normalize(pathname).replace(/^([.][.][/\\])+/, ""));
	if (!filePath.startsWith(DIST)) filePath = path.join(DIST, "index.html");
	fs.readFile(filePath, (error, data) => {
		if (error) {
			fs.readFile(path.join(DIST, "index.html"), (error2, index) => {
				if (error2) {
					res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
					res.end("dist 不存在:请先运行 npm run build");
					return;
				}
				res.writeHead(200, { "Content-Type": MIME[".html"] });
				res.end(index);
			});
			return;
		}
		const ext = path.extname(filePath).toLowerCase();
		res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
		res.end(data);
	});
}

function startLoopbackServer(token) {
	return new Promise((resolve) => {
		const server = http.createServer(async (req, res) => {
			const url = new URL(req.url, "http://127.0.0.1");
			if (url.pathname.startsWith("/api/")) return handleApi(req, res, url, token);
			return serveStatic(res, url.pathname);
		});
		server.listen(0, "127.0.0.1", () => {
			const port = server.address().port;
			console.log(`[quyuan] 回环可信侧服务:http://127.0.0.1:${port}`);
			resolve({ server, port });
		});
	});
}

// ---------- 应用生命周期 ----------
async function createWindow() {
	const token = crypto.randomBytes(24).toString("hex");
	const { port } = await startLoopbackServer(token);

	// 麦克风(WebRTC 实时语音)只对本应用页面放行
	session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
		callback(permission === "media");
	});

	const win = new BrowserWindow({
		width: 1280,
		height: 860,
		autoHideMenuBar: true,
		backgroundColor: "#0b0f14",
		title: "屈原 · 语音工作台",
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	win.loadURL(`http://127.0.0.1:${port}/?token=${token}`);
}

app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	app.quit();
});
