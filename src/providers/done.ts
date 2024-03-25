import {
	Event,
	EventEmitter,
	ExtensionContext,
	TreeDataProvider,
	TreeItem,
	window,
	CancellationToken,
	ProviderResult,
	commands,
} from "vscode";

import { NoteItem, type Note } from "../types";
import { TodoNoteItem } from "./todos";
import { type Storage } from "../storage";

class DoneNoteItem extends NoteItem {
	constructor(note: Note) {
		super("meronote/done", note);
	}
}

export class MeroNotesDoneProvider implements TreeDataProvider<TodoNoteItem> {
	constructor(
		ctx: ExtensionContext,
		public storage: Storage,
	) {
		storage.event(() => {
			this.refresh();
		});

		const done = window.createTreeView("meronotes/done", {
			treeDataProvider: this,
			showCollapseAll: false,
			canSelectMany: false,
		});

		done.onDidChangeCheckboxState(({ items: [[note]] }) => {
			storage.redo(note.id);
		});

		ctx.subscriptions.push(done);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	_onDidChangeTreeData: EventEmitter<TodoNoteItem | undefined | void> =
		new EventEmitter<TodoNoteItem | undefined | void>();

	onDidChangeTreeData: Event<TodoNoteItem | undefined | void> =
		this._onDidChangeTreeData.event;

	getTreeItem(element: TodoNoteItem): TodoNoteItem {
		return element;
	}

	getChildren(element?: TodoNoteItem): Thenable<TodoNoteItem[]> {
		// console.info(`element`, element);

		if (element) {
			return Promise.resolve([]);
		} else {
			const notesFromStorage = this.storage.store;
			return Promise.resolve(
				notesFromStorage
					.filter((note) => note.done)
					.map((note) => new DoneNoteItem(note)),
			);
		}
	}

	resolveTreeItem(
		item: TreeItem,
		element: TodoNoteItem,
		token: CancellationToken,
	): ProviderResult<TreeItem> {
		console.info({ item, element });

		return;
	}
}

export default function (context: ExtensionContext, storage: Storage) {
	const provider = new MeroNotesDoneProvider(context, storage);

	return provider;
}
