import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

interface TreeNode {
  name: string;
  isDirectory: boolean;
  children: TreeNode[];
  depth: number;
}

export function activate(context: vscode.ExtensionContext) {
  // Register command to show tree in new document
  let generateTreeCommand = vscode.commands.registerCommand(
    "folderTreeGenerator.generateTree",
    async () => {
      vscode.window.showInformationMessage("Generating tree...");

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder open");
        return;
      }

      try {
        const tree = await generateFileTree(workspaceFolder.uri.fsPath);
        const treeString = renderTreeAsText(tree);

        // Show in new untitled document
        const doc = await vscode.workspace.openTextDocument({
          content: treeString,
          language: "plaintext",
        });
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        vscode.window.showErrorMessage(`Error generating tree: ${error}`);
      }
    }
  );

  // Register command to generate text file (PNG later)
  let generateTreeToFileCommand = vscode.commands.registerCommand(
    "folderTreeGenerator.generateTreeToFile",
    async () => {
      vscode.window.showInformationMessage("Generating tree file...");

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder open");
        return;
      }

      try {
        const tree = await generateFileTree(workspaceFolder.uri.fsPath);
        const treeString = renderTreeAsText(tree);
        const outputPath = path.join(
          workspaceFolder.uri.fsPath,
          "folder-tree.txt"
        );

        await fs.promises.writeFile(outputPath, treeString);

        vscode.window.showInformationMessage(`Tree saved to: ${outputPath}`);

        // Open the generated file
        const uri = vscode.Uri.file(outputPath);
        await vscode.commands.executeCommand("vscode.open", uri);
      } catch (error) {
        vscode.window.showErrorMessage(`Error generating file: ${error}`);
      }
    }
  );

  context.subscriptions.push(generateTreeCommand, generateTreeToFileCommand);
}

async function generateFileTree(
  rootPath: string,
  maxDepth: number = 10
): Promise<TreeNode> {
  const gitignorePatterns = await loadGitignorePatterns(rootPath);

  async function buildTree(
    currentPath: string,
    depth: number
  ): Promise<TreeNode> {
    const name = path.basename(currentPath);
    const stats = await fs.promises.stat(currentPath);
    const isDirectory = stats.isDirectory();

    const node: TreeNode = {
      name,
      isDirectory,
      children: [],
      depth,
    };

    if (isDirectory && depth < maxDepth) {
      try {
        const items = await fs.promises.readdir(currentPath);

        for (const item of items.sort()) {
          const itemPath = path.join(currentPath, item);
          const relativePath = path.relative(rootPath, itemPath);

          // Skip if matches gitignore patterns
          if (shouldIgnore(relativePath, gitignorePatterns)) {
            continue;
          }

          try {
            const childNode = await buildTree(itemPath, depth + 1);
            node.children.push(childNode);
          } catch (error) {
            // Skip inaccessible files/folders
            console.log(`Skipping ${itemPath}: ${error}`);
          }
        }
      } catch (error) {
        console.log(`Cannot read directory ${currentPath}: ${error}`);
      }
    }

    return node;
  }

  return buildTree(rootPath, 0);
}

async function loadGitignorePatterns(rootPath: string): Promise<string[]> {
  const gitignorePath = path.join(rootPath, ".gitignore");
  const patterns = [".git", "node_modules", ".vscode", ".DS_Store"]; // Default patterns

  try {
    const gitignoreContent = await fs.promises.readFile(gitignorePath, "utf-8");
    const lines = gitignoreContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    patterns.push(...lines);
  } catch (error) {
    // .gitignore doesn't exist, use defaults
  }

  return patterns;
}

function shouldIgnore(relativePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.includes("*")) {
      // Simple wildcard matching
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return regex.test(relativePath);
    }
    return relativePath.includes(pattern) || relativePath.startsWith(pattern);
  });
}

function renderTreeAsText(node: TreeNode): string {
  let result = "";

  function renderNode(node: TreeNode, prefix: string, isLast: boolean): void {
    const connector = isLast ? "└── " : "├── ";
    const icon = node.isDirectory ? "📁" : "📄";
    result += prefix + connector + icon + " " + node.name + "\n";

    const newPrefix = prefix + (isLast ? "    " : "│   ");

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isChildLast = i === node.children.length - 1;
      renderNode(child, newPrefix, isChildLast);
    }
  }

  renderNode(node, "", true);
  return result;
}

export function deactivate() {}
