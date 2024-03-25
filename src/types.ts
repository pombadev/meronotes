import {
	TreeItem,
	TreeItemCollapsibleState,
	TreeItemCheckboxState,
} from "vscode";

export interface Note {
	id: string;
	done: boolean;
	contents: string;
	children: this[];
	parent?: string;
}

export type Notes = Note[];

export class NoteItem extends TreeItem {
	id: string;
	label: string;
	parent?: string;
	constructor(
		public contextValue: string,
		note: Note,
	) {
		super(note.contents);

		this.parent = note.parent;

		this.id = note.id;

		this.label = note.contents;

		this.checkboxState = note.done
			? TreeItemCheckboxState.Checked
			: TreeItemCheckboxState.Unchecked;

		this.collapsibleState =
			note.children.length > 0
				? TreeItemCollapsibleState.Expanded
				: TreeItemCollapsibleState.Collapsed;
	}
}
