// ============================================================
// 屈原宿主端口
//   从 TALOS Obsidian 插件提取时，把 Obsidian 运行时能力收窄为
//   本文件的最小接口。宿主（yuindex / 任意 Web 前端 / 测试）按自身
//   形态实现后，在装配 QuyuanVoicePanel / QuyuanModule 时注入。
// ============================================================

/**
 * 宿主文本存储：Obsidian `app.vault.adapter` 的最小替代。
 * 人格上下文加载（persona-context）只依赖 exists + read。
 */
export interface QuyuanTextStore {
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
}

/**
 * 库路径快照：原型为 data/schema.ts 的 VaultPaths 类。
 * 面板当前仅透传保存，宿主可以提供任意自描述的路径映射对象。
 */
export type QuyuanVaultPaths = Record<string, string>;

/** 宿主 UI 能力端口（Notice / MarkdownRenderer / 设置入口的替代）。 */
export interface QuyuanHostUi {
	/** 轻量通知（原 Obsidian Notice）。timeoutMs 缺省由宿主决定。 */
	notify(message: string, timeoutMs?: number): void;
	/**
	 * 把 Markdown 渲染进指定元素（原 MarkdownRenderer.render）。
	 * 生命周期由宿主自行管理；面板销毁时不再回调。
	 */
	renderMarkdown(markdown: string, el: HTMLElement): Promise<void>;
	/** 打开宿主的屈原设置界面（原 app.setting.openTabById）。 */
	openSettings?(): void;
}

/** 宿主环境信息。 */
export interface QuyuanHostEnv {
	/**
	 * 宿主"配置目录"名（Obsidian 里是 `.obsidian`）。
	 * 仅用于库路径保密策略判断（secret-policy 把配置目录列入禁区）。
	 */
	configDir?: string;
}

/** 装配屈原 UI/语音所需的完整宿主能力。 */
export type QuyuanHost = QuyuanHostUi & QuyuanHostEnv;

/**
 * 内存版文本存储：测试与无持久化宿主的兜底实现。
 * 行为语义与 Obsidian vault.adapter 一致（不存在时 exists 返回 false，
 * read 抛错）。
 */
export class InMemoryTextStore implements QuyuanTextStore {
	private readonly files = new Map<string, string>();

	constructor(entries?: Record<string, string>) {
		for (const [path, content] of Object.entries(entries ?? {})) {
			this.files.set(path, content);
		}
	}

	async exists(path: string): Promise<boolean> {
		return this.files.has(path);
	}

	async read(path: string): Promise<string> {
		const content = this.files.get(path);
		if (content === undefined) throw new Error(`文件不存在：${path}`);
		return content;
	}

	write(path: string, content: string): void {
		this.files.set(path, content);
	}

	delete(path: string): void {
		this.files.delete(path);
	}
}

/** 无宿主 UI 时的静默兜底：通知丢弃、Markdown 按纯文本写入。 */
export class NullHostUi implements QuyuanHostUi {
	notify(): void {
		/* 静默 */
	}

	async renderMarkdown(markdown: string, el: HTMLElement): Promise<void> {
		el.textContent = markdown;
	}
}
