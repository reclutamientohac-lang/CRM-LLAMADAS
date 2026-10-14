# Conservación del CRM

Este repositorio contiene un CRM operativo completo. Realiza cambios incrementales dentro del alcance solicitado. Lee también AGENTS.md antes de editar.

No sustituyas App, Sidebar, CRMContext, AuthContext, tipos ni pantallas por implementaciones simplificadas. Conserva las rutas, los formularios, los historiales, la agenda, Calendar, los reportes, los respaldos, los bonos y los controles de acceso.

Antes de dar por terminado un cambio ejecuta npm run build. Este comando verifica integridad, TypeScript y pruebas antes de compilar. Revisa también las pantallas afectadas en el visor. HTTP 200 o una pantalla de inicio no prueban que todos los módulos funcionen.

Si falta un archivo, recupéralo completo desde la misma versión del repositorio. No elimines su importación ni su funcionalidad para ocultar el error. No borres ni reduzcas scripts/integrity-contract.json, scripts/check-integrity.mjs, sus pruebas o los controles prebuild/predev para conseguir una compilación exitosa. Un cambio intencional de arquitectura debe conservar la funcionalidad y actualizar explícitamente sus comprobaciones.

Conserva la configuración Firebase, la base de datos, el correo administrador y el calendario propios de este proyecto. Nunca copies esas identidades desde la otra versión. No modifiques datos, reglas, ventas, bonos ni pagos al realizar ajustes visuales.

No publiques automáticamente. Antes de publicar verifica Mi Trabajo, Pipeline, Prospectos, Agenda, Ventas y Bonos, reportes y accesos según el rol, sin guardar registros ficticios en producción. Informa qué se comprobó realmente y qué queda pendiente.
