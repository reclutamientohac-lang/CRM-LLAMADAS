import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-compiler-api';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parse = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const walk = (node, visit) => { visit(node); ts.forEachChild(node, child => walk(child, visit)); };
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');

export function describe(root) {
  const app = parse('App.tsx', read(root, 'src/App.tsx'));
  const routes = [];
  walk(app, node => {
    if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) return;
    const match = node.left.getText(app).match(/currentTab\s*===\s*['"]([^'"]+)['"]/);
    if (!match) return;
    walk(node.right, child => {
      if (ts.isJsxSelfClosingElement(child) || ts.isJsxOpeningElement(child)) {
        const component = child.tagName.getText(app);
        if (/^[A-Z]/.test(component)) routes.push({ tab: match[1], component });
      }
    });
  });
  const contexts = {};
  for (const file of ['src/context/CRMContext.tsx', 'src/context/AuthContext.tsx']) {
    const source = parse(file, read(root, file));
    const members = [];
    walk(source, node => {
      if (ts.isInterfaceDeclaration(node) && /ContextType$/.test(node.name.text)) {
        node.members.forEach(member => members.push(member.name?.getText(source)));
      }
    });
    const provided = [];
    walk(source, node => {
      if (!ts.isJsxAttribute(node) || node.name.getText(source) !== 'value') return;
      if (!node.parent.parent.tagName?.getText(source).endsWith('.Provider')) return;
      const expression = node.initializer?.expression;
      if (expression && ts.isObjectLiteralExpression(expression)) expression.properties.forEach(p => provided.push(p.name?.getText(source)));
    });
    contexts[file] = { members: [...new Set(members.filter(Boolean))].sort(), provided: [...new Set(provided.filter(Boolean))].sort() };
  }
  return { routes: [...new Map(routes.map(r => [r.tab + ':' + r.component, r])).values()], contexts };
}

export function checkIntegrity(root = defaultRoot) {
  const expected = JSON.parse(read(root, 'scripts/integrity-contract.json'));
  const actual = describe(root);
  const errors = [];
  for (const route of expected.routes) {
    if (!actual.routes.some(r => r.tab === route.tab && r.component === route.component)) errors.push(`Módulo desconectado: ${route.tab} -> ${route.component}`);
  }
  for (const [file, contract] of Object.entries(expected.contexts)) {
    for (const kind of ['members', 'provided']) for (const name of contract[kind]) {
      if (!actual.contexts[file]?.[kind].includes(name)) errors.push(`Contrato eliminado en ${file}: ${kind}.${name}`);
    }
  }
  for (const file of expected.requiredFiles) if (!fs.existsSync(path.join(root, file))) errors.push(`Falta archivo requerido: ${file}`);
  const scan = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { scan(full); continue; }
      if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
      const source = parse(full, fs.readFileSync(full, 'utf8'));
      walk(source, node => {
        if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) return;
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) return;
        const target = path.resolve(path.dirname(full), specifier.text);
        if (![target, ...['.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx'].map(ext => target + ext)].some(f => fs.existsSync(f))) errors.push(`Importación sin archivo: ${path.relative(root, full)} -> ${specifier.text}`);
      });
    }
  };
  scan(path.join(root, 'src'));
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkIntegrity();
  if (errors.length) {
    console.error('INTEGRIDAD DEL CRM: compilación detenida.\n' + errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Integridad del CRM verificada: módulos, contratos y archivos completos.');
}
