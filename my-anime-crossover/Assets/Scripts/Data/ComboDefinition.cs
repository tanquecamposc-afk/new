using UnityEngine;

namespace AnimeCrossover.Data
{
    /// <summary>
    /// Cadena de golpes que se encadenan pulsando ataque.
    /// Create → Anime Crossover → Combo.
    /// </summary>
    [CreateAssetMenu(fileName = "Combo_", menuName = "Anime Crossover/Combo", order = 1)]
    public sealed class ComboDefinition : ScriptableObject
    {
        [SerializeField] private AttackDefinition[] _chain = new AttackDefinition[0];
        [Tooltip("Segundos sin atacar tras los que el combo vuelve al primer golpe")]
        [SerializeField, Min(0.05f)] private float _comboWindow = 1.2f;

        public int Length => _chain.Length;
        public float ComboWindow => _comboWindow;
        public AttackDefinition this[int index] => _chain[index];
        public bool IsValid => _chain.Length > 0 && System.Array.TrueForAll(_chain, a => a != null);
    }
}
