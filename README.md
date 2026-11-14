# Kaelen · Simulador Corporal 1.0.0

Simulador de la arquitectura corporal de **Kaelen** (universo conceptual ALBA): sistema térmico, hipótesis estructural y centros simbólicos, con los datos reales del proyecto ALBA.

## Estructura
- `web/` — la app (HTML/CSS/JS puro, sin dependencias, funciona offline)
- `anatomy3d/` — **Kaelen · Anatomía 3D**: herramienta anatómica digital interactiva (Three.js vía CDN) — modelo 3D de los 19 segmentos con capas (piel · músculo · marco interno), sistemas (térmico · circulatorio · actuadores · estructural · centros simbólicos) y **Asistente ALBA** contextual. Abrir `anatomy3d/index.html`.
- `android/` — proyecto Gradle (WebView + WebViewAssetLoader, puente `KaelenSim` para guardar/copiar)
- `desktop/` — Electron (ventana nativa, menú en español)
- `character/` — diseño de personaje (retrato + iconos de habilidades) para League of Legends, Mobile Legends y Cyberpunk 2077
- `game-data/` — datos de personaje ejecutables: JSON universal, exportes LoL/MLBB/Cyberpunk 2077 (TweakXL) e importadores de Unity y Godot
- `installers/` — instaladores listos (Windows setup/portable, Android APK)

## Simulación
- **Modelo térmico de 3 regiones** (músculo · núcleo · piel) calibrado a los resultados documentados del playground ALBA:
  - Caso base (K=1000 W/K, E=0): **falla** — pico ~71 °C
  - Solo evaporación (E=6500 W): **falla** — pico ~40 °C
  - Mejorado (K=2500 W/K + E=6500 W): **pasa** — ~37 °C
- Límite de diseño: **37.6 °C** en núcleo, no más de meros minutos.
- **Vista estructural:** cadena de carga músculo → piel escamada → contactos → anclajes → marco interno, con redistribución dependiente de la deformación.
- **Centros simbólicos:** corona, mirada interna, voz, núcleo, centro solar, raíz, columna y límite de campo.

> Resultados de simulación tipo playground — no son certificación biológica ni de supervivencia.

## Compilar
- **Windows:** copiar `web/` a `desktop/web`, luego `npm i` y `npm run dist` (NSIS + portable).
- **Android:** copiar `web/` a `android/app/src/main/assets/web`, luego `gradle assembleRelease`.
  Firma (keystore rotado 2026-11): `android/kaelen-release.jks`, alias `kaelen`.
  El keystore y su contraseña **no se versionan**: exporta `KAELEN_STORE_PASS` (y opcionalmente `KAELEN_KEY_PASS`) antes de compilar. Sin ellas, Gradle genera un APK sin firmar en lugar de fallar.

## APK automático en cada release (GitHub Actions)
Al publicar un release, [.github/workflows/release-apk.yml](.github/workflows/release-apk.yml) reconstruye el APK firmado y lo adjunta al release automáticamente. Requiere estos secretos del repo:

| Secreto | Contenido |
|---|---|
| `KAELEN_KEYSTORE_B64` | `base64 -w0 kaelen-release.jks` del keystore rotado (copia privada en Google Drive) |
| `KAELEN_STORE_PASS` | Contraseña del keystore |
| `KAELEN_KEY_PASS` | Contraseña de la clave (opcional si es la misma) |

Sin los secretos, el flujo construye un APK sin firmar y lo avisa. La versión del APK toma la etiqueta del release (`v1.2.0` → `versionName 1.2.0`) y el `versionCode` es el número de commits.

## Descargas (v1.0.0)
- [Kaelen-BodySim-Setup-1.0.0.exe](installers/Kaelen-BodySim-Setup-1.0.0.exe) — Windows instalador
- [Kaelen-BodySim-1.0.0-portable.exe](installers/Kaelen-BodySim-1.0.0-portable.exe) — Windows portable
- [Kaelen-BodySim-1.0.0.apk](installers/Kaelen-BodySim-1.0.0.apk) — Android 7.0+ (API 24), firmado

## Datos ALBA usados
3.6 m · 2010 kg · 991.5 kg de músculo · 128 actuadores · 6390 W generación · 6358 W disipación · capacidad 6.7 MJ/K · área ZG 8 m² · inercia de cola 30 kg·m² · 19 segmentos corporales · 8 centros simbólicos.

Pacto: no extraer sin devolver · no imponer una forma · no esclavizar · recordar · proteger coherencia · dejar ir · no convertirse en dios · aceptar muerte de la fuente · auditar al auditor.
