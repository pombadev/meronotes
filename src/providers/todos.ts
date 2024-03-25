import {
	TreeDataProvider,
	TreeDragAndDropController,
	EventEmitter,
	Event,
	ExtensionContext,
	window,
	DataTransfer,
	DataTransferItem,
	commands,
	TreeView,
	ProviderResult,
} from "vscode";

import { type Storage } from "../storage";
import { type Note, NoteItem } from "../types";

export class TodoNoteItem extends NoteItem {
	constructor(note: Note) {
		super("meronote/todo", note);
	}
}

class MeroNotesProvider
	implements
		TreeDataProvider<TodoNoteItem>,
		TreeDragAndDropController<TodoNoteItem>
{
	_onDidChangeTreeData: EventEmitter<TodoNoteItem | void> =
		new EventEmitter<TodoNoteItem | void>();

	onDidChangeTreeData: Event<TodoNoteItem | void> =
		this._onDidChangeTreeData.event;

	dropMimeTypes = ["application/vnd.code.tree.meronotes"];

	dragMimeTypes = ["text/uri-list"];

	tree: TreeView<TodoNoteItem>;

	constructor(
		context: ExtensionContext,
		public storage: Storage,
	) {
		const todos = window.createTreeView(`meronotes/todos`, {
			treeDataProvider: this,
			showCollapseAll: false,
			canSelectMany: false,
			dragAndDropController: this,
		});

		this.tree = todos;

		storage.event(() => {
			this.refresh();
		});

		todos.onDidChangeCheckboxState(({ items: [[note]] }) => {
			storage.done(note.id);
		});

		context.subscriptions.push(todos);
	}

	async handleDrag(
		source: TodoNoteItem[],
		dataTransfer: DataTransfer,
	): Promise<void> {
		dataTransfer.set(
			"application/vnd.code.tree.meronotes",
			new DataTransferItem(source),
		);
	}

	async handleDrop(target: TodoNoteItem, sources: DataTransfer): Promise<void> {
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
				1,
			);

			tmp.splice(
				tmp.findIndex((note) => note.id === target.id),
				0,
				f[0],
			);

			// this.storage.refresh();
		} else {
			//
		}

		// this.storage.move(to, from);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TodoNoteItem): TodoNoteItem {
		return element;
	}

	getParent(element: TodoNoteItem): ProviderResult<TodoNoteItem> {
		console.info("element", element);

		let parent = null;

		const r = this.storage.get(element.parent!);

		if (r) {
			parent = new TodoNoteItem(r);
			console.info(r);
		}

		return Promise.resolve(parent);
	}

	getChildren(element: TodoNoteItem): Thenable<TodoNoteItem[]> {
		const notesFromStorage = this.storage;

		if (element) {
			const it = notesFromStorage.get(element.id);

			if (!it) return Promise.resolve([]);

			return Promise.resolve(it.children.map((i) => new TodoNoteItem(i)));
		} else {
			return Promise.resolve(
				notesFromStorage.store
					.filter((note) => !note.done)
					.map((note) => new TodoNoteItem(note)),
			);
		}
	}
}

export default function (context: ExtensionContext, storage: Storage) {
	const provider = new MeroNotesProvider(context, storage);

	context.subscriptions.push(
		commands.registerCommand("meronotes.create", async () => {
			const contents = await window.showInputBox();

			if (contents) {
				storage.add(contents);
				// provider.refresh();
			}
		}),

		commands.registerCommand(
			"meronotes.createChild",
			async (parent: TodoNoteItem) => {
				const contents = await window.showInputBox({
					title: parent.label,
				});

				if (contents) {
					storage.addChild(parent, contents);
					provider.tree.reveal(parent, { expand: true });
				}
			},
		),

		commands.registerCommand("meronotes.delete", async (note: TodoNoteItem) => {
			storage.delete(note);
			// provider.refresh();
		}),

		commands.registerCommand("meronotes.deleteAll", async () => {
			if (storage.isEmpty) {
				return window.showInformationMessage("No notes saved.");
			}

			const answer = await window.showErrorMessage(
				"Are you sure?",
				{ detail: "You won't be able to restore them back.", modal: true },
				"Yes",
			);

			if (answer === "Yes") {
				storage.deleteAll();
				// provider.refresh();
			}
		}),
	);

	return provider;
}
