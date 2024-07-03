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
      const workspaceFolder = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : "";
      const goWorkPath = path.join(workspaceFolder, "go.work");
      const goWorkDisabledPath = path.join(workspaceFolder, "go.work.disable");
      const items = [];
      const isAction = true;
      if (fs.existsSync(goWorkPath)) {
        const actionItem = new GoworkItem(
          "CLOSE",
          vscode.TreeItemCollapsibleState.None,
          true,
          isAction
        );
        actionItem.command = {
          command: "gowork.toggleGoWorkAction",
          title: "command Check",
          arguments: [actionItem],
        };
        items.push(actionItem);
      } else if (fs.existsSync(goWorkDisabledPath)) {
        const actionItem = new GoworkItem(
          "OPEN",
          vscode.TreeItemCollapsibleState.None,
          false,
          isAction
        );
        actionItem.command = {
          command: "gowork.toggleGoWorkAction",
          title: "command Check",
          arguments: [actionItem],
        };
        items.push(actionItem);
      }

      this.items.sort((a, b) => {
        if (a.checked === b.checked) {
          return 0;
        }
        return a.checked ? -1 : 1;
      });
      return Promise.resolve(items.concat(this.items));
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
      .filter((line) => {
        // ignore not exists path
        const realpath = line.replaceAll("//", "").replaceAll(" ", "");
        const goworkFilePath = path.join(workspaceFolder, realpath);
        const find = fs.existsSync(goworkFilePath);
        return find;
      })
      .map((line) => {
        const isComment = line.startsWith("//");
        const rawLine = line.replaceAll("//", "").replaceAll(" ", "");
        return new GoworkItem(
          rawLine,
          vscode.TreeItemCollapsibleState.None,
          !isComment,
          false
        );
      });

    return items;
  }
}

export class GoworkItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public checked: boolean,
    public isAction: boolean
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
    if (!this.isAction) {
      this.iconPath = this.checked
        ? new vscode.ThemeIcon(
            "check",
            new vscode.ThemeColor("list.activeSelectionBackground")
          )
        : new vscode.ThemeIcon("circle-outline");
    } else {
      this.iconPath = this.checked
        ? new vscode.ThemeIcon(
            "eye",
            new vscode.ThemeColor("button.hoverBackground")
          )
        : new vscode.ThemeIcon("eye-closed");
    }
  }
  updateResourceUri() {
    if (!this.isAction) {
      this.resourceUri = vscode.Uri.parse(
        `gowork:/${this.label}${this.checked ? "?checked" : ""}`
      );
    }
  }

  toggleCheck() {
    this.checked = !this.checked;
    this.updateIconPath();
    this.updateResourceUri();
  }
}
