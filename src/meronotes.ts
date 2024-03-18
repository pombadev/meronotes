import {
	Event,
	EventEmitter,
	ExtensionContext,
	TreeDataProvider,
	TreeItem,
	window,
	TreeDragAndDropController,
	CancellationToken,
	ProviderResult,
	DataTransfer,
	DataTransferItem,
	TreeItemCollapsibleState,
	TreeItemCheckboxState
} from "vscode";

import loadStorage, { Storage } from "./storage";
import type { Note } from "./types";
import { randomUUID } from "crypto";
import assert from "assert";

class Item extends TreeItem {
	id: string;
	label: string;
	parent?: string;
	// done: boolean;

	constructor(
		public contextValue: string,
		note: Note,
	) {
		super(note.contents, TreeItemCollapsibleState.Expanded);
		this.parent = note.parent;
		this.id = note.id;
		this.label = note.contents;
		// this.done = note.done;
		this.checkboxState = note.done ? TreeItemCheckboxState.Checked : TreeItemCheckboxState.Unchecked;
		// this.iconPath = new ThemeIcon(note.done ? "pass-filled" : "circle-large-outline");
		this.collapsibleState = note.children.length > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
	}

	get isDone(): boolean {
		return this.collapsibleState === 1;
	}
}

export class TodoNoteItem extends Item {
	static KEY = "meronote/todo";

	constructor(note: Note) {
		super(TodoNoteItem.KEY, note);
	}
}

export class DoneNoteItem extends Item {
	static KEY = "meronote/done";

	constructor(note: Note) {
		super(DoneNoteItem.KEY, note);
	}
}

export default class MeroNotesProvider<T extends Item> implements TreeDataProvider<T>, TreeDragAndDropController<T> {
	_onDidChangeTreeData: EventEmitter<T | void> = new EventEmitter<T | void>();

	onDidChangeTreeData: Event<T | void> = this._onDidChangeTreeData.event;

	storage: Storage<this>;

	dropMimeTypes = ["application/vnd.code.tree.meronotes"];

	dragMimeTypes = ["text/uri-list"];

	constructor(context: ExtensionContext) {
		this.storage = new Storage<this>(context, this);

		const todos = window.createTreeView(`meronotes/todos`, {
			treeDataProvider: this,
			showCollapseAll: false,
			canSelectMany: false,
			dragAndDropController: this,
		});

		window.registerTreeDataProvider('meronotes/done', nodeDependenciesProvider);

		todos.onDidChangeCheckboxState(({ items: [[note]] }) => {
			this.storage.done(note.id);
		});

		context.subscriptions.push(todos);
	}

	async handleDrag(source: T[], dataTransfer: DataTransfer): Promise<void> {
		dataTransfer.set("application/vnd.code.tree.meronotes", new DataTransferItem(source));
	}

	async handleDrop(target: T, sources: DataTransfer, token: CancellationToken): Promise<void> {
		const transferItem = sources.get("application/vnd.code.tree.meronotes");

		if (!transferItem) {
			return;
		}

		// if (transferItem) {
		// 	return console.info(transferItem.value[0]);
		// }

		const [src] = transferItem.value;

		const from = this.storage.indexOf(src.id);
		const to = this.storage.indexOf(target.id);

		// console.info({
		// 	src: { src, parent: this.storage.get(src.parent) },
		// 	target: { target, parent: this.storage.get(target.parent!) }
		// });

		const srcParent = this.storage.get(src.parent);
		const targetParent = this.storage.get(target.parent!);

		if (!srcParent || !targetParent) {
			// this.storage.store
			return;
		}

		console.info(`{ srcParent, targetParent }`, { srcParent, targetParent });
		console.info("srcParent?.id", srcParent?.id);
		console.info("target?.id", target.id);
		console.info("<=>", srcParent?.id === target.id);

		if (srcParent.id === targetParent.id) {
			const tmp = srcParent!.children;

			const f = tmp.splice(
				tmp.findIndex((note) => note.id === src.id),
				1
			);

			tmp.splice(
				tmp.findIndex((note) => note.id === target.id),
				0,
				f[0]
			);

			this.storage.refresh();
		} else {
			//
		}

		// this.storage.move(to, from);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: T): T {
		// element.collapsibleState = Math.ceil(Math.random() * 3);

		return element;
	}

	getChildren(element: T): Thenable<T[]> {
		const notesFromStorage = this.storage.store;

		if (element) {
			const it = this.storage.get(element.id);

			// console.info(it);

			if (!it) return Promise.resolve([]);

			if (element.contextValue == TodoNoteItem.KEY) {
				return Promise.resolve(it.children.map((i) => new TodoNoteItem(i) as T));
			}

			if (element.contextValue == DoneNoteItem.KEY) {
				return Promise.resolve(it.children.map((i) => new DoneNoteItem(i) as T));
			}

			return Promise.reject(`Invalid TreeItem, should be one of : ${TodoNoteItem.KEY}, ${DoneNoteItem.KEY}`);
		} else {
			console.info("getChildren", { element });

			// return Promise.resolve([
			// 	new TodoNoteItem({ contents: "foo", done: false, id: "???" }),
			// 	[new TodoNoteItem({ contents: "foo", done: false, id: "???" })]
			// ]);

			return Promise.resolve(
				notesFromStorage
					.filter((note) => !note.done)
					.map((note) => new TodoNoteItem(note) as T)
			);
		}
	}

	resolveTreeItem(item: T, element: T, token: CancellationToken): ProviderResult<TreeItem> {
		return;
	}
}

export class MeroNotesDoneProvider implements TreeDataProvider<TodoNoteItem> {
	storage: Storage<this>;

	_onDidChangeTreeData: EventEmitter<TodoNoteItem | undefined | void> = new EventEmitter<TodoNoteItem | undefined | void>();

	onDidChangeTreeData: Event<TodoNoteItem | undefined | void> = this._onDidChangeTreeData.event;

	constructor(context: ExtensionContext) {
		this.storage = new Storage<this>(context, this);

		const done = window.createTreeView(`meronotes/done`, { treeDataProvider: this, showCollapseAll: false, canSelectMany: false });

		context.subscriptions.push(done);
	}

	refresh() {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TodoNoteItem): TodoNoteItem {
		return element;
	}

	getChildren(element?: TodoNoteItem): Thenable<TodoNoteItem[]> {
		if (element) {
			return Promise.resolve([]);
		} else {
			const notesFromStorage = this.storage.store;
			return Promise.resolve(notesFromStorage.filter((note) => note.done).map((note) => new TodoNoteItem(note)));
		}
	}

	resolveTreeItem(item: TreeItem, element: TodoNoteItem, token: CancellationToken): ProviderResult<TreeItem> {
		console.info({ item, element });

		return;
	}
}
