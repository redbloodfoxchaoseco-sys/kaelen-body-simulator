# Datos de personaje — importación en juegos

Definiciones **completas y ejecutables** de Kaelen (basadas en ALBA), más allá de la descripción del documento de diseño: listas para importar en motores y herramientas.

## Archivos

| Archivo | Juego / destino | Uso |
|---|---|---|
| [`kaelen-universal.json`](kaelen-universal.json) | Universal | Definición maestra: identidad, stats base, pasiva, Q/W/E/R con números completos, guards anti-OP, rutas de assets. Único fuente de verdad. |
| [`lol/kaelen-champion.json`](lol/kaelen-champion.json) | League of Legends | Estructura tipo `champion.json` (stats, cooldownBurn, tooltips). Importable en sandboxes/custom-kit editors comunitarios y motores propios. |
| [`mlbb/kaelen-hero.json`](mlbb/kaelen-hero.json) | Mobile Legends: Bang Bang | Héroe completo: stats MLBB, S1/S2/Ult, build recomendada. |
| [`cyberpunk2077/kaelen_boss.yaml`](cyberpunk2077/kaelen_boss.yaml) | Cyberpunk 2077 | TweakXL tweak real: copia a `r6/tweaks/kaelen/` con TweakXL instalado y el jefe KA-EL3N aparece con stats, fases y loot. |
| [`importers/unity/KaelenImporter.cs`](importers/unity/KaelenImporter.cs) | Unity | `KaelenData.Load()` — carga el JSON universal como datos tipados. |
| [`importers/godot/kaelen_importer.gd`](importers/godot/kaelen_importer.gd) | Godot 4 | `KaelenImporter.load_data()` + helpers de stats e iconos. |

## Inicio rápido

**Unity:** copia el `.cs` a `Assets/Scripts/` y el JSON a `Assets/Resources/`, luego `var kaelen = KaelenData.Load();`

**Godot 4:** copia el `.gd` y el JSON a `res://game_data/`, luego `var kaelen = KaelenImporter.load_data()`

**Cyberpunk 2077:** con [TweakXL](https://www.nexusmods.com/cyberpunk2077/mods/4197) instalado, copia `cyberpunk2077/kaelen_boss.yaml` a `Cypunk 2077/r6/tweaks/kaelen/`.

## Reglas de balance (respetadas por los tres formatos)

- Sin CC duro — solo ralentizaciones.
- Un solo desplazamiento, corto, CD largo.
- Venteo predecible a 100 Calor (silencio autoimpuesto, el límite de 37.6 °C de ALBA).
- La ultimate exige que Kaelen permanezca dentro de la zona (Pacto: proteger coherencia).
