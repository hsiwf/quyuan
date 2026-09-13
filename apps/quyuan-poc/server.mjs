// ============================================================
// 屈原 POC · 可信侧本机服务
//   浏览器没有安全保管 API Key 的能力,百炼密钥、SDP 交换、联网搜索
//   全部收拢在这个 127.0.0.1 服务里(对应 TALOS 插件中 main.ts 的角色)。
//   仅监听回环地址;生产化(桌面 App)请看 ../quyuan-app。
// ============================================================
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildQwenWebSearchRequest,
	parseQwenWebSearchResponse,
	qwenWebSearchEndpoint,
} from "quyuan";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const CONFIG_PATH = path.join(ROOT, "quyuan.config.json");
const USAGE_PATH = path.join(ROOT, "quyuan-usage.jsonl");
const PORT = Number(process.env.QUYUAN_POC_PORT || 8787);

const DEFAULT_CONFIG = {
	dashscopeApiKey: "",
	workspaceId: "",
	region: "cn-beijing", // cn-beijing | ap-southeast-1
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

// ---------- 小工具 ----------
function sendJson(res, status, value) {
	const body = JSON.stringify(value);
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	res.end(body);
}

async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	const text = Buffer.concat(chunks).toString("utf8");
	return text ? JSON.parse(text) : {};
}

async function loadConfig() {
	try {
		const raw = await fs.readFile(CONFIG_PATH, "utf8");
		return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

async function saveConfig(config) {
	await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
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

// 递归列举知识库下的 Markdown 相对路径
async function listMarkdownFiles(knowledgeDir) {
	const root = path.resolve(knowledgeDir);
	const out = [];
	const walk = async (dir, depth) => {
		if (depth > 8 || out.length >= 5000) return;
		let entries;
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
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

// ---------- API 路由 ----------
async function handleApi(req, res, url) {
	const route = `${req.method} ${url.pathname}`;
	try {
		if (route === "GET /api/config") {
			const config = await loadConfig();
			return sendJson(res, 200, config);
		}
		if (route === "PUT /api/config") {
			const incoming = await readBody(req);
			const merged = { ...(await loadConfig()), ...incoming };
			await saveConfig(merged);
			return sendJson(res, 200, merged);
		}
		if (route === "POST /api/sdp") {
			const body = await readBody(req);
			const config = await loadConfig();
			const { apiKey, workspace, region } = requireQuyuanConfig(config);
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
			const config = await loadConfig();
			const { apiKey, workspace, region } = requireQuyuanConfig(config);
			const endpoint = qwenWebSearchEndpoint(workspace, region);
			const requestBody = buildQwenWebSearchRequest(String(body.query || ""));
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
			const result = parseQwenWebSearchResponse(JSON.parse(text));
			await fs.appendFile(
				USAGE_PATH,
				JSON.stringify({
					namespace: "voice",
					providerId: "aliyun-qwen-search",
					operation: "web-search",
					model: "qwen-flash",
					usage: result.usage,
					at: Date.now(),
				}) + "\n"
			);
			return sendJson(res, 200, { output: result.output });
		}
		if (route === "POST /api/usage") {
			const body = await readBody(req);
			await fs.appendFile(USAGE_PATH, JSON.stringify({ ...body, at: Date.now() }) + "\n");
			return sendJson(res, 200, {});
		}
		if (route === "GET /api/fs/list") {
			const config = await loadConfig();
			if (!config.knowledgeDir) return sendJson(res, 200, { paths: [] });
			return sendJson(res, 200, { paths: await listMarkdownFiles(config.knowledgeDir) });
		}
		if (route === "GET /api/fs/read") {
			const config = await loadConfig();
			const rel = String(url.searchParams.get("path") || "");
			if (!config.knowledgeDir || !rel) throw new Error("知识库未配置或路径为空");
			const root = path.resolve(config.knowledgeDir);
			const full = path.resolve(root, rel);
			if (full !== root && !full.startsWith(root + path.sep)) {
				throw new Error("路径越界");
			}
			const content = await fs.readFile(full, "utf8");
			return sendJson(res, 200, { content });
		}
		return sendJson(res, 404, { error: `未知接口:${route}` });
	} catch (error) {
		return sendJson(res, 400, {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

// ---------- 静态资源 ----------
async function serveStatic(res, pathname) {
	let filePath = path.join(DIST, path.normalize(pathname).replace(/^([.][.][/\\])+/, ""));
	if (!filePath.startsWith(DIST)) filePath = path.join(DIST, "index.html");
	try {
		const data = await fs.readFile(filePath);
		const ext = path.extname(filePath).toLowerCase();
		res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
		res.end(data);
	} catch {
		// SPA 回退
		try {
			const data = await fs.readFile(path.join(DIST, "index.html"));
			res.writeHead(200, { "Content-Type": MIME[".html"] });
			res.end(data);
		} catch {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("dist 不存在:先运行 npm run build,或用 npm run dev 走 Vite 开发服务");
		}
	}
}

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
	if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
	return serveStatic(res, url.pathname);
});

server.listen(PORT, "127.0.0.1", () => {
	console.log(`[quyuan-poc] 可信侧服务 http://127.0.0.1:${PORT}`);
	console.log(`[quyuan-poc] 配置:${CONFIG_PATH}`);
});
