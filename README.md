# CRM LLAMADAS

Proyecto exportado de Google AI Studio, ampliado con las etapas 7 y 8: Reportes, Respaldo y Consulta Global. La guía de implementación está en [GUIA_ETAPAS_7_8.md](GUIA_ETAPAS_7_8.md). La validación realizada está en [VERIFICACION.md](VERIFICACION.md).

Instala con `npm ci`, inicia con `npm run dev` y compila con `npm run build`. Ejecuta `npm run lint` y `npm run test`; las pruebas de reglas y restauración usan `npm run test:rules` y requieren Java 17 o superior. Se incluye package-lock.json actualizado. No se incluye el bun.lock anterior, porque corresponde a dependencias anteriores a esta ampliación.

Antes de activar con datos reales, publica las reglas y el índice en la base correcta. La configuración original de Firebase se conserva. Consulta la guía antes de cambiarla: una base con nombre de AI Studio no equivale automáticamente a una base propia gratuita en Spark.
