# Kaelen · Simulador Corporal 1.0.0

Simulador de la arquitectura corporal de **Kaelen** (universo conceptual ALBA): sistema térmico, hipótesis estructural y centros simbólicos, con los datos reales del proyecto ALBA.

**Sitio web:** [redbloodfoxchaoseco-sys.github.io/kaelen-body-simulator](https://redbloodfoxchaoseco-sys.github.io/kaelen-body-simulator/) — demo de Anatomía 3D y descargas de todas las apps.

## Showcase

### Kaelen · Anatomía 3D
Herramienta anatómica digital interactiva: modelo 3D de los 19 segmentos con capas (piel · músculo · marco interno), sistemas térmico · circulatorio · actuadores · estructural · centros simbólicos, casos de estudio y **Asistente ALBA** contextual.

<p>
  <a href="https://www.perplexity.ai/computer/a/kaelen-anatomia-3d-dCsUO..lQCqSo9GfcsCNYw">
    <img src="anatomy3d/assets/portrait.jpg" alt="Retrato de Kaelen" width="260" align="left" style="margin-right:16px;border-radius:8px">
  </a>
  <strong>Pruébala:</strong>
  <ul>
    <li><a href="https://www.perplexity.ai/computer/a/kaelen-anatomia-3d-dCsUO..lQCqSo9GfcsCNYw">Demo en vivo</a> — funciona en escritorio y móvil (requiere conexión)</li>
    <li><a href="anatomy3d/">Código fuente</a> — abrir <code>anatomy3d/index.html</code></li>
    <li><a href="https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases/tag/v1.2.0">Release v1.2.0 · Anatomía 3D</a></li>
  </ul>
</p>

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
Al publicar un release, [.github/workflows/release.yml](.github/workflows/release.yml) construye todas las apps (APK firmado, instaladores de Windows y zips web) y las adjunta al release automáticamente. La versión del APK toma la etiqueta del release (`v1.2.0` → `versionName 1.2.0`) y el `versionCode` es el número de commits.

### Configuración de secretos (una sola vez)
El keystore `kaelen-release.jks` (alias `kaelen`) está respaldado de forma privada en Google Drive junto a `kaelen-keystore-credentials.txt`; nunca se versiona. Para habilitar la firma automática, crea estos tres secretos en **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Contenido |
|---|---|
| `KAELEN_KEYSTORE_B64` | El keystore codificado en base64: `base64 -w0 kaelen-release.jks` |
| `KAELEN_STORE_PASS` | Contraseña del keystore (en `kaelen-keystore-credentials.txt`) |
| `KAELEN_KEY_PASS` | Contraseña de la clave (omítelo si es la misma que la del keystore) |

Con `gh` (GitHub CLI) autenticado, desde la carpeta que contiene el keystore:

```bash
# 1. Codificar el keystore (una línea, sin saltos)
base64 -w0 kaelen-release.jks > /tmp/ks.b64

# 2. Crear los secretos (pedirá el valor en cada uno)
gh secret set KAELEN_KEYSTORE_B64 < /tmp/ks.b64
gh secret set KAELEN_STORE_PASS   # pega la contraseña cuando la pida
gh secret set KAELEN_KEY_PASS    # solo si difiere de la del keystore
rm /tmp/ks.b64
```

### Verificar y reintentar
- Comprueba el estado en la pestaña **Actions** del repo.
- Sin secretos, el flujo compila un APK sin firmar, **no** lo adjunta al release y deja un aviso con estas instrucciones.
- Tras crear los secretos, publica el release normalmente; o re-ejecuta el flujo manualmente (**Run workflow**) indicando la etiqueta (p. ej. `v1.1.0`) para reconstruir y adjuntar el APK firmado de un release ya existente.

## Descargas — todas las apps

### Kaelen · BodySim (simulador corporal)
| App | Descarga | Notas |
|---|---|---|
| **Windows instalador** | [Kaelen-BodySim-Setup-1.2.0.exe](https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases/download/v1.2.0/Kaelen-BodySim-Setup-1.2.0.exe) | Windows 10+ · v1.2.0 |
| **Windows portable** | [Kaelen-BodySim-1.2.0-portable.exe](https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases/download/v1.2.0/Kaelen-BodySim-1.2.0-portable.exe) | Sin instalación · v1.2.0 |
| **Android APK** | [Kaelen-BodySim-1.2.0.apk](https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases/download/v1.2.0/Kaelen-BodySim-1.2.0.apk) | Android 7.0+ (API 24) · firmado |
| **Web offline (zip)** | [Kaelen-BodySim-web-1.2.0.zip](https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases/download/v1.2.0/Kaelen-BodySim-web-1.2.0.zip) | Descomprimir y abrir `index.html` |

Versión anterior: [release v1.0.0](https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases/tag/v1.0.0) (Setup, portable y APK 1.0.0).

### Kaelen · Anatomía 3D (herramienta anatómica)
| App | Descarga / acceso | Notas |
|---|---|---|
| **Demo en vivo** | [Demo en vivo](https://www.perplexity.ai/computer/a/kaelen-anatomia-3d-dCsUO..lQCqSo9GfcsCNYw) | Escritorio y móvil · requiere conexión |
| **Web (zip)** | [Kaelen-Anatomia3D-1.2.0.zip](https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases/download/v1.2.0/Kaelen-Anatomia3D-1.2.0.zip) | Descomprimir y abrir `index.html` |

Todas las descargas viven en la página de [Releases](https://github.com/redbloodfoxchaoseco-sys/kaelen-body-simulator/releases); cada release nuevo construye y adjunta todo automáticamente (ver [flujo Release](.github/workflows/release.yml)).

## Datos ALBA usados
3.6 m · 2010 kg · 991.5 kg de músculo · 128 actuadores · 6390 W generación · 6358 W disipación · capacidad 6.7 MJ/K · área ZG 8 m² · inercia de cola 30 kg·m² · 19 segmentos corporales · 8 centros simbólicos.

Pacto: no extraer sin devolver · no imponer una forma · no esclavizar · recordar · proteger coherencia · dejar ir · no convertirse en dios · aceptar muerte de la fuente · auditar al auditor.
