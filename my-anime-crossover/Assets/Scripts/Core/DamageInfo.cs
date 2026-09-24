using UnityEngine;

namespace AnimeCrossover.Core
{
    public enum Team { Player, Enemy, Neutral }

    /// <summary>
    /// Todo lo que necesita saber quien recibe un golpe. Se pasa por <c>in</c>
    /// para no copiar el struct en cada impacto.
    /// </summary>
    public readonly struct DamageInfo
    {
        public readonly HitboxData Hit;
        public readonly GameObject Attacker;
        public readonly Team AttackerTeam;
        public readonly Vector3 HitPoint;
        public readonly Vector3 Knockback;   // ya en espacio de mundo

        public DamageInfo(in HitboxData hit, GameObject attacker, Team attackerTeam, Vector3 hitPoint, Vector3 knockback)
        {
            Hit = hit;
            Attacker = attacker;
            AttackerTeam = attackerTeam;
            HitPoint = hitPoint;
            Knockback = knockback;
        }

        public float Damage => Hit.damage;
    }

    public interface IDamageable
    {
        Team Team { get; }
        bool IsAlive { get; }
        /// <returns>true si el golpe se aplicó (no estaba muerto ni invulnerable).</returns>
        bool TakeDamage(in DamageInfo info);
    }

    /// <summary>Cualquier componente que pueda volver invulnerable al personaje (dash, esquiva, cinemáticas).</summary>
    public interface IInvulnerabilitySource
    {
        bool IsInvulnerable { get; }
    }
}
