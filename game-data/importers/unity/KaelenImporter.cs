// Kaelen — Unity importer
// Carga game-data/kaelen-universal.json y lo expone como ScriptableObjects.
// Uso: copia este archivo a Assets/Scripts/, y el JSON a Assets/Resources/.
// Luego: var kaelen = KaelenData.Load(); // Resources.Load<TextAsset>("kaelen-universal")

using System.Collections.Generic;
using UnityEngine;

public class KaelenImporter
{
    [System.Serializable]
    public class KaelenData
    {
        public string id, name, title;
        public string[] role;
        public string resource;
        public BaseStats base_stats;
        public Passive passive;
        public Abilities abilities;
        public Assets assets;

        [System.Serializable]
        public class BaseStats
        {
            public float hp, hp_per_level, attack_damage, ad_per_level;
            public float attack_speed, armor, armor_per_level;
            public float magic_resist, mr_per_level, movement_speed, attack_range;
        }

        [System.Serializable]
        public class Passive
        {
            public string name;
            public HeatResource resource;
            [System.Serializable]
            public class HeatResource
            {
                public int min, max, gain_per_ability, gain_per_basic_attack;
                public float decay_per_second_out_of_combat;
            }
        }

        [System.Serializable]
        public class Abilities
        {
            public Ability q, w, e, r;
        }

        [System.Serializable]
        public class Ability
        {
            public string id, name, slot, description;
            public float[] cooldown;
            public Damage damage;
            [System.Serializable]
            public class Damage
            {
                public float[] magic;
                public float ap_ratio;
            }
        }

        [System.Serializable]
        public class Assets
        {
            public string portrait, passive_icon, q_icon, w_icon, e_icon, r_icon;
        }

        public static KaelenData Load()
        {
            var txt = Resources.Load<TextAsset>("kaelen-universal");
            if (txt == null) { Debug.LogError("kaelen-universal.json no está en Assets/Resources"); return null; }
            var data = JsonUtility.FromJson<KaelenData>(txt.text);
            // rutas de assets relativas al JSON: resuélvelas contra Assets/StreamingAssets/
            return data;
        }

        public float HPAtLevel(int level) => base_stats.hp + base_stats.hp_per_level * (level - 1);
    }
}
