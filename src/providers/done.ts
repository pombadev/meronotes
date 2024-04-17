import {
	Event,
	EventEmitter,
	ExtensionContext,
	TreeDataProvider,
	window,
	commands,
} from "vscode";

import { type Storage } from "../storage";
import { NoteItem, Notes, type Note } from "../types";

class DoneNoteItem extends NoteItem {
	constructor(note: Note) {
		super("meronote/done", note);
	}
}

class MeroNotesDoneProvider implements TreeDataProvider<DoneNoteItem> {
	storage: Storage;

	constructor(ctx: ExtensionContext, storage: Storage) {
		this.storage = storage;

		storage.event(() => {
			this.refresh();

			this.setContext();
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

		this.setContext();
	}

	setContext() {
		commands.executeCommand(
			"setContext",
			"meroNotes.noDoneItems",
			this.storage.store.filter((store) => store.done).length === 0,
		);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	_onDidChangeTreeData: EventEmitter<DoneNoteItem | undefined | void> =
		new EventEmitter<DoneNoteItem | undefined | void>();

	onDidChangeTreeData: Event<DoneNoteItem | undefined | void> =
		this._onDidChangeTreeData.event;

	getTreeItem(element: DoneNoteItem): DoneNoteItem {
		return element;
	}

	getChildren(element?: DoneNoteItem): Thenable<DoneNoteItem[]> {
		if (element) {
			const item = this.storage.get(element.id);

			if (item) {
				return Promise.resolve(
					item.children.filter((i) => i.done).map((i) => new DoneNoteItem(i)),
				);
			} else {
				return Promise.resolve([]);
			}
		} else {
			// const items: { [id: string]: Note } = {};

			// const inner = (s: Notes) => {
			// 	s.forEach((note) => {
			// 		if (note.done) {
			// 			let parent = this.storage.get(note.parent as string);

			// 			if (parent) {
			// 				parent = {
			// 					...parent,
			// 					children: [],
			// 				};

			// 				items[parent.id] ??= parent;
			// 				items[parent.id].children.push(note);
			// 			} else {
			// 				items[note.id] = note;
			// 			}
			// 		}

			// 		inner(note.children);
			// 	});
			// };

			// inner(this.storage.store);

			return Promise.resolve(
				this.storage.store
					.filter((a) => a.done)
					.map((note) => new DoneNoteItem(note)),
				// Object.values(items).map((note) => new DoneNoteItem(note)),
			);
		}
	}
}

export default function (context: ExtensionContext, storage: Storage) {
	const provider = new MeroNotesDoneProvider(context, storage);

	return provider;
}
