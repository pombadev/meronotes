import {
	ExtensionContext,
	commands,
	window,
	ProgressLocation,
	InputBoxValidationSeverity,
} from "vscode";

import loadStorage from "./storage";
import { type NoteItem } from "./types";
import DoneProvider from "./providers/done";
import TodoProvider from "./providers/todos";
import NotesProvider from "./providers/notes";

export function activate(context: ExtensionContext) {
	// const cfg = workspace
	// 	.getConfiguration("meroNotes")
	// 	.get<string>("notesDirectory");

	const storage = loadStorage(context);

	NotesProvider(context);

	TodoProvider(context, storage);

	DoneProvider(context, storage);

	context.subscriptions.push(
		commands.registerCommand("meronotes.edit", (note: NoteItem) => {
			window
				.showInputBox({
					value: note.label,
					validateInput(input) {
						if (!input) {
							return Promise.resolve({
								message: "Input cannot be empty",
								severity: InputBoxValidationSeverity.Error,
							});
						}

						return Promise.resolve(null);
					},
				})
				.then((input) => {
					if (input) {
						storage.edit(note, input);
					}
				});
		}),

		commands.registerCommand("meronotes.done", async (note: NoteItem) => {
			// storage.markAllDone();
			// doneProvider.storage.done(note.id);
			// storage.refresh();
		}),

		commands.registerCommand("meronotes.redo", async (note: NoteItem) => {
			// storage.markAllDone();
			// doneProvider.storage.redo(note.id);
			// storage.refresh();
		}),

		commands.registerCommand("meronotes.doneAll", async () => {
			if (storage.isEmpty) {
				return window.showInformationMessage("No notes saved.");
			}

			const answer = await window.showWarningMessage(
				"Mark all as done?",
				{ modal: true },
				"Yes",
			);

			if (answer === "Yes") {
				storage.markAllDone();
				// doneProvider.refresh();
			}
		}),

		commands.registerCommand("meronotes.refresh", () => {
			window.withProgress(
				{
					location: ProgressLocation.Window,
					title: "$(notebook)",
					cancellable: false,
				},
				() => {
					return new Promise((resolve) => {
						setTimeout(() => {
							// storage.refresh();
							resolve(undefined);
						}, 500);
					});
				},
			);
		}),
	);
}
