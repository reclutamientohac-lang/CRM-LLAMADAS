import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

// Render the real screens with only their external services and unrelated
// subviews replaced. This catches the admin tool being mounted in a denied path.
async function screen(component: string, role: string, index = { ready: true, loading: false, error: '' }) {
  const admin = role === 'Administrador';
  const result = await build({
    stdin: {
      contents: `export { ${component} as default } from './src/components/${component}';`,
      resolveDir: process.cwd(),
    },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'screen-services', setup(builder) {
      builder.onResolve({ filter: /(?:context\/(?:AuthContext|CRMContext)|hooks\/usePhoneIndexStatus|\/phoneRegistry|\/UnificarPropietarios|\/CargaMasivaExcelView)$/ }, args => ({ path: args.path, namespace: 'screen-services' }));
      builder.onLoad({ filter: /.*/, namespace: 'screen-services' }, args => {
        if (args.path.endsWith('AuthContext')) return { contents: `export const useAuth = () => (${JSON.stringify({ isAdmin: admin, isSupervisor: admin || role === 'Supervisor', userProfile: { role, displayName: 'Prueba', telemarketingAgent: 'GERAL' } })});` };
        if (args.path.endsWith('CRMContext')) return { contents: `export const useCRM = () => ({ settings: {telemarketingAgents:[],tiposProspecto:[],origenes:[]}, prospectos:[],usersList:[] });` };
        if (args.path.endsWith('usePhoneIndexStatus')) return { contents: `export const usePhoneIndexStatus = () => (${JSON.stringify(index)});` };
        if (args.path.endsWith('phoneRegistry')) return { contents: 'export const preparePhoneIndex = async () => ({count:0,conflicts:[],invalid:[],applied:false});' };
        const name = args.path.endsWith('UnificarPropietarios') ? 'UnificarPropietarios' : 'CargaMasivaExcelView';
        return { contents: `export const ${name} = () => null;` };
      });
    } }],
  });
  const output = { exports: {} as any };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(
    (await import('node:module')).createRequire(import.meta.url), output, output.exports,
  );
  return renderToStaticMarkup(React.createElement(output.exports.default));
}

test('el administrador ve la preparación del índice dentro de Configuración', async () => {
  const html = await screen('ConfiguracionView', 'Administrador');
  assert.match(html, /Protección de teléfonos duplicados/);
  assert.match(html, /Verificar sin modificar/);
  assert.doesNotMatch(html, /Acceso Restringido/);
});

test('los demás roles no ven la herramienta administrativa del índice', async () => {
  for (const role of ['Telemarketing', 'Vendedor', 'Supervisor']) {
    assert.doesNotMatch(await screen('ConfiguracionView', role), /Verificar sin modificar/);
  }
});

test('el formulario bloquea el guardado e indica cómo habilitarlo cuando falta el índice', async () => {
  for (const role of ['Administrador', 'Telemarketing']) {
    const html = await screen('CargarProspectosView', role, {ready:false,loading:false,error:''});
    assert.match(html, /Registro pendiente de habilitación/);
    assert.match(html, /índice de teléfonos/);
    assert.match(html, /<button[^>]*type="submit"[^>]*\sdisabled=/);
    assert.doesNotMatch(html, /Guardando\.\.\./);
  }
});

test('el formulario espera la verificación y conserva bloqueado el guardado si la consulta falla', async () => {
  const loading = await screen('CargarProspectosView', 'Telemarketing', {ready:false,loading:true,error:''});
  assert.match(loading, /Verificando registro/);
  assert.match(loading, /<button[^>]*type="submit"[^>]*\sdisabled=/);
  const failed = await screen('CargarProspectosView', 'Telemarketing', {ready:false,loading:false,error:'No se pudo verificar la disponibilidad del registro.'});
  assert.match(failed, /No se pudo verificar la disponibilidad/);
  assert.match(failed, /<button[^>]*type="submit"[^>]*\sdisabled=/);
});

test('el formulario habilita el guardado cuando el índice está preparado', async () => {
  const html = await screen('CargarProspectosView', 'Telemarketing');
  assert.match(html, /<button[^>]*type="submit"/);
  assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]*\sdisabled=/);
  assert.doesNotMatch(html, /Registro pendiente de habilitación/);
});
