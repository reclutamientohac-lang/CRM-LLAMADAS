# Vendedores, propietarios y telemarketing

El administrador crea o edita la cuenta en Usuarios y accesos, elige Vendedor y una telemarketing vinculada. Una cuenta de vendedor sin agente asignada no obtiene acceso. El vendedor no administra usuarios, no cambia su agente ni cambia la propiedad de los prospectos.

Los ingresos individuales y por Excel del vendedor usan su correo normalizado en propietarioEmail, el nombre de su cuenta y la telemarketing configurada por el administrador. Esos valores prevalecen sobre el formulario o el archivo. Cambiar la agente de una cuenta afecta al valor por defecto de sus próximos ingresos. La cartera existente mantiene su asignación hasta que el administrador la reasigne desde Prospectos; cambiar la cuenta no mueve silenciosamente registros históricos.

La lectura del vendedor consulta Firestore por propietarioEmail, y las gestiones, citas, resultados y ventas se leen por los IDs de esa cartera. Compartir agente o nombre no concede acceso a contactos ajenos. Las reglas del servidor impiden cambiar la identidad, la procedencia o la agente del prospecto, incluso fuera de la interfaz. El administrador puede transferir la propiedad al seleccionar la cuenta de un vendedor en Editar prospecto. Los históricos sin propietarioEmail no se vinculan automáticamente por nombre.

Los distribuidores supervisan todas las carteras; no se crean equipos ni se asignan vendedores a un distribuidor. El vendedor registra gestiones y resultados de sus propias citas. Al reportar Venta se crea una venta pendiente; no puede aprobar montos ni modificar bonos o pagos. La aprobación financiera mantiene los permisos administrativos existentes.

Reporte individual incorpora Actividad por vendedor para administrador y distribuidores, y Mi actividad y resultados para vendedores. Muestra cartera actual, ingresos por fecha de recepción, contactos cargados por el propio vendedor según creadoPor y creadoEn, gestiones, citas por fecha programada, canceladas, ventas aprobadas y pendientes, y volumen aprobado por fecha de reporte. Las ventas canceladas no suman volumen. Los contactos y eventos se deduplican por ID. El botón histórico completo elimina el filtro de fechas. La actividad histórica de agentes anteriores permanece en el resumen de la cartera actual; el reporte individual de telemarketing conserva además su filtro de agente.

La atribución por cartera utiliza el propietario actual, no una reconstrucción de propietarios pasados. La métrica de carga personal usa el autor registrado, dentro de los datos permitidos a la cuenta. Los vendedores no reciben acceso a contactos transferidos fuera de su cartera.

## Activación

Sincronizar TODOS los archivos de la rama main en AI Studio, instalar dependencias y ejecutar npm run build. Publicar firestore.rules en la base Firestore correspondiente a esta versión antes de autorizar cuentas Vendedor. El original utiliza su base nombrada y la copia personal su propia configuración: no intercambiar proyectos, administradores ni calendarios. Publicar luego la aplicación y comprobar con una cuenta de vendedor y otra de distribuidor.

Las reglas guardadas en GitHub no se publican automáticamente en Firebase. Estas modificaciones no crean usuarios ni vinculan o trasladan prospectos reales.

## Verificación

npm run build ejecuta integridad estructural, TypeScript y pruebas de reportes, pipeline y vendedor. npm run test:rules comprueba aislamiento real con Firestore Emulator, incluidas consultas de cartera, intentos de cambiar propiedad o agente, supervisión global y ventas pendientes. No usar las cuentas de prueba del emulador en producción.
