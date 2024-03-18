import { ExtensionContext, commands, window, ProgressLocation, InputBoxValidationSeverity } from "vscode";

import MeroNotesProvider, { type TodoNoteItem, MeroNotesDoneProvider } from "./meronotes";
import { randomInt, randomUUID } from "crypto";

import loadStorage from "./storage";

export function activate(context: ExtensionContext) {

	const todoProvider = new MeroNotesProvider(context);

	const storage = todoProvider.storage;

	// const doneProvider = new MeroNotesDoneProvider(context);

	const s = loadStorage(context, todoProvider);

	context.subscriptions.push(
		commands.registerCommand("meronotes.create", async () => {
			const contents = await window.showInputBox();

			if (contents) {
				storage.add(contents);
			}
		}),

		commands.registerCommand("meronotes.createChild", async (parent: TodoNoteItem) => {
			const contents = await window.showInputBox({
				title: parent.label
			});

			if (contents) {
				storage.addChild(parent, contents);
			}
		}),

		commands.registerCommand("meronotes.edit", async (note: TodoNoteItem) => {
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

		commands.registerCommand("meronotes.delete", async (note: TodoNoteItem) => {
			storage.delete(note);
			// doneProvider.refresh();
		}),

		commands.registerCommand("meronotes.deleteAll", async () => {
			if (storage.isEmpty) {
				return window.showInformationMessage("No notes saved.");
			}

			const answer = await window.showErrorMessage("Are you sure?", { detail: "You won't be able to restore them back.", modal: true }, "Yes");

			if (answer === "Yes") {
				storage.deleteAll();
			}
		}),

		commands.registerCommand("meronotes.done", async (note: TodoNoteItem) => {
			// storage.markAllDone();
			// doneProvider.storage.done(note.id);
			todoProvider.refresh();
		}),

		commands.registerCommand("meronotes.redo", async (note: TodoNoteItem) => {
			// storage.markAllDone();
			// doneProvider.storage.redo(note.id);
			todoProvider.refresh();
		}),

		commands.registerCommand("meronotes.doneAll", async () => {
			if (storage.isEmpty) {
				return window.showInformationMessage("No notes saved.");
			}

			const answer = await window.showWarningMessage("Mark all as done?", { modal: true }, "Yes");

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
							todoProvider.refresh();
							resolve(undefined);
						}, 500);
					});
				},
			);
		}),
	);
}
