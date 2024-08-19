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

    let useSection = extractUseSection(data);

    if (!useSection) {
      vscode.window.showErrorMessage("Please check your go.work");
      return;
    }
    const modifiedContent = modifyUseSection(
      data,
      label,
      checked,
      workspaceFolder
    );
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
  const useSingleLineRegex = /^use\s+(\S+)/gm;
  let match = useRegex.exec(content);
  if (!match) {
    match = useSingleLineRegex.exec(content);
  }

  return match ? match[1].trim() : null;
}

function modifyUseSection(
  content: string,
  label: string,
  checked: boolean,
  workspaceFolder: string
): string | null {
  let findLabel = false;
  const lines = content.split("\n");
  let inUseSection = false;
  let singleUse = false;
  let singleUseArr = [];
  if (label.startsWith("./")) {
    label = "./" + label; // as path
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("use (")) {
      inUseSection = true;
    } else if (inUseSection && line === ")") {
      inUseSection = false;
    } else if (!inUseSection && line.startsWith("use ")) {
      // start with use but not inUseSection
      // this is single line use like `use ./project`
      singleUse = true;
      if (line.includes(label)) {
        // itself
        if (checked) {
          lines[i] = line.replaceAll("//", "");
        } else {
          lines[i] = "use //" + line.replace("use ", "").replaceAll("//", "");
        }
      } else {
        // pick the current one
        singleUseArr.push(line.replace("use ", ""));
        if (checked) {
          singleUseArr.push(label.replace("//", ""));
        } else {
          singleUseArr.push("// " + label.replace("//", ""));
        }
      }
    }
    // inUseSection or singleUse is go.work contains `use`
    if ((inUseSection || singleUse) && singleUseArr.length <= 0) {
      const lineContainsLabel = line.includes(label);
      if (lineContainsLabel) {
        findLabel = true;
        // if checked , need remove
        if (checked && line.startsWith("//")) {
          lines[i] = line.replace("// ", "");
        } else if (!checked && !line.startsWith("//")) {
          lines[i] = `// ${line}`;
        }
      }
    }
  }
  //
  const goModeFilePath = path.join(workspaceFolder, `${label}`, "go.mod");
  var newWorkPath;

  // only not find in go.work should be append
  // if  singleUseArr.length >0 ,we need rewrite use from `use `to `use (`
  if (!findLabel && fs.existsSync(goModeFilePath) && singleUseArr.length <= 0) {
    let p = label;
    if (!p.startsWith("./")) {
      p = "./" + p;
    }
    if (checked) {
      newWorkPath = p.replace("// ", "");
    } else if (!checked && !p.startsWith("//")) {
      newWorkPath = `// ${label}`;
    }
    if (newWorkPath) {
      vscode.window.showInformationMessage("new project add to goworkspace");
      let index = lines.indexOf(")");
      lines.splice(index, 0, newWorkPath);
      return lines.join("\n");
    }
  }
  if (singleUseArr.length > 0) {
    // go 1.22
    // use ./xxx
    // =>
    // let index = lines.indexOf("use ");
    const useIndex = lines.findIndex((line) => line.startsWith("use "));
    if (useIndex !== -1) {
      // Remove the single line use
      lines.splice(useIndex, 1);

      // Insert new lines
      lines.splice(
        useIndex,
        0,
        "use (",
        ...singleUseArr.map((use) => `  ${use}`),
        ")"
      );
    }
  }
  return lines.join("\n");
}

export { modifyGoWorkFile };
