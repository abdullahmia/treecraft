// import * as fs from "fs";
// import * as path from "path";
// import * as vscode from "vscode";

// interface TreeNode {
//   name: string;
//   isDirectory: boolean;
//   children: TreeNode[];
//   depth: number;
//   fullPath?: string;
// }

// export function activate(context: vscode.ExtensionContext) {
//   // Register command to show tree in new document (plain text)
//   let generateTreeCommand = vscode.commands.registerCommand(
//     "folderTreeGenerator.generateTree",
//     async () => {
//       vscode.window.showInformationMessage("Generating tree...");

//       const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
//       if (!workspaceFolder) {
//         vscode.window.showErrorMessage("No workspace folder open");
//         return;
//       }

//       try {
//         const tree = await generateFileTree(workspaceFolder.uri.fsPath);
//         const treeString = renderTreeAsText(tree);

//         // Show in new untitled document
//         const doc = await vscode.workspace.openTextDocument({
//           content: treeString,
//           language: "plaintext",
//         });
//         await vscode.window.showTextDocument(doc);
//       } catch (error) {
//         vscode.window.showErrorMessage(`Error generating tree: ${error}`);
//       }
//     }
//   );

//   // Register command to show interactive tree with hover effects
//   let generateInteractiveTreeCommand = vscode.commands.registerCommand(
//     "folderTreeGenerator.generateInteractiveTree",
//     async () => {
//       vscode.window.showInformationMessage("Generating interactive tree...");

//       const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
//       if (!workspaceFolder) {
//         vscode.window.showErrorMessage("No workspace folder open");
//         return;
//       }

//       try {
//         const rootPath = workspaceFolder.uri.fsPath;
//         const tree = await generateFileTree(rootPath);
//         const htmlContent = renderTreeAsHTML(tree, rootPath);

//         // Create webview panel
//         const panel = vscode.window.createWebviewPanel(
//           'folderTree',
//           'Project Tree',
//           vscode.ViewColumn.One,
//           {
//             enableScripts: true,
//             localResourceRoots: [workspaceFolder.uri]
//           }
//         );

//         panel.webview.html = htmlContent;

//         // Build reverse dependency index lazily on first request
//         let reverseDepIndex: Map<string, Set<string>> | null = null;
//         const ensureReverseIndex = async (): Promise<Map<string, Set<string>>> => {
//           if (reverseDepIndex) return reverseDepIndex;
//           reverseDepIndex = await buildReverseDependencyIndex(rootPath);
//           return reverseDepIndex;
//         };

//         // Handle messages from webview
//         // panel.webview.onDidReceiveMessage(
//         //   async message => {
//         //     switch (message.command) {
//         //       case 'fileClicked': {
//         //         if (!message.isDirectory && message.path) {
//         //           if (message.open) {
//         //             vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.path));
//         //           }
//         //           try {
//         //             const index = await ensureReverseIndex();
//         //             const normalized = normalizeToExistingFile(message.path);
//         //             const dependents = normalized ? Array.from(index.get(normalized) ?? []) : [];
//         //             const graph = buildGraphPayload(normalized ?? message.path, dependents);
//         //             panel.webview.postMessage({ command: 'dependencyGraph', graph });
//         //           } catch (e) {
//         //             vscode.window.showWarningMessage(`Could not compute dependencies: ${e}`);
//         //           }
//         //         }
//         //         break;
//         //       }
//         //     }
//         //   },
//         //   undefined,
//         //   context.subscriptions
//         // );
//         // In the panel.webview.onDidReceiveMessage handler:
//         panel.webview.onDidReceiveMessage(
//           async message => {
//               switch (message.command) {
//                   case 'fileClicked': {
//                       if (!message.isDirectory && message.path) {
//                           // Log to help debug
//                           console.log('File clicked:', message.path);
                          
//                           if (message.open) {
//                               vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.path));
//                           }
                          
//                           try {
//                               // Ensure we build the index
//                               const index = await ensureReverseIndex();
//                               console.log('Dependency index built:', index.size, 'entries');
                              
//                               // Get the normalized path
//                               const normalized = normalizeToExistingFile(message.path);
//                               console.log('Normalized path:', normalized);
                              
//                               // Get dependents and build graph
//                               const dependents = normalized ? Array.from(index.get(normalized) ?? []) : [];
//                               console.log('Found dependents:', dependents.length);
                              
//                               const graph = buildGraphPayload(normalized ?? message.path, dependents);
                              
//                               // Send the graph data back to webview
//                               panel.webview.postMessage({ 
//                                   command: 'dependencyGraph', 
//                                   graph: graph 
//                               });
//                           } catch (e) {
//                               console.error('Error computing dependencies:', e);
//                               vscode.window.showWarningMessage(`Could not compute dependencies: ${e}`);
//                           }
//                       }
//                       break;
//                   }
//               }
//           },
//           undefined,
//           context.subscriptions
//         );

//       } catch (error) {
//         vscode.window.showErrorMessage(`Error generating interactive tree: ${error}`);
//       }
//     }
//   );

//   // Register command to generate text file (PNG later)
//   let generateTreeToFileCommand = vscode.commands.registerCommand(
//     "folderTreeGenerator.generateTreeToFile",
//     async () => {
//       vscode.window.showInformationMessage("Generating tree file...");

//       const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
//       if (!workspaceFolder) {
//         vscode.window.showErrorMessage("No workspace folder open");
//         return;
//       }

//       try {
//         const tree = await generateFileTree(workspaceFolder.uri.fsPath);
//         const treeString = renderTreeAsText(tree);
//         const outputPath = path.join(
//           workspaceFolder.uri.fsPath,
//           "folder-tree.txt"
//         );

//         await fs.promises.writeFile(outputPath, treeString);

//         vscode.window.showInformationMessage(`Tree saved to: ${outputPath}`);

//         // Open the generated file
//         const uri = vscode.Uri.file(outputPath);
//         await vscode.commands.executeCommand("vscode.open", uri);
//       } catch (error) {
//         vscode.window.showErrorMessage(`Error generating file: ${error}`);
//       }
//     }
//   );

//   context.subscriptions.push(
//     generateTreeCommand, 
//     generateInteractiveTreeCommand, 
//     generateTreeToFileCommand
//   );
// }

// async function generateFileTree(
//   rootPath: string,
//   maxDepth: number = 10
// ): Promise<TreeNode> {
//   const gitignorePatterns = await loadGitignorePatterns(rootPath);

//   async function buildTree(
//     currentPath: string,
//     depth: number
//   ): Promise<TreeNode> {
//     const name = path.basename(currentPath);
//     const stats = await fs.promises.stat(currentPath);
//     const isDirectory = stats.isDirectory();

//     const node: TreeNode = {
//       name,
//       isDirectory,
//       children: [],
//       depth,
//       fullPath: currentPath,
//     };

//     if (isDirectory && depth < maxDepth) {
//       try {
//         const items = await fs.promises.readdir(currentPath);

//         for (const item of items.sort()) {
//           const itemPath = path.join(currentPath, item);
//           const relativePath = path.relative(rootPath, itemPath);

//           // Skip if matches gitignore patterns
//           if (shouldIgnore(relativePath, gitignorePatterns)) {
//             continue;
//           }

//           try {
//             const childNode = await buildTree(itemPath, depth + 1);
//             node.children.push(childNode);
//           } catch (error) {
//             // Skip inaccessible files/folders
//             console.log(`Skipping ${itemPath}: ${error}`);
//           }
//         }
//       } catch (error) {
//         console.log(`Cannot read directory ${currentPath}: ${error}`);
//       }
//     }

//     return node;
//   }

//   return buildTree(rootPath, 0);
// }

// async function loadGitignorePatterns(rootPath: string): Promise<string[]> {
//   const gitignorePath = path.join(rootPath, ".gitignore");
//   const patterns = [".git", "node_modules", ".vscode", ".DS_Store"]; // Default patterns

//   try {
//     const gitignoreContent = await fs.promises.readFile(gitignorePath, "utf-8");
//     const lines = gitignoreContent
//       .split("\n")
//       .map((line) => line.trim())
//       .filter((line) => line && !line.startsWith("#"));
//     patterns.push(...lines);
//   } catch (error) {
//     // .gitignore doesn't exist, use defaults
//   }

//   return patterns;
// }

// function shouldIgnore(relativePath: string, patterns: string[]): boolean {
//   return patterns.some((pattern) => {
//     if (pattern.includes("*")) {
//       // Simple wildcard matching
//       const regex = new RegExp(pattern.replace(/\*/g, ".*"));
//       return regex.test(relativePath);
//     }
//     return relativePath.includes(pattern) || relativePath.startsWith(pattern);
//   });
// }

// function renderTreeAsText(node: TreeNode): string {
//   let result = "";

//   function renderNode(node: TreeNode, prefix: string, isLast: boolean): void {
//     const connector = isLast ? "└── " : "├── ";
//     const icon = node.isDirectory ? "📁" : "📄";
//     result += prefix + connector + icon + " " + node.name + "\n";

//     const newPrefix = prefix + (isLast ? "    " : "│   ");

//     for (let i = 0; i < node.children.length; i++) {
//       const child = node.children[i];
//       const isChildLast = i === node.children.length - 1;
//       renderNode(child, newPrefix, isChildLast);
//     }
//   }

//   renderNode(node, "", true);
//   return result;
// }

// function renderTreeAsHTML(node: TreeNode, rootPath: string): string {
//   const css = `
//     <style>
//       body {
//         font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
//         font-size: 14px;
//         line-height: 1.4;
//         margin: 20px;
//         background-color: var(--vscode-editor-background);
//         color: var(--vscode-editor-foreground);
//       }
      
//       .tree {
//         white-space: pre;
//       }
      
//       .tree-item {
//         display: inline-block;
//         transition: all 0.2s ease;
//         cursor: pointer;
//         border-radius: 3px;
//         padding: 1px 4px;
//         margin: 0 2px;
//       }
      
//       .tree-item:hover {
//         background-color: var(--vscode-list-hoverBackground);
//         text-decoration: underline;
//         text-decoration-color: var(--vscode-textLink-foreground);
//         color: var(--vscode-textLink-foreground);
//         transform: translateX(2px);
//       }
      
//       .tree-item.directory {
//         color: var(--vscode-symbolIcon-folderForeground);
//         font-weight: 500;
//       }
      
//       .tree-item.file {
//         color: var(--vscode-symbolIcon-fileForeground);
//       }
      
//       .tree-item.directory:hover {
//         color: var(--vscode-textLink-activeForeground);
//         background-color: var(--vscode-list-activeSelectionBackground);
//       }
      
//       .tree-connector {
//         color: var(--vscode-tree-tableColumnsBorder);
//         user-select: none;
//       }
      
//       .tree-icon {
//         margin-right: 4px;
//       }
      
//       .tree-line {
//         margin: 0;
//         padding: 2px 0;
//       }
      
//       /* File type specific colors */
//       .tree-item[data-ext=".js"], .tree-item[data-ext=".ts"] {
//         color: #f7df1e;
//       }
      
//       .tree-item[data-ext=".html"] {
//         color: #e34c26;
//       }
      
//       .tree-item[data-ext=".css"] {
//         color: #1572b6;
//       }
      
//       .tree-item[data-ext=".json"] {
//         color: #cbcb41;
//       }
      
//       .tree-item[data-ext=".md"] {
//         color: #755838;
//       }
      
//       .tree-item[data-ext=".py"] {
//         color: #3776ab;
//       }
//       .graph {
//         margin-top: 16px;
//         border-top: 1px solid var(--vscode-tree-tableColumnsBorder);
//         padding-top: 12px;
//       }

//       .graph h3 {
//         margin: 6px 0 10px;
//         font-size: 13px;
//         color: var(--vscode-editor-foreground);
//       }

//       .graph svg {
//         width: 100%;
//         height: 360px;
//         background: transparent;
//       }

//       .graph .node {
//         fill: var(--vscode-editor-foreground);
//       }

//       .graph .node.central {
//         fill: var(--vscode-textLink-foreground);
//       }

//       .graph .label {
//         fill: var(--vscode-editor-foreground);
//         font-size: 11px;
//         dominant-baseline: middle;
//       }

//       .graph .edge {
//         stroke: var(--vscode-tree-tableColumnsBorder);
//         stroke-width: 1;
//       }
//     </style>
//   `;

//   const script = `
//     <script>
//       const vscode = acquireVsCodeApi();
      
//       function postFileClicked(filePath, isDirectory) {
//         vscode.postMessage({ command: 'fileClicked', path: filePath, isDirectory: !!isDirectory });
//       }

//       document.addEventListener('click', (ev) => {
//         const target = ev.target;
//         if (!(target instanceof Element)) return;
//         const el = target.closest('.tree-item');
//         if (!el) return;
//         const p = el.getAttribute('data-path');
//         const d = el.getAttribute('data-isdir') === 'true';
//         const open = ev.metaKey || ev.ctrlKey; // Cmd/Ctrl+Click opens file
//         if (p) {
//           let pathVal = p;
//           try { pathVal = decodeURIComponent(p); } catch {}
//           vscode.postMessage({ command: 'fileClicked', path: pathVal, isDirectory: d, open });
//         }
//       });

//       window.addEventListener('message', event => {
//           const message = event.data;
//           console.log('Received message:', message); // Add logging
          
//           if (message && message.command === 'dependencyGraph') {
//               console.log('Rendering graph with data:', message.graph); // Add logging
//               renderGraph(message.graph);
//           }
//       });

//       function renderGraph(graph) {
//         const container = document.getElementById('graph');
//         if (!container) {
//             console.error('Graph container not found');
//             return;
//         }
        
//         if (!graph || !graph.nodes || graph.nodes.length === 0) {
//             container.innerHTML = '<h3>Dependencies</h3><div>No dependents found.</div>';
//             console.log('No graph data to render');
//             return;
//         }

//         const width = container.clientWidth || 800;
//         const height = 360;
//         const cx = Math.max(200, Math.min(width - 200, width / 2));
//         const cy = height / 2;
//         const radius = Math.min(width, height) / 2 - 40;

//         const center = graph.nodes.find(n => n.isCenter);
//         const others = graph.nodes.filter(n => !n.isCenter);

//         const angleStep = others.length ? (Math.PI * 2) / others.length : 0;
//         const positioned = others.map((n, i) => {
//           const angle = i * angleStep;
//           return { id: n.id, label: n.label, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
//         });

//         let svg = '';
//         svg += '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet">';
//         // edges
//         for (const edge of graph.edges) {
//           const from = positioned.find(p => p.id === edge.from);
//           const toX = cx, toY = cy;
//           if (from) {
//             svg += '<line class="edge" x1="' + from.x + '" y1="' + from.y + '" x2="' + toX + '" y2="' + toY + '" />';
//           }
//         }
//         // nodes others
//         for (const p of positioned) {
//           svg += '<circle class="node" r="6" cx="' + p.x + '" cy="' + p.y + '"></circle>';
//           svg += '<text class="label" x="' + (p.x + 10) + '" y="' + p.y + '">' + escapeHtml(shortLabel(p.label)) + '</text>';
//         }
//         // center node
//         svg += '<circle class="node central" r="8" cx="' + cx + '" cy="' + cy + '"></circle>';
//         svg += '<text class="label" x="' + (cx + 12) + '" y="' + cy + '">' + escapeHtml(shortLabel(center ? center.label : 'Selected')) + '</text>';
//         svg += '</svg>';

//         container.innerHTML = '<h3>Dependencies (who imports selected file)</h3>' + svg;
//       }

//       function shortLabel(label) {
//         if (!label) return '';
//         const parts = label.split(/[\\\/]/);
//         if (parts.length <= 2) return label;
//         return parts.slice(-2).join('/');
//       }

//       function escapeHtml(s) {
//         return String(s)
//           .replace(/&/g, '&amp;')
//           .replace(/</g, '&lt;')
//           .replace(/>/g, '&gt;')
//           .replace(/"/g, '&quot;')
//           .replace(/'/g, '&#039;');
//       }
//     </script>
//   `;

//   let htmlContent = "";

//   function renderNodeHTML(node: TreeNode, prefix: string, isLast: boolean): void {
//     const connector = isLast ? "└── " : "├── ";
//     const icon = node.isDirectory ? "📁" : "📄";
//     const fileExt = node.isDirectory ? "" : path.extname(node.name);
//     const itemClass = node.isDirectory ? "directory" : "file";
//     const relativePath = node.fullPath ? path.relative(rootPath, node.fullPath) : node.name;
//     const encodedPath = node.fullPath ? encodeURIComponent(node.fullPath) : '';
    
//     htmlContent += `<div class="tree-line">`;
//     htmlContent += `<span class="tree-connector">${prefix}${connector}</span>`;
//     htmlContent += `<span class="tree-icon">${icon}</span>`;
//     htmlContent += `<span class="tree-item ${itemClass}" data-ext="${fileExt}" data-path="${encodedPath}" data-isdir="${node.isDirectory}" title="${relativePath}">${node.name}</span>`;
//     htmlContent += `</div>\n`;

//     const newPrefix = prefix + (isLast ? "    " : "│   ");

//     for (let i = 0; i < node.children.length; i++) {
//       const child = node.children[i];
//       const isChildLast = i === node.children.length - 1;
//       renderNodeHTML(child, newPrefix, isChildLast);
//     }
//   }

//   renderNodeHTML(node, "", true);

//   return `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Project Tree</title>
//         ${css}
//     </head>
//     <body>
//         <h2>Project Structure</h2>
//         <div class="tree">
//             ${htmlContent}
//         </div>
//         <div id="graph" class="graph"></div>
//         ${script}
//     </body>
//     </html>
//   `;
// }

// export function deactivate() {}

// // ---------------- Dependency index and graph helpers ----------------

// type ReverseDepIndex = Map<string, Set<string>>; // target -> set of sources that import target

// async function buildReverseDependencyIndex(rootPath: string): Promise<ReverseDepIndex> {
//   const files = await collectCodeFiles(rootPath);
//   const forward = new Map<string, Set<string>>(); // source -> targets

//   for (const file of files) {
//     try {
//       const content = await fs.promises.readFile(file, 'utf-8');
//       const specs = extractImportSpecifiers(content);
//       for (const spec of specs) {
//         const resolved = resolveImportSpecifier(spec, file, rootPath);
//         if (!resolved) continue;
//         if (!forward.has(file)) forward.set(file, new Set<string>());
//         forward.get(file)!.add(resolved);
//       }
//     } catch {
//       // ignore file read errors
//     }
//   }

//   const reverse: ReverseDepIndex = new Map<string, Set<string>>();
//   for (const [src, targets] of forward) {
//     for (const tgt of targets) {
//       if (!reverse.has(tgt)) reverse.set(tgt, new Set<string>());
//       reverse.get(tgt)!.add(src);
//     }
//   }
//   return reverse;
// }

// async function collectCodeFiles(rootPath: string): Promise<string[]> {
//   const patterns = await loadGitignorePatterns(rootPath);
//   const results: string[] = [];

//   async function walk(current: string) {
//     let stats: fs.Stats;
//     try { stats = await fs.promises.stat(current); } catch { return; }
//     if (stats.isDirectory()) {
//       let items: string[] = [];
//       try { items = await fs.promises.readdir(current); } catch { return; }
//       for (const item of items) {
//         const full = path.join(current, item);
//         const rel = path.relative(rootPath, full);
//         if (shouldIgnore(rel, patterns)) continue;
//         await walk(full);
//       }
//     } else {
//       const ext = path.extname(current).toLowerCase();
//       if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
//         results.push(current);
//       }
//     }
//   }

//   await walk(rootPath);
//   return results;
// }

// function extractImportSpecifiers(source: string): string[] {
//   const specs = new Set<string>();
//   const importRegex = /import\s+[^'"\n]+from\s+['\"]([^'\"]+)['\"]/g;
//   const importBareRegex = /import\s+['\"]([^'\"]+)['\"]/g;
//   const requireRegex = /require\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
//   const dynamicImportRegex = /import\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
//   let m: RegExpExecArray | null;
//   while ((m = importRegex.exec(source))) specs.add(m[1]);
//   while ((m = importBareRegex.exec(source))) specs.add(m[1]);
//   while ((m = requireRegex.exec(source))) specs.add(m[1]);
//   while ((m = dynamicImportRegex.exec(source))) specs.add(m[1]);
//   return Array.from(specs);
// }

// function resolveImportSpecifier(spec: string, fromFile: string, rootPath: string): string | null {
//   // only resolve relative paths; ignore packages
//   if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
//   const fromDir = path.dirname(fromFile);
//   const attemptPaths: string[] = [];
//   const base = spec.startsWith('/') ? path.join(rootPath, spec) : path.resolve(fromDir, spec);
//   attemptPaths.push(base);

//   const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ""];
//   for (const ext of exts) {
//     attemptPaths.push(base + ext);
//   }
//   const indexNames = ["index.ts", "index.tsx", "index.js", "index.jsx", "index.mjs", "index.cjs"];
//   for (const idx of indexNames) {
//     attemptPaths.push(path.join(base, idx));
//   }

//   for (const p of attemptPaths) {
//     try {
//       const stat = fs.statSync(p);
//       if (stat.isFile()) return normalizeToExistingFile(p)!;
//     } catch {
//       // continue
//     }
//   }
//   return null;
// }

// function normalizeToExistingFile(filePath: string): string | null {
//   try {
//     const real = fs.realpathSync.native ? fs.realpathSync.native(filePath) : fs.realpathSync(filePath);
//     return real;
//   } catch {
//     return null;
//   }
// }

// function buildGraphPayload(centerPath: string, dependents: string[]) {
//   console.log("Called")
//   const nodes = [
//     { id: centerPath, label: path.relative(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', centerPath), isCenter: true }
//   ];
//   for (const dep of dependents) {
//     nodes.push({ id: dep, label: path.relative(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', dep), isCenter: false });
//   }
//   const edges = dependents.map(d => ({ from: d, to: centerPath }));
//   return { nodes, edges };
// }
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

interface TreeNode {
  name: string;
  isDirectory: boolean;
  children: TreeNode[];
  depth: number;
  fullPath?: string;
}

export function activate(context: vscode.ExtensionContext) {
  // Register command to show tree in new document (plain text)
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

  // Register command to show interactive tree with hover effects
  let generateInteractiveTreeCommand = vscode.commands.registerCommand(
    "folderTreeGenerator.generateInteractiveTree",
    async () => {
      vscode.window.showInformationMessage("Generating interactive tree...");

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder open");
        return;
      }

      try {
        const rootPath = workspaceFolder.uri.fsPath;
        const tree = await generateFileTree(rootPath);
        const htmlContent = renderTreeAsHTML(tree, rootPath);

        const panel = vscode.window.createWebviewPanel(
          'folderTree',
          'Project Tree with Dependencies',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            localResourceRoots: [workspaceFolder.uri]
          }
        );

        panel.webview.html = htmlContent;

        // Build reverse dependency index lazily on first request
        let reverseDepIndex: Map<string, Set<string>> | null = null;
        const ensureReverseIndex = async (): Promise<Map<string, Set<string>>> => {
          if (reverseDepIndex) return reverseDepIndex;
          
          // Show progress
          const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: "Building dependency index...",
            cancellable: false
          };
          
          reverseDepIndex = await vscode.window.withProgress(progressOptions, async () => {
            return await buildReverseDependencyIndex(rootPath);
          });
          
          return reverseDepIndex;
        };

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
          async message => {
            switch (message.command) {
              case 'fileClicked': {
                console.log('File clicked:', message);
                
                if (!message.isDirectory && message.path) {
                  // Open file if requested (Ctrl/Cmd + Click)
                  if (message.open) {
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.path));
                    return;
                  }
                  
                  try {
                    // Show loading state
                    panel.webview.postMessage({ 
                      command: 'showLoading', 
                      message: 'Analyzing dependencies...' 
                    });
                    
                    // Ensure we build the index
                    const index = await ensureReverseIndex();
                    console.log('Dependency index built:', index.size, 'entries');
                    
                    // Get the normalized path
                    const normalized = normalizeToExistingFile(message.path);
                    console.log('Normalized path:', normalized);
                    
                    // Get dependents and build graph
                    const dependents = normalized ? Array.from(index.get(normalized) ?? []) : [];
                    console.log('Found dependents:', dependents);
                    
                    // Also get what this file imports
                    const imports = normalized ? await getFileImports(normalized, rootPath) : [];
                    console.log('Found imports:', imports);
                    
                    const graph = buildGraphPayload(normalized ?? message.path, dependents, imports, rootPath);
                    
                    // Send the graph data back to webview
                    panel.webview.postMessage({ 
                      command: 'dependencyGraph', 
                      graph: graph 
                    });
                    
                  } catch (e) {
                    console.error('Error computing dependencies:', e);
                    vscode.window.showWarningMessage(`Could not compute dependencies: ${e}`);
                    
                    // Send error state to webview
                    panel.webview.postMessage({ 
                      command: 'dependencyGraph', 
                      graph: { nodes: [], edges: [], error: String(e) }
                    });
                  }
                }
                break;
              }
              case 'openFile': {
                if (message.path) {
                  vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.path));
                }
                break;
              }
            }
          },
          undefined,
          context.subscriptions
        );

      } catch (error) {
        vscode.window.showErrorMessage(`Error generating interactive tree: ${error}`);
      }
    }
  );

  // Register command to generate text file
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

        const uri = vscode.Uri.file(outputPath);
        await vscode.commands.executeCommand("vscode.open", uri);
      } catch (error) {
        vscode.window.showErrorMessage(`Error generating file: ${error}`);
      }
    }
  );

  context.subscriptions.push(
    generateTreeCommand, 
    generateInteractiveTreeCommand, 
    generateTreeToFileCommand
  );
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
      fullPath: currentPath,
    };

    if (isDirectory && depth < maxDepth) {
      try {
        const items = await fs.promises.readdir(currentPath);

        for (const item of items.sort()) {
          const itemPath = path.join(currentPath, item);
          const relativePath = path.relative(rootPath, itemPath);

          if (shouldIgnore(relativePath, gitignorePatterns)) {
            continue;
          }

          try {
            const childNode = await buildTree(itemPath, depth + 1);
            node.children.push(childNode);
          } catch (error) {
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
  const patterns = [".git", "node_modules", ".vscode", ".DS_Store"];

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

function renderTreeAsHTML(node: TreeNode, rootPath: string): string {
  const css = `
    <style>
      body {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.4;
        margin: 20px;
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        overflow-x: auto;
      }
      
      .container {
        display: flex;
        gap: 20px;
        min-height: calc(100vh - 80px);
      }
      
      .tree-panel {
        flex: 1;
        min-width: 300px;
        max-width: 50%;
        overflow-y: auto;
      }
      
      .graph-panel {
        flex: 1;
        min-width: 300px;
        border-left: 1px solid var(--vscode-panel-border);
        padding-left: 20px;
        overflow-y: auto;
      }
      
      .tree {
        white-space: pre;
      }
      
      .tree-item {
        display: inline-block;
        transition: all 0.2s ease;
        cursor: pointer;
        border-radius: 3px;
        padding: 2px 6px;
        margin: 0 2px;
      }
      
      .tree-item:hover {
        background-color: var(--vscode-list-hoverBackground);
        text-decoration: underline;
        text-decoration-color: var(--vscode-textLink-foreground);
        color: var(--vscode-textLink-foreground);
        transform: translateX(3px);
      }
      
      .tree-item.selected {
        background-color: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
        font-weight: bold;
      }
      
      .tree-item.directory {
        color: var(--vscode-symbolIcon-folderForeground);
        font-weight: 500;
      }
      
      .tree-item.file {
        color: var(--vscode-symbolIcon-fileForeground);
      }
      
      .tree-item.file:hover::after {
        content: "📊";
        margin-left: 8px;
        font-size: 10px;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      
      .tree-connector {
        color: var(--vscode-tree-tableColumnsBorder);
        user-select: none;
      }
      
      .tree-icon {
        margin-right: 4px;
      }
      
      .tree-line {
        margin: 0;
        padding: 2px 0;
      }
      
      .graph-container {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 16px;
        margin-top: 10px;
      }
      
      .graph-header {
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }
      
      .graph-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
        margin: 0 0 4px 0;
      }
      
      .graph-subtitle {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin: 0;
      }
      
      .graph-svg {
        width: 100%;
        height: 400px;
        background: transparent;
        border-radius: 4px;
      }
      
      .node {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .node:hover {
        r: 8;
      }
      
      .node.center {
        fill: #4CAF50;
        stroke: #2E7D32;
        stroke-width: 2;
      }
      
      .node.dependent {
        fill: #2196F3;
        stroke: #1565C0;
        stroke-width: 1.5;
      }
      
      .node.imported {
        fill: #FF9800;
        stroke: #E65100;
        stroke-width: 1.5;
      }
      
      .edge {
        stroke-width: 2;
        opacity: 0.7;
        marker-end: url(#arrowhead);
      }
      
      .edge.to-center {
        stroke: #2196F3;
      }
      
      .edge.from-center {
        stroke: #FF9800;
      }
      
      .label {
        fill: var(--vscode-editor-foreground);
        font-size: 11px;
        font-family: 'Consolas', monospace;
        dominant-baseline: middle;
        pointer-events: none;
        user-select: none;
      }
      
      .loading {
        text-align: center;
        padding: 40px;
        color: var(--vscode-descriptionForeground);
      }
      
      .loading::after {
        content: '...';
        animation: dots 1.5s infinite;
      }
      
      @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
      }
      
      .stats {
        display: flex;
        gap: 20px;
        font-size: 12px;
        margin-bottom: 10px;
        color: var(--vscode-descriptionForeground);
      }
      
      .stat {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .stat-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
    </style>
  `;

  const script = `
    <script>
      const vscode = acquireVsCodeApi();
      let selectedFile = null;
      
      // Handle file clicks
      document.addEventListener('click', (ev) => {
        const target = ev.target;
        if (!(target instanceof Element)) return;
        const el = target.closest('.tree-item');
        if (!el) return;
        
        const p = el.getAttribute('data-path');
        const d = el.getAttribute('data-isdir') === 'true';
        const open = ev.metaKey || ev.ctrlKey;
        
        if (p) {
          let pathVal = p;
          try { pathVal = decodeURIComponent(p); } catch {}
          
          // Update visual selection
          if (!d) {
            document.querySelectorAll('.tree-item.selected').forEach(item => {
              item.classList.remove('selected');
            });
            el.classList.add('selected');
            selectedFile = pathVal;
          }
          
          vscode.postMessage({ 
            command: 'fileClicked', 
            path: pathVal, 
            isDirectory: d, 
            open: open 
          });
        }
      });

      // Handle messages from extension
      window.addEventListener('message', event => {
        const message = event.data;
        console.log('Received message:', message);
        
        switch (message.command) {
          case 'dependencyGraph':
            renderGraph(message.graph);
            break;
          case 'showLoading':
            showLoading(message.message);
            break;
        }
      });

      function showLoading(message) {
        const container = document.getElementById('graph-content');
        if (container) {
          container.innerHTML = '<div class="loading">' + (message || 'Loading') + '</div>';
        }
      }

      function renderGraph(graph) {
        const container = document.getElementById('graph-content');
        if (!container) {
          console.error('Graph container not found');
          return;
        }
        
        if (graph.error) {
          container.innerHTML = '<div style="color: var(--vscode-errorForeground); padding: 20px;">Error: ' + escapeHtml(graph.error) + '</div>';
          return;
        }
        
        if (!graph || !graph.nodes || graph.nodes.length === 0) {
          container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No dependencies found for this file.</div>';
          return;
        }

        const centerNode = graph.nodes.find(n => n.isCenter);
        const dependentNodes = graph.nodes.filter(n => n.type === 'dependent');
        const importedNodes = graph.nodes.filter(n => n.type === 'imported');
        
        const statsHtml = \`
          <div class="stats">
            <div class="stat">
              <div class="stat-color" style="background: #4CAF50;"></div>
              <span>Selected file</span>
            </div>
            <div class="stat">
              <div class="stat-color" style="background: #2196F3;"></div>
              <span>Files using this (\${dependentNodes.length})</span>
            </div>
            <div class="stat">
              <div class="stat-color" style="background: #FF9800;"></div>
              <span>Files imported by this (\${importedNodes.length})</span>
            </div>
          </div>
        \`;

        const svg = renderGraphSVG(graph);
        
        container.innerHTML = \`
          <div class="graph-header">
            <h3 class="graph-title">📊 Dependency Graph</h3>
            <p class="graph-subtitle">Selected: \${escapeHtml(centerNode ? centerNode.label : 'Unknown file')}</p>
          </div>
          \${statsHtml}
          \${svg}
        \`;
      }

      function renderGraphSVG(graph) {
        const width = 100; // percentage
        const height = 400;
        const centerX = 50; // percentage
        const centerY = 50; // percentage
        const radius = 35; // percentage
        
        const centerNode = graph.nodes.find(n => n.isCenter);
        const otherNodes = graph.nodes.filter(n => !n.isCenter);
        
        if (otherNodes.length === 0) {
          return \`
            <svg class="graph-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                </marker>
              </defs>
              <circle class="node center" cx="\${centerX}" cy="\${centerY}" r="3" />
              <text class="label" x="\${centerX + 5}" y="\${centerY}">\${escapeHtml(shortLabel(centerNode ? centerNode.label : ''))}</text>
            </svg>
          \`;
        }
        
        // Position nodes in a circle around the center
        const angleStep = (Math.PI * 2) / otherNodes.length;
        const positioned = otherNodes.map((node, i) => {
          const angle = i * angleStep - Math.PI / 2; // Start from top
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          return { ...node, x, y };
        });
        
        // Generate SVG
        let svg = \`
          <svg class="graph-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--vscode-editor-foreground)" />
              </marker>
            </defs>
        \`;
        
        // Draw edges
        for (const edge of graph.edges) {
          const fromNode = positioned.find(n => n.id === edge.from) || (edge.from === centerNode?.id ? { x: centerX, y: centerY } : null);
          const toNode = positioned.find(n => n.id === edge.to) || (edge.to === centerNode?.id ? { x: centerX, y: centerY } : null);
          
          if (fromNode && toNode) {
            const edgeClass = edge.to === centerNode?.id ? 'to-center' : 'from-center';
            svg += \`<line class="edge \${edgeClass}" x1="\${fromNode.x}%" y1="\${fromNode.y}%" x2="\${toNode.x}%" y2="\${toNode.y}%" />\`;
          }
        }
        
        // Draw other nodes
        for (const node of positioned) {
          const nodeClass = node.type === 'dependent' ? 'dependent' : 'imported';
          svg += \`<circle class="node \${nodeClass}" cx="\${node.x}%" cy="\${node.y}%" r="2" onclick="openFileFromGraph('\${node.id}')" title="\${escapeHtml(node.label)}" />\`;
          
          // Position label to avoid overlap
          const labelX = node.x + (node.x > centerX ? 4 : -4);
          const labelY = node.y;
          const anchor = node.x > centerX ? 'start' : 'end';
          svg += \`<text class="label" x="\${labelX}%" y="\${labelY}%" text-anchor="\${anchor}" onclick="openFileFromGraph('\${node.id}')">\${escapeHtml(shortLabel(node.label))}</text>\`;
        }
        
        // Draw center node last (on top)
        svg += \`<circle class="node center" cx="\${centerX}%" cy="\${centerY}%" r="3" />\`;
        svg += \`<text class="label" x="\${centerX + 5}%" y="\${centerY}%" text-anchor="start">\${escapeHtml(shortLabel(centerNode ? centerNode.label : ''))}</text>\`;
        
        svg += '</svg>';
        return svg;
      }
      
      function openFileFromGraph(filePath) {
        vscode.postMessage({
          command: 'openFile',
          path: filePath
        });
      }

      function shortLabel(label) {
        if (!label) return '';
        const parts = label.split(/[\\\\\/]/);
        if (parts.length <= 2) return label;
        return '...' + parts.slice(-2).join('/');
      }

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    </script>
  `;

  let htmlContent = "";

  function renderNodeHTML(node: TreeNode, prefix: string, isLast: boolean): void {
    const connector = isLast ? "└── " : "├── ";
    const icon = node.isDirectory ? "📁" : "📄";
    const fileExt = node.isDirectory ? "" : path.extname(node.name);
    const itemClass = node.isDirectory ? "directory" : "file";
    const relativePath = node.fullPath ? path.relative(rootPath, node.fullPath) : node.name;
    const encodedPath = node.fullPath ? encodeURIComponent(node.fullPath) : '';
    
    htmlContent += `<div class="tree-line">`;
    htmlContent += `<span class="tree-connector">${prefix}${connector}</span>`;
    htmlContent += `<span class="tree-icon">${icon}</span>`;
    htmlContent += `<span class="tree-item ${itemClass}" data-ext="${fileExt}" data-path="${encodedPath}" data-isdir="${node.isDirectory}" title="${relativePath}${!node.isDirectory ? ' (Click to see dependencies)' : ''}">${node.name}</span>`;
    htmlContent += `</div>\n`;

    const newPrefix = prefix + (isLast ? "    " : "│   ");

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isChildLast = i === node.children.length - 1;
      renderNodeHTML(child, newPrefix, isChildLast);
    }
  }

  renderNodeHTML(node, "", true);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Tree with Dependencies</title>
        ${css}
    </head>
    <body>
        <h2>🌲 Project Structure & Dependencies</h2>
        <p style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 20px;">
          💡 Click files to see dependencies • Ctrl/Cmd+Click to open file
        </p>
        
        <div class="container">
          <div class="tree-panel">
            <h3 style="margin-top: 0;">File Tree</h3>
            <div class="tree">${htmlContent}</div>
          </div>
          
          <div class="graph-panel">
            <div class="graph-container">
              <div id="graph-content">
                <div style="padding: 40px; text-align: center; color: var(--vscode-descriptionForeground);">
                  👈 Click on a file to see its dependencies
                </div>
              </div>
            </div>
          </div>
        </div>
        
        ${script}
    </body>
    </html>
  `;
}

export function deactivate() {}

// ---------------- Dependency analysis functions ----------------

type ReverseDepIndex = Map<string, Set<string>>;

async function buildReverseDependencyIndex(rootPath: string): Promise<ReverseDepIndex> {
  const files = await collectCodeFiles(rootPath);
  const forward = new Map<string, Set<string>>();

  for (const file of files) {
    try {
      const content = await fs.promises.readFile(file, 'utf-8');
      const specs = extractImportSpecifiers(content);
      for (const spec of specs) {
        const resolved = resolveImportSpecifier(spec, file, rootPath);
        if (!resolved) continue;
        if (!forward.has(file)) forward.set(file, new Set<string>());
        forward.get(file)!.add(resolved);
      }
    } catch {
      // ignore file read errors
    }
  }

  const reverse: ReverseDepIndex = new Map<string, Set<string>>();
  for (const [src, targets] of forward) {
    for (const tgt of targets) {
      if (!reverse.has(tgt)) reverse.set(tgt, new Set<string>());
      reverse.get(tgt)!.add(src);
    }
  }
  return reverse;
}

async function collectCodeFiles(rootPath: string): Promise<string[]> {
  const patterns = await loadGitignorePatterns(rootPath);
  const results: string[] = [];

  async function walk(current: string) {
    let stats: fs.Stats;
    try { stats = await fs.promises.stat(current); } catch { return; }
    if (stats.isDirectory()) {
      let items: string[] = [];
      try { items = await fs.promises.readdir(current); } catch { return; }
      for (const item of items) {
        const full = path.join(current, item);
        const rel = path.relative(rootPath, full);
        if (shouldIgnore(rel, patterns)) continue;
        await walk(full);
      }
    } else {
      const ext = path.extname(current).toLowerCase();
      if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"].includes(ext)) {
        results.push(current);
      }
    }
  }

  await walk(rootPath);
  return results;
}

function extractImportSpecifiers(source: string): string[] {
  const specs = new Set<string>();
  
  // Regular expressions for different import patterns
  const patterns = [
    // ES6 imports: import ... from 'module'
    /import\s+(?:[^'"]*\s+from\s+)?['"']([^'"]+)['"]/g,
    // CommonJS: require('module')
    /require\s*\(\s*['"']([^'"]+)['"]\s*\)/g,
    // Dynamic imports: import('module')
    /import\s*\(\s*['"']([^'"]+)['"]\s*\)/g,
    // Re-exports: export ... from 'module'
    /export\s+(?:[^'"]*\s+from\s+)?['"']([^'"]+)['"]/g
  ];
  
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      specs.add(match[1]);
    }
  }
  
  return Array.from(specs);
}

function resolveImportSpecifier(spec: string, fromFile: string, rootPath: string): string | null {
  // Only resolve relative paths; ignore package imports
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  
  const fromDir = path.dirname(fromFile);
  const base = spec.startsWith('/') ? path.join(rootPath, spec) : path.resolve(fromDir, spec);
  
  // Try different extensions and index files
  const attemptPaths: string[] = [
    base,
    base + '.ts',
    base + '.tsx',
    base + '.js',
    base + '.jsx',
    base + '.mjs',
    base + '.cjs',
    base + '.vue',
    base + '.svelte',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
    path.join(base, 'index.mjs'),
    path.join(base, 'index.cjs')
  ];

  for (const attemptPath of attemptPaths) {
    try {
      const stat = fs.statSync(attemptPath);
      if (stat.isFile()) {
        return normalizeToExistingFile(attemptPath);
      }
    } catch {
      // Continue trying other paths
    }
  }
  
  return null;
}

function normalizeToExistingFile(filePath: string): string | null {
  try {
    const real = fs.realpathSync.native ? fs.realpathSync.native(filePath) : fs.realpathSync(filePath);
    return real;
  } catch {
    return null;
  }
}

async function getFileImports(filePath: string, rootPath: string): Promise<string[]> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const specs = extractImportSpecifiers(content);
    const resolvedImports: string[] = [];
    
    for (const spec of specs) {
      const resolved = resolveImportSpecifier(spec, filePath, rootPath);
      if (resolved) {
        resolvedImports.push(resolved);
      }
    }
    
    return resolvedImports;
  } catch {
    return [];
  }
}

function buildGraphPayload(
  centerPath: string, 
  dependents: string[], 
  imports: string[], 
  rootPath: string
) {
  console.log("Building graph payload for:", centerPath);
  console.log("Dependents:", dependents.length);
  console.log("Imports:", imports.length);
  
  const nodes = [];
  const edges = [];
  
  // Add center node
  const centerLabel = path.relative(rootPath, centerPath) || path.basename(centerPath);
  nodes.push({ 
    id: centerPath, 
    label: centerLabel, 
    isCenter: true,
    type: 'center'
  });
  
  // Add dependent nodes (files that import this file)
  for (const dep of dependents) {
    const depLabel = path.relative(rootPath, dep) || path.basename(dep);
    nodes.push({ 
      id: dep, 
      label: depLabel, 
      isCenter: false,
      type: 'dependent'
    });
    
    // Edge from dependent to center (dependent imports center)
    edges.push({ 
      from: dep, 
      to: centerPath,
      type: 'imports'
    });
  }
  
  // Add imported nodes (files that this file imports)
  for (const imp of imports) {
    // Don't add if already exists as a dependent
    if (!nodes.find(n => n.id === imp)) {
      const impLabel = path.relative(rootPath, imp) || path.basename(imp);
      nodes.push({ 
        id: imp, 
        label: impLabel, 
        isCenter: false,
        type: 'imported'
      });
    }
    
    // Edge from center to imported (center imports imported)
    edges.push({ 
      from: centerPath, 
      to: imp,
      type: 'imports'
    });
  }
  
  console.log("Final graph:", { nodes: nodes.length, edges: edges.length });
  return { nodes, edges };
}