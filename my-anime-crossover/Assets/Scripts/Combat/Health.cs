using System;
using UnityEngine;
using AnimeCrossover.Core;
using AnimeCrossover.Data;

namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Vida de cualquier personaje. Es el único IDamageable: los controladores
    /// escuchan sus eventos en vez de recibir el daño directamente.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class Health : MonoBehaviour, IDamageable
    {
        [SerializeField] private Team _team = Team.Enemy;
        [SerializeField] private CharacterStats _stats;
        [Tooltip("Se usa si no hay CharacterStats asignado")]
        [SerializeField, Min(1f)] private float _maxHealthFallback = 100f;
        [SerializeField] private bool _friendlyFire = false;

        private IInvulnerabilitySource[] _invulnerabilitySources;
        private float _current;
        private bool _initialized;

        public Team Team => _team;
        public float Max => _stats != null ? _stats.MaxHealth : _maxHealthFallback;
        public float Current { get { EnsureInitialized(); return _current; } private set => _current = value; }
        public float Normalized => Max > 0f ? Current / Max : 0f;
        public bool IsAlive => Current > 0f;

        /// <summary>(golpe, daño aplicado)</summary>
        public event Action<DamageInfo, float> Damaged;
        public event Action<float> Healed;
        public event Action<DamageInfo> Died;

        private void Awake() => EnsureInitialized();

        // Awake no se llama en pruebas de EditMode: todo el acceso pasa por aquí.
        private void EnsureInitialized()
        {
            if (_initialized) return;
            _initialized = true;
            _invulnerabilitySources = GetComponents<IInvulnerabilitySource>();
            _current = Max;
        }

        public bool IsInvulnerable
        {
            get
            {
                EnsureInitialized();
                for (int i = 0; i < _invulnerabilitySources.Length; i++)
                    if (_invulnerabilitySources[i].IsInvulnerable) return true;
                return false;
            }
        }

        public bool TakeDamage(in DamageInfo info) => TakeDamage(info, 1f);

        public bool TakeDamage(in DamageInfo info, float multiplier)
        {
            if (!IsAlive || IsInvulnerable) return false;
            if (!_friendlyFire && info.AttackerTeam == _team) return false;

            float amount = Mathf.Max(0f, info.Damage * multiplier);
            Current = Mathf.Max(0f, Current - amount);
            Damaged?.Invoke(info, amount);
            if (Current <= 0f) Died?.Invoke(info);
            return true;
        }

        public void Heal(float amount)
        {
            if (!IsAlive || amount <= 0f) return;
            float before = Current;
            Current = Mathf.Min(Max, Current + amount);
            if (Current > before) Healed?.Invoke(Current - before);
        }

        public void ResetHealth() { EnsureInitialized(); _current = Max; }

#if UNITY_EDITOR || DEVELOPMENT_BUILD
        /// <summary>Solo para pruebas: cambia el equipo sin reserializar.</summary>
        public void SetTeamForTests(Team team) => _team = team;
#endif
    }
}
