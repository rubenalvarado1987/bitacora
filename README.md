# Bitácora App

Aplicación multiplataforma para gestión de bitácoras, participantes, calendarios y chat interno, construida con Expo, Expo Router y Firebase.

El repositorio ya no está orientado al MVP anterior. La base actual arranca desde la especificación funcional en [docs/bitacora-historias-usuario.md](docs/bitacora-historias-usuario.md) y se está rearmando en torno a estas piezas:

- Onboarding por wizard para definir la categoría de negocio.
- Admin como primer usuario y creador de la organización.
- Catálogo configurable de plantillas por categoría.
- Base de datos y tipos preparados para perfiles, salones, planes, participantes, calendario y chat.
- Dashboard inicial como hoja de ruta funcional para las épicas.

## Estado actual

- HU-01: primer corte implementado con wizard de configuración inicial.
- Base compartida: catálogo de categorías y plantilla inicial por categoría.
- Navegación: redirección según sesión y membresía.
- Desarrollo posterior: el resto de las HU queda organizado como backlog técnico dentro de la app y en la especificación funcional.

## Instalación

```bash
npm install
npx expo install --fix
```

## Variables de entorno

La app necesita las variables `EXPO_PUBLIC_FIREBASE_*` en `.env`.

## Desarrollo local

```bash
npx expo start
```

## Estructura relevante

```
app/
  _layout.tsx                Layout raíz + AuthProvider
  login.tsx                  Inicio de sesión
  setup.tsx                  Wizard de alta inicial
  (app)/_layout.tsx          Guard de sesión y membresía
  (app)/index.tsx            Dashboard inicial / roadmap
src/
  firebase.ts                Inicialización de Firebase
  theme.ts                   Tokens visuales
  types.ts                   Tipos compartidos del dominio
  data/businessCatalog.ts    Categorías y plantillas base
  data/organizationSetup.ts  Alta de organización desde el wizard
  data/featureRoadmap.ts     Hoja de ruta de las épicas
  context/AuthContext.tsx    Sesión y membresía
firestore.rules             Reglas de seguridad
docs/bitacora-historias-usuario.md  Especificación funcional
```

## Siguientes hitos de desarrollo

1. Completar CRUD de perfiles Admin, Editor y Lector.
2. Implementar ficha técnica de participante y planes económicos.
3. Agregar salones y asignaciones por salón para la categoría Jardín Infantil.
4. Construir las plantillas de bitácora configurables por categoría.
5. Montar calendario, dashboard y chat con reglas por rol.

## Despliegue web

```bash
npm run build:web
```

## Despliegue móvil

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```
