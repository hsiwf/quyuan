// ============================================================
// Obsidian DOM 扩展的宿主兼容层
//   TALOS 插件的 UI 代码依赖 Obsidian 预挂在 HTMLElement 原型上的
//   createDiv/createSpan/createEl/setText/empty/addClass 等扩展。
//   本模块以相同语义在任意 Web 页面提供这一子集：
//   - 显式调用 installQuyuanDomExtensions() 后生效（幂等，可重复调用）；
//   - 类型经由全局声明合并补齐，源码可保持与 Obsidian 插件一致。
// ============================================================

/** 与 Obsidian DomElementInfo 对齐的元素创建属性。 */
export interface QuyuanDomElementInfo {
	/** CSS 类名，可传数组；falsy 项会被过滤。 */
	cls?: string | string[];
	/** 创建后设置 textContent。 */
	text?: string | Node;
	/** 逐项 setAttribute。 */
	attr?: Record<string, string | number | boolean>;
	title?: string;
	href?: string;
	type?: string;
	value?: string;
	placeholder?: string;
}

export type QuyuanDomElementCallback<T extends HTMLElement> = (el: T) => void;

interface quyuanDomPrototypeExtensions {
	createEl<K extends keyof HTMLElementTagNameMap>(
		tag: K,
		options?: QuyuanDomElementInfo | string,
		callback?: QuyuanDomElementCallback<HTMLElementTagNameMap[K]>
	): HTMLElementTagNameMap[K];
	createDiv(
		options?: QuyuanDomElementInfo | string,
		callback?: QuyuanDomElementCallback<HTMLDivElement>
	): HTMLDivElement;
	createSpan(
		options?: QuyuanDomElementInfo | string,
		callback?: QuyuanDomElementCallback<HTMLSpanElement>
	): HTMLSpanElement;
	setText(value: string | Node): void;
	empty(): void;
	addClass(...classes: Array<string | string[]>): void;
	removeClass(...classes: Array<string | string[]>): void;
	toggleClass(className: string, value: boolean): void;
	/** 批量设置自定义 CSS 属性（原 Obsidian setCssProps）。 */
	setCssProps(props: Record<string, string>): void;
}

declare global {
	interface HTMLElement extends quyuanDomPrototypeExtensions {}
}

function flattenClasses(
	classes: Array<string | string[]>
): string[] {
	// 与 Obsidian 语义对齐:单个字符串允许空格分隔多个类名
	// (如 cls: "tq-btn tq-btn--sm"),DOMTokenList.add 不接受含空格的 token。
	return classes
		.flatMap((item) => (Array.isArray(item) ? item : item.split(/\s+/)))
		.filter(Boolean);
}

function applyDomOptions(el: HTMLElement, options?: QuyuanDomElementInfo | string): void {
	const info: QuyuanDomElementInfo =
		typeof options === "string" ? { cls: options } : (options ?? {});
	if (info.cls) el.addClass(...(Array.isArray(info.cls) ? info.cls : [info.cls]));
	if (info.text !== undefined) el.setText(info.text);
	if (info.title !== undefined) el.title = info.title;
	if (info.href !== undefined) el.setAttribute("href", info.href);
	if (info.type !== undefined) el.setAttribute("type", info.type);
	if (info.value !== undefined) el.setAttribute("value", info.value);
	if (info.placeholder !== undefined) el.setAttribute("placeholder", info.placeholder);
	if (info.attr) {
		for (const [name, value] of Object.entries(info.attr)) {
			el.setAttribute(name, String(value));
		}
	}
}

function setTextValue(el: HTMLElement, value: string | Node): void {
	if (typeof value === "string") el.textContent = value;
	else el.replaceChildren(value);
}

/**
 * 安装屈原所需的 Obsidian 风格 DOM 原型扩展。
 * 幂等；在任何渲染 DOM 的宿主（真实页面、jsdom 测试）装配面板前调用。
 */
export function installQuyuanDomExtensions(): void {
	const proto = HTMLElement.prototype as unknown as quyuanDomPrototypeExtensions & {
		__quyuanDomExtensionsInstalled?: boolean;
	};
	if (proto.__quyuanDomExtensionsInstalled) return;

	proto.createEl = function createEl<K extends keyof HTMLElementTagNameMap>(
		this: HTMLElement,
		tag: K,
		options?: QuyuanDomElementInfo | string,
		callback?: QuyuanDomElementCallback<HTMLElementTagNameMap[K]>
	): HTMLElementTagNameMap[K] {
		const el = this.ownerDocument.createElement(tag);
		applyDomOptions(el, options);
		callback?.(el);
		this.appendChild(el);
		return el;
	};

	proto.createDiv = function createDiv(
		this: HTMLElement,
		options?: QuyuanDomElementInfo | string,
		callback?: QuyuanDomElementCallback<HTMLDivElement>
	): HTMLDivElement {
		return this.createEl("div", options, callback);
	};

	proto.createSpan = function createSpan(
		this: HTMLElement,
		options?: QuyuanDomElementInfo | string,
		callback?: QuyuanDomElementCallback<HTMLSpanElement>
	): HTMLSpanElement {
		return this.createEl("span", options, callback);
	};

	proto.setText = function setText(this: HTMLElement, value: string | Node): void {
		setTextValue(this, value);
	};

	proto.empty = function empty(this: HTMLElement): void {
		this.replaceChildren();
	};

	proto.addClass = function addClass(
		this: HTMLElement,
		...classes: Array<string | string[]>
	): void {
		for (const cls of flattenClasses(classes)) this.classList.add(cls);
	};

	proto.removeClass = function removeClass(
		this: HTMLElement,
		...classes: Array<string | string[]>
	): void {
		for (const cls of flattenClasses(classes)) this.classList.remove(cls);
	};

	proto.toggleClass = function toggleClass(
		this: HTMLElement,
		className: string,
		value: boolean
	): void {
		this.classList.toggle(className, value);
	};

	proto.setCssProps = function setCssProps(
		this: HTMLElement,
		props: Record<string, string>
	): void {
		for (const [name, value] of Object.entries(props)) {
			this.style.setProperty(name, value);
		}
	};

	proto.__quyuanDomExtensionsInstalled = true;
}
