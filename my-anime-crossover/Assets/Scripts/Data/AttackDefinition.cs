using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Data
{
    /// <summary>
    /// Un golpe como asset: se edita y se reutiliza entre personajes sin tocar código.
    /// Create → Anime Crossover → Attack.
    /// </summary>
    [CreateAssetMenu(fileName = "Attack_", menuName = "Anime Crossover/Attack", order = 0)]
    public sealed class AttackDefinition : ScriptableObject
    {
        [SerializeField] private HitboxData _hitbox = new HitboxData
        {
            attackName = "Light 1",
            damage = 10f,
            hitStunDuration = 0.25f,
            knockbackForce = new Vector3(0f, 0f, 2f),
            type = AttackType.Light,
            boxSize = new Vector3(1.4f, 1.2f, 1.6f),
            boxOffset = new Vector3(0f, 1f, 1f),
            startupFrames = 5,
            activeFrames = 3,
            recoveryFrames = 10,
            hitStopFrames = 3,
        };

        [Header("Presentación")]
        [Tooltip("Trigger del Animator que reproduce el golpe")]
        [SerializeField] private string _animatorTrigger = "Attack1";
        [Tooltip("Clave del PoolService para el efecto de impacto")]
        [SerializeField] private string _hitVfxKey = "HitVFX";
        [Tooltip("Avance del atacante durante la preparación (m)")]
        [SerializeField, Min(0f)] private float _lungeDistance = 0.4f;

        public HitboxData Hitbox => _hitbox;
        public string AnimatorTrigger => _animatorTrigger;
        public string HitVfxKey => _hitVfxKey;
        public float LungeDistance => _lungeDistance;

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (_hitbox.activeFrames < 1) _hitbox.activeFrames = 1;
            if (string.IsNullOrEmpty(_hitbox.attackName)) _hitbox.attackName = name;
        }
#endif
    }
}
