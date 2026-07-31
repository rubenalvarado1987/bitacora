# Bitácora App — Historias de Usuario y Casos de Uso

Documento de especificación funcional derivado de notas de producto, organizado en épicas para indicación al equipo de desarrollo.

**Roles del sistema:** Admin · Editor (Profesional) · Lector (Apoderado)

## Épica 1 — Onboarding y configuración inicial (Wizard)

### HU-01 — Selección de categoría de negocio
**Como** primer usuario que inicia sesión sin cuenta creada,
**quiero** pasar por un wizard de configuración inicial,
**para** definir la categoría de negocio y que la app se configure según ese rubro.

**Criterios de aceptación:**
- Si no existe un usuario registrado, al iniciar sesión se despliega automáticamente el Wizard.
- El wizard obliga a elegir una categoría de negocio antes de continuar.
- Categorías disponibles: `Jardín Infantil`, `Casa de Reposo`, `Hotel de Mascotas`, `Gym`, `Profesional a Domicilio`.
- El primer usuario que completa el wizard queda automáticamente con rol **Admin**.
- La categoría elegida determina qué módulos y plantillas de ficha se habilitan (ver Épica 5 para el caso Jardín Infantil).

**Caso de uso:**
1. Usuario nuevo abre la app → no hay sesión activa → se lanza Wizard.
2. Usuario selecciona categoría (ej. "Jardín Infantil").
3. Sistema crea la cuenta con rol Admin y guarda la categoría de negocio.
4. Sistema redirige al panel de configuración del Admin.

## Épica 2 — Gestión de usuarios y perfiles (Admin)

### HU-02 — Crear perfiles de usuario
**Como** Admin,
**quiero** crear y editar perfiles de tipo Editor, Lector y Participantes,
**para** dar acceso controlado a profesionales, apoderados y participantes.

**Criterios de aceptación:**
- El Admin tiene un módulo "Editar" desde el cual puede **Crear perfiles**.
- Tipos de perfil disponibles: `Editor`, `Lector`, `Participantes`.
- El sistema permite editar y eliminar perfiles ya creados.

### HU-03 — Perfil Editor (Profesional)
**Como** Admin,
**quiero** que los perfiles Editor representen a los profesionales del servicio,
**para** que puedan cargar información operativa de los participantes.

**Criterios de aceptación:**
- El perfil Editor requiere usuario y clave.
- El Editor tiene acceso para **cargar bitácoras** (fichas) de los participantes que tenga asignados.

### HU-04 — Perfil Lector (Apoderado)
**Como** Admin,
**quiero** que los perfiles Lector representen a los apoderados,
**para** que puedan hacer seguimiento del avance de sus participantes.

**Criterios de aceptación:**
- El perfil Lector requiere usuario y clave.
- El Lector tiene acceso de **solo lectura** para revisar el avance de sus participantes asociados.

### HU-05 — Chat entre Editores y Apoderados
**Como** usuario del sistema (Editor o Lector),
**quiero** contar con un chat integrado,
**para** comunicarme directamente según las reglas de mi rol.

**Criterios de aceptación:**
- Debe existir un módulo de chat visible para ambos roles.
- Las reglas específicas de con quién puede chatear cada rol se detallan en HU-13, HU-16 y HU-18.

## Épica 3 — Gestión de participantes (Admin)

### HU-06 — Ficha técnica del participante
**Como** Admin,
**quiero** que al crear un participante se genere una ficha técnica completa,
**para** contar con toda la información relevante antes de iniciar el servicio.

**Criterios de aceptación:**
- Al crear un participante, el sistema exige completar una ficha técnica con las secciones:
  - Datos demográficos
  - Datos personales
  - Relación parental
  - Alergias
  - Medicamentos
  - Otros
- La ficha queda asociada de forma permanente al participante y es visible según los permisos de cada rol.

### HU-07 — Asociar plan económico al participante
**Como** Admin,
**quiero** asignar un plan económico a cada participante,
**para** llevar el control comercial de cada inscripción.

**Criterios de aceptación:**
- Debe existir un módulo "Admin de Planes" donde se registran planes con: nombre, costo, periodo y vigencia.
- Al crear o editar un participante, el Admin puede asignarle uno de los planes existentes.

**Caso de uso:**
1. Admin ingresa a "Admin de Planes" y crea un plan (ej. "Jornada completa", $XX.XXX, mensual, vigencia indefinida).
2. Admin crea un participante nuevo, completa la ficha técnica.
3. Admin asigna el plan económico creado al participante.
4. El participante queda activo en el sistema, asociado a un plan.

## Épica 4 — Gestión de salones (exclusivo categoría Jardín Infantil)

### HU-08 — Crear salones
**Como** Admin de un Jardín Infantil,
**quiero** crear salones (aulas/grupos),
**para** organizar a profesionales y participantes por grupo.

**Criterios de aceptación:**
- Disponible únicamente cuando la categoría de negocio elegida en el wizard es "Jardín Infantil".
- El Admin puede crear, editar y eliminar salones.

### HU-09 — Asignar profesionales y participantes a salones
**Como** Admin,
**quiero** asignar profesionales y participantes a un salón específico,
**para** que la información y el chat queden segmentados correctamente por grupo.

**Criterios de aceptación:**
- Un salón puede tener uno o más profesionales (Editores) y uno o más participantes asignados.
- Un participante puede pertenecer a uno o varios salones.

## Épica 5 — Fichas de bitácora (plantillas de registro diario)

> Aplica principalmente a la categoría Jardín Infantil; las plantillas relevantes pueden adaptarse a otras categorías de negocio.

### HU-10 — Plantilla de Alimentación
**Como** Editor,
**quiero** registrar la alimentación del participante,
**para** informar al apoderado sobre lo consumido en el día.

**Criterios de aceptación:**
- Tipos de comida: `Desayuno`, `Almuerzo`, `Cena`, `Colaciones`.
- Cada registro debe incluir:
  - Descripción (texto)
  - Cantidad consumida, con opciones: `Menos de la mitad`, `La mitad`, `Más de la mitad`, `Todo`.

### HU-11 — Plantilla de Actividades
**Como** Editor,
**quiero** registrar las actividades realizadas por el participante,
**para** dejar constancia del desarrollo diario.

**Criterios de aceptación:**
- Tipos de actividad: `Académico`, `Recreativo`, `Grupal`, `Física`, `Extra programático`.
- Se debe poder adjuntar fotos o archivos a cada registro de actividad.

### HU-12 — Plantilla de Asistencia
**Como** Editor,
**quiero** registrar la asistencia diaria del participante,
**para** llevar el control de presencia.

**Criterios de aceptación:**
- Registro de tipo diario (presente/ausente, con fecha).

### HU-13 — Plantilla Emocional
**Como** Editor,
**quiero** registrar el estado de ánimo del participante,
**para** informar su condición emocional al apoderado.

**Criterios de aceptación:**
- Campo de estado de ánimo mediante selección de emoji.
- Campo de texto libre opcional para observaciones adicionales.

### HU-14 — Plantilla de Descanso
**Como** Editor,
**quiero** registrar la siesta del participante,
**para** informar la duración del descanso.

**Criterios de aceptación:**
- Campo de duración de la siesta.

### HU-15 — Plantilla de Higiene
**Como** Editor,
**quiero** registrar eventos de higiene del participante,
**para** informar mudas y lavado de dientes realizados.

**Criterios de aceptación:**
- Registro de mudas (cantidad/hora).
- Registro de lavado de dientes (sí/no, hora).

### HU-16 — Plantilla de Medicamentos
**Como** Editor,
**quiero** registrar la administración de medicamentos,
**para** dejar trazabilidad de dosis y evitar errores de administración.

**Criterios de aceptación:**
- Permite carga de archivos con la prescripción médica.
- Campos requeridos: nombre del medicamento, dosis, horarios, fecha de vencimiento.

### HU-17 — Plantilla Extras (formulario libre)
**Como** Editor,
**quiero** contar con un formulario de campo libre,
**para** registrar información que no calza en las plantillas predefinidas.

**Criterios de aceptación:**
- Campo de texto libre, sin estructura predefinida.

### HU-18 — Asignar una ficha a múltiples participantes
**Como** Editor,
**quiero** aplicar una misma ficha de bitácora a varios participantes o al personal a la vez,
**para** agilizar el registro cuando la información es común a un grupo.

**Criterios de aceptación:**
- Al crear una ficha, el Editor puede seleccionar múltiples participantes (o personal) como destinatarios.
- El sistema genera un registro independiente por cada destinatario seleccionado.

## Épica 6 — Calendario, dashboard y estadísticas

### HU-19 — Calendario de actividades
**Como** usuario del sistema,
**quiero** ver un calendario de actividades,
**para** visualizar la planificación por salón o de forma global.

**Criterios de aceptación:**
- El calendario permite filtrar por: `Salones` y `Global`.
- El Editor puede agregar o quitar actividades del calendario de los salones que tiene asignados.
- El Admin ve el calendario completo (todos los salones).
- El Apoderado ve solo el calendario de su(s) participante(s), en modo solo lectura.

### HU-20 — Dashboard de estadísticas (Admin)
**Como** Admin,
**quiero** un panel de estadísticas (dashboard),
**para** tener una vista consolidada del estado operativo del negocio.

**Criterios de aceptación:**
- El dashboard incluye al menos:
  - Resumen de salones
  - Asistencia
  - Calendario del día

## Épica 7 — Chat interno

### HU-21 — Chat del Admin (full acceso)
**Como** Admin,
**quiero** un chat sin restricciones,
**para** poder comunicarme con cualquier perfil del sistema.

**Criterios de aceptación:**
- El chat del Admin permite conversar con todos los perfiles (Editores y Lectores).
- Permite compartir archivos dentro de la conversación.

### HU-22 — Chat del Editor (Profesional)
**Como** Editor,
**quiero** enviar mensajes grupales o individuales,
**para** comunicarme con los apoderados de mis participantes.

**Criterios de aceptación:**
- El Editor puede enviar mensajes tanto a un apoderado individual como a un grupo.

### HU-23 — Chat del Apoderado (Lector)
**Como** Apoderado,
**quiero** poder escribir a los profesionales asociados al salón de mi participante,
**para** resolver dudas sobre su cuidado diario.

**Criterios de aceptación:**
- El Apoderado solo puede chatear con los profesionales asociados al salón o salones de su(s) participante(s).
- En la conversación, el remitente debe mostrarse siempre bajo el **nombre del salón**, nunca el nombre individual del profesional.

## Épica 8 — Funcionalidades del rol Editor (Profesional)

### HU-24 — Panel del Editor Profesional
**Como** Editor,
**quiero** un panel con mis herramientas de trabajo diario,
**para** gestionar a mis participantes de forma autónoma.

**Criterios de aceptación:**
- Puede ver el listado de participantes que tiene asignados.
- Puede ingresar y visualizar las fichas de bitácora de sus participantes.
- Puede ver el calendario de sus salones y el calendario global.
- Puede asignar una ficha de bitácora a varios participantes seleccionándolos, o al personal (ver HU-18).
- Puede agregar o quitar actividades del calendario de los salones que tiene asignados.
- Puede enviar mensajes grupales o individuales (ver HU-22).

## Épica 9 — Funcionalidades del rol Lector (Apoderado)

### HU-25 — Panel del Apoderado
**Como** Apoderado,
**quiero** un panel de solo lectura enfocado en mi(s) participante(s),
**para** hacer seguimiento de su día a día sin poder modificar información.

**Criterios de aceptación:**
- Puede ver el calendario de su participante, en modo **solo lectura**.
- Puede leer las fichas de bitácora de sus participantes y sus archivos adjuntos.
- Puede chatear con los profesionales asociados al salón(es) de su participante, bajo el nombre del salón (ver HU-23).
- No tiene permisos de edición sobre ninguna ficha, calendario o dato del participante.

## Resumen de permisos por rol

| Funcionalidad | Admin | Editor (Profesional) | Lector (Apoderado) |
|---|---|---|---|
| Crear/editar perfiles | ✅ | ❌ | ❌ |
| Crear salones | ✅ | ❌ | ❌ |
| Crear/editar planes económicos | ✅ | ❌ | ❌ |
| Crear ficha técnica de participante | ✅ | ❌ | ❌ |
| Cargar fichas de bitácora | ✅ (si aplica) | ✅ | ❌ (solo lectura) |
| Ver calendario | Global | Salones propios + global | Solo su(s) participante(s), lectura |
| Editar calendario | ✅ | ✅ (salones asignados) | ❌ |
| Dashboard de estadísticas | ✅ | ❌ | ❌ |
| Chat | Con todos los perfiles | Individual/grupal con apoderados | Con profesionales del salón (bajo nombre del salón) |

## Notas para desarrollo

- El módulo de plantillas de bitácora (Épica 5) debe diseñarse de forma **configurable**, ya que las categorías de negocio distintas a Jardín Infantil (Casa de Reposo, Hotel de Mascotas, Gym, Profesional a Domicilio) probablemente reutilicen varias plantillas (Alimentación, Medicamentos, Actividades, Asistencia) con variaciones menores — se recomienda validar con el cliente qué plantillas aplican a cada categoría antes de construir el modelo de datos definitivo.
- El campo "cantidad consumida" en Alimentación y el "estado de ánimo" en Emocional son de tipo enumerado fijo: conviene modelarlos como catálogos editables desde el backend, no hardcodeados en frontend.
- La regla de chat del Apoderado (mostrar nombre del salón, no del profesional) es una regla de negocio crítica de privacidad: debe aplicarse a nivel de backend/render del chat, no solo visualmente.