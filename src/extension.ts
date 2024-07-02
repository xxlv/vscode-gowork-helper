// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GoWorkViewProvider, GoworkItem } from "./goworkView";
import * as path from "path";
import * as fs from "fs";
import { modifyGoWorkFile } from "./util";

export function activate(context: vscode.ExtensionContext) {
  const decorationProvider = vscode.window.registerFileDecorationProvider({
    provideFileDecoration: (uri: vscode.Uri) => {
      console.log(uri.scheme);
      if (uri.scheme === "gowork" && uri.query === "checked") {
        return {
          backgroundColor: new vscode.ThemeColor(
            "list.activeSelectionBackground"
          ),
          // backgroundColor: new vscode.ThemeColor(
          //   "gowork.itemHighlightBackground"
          // ),
          // new vscode.ThemeColor('gowork.itemHighlightBackground')
          color: new vscode.ThemeColor("list.activeSelectionForeground"),
        };
      }
      return null;
    },
  });
  context.subscriptions.push(decorationProvider);

  const goworkViewProvider = new GoWorkViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("goworkView", goworkViewProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gowork.toggleCheck",
      (item: GoworkItem) => {
        if (item) {
          item.toggleCheck();
          goworkViewProvider.refresh(item);

          modifyGoWorkFile(item.label, item.checked);
        } else {
          console.log("No item provided to the command");
        }
      }
    )
  );
}

export function deactivate() {
  console.log("gowork deactivate");
}
