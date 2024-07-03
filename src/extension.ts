// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GoWorkViewProvider, GoworkItem } from "./goworkView";
import { modifyGoWorkFile } from "./util";
import * as path from "path";
import * as fs from "fs";

vscode.commands.executeCommand("setContext", "goworkCondition", "1");

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (workspaceFolder) {
    // --------------------------------------------------------------------------
    // checked color
    const decorationProvider = vscode.window.registerFileDecorationProvider({
      provideFileDecoration: (uri: vscode.Uri) => {
        console.log(uri.scheme);
        if (uri.scheme === "gowork" && uri.query === "checked") {
          return {
            backgroundColor: new vscode.ThemeColor(
              "list.activeSelectionBackground"
            ),
            color: new vscode.ThemeColor("list.activeSelectionForeground"),
          };
        }
        return null;
      },
    });
    context.subscriptions.push(decorationProvider);

    // --------------------------------------------------------------------------
    const toggleCommand = vscode.commands.registerCommand(
      "gowork.toggleGoWorkAction",
      (item: GoworkItem) => {
        item.toggleCheck();
        const enable = item.checked;
        const goWorkPath = path.join(workspaceFolder.uri.fsPath, "go.work");
        const goWorkDisabledPath = path.join(
          workspaceFolder.uri.fsPath,
          "go.work.disable"
        );

        if (enable) {
          if (fs.existsSync(goWorkDisabledPath)) {
            fs.renameSync(goWorkDisabledPath, goWorkPath);
            vscode.window.showInformationMessage("go.work enabled");
          }
        } else {
          if (fs.existsSync(goWorkPath)) {
            fs.renameSync(goWorkPath, goWorkDisabledPath);
            vscode.window.showInformationMessage("go.work disabled");
          }
        }
        goworkViewProvider.refresh();
      }
    );
    context.subscriptions.push(toggleCommand);

    // --------------------------------------------------------------------------
    // refresh disable
    const refreshCommand = vscode.commands.registerCommand(
      "gowork.refreshAction",
      () => {
        goworkViewProvider.refresh();
      }
    );
    context.subscriptions.push(refreshCommand);

    // --------------------------------------------------------------------------
    // watch go.work
    const goWorkFilePath = `${workspaceFolder.uri.fsPath}/go.work`;
    const fileWatcher =
      vscode.workspace.createFileSystemWatcher(goWorkFilePath);

    fileWatcher.onDidCreate(() => {
      vscode.commands.executeCommand("gowork.refreshAction");
    });
    fileWatcher.onDidDelete(() => {
      vscode.commands.executeCommand("gowork.refreshAction");
    });
    context.subscriptions.push(fileWatcher);

    // --------------------------------------------------------------------------
    // main view
    const goworkViewProvider = new GoWorkViewProvider();
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider("goworkView", goworkViewProvider)
    );

    // --------------------------------------------------------------------------
    // toggle
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "gowork.toggleCheck",
        (item: GoworkItem) => {
          if (item) {
            item.toggleCheck();
            goworkViewProvider.refresh(item);

            if (!item.isAction) {
              modifyGoWorkFile(item.label, item.checked);
            } else {
            }
          } else {
            console.log("No item provided to the command");
          }
        }
      )
    );
  }
}

export function deactivate() {
  console.log("gowork deactivate");
}
