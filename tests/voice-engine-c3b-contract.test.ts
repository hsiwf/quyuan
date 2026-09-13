import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const readSrc = (rel: string): string =>
	readFileSync(`${projectRoot}${rel}`, "utf8");

// D-TLP-016 · C-3b:旧 jarvis 引擎栈移除契约(可移植模块版)。
// 钉死:① 旧引擎/面板/会话/右侧栏视图文件不存在;
// ② 语音 I/O 层以 vendor/voiceio 形态随模块保留;
// ③ 语音单引擎 = QuyuanVoiceDriver。
// 宿主仓库专属断言(main.ts / settings.ts / ai/provider)由
// talos-plugin 自己的测试套件继续执行,不属于模块内部合同。
describe("voice engine C-3b removal contract (D-TLP-016)", () => {
	it("removes the legacy jarvis engine stack files", () => {
		for (const gone of [
			"src/jarvis-view.ts",
			"src/voice.ts",
			"src/jarvis/panel.ts",
			"src/jarvis/engine.ts",
			"src/jarvis/engine-factory.ts",
			"src/jarvis/context/mentions.ts",
			"src/jarvis/providers/openai-engine.ts",
			"src/jarvis/session/store.ts",
		]) {
			expect(existsSync(`${projectRoot}${gone}`), gone).toBe(false);
		}
	});

	it("keeps the voice I/O layer as the vendored module", () => {
		expect(existsSync(`${projectRoot}src/vendor/voiceio.ts`)).toBe(true);
	});

	it("keeps the voice page on the single QuyuanVoiceDriver engine", () => {
		const panel = readSrc("src/voice-panel.ts");
		expect(panel).toContain('from "./native-voice-driver"');
		expect(panel).toContain('from "./vendor/voiceio"');
		expect(panel).not.toContain("jarvis/panel");
		expect(panel).not.toContain("engine-factory");
	});
});
