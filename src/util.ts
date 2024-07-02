import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

function modifyGoWorkFile(label: string, checked: boolean) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length !== 1) {
    vscode.window.showErrorMessage("only single workspace required!");
    return;
  }

  const workspaceFolder = workspaceFolders[0].uri.fsPath;
  const goworkFilePath = path.join(workspaceFolder, "go.work");

  fs.readFile(goworkFilePath, "utf-8", (err, data) => {
    if (err) {
      vscode.window.showErrorMessage(`Could not read go.work file: ${err}`);
      return;
    }

    const useSection = extractUseSection(data);
    if (!useSection) {
      vscode.window.showErrorMessage(
        "Could not find use section in go.work file"
      );
      return;
    }

    const modifiedContent = modifyUseSection(data, label, checked);
    if (modifiedContent === null) {
      vscode.window.showErrorMessage("Label not found in use section");
      return;
    }
    fs.writeFile(goworkFilePath, modifiedContent, "utf-8", (err) => {
      if (err) {
        vscode.window.showErrorMessage(
          `Could not write to go.work file: ${err}`
        );
      } else {
        vscode.window.showInformationMessage(
          `go.work file successfully modified.`
        );
        console.log(`go.work file successfully modified.`);
      }
    });
  });
}

export function extractUseSection(content: string): string | null {
  const useRegex = /use\s*\(([\s\S]*?)\)/;
  const match = useRegex.exec(content);
  return match ? match[1].trim() : null;
}

function modifyUseSection(
  content: string,
  label: string,
  checked: boolean
): string | null {
  const lines = content.split("\n");
  let inUseSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("use (")) {
      inUseSection = true;
    } else if (inUseSection && line === ")") {
      inUseSection = false;
    }

    if (inUseSection) {
      const lineContainsLabel = line.includes(label);
      if (lineContainsLabel) {
        // if checked , need remove
        if (checked && line.startsWith("//")) {
          lines[i] = line.replace("// ", "");
        } else if (!checked && !line.startsWith("//")) {
          lines[i] = `// ${line}`;
        }
        return lines.join("\n");
      }
    }
  }

  return null;
}

export { modifyGoWorkFile };
