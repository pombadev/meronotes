import { Memento, ExtensionContext, TreeDataProvider, TreeItem, window, TreeItemCollapsibleState } from "vscode";
import { randomUUID } from "crypto";

import type { Notes, Note } from "./types";
import type { MeroNotesDoneProvider, TodoNoteItem } from "./meronotes";

type Provider = TreeDataProvider<any> & { refresh(): void }

let storage: Storage<any>;

export default function load(ctx: ExtensionContext, provider: Provider): Storage<Provider> {
	if (!storage) {
		storage = new Storage(ctx, provider);
	}

	return storage;
}

export class Storage<P extends Provider> {
	#backend: Memento & { setKeysForSync(keys: readonly string[]): void };

	#provider: P;

	#key = "meronotes/storage";

	constructor(ctx: ExtensionContext, provider: P) {
		this.#backend = ctx.globalState;
		this.#provider = provider;

		this.#backend.setKeysForSync([this.#key]);

		const hasKey = this.#backend.get<Notes>(this.#key);

		if (!hasKey) {
			this.#backend.update(this.#key, []);
		}
	}

	get store(): Notes {
		return this.#backend.get<Notes>(this.#key)!;
	}

	get isEmpty(): boolean {
		return this.store.length === 0;
	}

	#update(store = this.store): void {
		this.#backend.update(this.#key, store);

		// this.#provider.refresh();
	}

	indexOf(id: string): number {
		return this.store.findIndex((node) => node.id === id);
	}

	refresh() {
		this.#update();
	}

	move(to: number, from: number): void {
		const tmp = this.store;
		tmp.splice(to, 0, tmp.splice(from, 1)[0]);
		this.#update(tmp);
	}

	get(id: string): Note | undefined {
		let ret;

		function inner(s: Notes) {
			for (const note of s) {
				if (note.id === id) {
					ret = note;
					break;
				}

				if (note.children.length > 0) {
					inner(note.children);
				}
			}
		}

		inner(this.store);

		return ret;
	}

	add(contents: string): void {
		this.store.push({
			contents,
			done: false,
			children: [],
			id: randomUUID(),
		});

		this.#update();
	}

	addChild(parent: TodoNoteItem, contents: string) {
		const current = this.get(parent.id);

		if (current) {
			parent.collapsibleState = TreeItemCollapsibleState.Expanded;

			current.children.push({
				contents,
				done: false,
				children: [],
				id: randomUUID(),
				parent: parent.id,
			});

			this.#update();
		} else {
			console.error(parent, "has no stuffs");
		}
	}

	edit(current: TodoNoteItem, value: string): void {
		// const index = this.indexOf(current.id);

		// const note = this.store[index];

		// note.contents = value;

		// this.#update();

		const note = this.get(current.id);

		if (note) {
			note.contents = value;

			this.#update();
		} else {
			window.showWarningMessage(`${current.label} was not found`);
		}
	}

	delete(note: TodoNoteItem): void {
		let store = this.store;
		const parent = this.get(note.parent!);

		if (parent) {
			parent.children = parent.children.filter((item) => item.id !== note.id);
		} else {
			store = this.store.filter((item) => item.id !== note.id);
		}

		this.#update(store);
	}

	deleteAll(): void {
		this.#update([]);
	}

	done(id: string): void {
		for (const note of this.store) {
			if (note.id === id) {
				note.done = true;
				break;
			}
		}

		this.#update();
	}

	markAllDone(): void {
		this.store.forEach((note) => {
			note.done = true;
		});

		this.#update();
	}

	redo(id: string): void {
		for (const note of this.store) {
			if (note.id === id) {
				note.done = false;
				break;
			}
		}

		this.#update();
	}
}
