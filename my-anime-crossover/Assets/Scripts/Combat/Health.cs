using System;
using UnityEngine;
using AnimeCrossover.Core;
using AnimeCrossover.Data;

namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Vida de cualquier personaje. Es el único IDamageable: los controladores
    /// escuchan sus eventos en vez de recibir el daño directamente. Las reglas
    /// están en <see cref="HealthModel"/> (C# puro, con pruebas).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class Health : MonoBehaviour, IDamageable
    {
        [SerializeField] private Team _team = Team.Enemy;
        [SerializeField] private CharacterStats _stats = null;
        [Tooltip("Se usa si no hay CharacterStats asignado")]
        [SerializeField, Min(1f)] private float _maxHealthFallback = 100f;
        [SerializeField] private bool _friendlyFire = false;

        private HealthModel _model;
        private IInvulnerabilitySource[] _invulnerabilitySources;

        public Team Team => Model.Team;
        public float Max => Model.Max;
        public float Current => Model.Current;
        public float Normalized => Model.Normalized;
        public bool IsAlive => Model.IsAlive;

        /// <summary>(golpe, daño aplicado)</summary>
        public event Action<DamageInfo, float> Damaged;
        public event Action<float> Healed;
        public event Action<DamageInfo> Died;
        /// <summary>Vuelve a la vida (reaparición o reciclado desde un pool).</summary>
        public event Action Revived;

        // Awake no se llama en pruebas de EditMode: todo el acceso pasa por aquí.
        private HealthModel Model
        {
            get
            {
                if (_model == null)
                {
                    _model = new HealthModel(_stats != null ? _stats.MaxHealth : _maxHealthFallback, _team) { FriendlyFire = _friendlyFire };
                    _invulnerabilitySources = GetComponents<IInvulnerabilitySource>();
                }
                return _model;
            }
        }

        private void Awake() => _ = Model;

        public bool IsInvulnerable
        {
            get
            {
                _ = Model;
                for (int i = 0; i < _invulnerabilitySources.Length; i++)
                    if (_invulnerabilitySources[i].IsInvulnerable) return true;
                return false;
            }
        }

        public bool TakeDamage(in DamageInfo info) => TakeDamage(info, 1f);

        public bool TakeDamage(in DamageInfo info, float multiplier)
        {
            DamageResult result = Model.TryDamage(info.Damage * multiplier, info.AttackerTeam, IsInvulnerable, out float applied);
            if (result != DamageResult.Applied && result != DamageResult.Killed) return false;

            Damaged?.Invoke(info, applied);
            if (result == DamageResult.Killed) Died?.Invoke(info);
            return true;
        }

        public void Heal(float amount)
        {
            float gained = Model.Heal(amount);
            if (gained > 0f) Healed?.Invoke(gained);
        }

        public void ResetHealth() => Model.Refill();

        public void Revive()
        {
            bool wasDead = !Model.IsAlive;
            Model.Refill();
            if (wasDead) Revived?.Invoke();
        }

#if UNITY_EDITOR || DEVELOPMENT_BUILD
        /// <summary>Solo para pruebas: cambia el equipo sin reserializar.</summary>
        public void SetTeamForTests(Team team)
        {
            _team = team;
            Model.Team = team;
        }
#endif

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (_model == null) return;           // en juego, los cambios del inspector se aplican al momento
            _model.Team = _team;
            _model.FriendlyFire = _friendlyFire;
            _model.SetMax(_stats != null ? _stats.MaxHealth : _maxHealthFallback, refill: false);
        }
#endif
    }
}
