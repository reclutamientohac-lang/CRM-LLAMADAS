# Pipeline de contactos

El menú Pipeline muestra seis etapas exclusivas: Sin llamar, 1 llamada, 2 llamadas, 3 llamadas o más, Con cita y Con venta. Se calcula en lectura a partir de los prospectos, gestiones, citas, ventas y resultados existentes. No escribe estados ni modifica montos o bonos.

La prioridad es venta, cita y después número de llamadas. Todas las citas cuentan, históricas y actuales, incluidas las canceladas y reprogramadas. Las ventas aprobadas o pendientes cuentan; las ventas canceladas no. Un resultado histórico Venta cuenta cuando todavía no existe el documento de venta correspondiente. Venta futura no cuenta como venta.

El contador de llamadas utiliza el mayor de intentos guardados y la suma de intentosHistoricos más gestiones de llamada únicas. Esto evita sumar dos veces el histórico ya incluido en intentos. Los prospectos se cuentan por ID; varios eventos del mismo contacto no crean varias tarjetas. No se fusionan automáticamente personas con IDs diferentes.

Cada telemarketing solo ve su cartera actualmente asignada. Sin una agente vinculada, la vista queda vacía. La administración puede filtrar por agente. La original conserva los roles globales existentes de supervisor y distribuidor; la copia personal conserva su política de acceso propia. El pipeline utiliza las suscripciones existentes, sin cambios a reglas ni nuevos permisos de base de datos.

Se incluyen archivados inicialmente; el filtro permite ocultarlos. Se puede buscar por nombre, teléfono, propietario o ciudad, abrir la ficha desde cualquier tarjeta y cargar más contactos en cada etapa. El porcentaje de ventas representa contactos con venta sobre los contactos visibles, no ventas sobre llamadas. La búsqueda y los filtros también afectan los contadores.

Comprobación: npm run lint, npm test, npm run test:pipeline y npm run build. Las ocho pruebas del pipeline verifican clasificación exclusiva, conteos históricos, citas de cualquier fecha/estado, cancelaciones, resultados históricos, asignación actual, registros duplicados y ausencia de escrituras.

Después de traer los cambios de GitHub a AI Studio, recargar la vista previa y abrir Pipeline. No es necesario volver a publicar las reglas de Firebase por este cambio.
