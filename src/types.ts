export interface Note {
	id: string;
	done: boolean;
	contents: string;
	children: this[]
	parent?: string
}

export type Notes = Note[];
