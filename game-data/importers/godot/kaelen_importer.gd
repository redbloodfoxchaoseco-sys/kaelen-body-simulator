# Kaelen — Godot 4 importer
# Carga game-data/kaelen-universal.json y lo expone como un diccionario tipado.
# Uso: copia este script y el JSON a res://game_data/
#   var kaelen = KaelenImporter.load_data()
#   var hp_lvl5 = KaelenImporter.hp_at_level(kaelen, 5)

class_name KaelenImporter

const DATA_PATH := "res://game_data/kaelen-universal.json"

static func load_data(path: String = DATA_PATH) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("Kaelen: no se encontró %s — copia game-data/kaelen-universal.json" % path)
		return {}
	var txt := FileAccess.get_file_as_string(path)
	var data: Dictionary = JSON.parse_string(txt)
	if data.is_empty():
		push_error("Kaelen: JSON inválido en %s" % path)
	return data

static func hp_at_level(data: Dictionary, level: int) -> float:
	var s: Dictionary = data.get("base_stats", {})
	return float(s.get("hp", 0.0)) + float(s.get("hp_per_level", 0.0)) * float(level - 1)

static func icon_path(data: Dictionary, slot: String) -> String:
	# slot: "portrait", "passive_icon", "q_icon", ...
	var assets: Dictionary = data.get("assets", {})
	var rel: String = assets.get(slot, "")
	return rel if rel.is_empty() else "res://game_data/" + rel.replace("../", "")
