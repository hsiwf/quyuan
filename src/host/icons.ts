// ============================================================
// 屈原内置图标（替代 Obsidian setIcon + Lucide 图标库）
//   TALOS 插件直接使用 Obsidian 内置的 Lucide 图标渲染器；本模块以
//   内联 SVG 自持同名图标（Lucide v0.x 路径数据，ISC 许可，见 NOTICE）。
//   宿主可用 registerQuyuanIcon 覆盖/补充图标，未注册的名字回退为一个
//   透明占位圆点，不阻断布局。
// ============================================================
import { TALOS_ICON_SVG } from "../vendor/talos-mark";

/** Lucide 24x24 描边风格的内层路径。 */
const BUILTIN_ICON_PATHS: Record<string, string> = {
	"audio-lines":
		'<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>',
	ear: '<path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/>',
	loader:
		'<line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/>',
	"mic-off":
		'<path d="m2 2 20 20"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>',
	mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
	moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
	"volume-2":
		'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
	"volume-x":
		'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
	"shield-check":
		'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
	"message-square":
		'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
	"arrow-up": '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
	cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
	radio: '<circle cx="12" cy="12" r="2"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
	"mouse-pointer-click":
		'<path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/>',
};

const registry = new Map<string, string>(Object.entries(BUILTIN_ICON_PATHS));

/** 注册或覆盖图标（svgInner 为 24x24 视窗内的 SVG 内层标记）。 */
export function registerQuyuanIcon(name: string, svgInner: string): void {
	registry.set(name, svgInner);
}

/** 判断图标是否已注册（talos-logo 随 vendor/talos-mark 内置）。 */
export function hasQuyuanIcon(name: string): boolean {
	return name === "talos-logo" || registry.has(name);
}

/**
 * 渲染图标到目标元素（语义与 Obsidian setIcon 一致：先清空再写入）。
 * 未注册的图标名渲染为透明占位圆点，便于在界面上发现缺图标。
 */
export function setIcon(parent: HTMLElement, name: string): void {
	const doc = parent.ownerDocument;
	parent.empty();
	const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("class", "svg-icon");
	const inner = name === "talos-logo" ? TALOS_ICON_SVG : registry.get(name);
	if (inner) {
		if (name === "talos-logo") {
			svg.setAttribute("fill", "currentColor");
			svg.setAttribute("stroke", "none");
		} else {
			svg.setAttribute("fill", "none");
			svg.setAttribute("stroke", "currentColor");
			svg.setAttribute("stroke-width", "2");
			svg.setAttribute("stroke-linecap", "round");
			svg.setAttribute("stroke-linejoin", "round");
		}
		const holder = doc.createElementNS("http://www.w3.org/2000/svg", "g");
		holder.innerHTML = inner;
		svg.appendChild(holder);
	} else {
		const dot = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
		dot.setAttribute("cx", "12");
		dot.setAttribute("cy", "12");
		dot.setAttribute("r", "1");
		dot.setAttribute("opacity", "0");
		svg.appendChild(dot);
	}
	parent.appendChild(svg);
}
