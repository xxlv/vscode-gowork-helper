import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { extractUseSection } from "./util";

export class GoWorkViewProvider implements vscode.TreeDataProvider<GoworkItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    GoworkItem | undefined | void
  > = new vscode.EventEmitter<GoworkItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<GoworkItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private items: GoworkItem[];

  constructor() {
    // read current project `go.work` file
    // convert to this items array
    // if comment ,then false, else true
    this.items = this.loadGoworkItems();
  }

  refresh(item?: GoworkItem): void {
    if (item) {
      console.log(item);
      this._onDidChangeTreeData.fire(item);
    } else {
      this._onDidChangeTreeData.fire();
    }

    this.items = this.loadGoworkItems();
  }

  getTreeItem(element: GoworkItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GoworkItem): Thenable<GoworkItem[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.items);
    }
  }

  private loadGoworkItems(): GoworkItem[] {
    const workspaceFolder = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "";
    const goworkFilePath = path.join(workspaceFolder, "go.work");
    let goworkContent: string = "";

    try {
      goworkContent = fs.readFileSync(goworkFilePath, "utf-8");
    } catch (err) {
      vscode.window.showErrorMessage(`Could not read go.work file: ${err}`);
      return [];
    }

    const useSection = extractUseSection(goworkContent);
    if (!useSection) {
      return [];
    }

    const items = useSection
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const isComment = line.startsWith("//");
        return new GoworkItem(
          line.replaceAll("//", "").replaceAll(" ", ""),
          vscode.TreeItemCollapsibleState.None,
          !isComment
        );
      });

    return items;
  }
}

export class GoworkItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public checked: boolean
  ) {
    super(label, collapsibleState);
    this.contextValue = "goworkItem";
    this.command = {
      command: "gowork.toggleCheck",
      title: "Toggle Check",
      arguments: [this],
    };
    this.updateIconPath();
    this.updateResourceUri();
  }

  updateIconPath() {
    this.iconPath = this.checked
      ? new vscode.ThemeIcon("check")
      : new vscode.ThemeIcon("circle-outline");
  }
  updateResourceUri() {
    this.resourceUri = vscode.Uri.parse(
      `gowork:/item${this.checked ? "?checked" : ""}`
    );
  }

  toggleCheck() {
    this.checked = !this.checked;
    this.updateIconPath();
    this.updateResourceUri();
  }
}
