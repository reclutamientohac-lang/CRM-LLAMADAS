import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkIntegrity } from '../scripts/check-integrity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-integrity-'));
  fs.cpSync(path.join(root, 'src'), path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/integrity-contract.json'), path.join(dir, 'scripts/integrity-contract.json'));
  for (const file of ['firebase-applet-config.json']) fs.copyFileSync(path.join(root, file), path.join(dir, file));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test('CRM completo conserva todos los módulos y operaciones', () => assert.deepEqual(checkIntegrity(root), []));
test('bloquea la regresión real: App sustituida por pantalla de relleno', t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, 'src/App.tsx'), 'export default function App() { return <p>Módulo activo en el sistema.</p>; }');
  assert(checkIntegrity(dir).some(e => e.includes('Módulo desconectado: trabajo')));
});
test('bloquea una operación eliminada del proveedor aunque su interfaz permanezca', t => {
  const dir = fixture(t);
  const file = path.join(dir, 'src/context/CRMContext.tsx');
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/^\s+registrarGestion,\s*$/m, '');
  assert.notEqual(after, before);
  fs.writeFileSync(file, after);
  assert(checkIntegrity(dir).some(e => e.includes('provided.registrarGestion')));
});
test('bloquea carpeta incompleta de reportes y respaldos', t => {
  const dir = fixture(t);
  fs.unlinkSync(path.join(dir, 'src/stage78/style.css'));
  assert(checkIntegrity(dir).some(e => e.includes('src/stage78/style.css')));
});
test('bloquea componente importado cuyo archivo desapareció', t => {
  const dir = fixture(t);
  fs.unlinkSync(path.join(dir, 'src/components/MiTrabajoView.tsx'));
  assert(checkIntegrity(dir).some(e => e.includes('MiTrabajoView')));
});
