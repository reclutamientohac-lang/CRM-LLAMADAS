# Conexión central de AGENDA DE CITAS

## Estado de esta entrega

Código preparado y probado localmente: 31 pruebas de sincronización, concurrencia y reglas de acceso aprobadas; compilación de interfaz y funciones aprobada. **No desplegado ni autorizado en producción.** No confundir el estado de la publicación de AI Studio con el despliegue de estas funciones. Hasta la activación, se conserva la conexión anterior de sesión.

## Arquitectura

Cloud Functions de segunda generación usa la base Firestore nombrada del CRM. Los cambios de citas generan trabajos privados; el servidor crea, actualiza o cancela el mismo evento mediante identificadores estables. Cloud Scheduler recupera trabajos pendientes cada cinco minutos. Funciona sin navegadores abiertos. No importa automáticamente citas históricas que nunca se solicitaron para Calendar. Los cambios hechos directamente en Google Calendar no se importan al CRM.

La identidad de ejecución `crm-calendar-worker@project-76706253-7b54-4622-a4a.iam.gserviceaccount.com` tiene acceso a la base CRM, recepción de eventos Eventarc, invocación de sus dos funciones de eventos y permiso para generar credenciales breves de `crm-calendar-sync@project-76706253-7b54-4622-a4a.iam.gserviceaccount.com`. Esta segunda identidad no recibe roles sobre datos de Google Cloud: solo debe compartirse con ella el calendario especificado, con permiso de modificar eventos. No se crean claves JSON ni se guardan tokens en el navegador, Firestore o GitHub. No hay delegación de dominio.

## Despliegue pendiente

Abrir este repositorio en Google Cloud Shell, autenticado con una cuenta con facultad de despliegue e IAM sobre el proyecto. Revisar y ejecutar `bash scripts/deploy-calendar-central.sh`. El script comprueba la facturación existente, pide aprobación concreta de los permisos y no activa un plan de pago. Cloud Functions y Scheduler pueden generar cargos según uso.

El script despliega solo el codebase `calendar-central` y las reglas de la base nombrada; no importa datos ni modifica otras funciones. Si Firebase pide autenticación, usar `npx firebase login` y repetir el script. Confirmar en Cloud Functions que las cuatro funciones están activas y en Scheduler que existe `calendarRetry`.

Compartir **solo AGENDA DE CITAS**, ID `71d933f40940ebf6b2ddc9a8abd4326ce0a25a377eb76e8549d1cbb4a61480ad@group.calendar.google.com`, con `crm-calendar-sync@project-76706253-7b54-4622-a4a.iam.gserviceaccount.com`, permiso **Hacer cambios en eventos**. No otorgar administración del calendario ni compartir otros calendarios.

Publicar los cambios de interfaz en AI Studio después del despliegue. La región del frontend `VITE_CALENDAR_FUNCTION_REGION` debe coincidir con `CALENDAR_FUNCTION_REGION` impreso por el script; el valor por defecto es `us-central1`.

Ingresar al CRM como `reclutamientohac@gmail.com`, abrir Agenda y pulsar **Activar conexión central**. La función autenticada verifica primero que la identidad tiene permiso `writer` u `owner` sobre el calendario exacto. Solo entonces marca `settings/calendarCentral.enabled=true`. Los navegadores dejan de procesar trabajos y las reglas bloquean escrituras de sincronización de pestañas antiguas. Las telemarketing no necesitan permisos de Google Calendar.

## Verificación antes de dar por terminada la activación

Crear una cita identificada como prueba en un prospecto de prueba autorizado, cerrar la app y comprobar en Calendar su creación. Reabrir, reprogramar y comprobar que sigue siendo el mismo evento. Cancelar desde el CRM y comprobar la cancelación en Calendar. Verificar que una cuenta de telemarketing solo ve su información y no puede activar la conexión ni escribir `calendarJobs`. Revisar `lastCheckedAt` y errores de las citas. Esta prueba real aún está pendiente.

## Recuperación y alcance

Un fallo de red o de cuota se reintenta con espera creciente, hasta una hora entre intentos. Los permisos revocados se reintentan cada hora. Fechas inválidas y conflictos con eventos ajenos requieren corregir o usar Reintentar. Se comprueban los identificadores privados del evento antes de modificarlo. Los leases evitan que dos trabajadores procesen el mismo trabajo y recuperan procesos interrumpidos.

Para pausar, la función autenticada `calendarCentralControl` admite `{action:'pause'}` solo para la administradora. Una operación ya iniciada puede finalizar. Revocar el acceso del servicio al calendario detiene el envío sin borrar citas ni eventos. No borrar la cola para solucionar errores. Los campos de procesamiento son de servidor mientras esté activa la central; pausar antes de una restauración que sobrescriba dichos campos.

La cola privada no se incluye en exportaciones o extensiones de respaldo del cliente. El calendario y sus datos no se hacen públicos. La activación autoriza al servidor a procesar las operaciones ya pendientes, incluidas las cancelaciones solicitadas anteriormente.
