import { watch } from "fs";
import {
	commands,
	ConfigurationTarget,
	Event,
	EventEmitter,
	ExtensionContext,
	ProviderResult,
	ThemeIcon,
	TreeDataProvider,
	TreeItem,
	Uri,
	window,
	workspace,
} from "vscode";

class NoteItem extends TreeItem {
	uri: Uri;

	constructor(root: Uri, file: string) {
		super(file.replace(/\.md/i, ""));

		const dir = Uri.joinPath(root, file);

		this.uri = dir;

		this.iconPath = new ThemeIcon("note");

		this.command = {
			command: "vscode.open",
			title: "Open",
			arguments: [dir],
		};
	}
}

export default function (context: ExtensionContext) {
	class MeroNotesNotesProvider implements TreeDataProvider<NoteItem> {
		#root?: string;

		constructor() {
			const rootFromCfg = workspace
				.getConfiguration("meroNotes")
				.get<string>("notesDirectory");

			console.info("rootFromCfg", rootFromCfg);

			if (rootFromCfg) {
				this.#root = rootFromCfg;

				context.subscriptions.push({
					dispose: watch(rootFromCfg, (event) => {
						// watch for creating, renaming & deleting file
						if (event === "rename") {
							this._onDidChangeTreeData.fire();

							this.update(rootFromCfg);
						}
					}).close,
				});

				this.update(rootFromCfg);
			} else {
				commands.executeCommand(
					"setContext",
					"meroNotes.notesDirectoryNotSet",
					true,
				);
			}
		}

		_onDidChangeTreeData: EventEmitter<void> = new EventEmitter<void>();

		onDidChangeTreeData: Event<void> = this._onDidChangeTreeData.event;

		update(root: string): void {
			this.#root ??= root;

			workspace.fs.readDirectory(Uri.parse(root)).then((dir) => {
				commands.executeCommand(
					"setContext",
					"meroNotes.notesEmpty",
					dir.filter(([file, d]) => /\.md/i.test(file)).map(([file]) => file)
						.length === 0,
				);
			});

			commands.executeCommand(
				"setContext",
				"meroNotes.notesDirectoryNotSet",
				undefined,
			);
		}

		getTreeItem(element: NoteItem): NoteItem {
			return element;
		}

		getChildren(): ProviderResult<NoteItem[]> {
			if (!this.#root) {
				return Promise.resolve([]);
			}

			const notesDir = Uri.parse(this.#root);

			return workspace.fs.readDirectory(notesDir).then((dir) => {
				return dir
					.filter(([file]) => /\.md/i.test(file))
					.map(([file]) => new NoteItem(notesDir, file));
			});
		}
	}

	const provider = new MeroNotesNotesProvider();

	// workspace
	// 	.getConfiguration("meroNotes")
	// 	.update("notesDirectory", undefined, true);

	context.subscriptions.push(
		commands.registerCommand("meronotes.selectNotesDir", async () => {
			const folders = await window.showOpenDialog({
				canSelectFolders: true,
				canSelectMany: false,
			});

			if (folders) {
				const [folder] = folders;

				workspace
					.getConfiguration("meroNotes")
					.update("notesDirectory", folder.path, ConfigurationTarget.Global)
					.then(() => {
						provider._onDidChangeTreeData.fire();
						provider.update(folder.path);

						watch(folder.path, (event) => {
							// watch for creating, renaming & deleting file
							if (event === "rename") {
								provider._onDidChangeTreeData.fire();
								provider.update(folder.path);
							}
						});
					});
			}
		}),

		window.createTreeView("meronotes/notes", {
			treeDataProvider: provider,
		}),

		commands.registerCommand("meronotes.notesCreate", () => {
			workspace
				.openTextDocument({ language: "markdown" })
				.then(window.showTextDocument);
		}),

		commands.registerCommand("meronotes.notesDelete", (file: NoteItem) => {
			workspace.fs.delete(file.uri, { useTrash: true });
		}),
	);
}
