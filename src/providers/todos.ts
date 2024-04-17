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
	CancellationToken,
	TreeItem,
} from "vscode";

import { type Storage } from "../storage";
import { type Note, NoteItem, Notes } from "../types";

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

		this.storage = storage;

		storage.event(() => {
			this.refresh();

			this.setContext();
		});

		todos.onDidChangeCheckboxState(({ items: [[note]] }) => {
			storage.done(note.id);
		});

		context.subscriptions.push(todos);

		this.setContext();
	}

	setContext() {
		commands.executeCommand(
			"setContext",
			"meroNotes.noTodoItems",
			this.storage.store.filter((store) => store.done === false).length === 0,
		);
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

		const [src] = transferItem.value;

		const srcParent = this.storage.get(src.parent);

		const targetParent = this.storage.get(target.parent!);

		console.info({ srcParent, targetParent });

		// case one: src & target are in the root
		if (!srcParent && !targetParent) {
			const from = this.storage.indexOf(src.id);
			const to = this.storage.indexOf(target.id);
			this.storage.move(to, from);
			return;
		}

		// if (!srcParent && targetParent) {
		// 	return;
		// }

		// if (!targetParent && srcParent) {
		// 	return;
		// }

		// case two: src & parent are under same parent
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

			this.storage.update(this.storage.store);
			return;
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TodoNoteItem): TodoNoteItem {
		return element;
	}

	getParent(element: TodoNoteItem): ProviderResult<TodoNoteItem> {
		let parent = null;

		const note = this.storage.get(element.parent!);

		if (note) {
			parent = new TodoNoteItem(note);
		}

		return Promise.resolve(parent);
	}

	getChildren(element?: TodoNoteItem): Thenable<TodoNoteItem[]> {
		// console.info("todo/getChildren", element);

		const it = this.storage.get(element?.id as string); // intentional casting

		if (it) {
			return Promise.resolve(
				it.children.filter((i) => !i.done).map((i) => new TodoNoteItem(i)),
			);
		}

		const items: { [id: string]: Note } = {};

		const inner = (s: Notes) => {
			s.forEach((note) => {
				let next = note.done === false;

				if (note.done && note.children.length) {
					next = note.children.some(({ done }) => done);
					console.info("%b", next, note);
				}

				if (next) {
					const parent = this.storage.get(note.parent as string);

					// console.info("note", note);
					// console.info("parent", parent);

					if (parent) {
						const { children, ...item } = parent;

						items[parent.id] = {
							...item,
							children: [note],
						};
					} else {
						// note.children = [];
						items[note.id] = {
							...note,
							children: [],
						};
					}
				}

				inner(note.children);
			});
		};

		inner(this.storage.store);

		// this.storage.deleteAll();

		console.info("items", items);

		console.info(this.storage.store);

		// return Promise.resolve(
		// 	Object.values(items)
		// 		// .filter((note) => !note.done)
		// 		.map((note) => new TodoNoteItem(note)),
		// );

		return Promise.resolve(
			this.storage.store
				.filter((note) => !note.done)
				.map((note) => new TodoNoteItem(note)),
		);
	}
}

export default function (context: ExtensionContext, storage: Storage) {
	const provider = new MeroNotesProvider(context, storage);

	context.subscriptions.push(
		commands.registerCommand("meronotes.create", async () => {
			const contents = await window.showInputBox();

			if (contents) {
				storage.add(contents);
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
			}
		}),
	);

	return provider;
}
