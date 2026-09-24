using System;
using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    public enum DamageResult { Applied, Killed, IgnoredDead, IgnoredInvulnerable, IgnoredFriendly }

    /// <summary>
    /// Reglas de la vida en C# puro (sin Unity): equipos, invulnerabilidad,
    /// muerte y curación. <see cref="Health"/> lo envuelve y lanza los eventos.
    /// </summary>
    public sealed class HealthModel
    {
        public float Max { get; private set; }
        public float Current { get; private set; }
        public Team Team { get; set; }
        public bool FriendlyFire { get; set; }

        public bool IsAlive => Current > 0f;
        public float Normalized => Max > 0f ? Current / Max : 0f;

        public HealthModel(float max, Team team)
        {
            SetMax(max, refill: true);
            Team = team;
        }

        public void SetMax(float max, bool refill)
        {
            Max = Math.Max(1f, max);
            Current = refill ? Max : Math.Min(Current, Max);
        }

        /// <param name="applied">Daño realmente restado (0 si se ignoró).</param>
        public DamageResult TryDamage(float amount, Team attackerTeam, bool invulnerable, out float applied)
        {
            applied = 0f;
            if (!IsAlive) return DamageResult.IgnoredDead;
            if (invulnerable) return DamageResult.IgnoredInvulnerable;
            if (!FriendlyFire && attackerTeam == Team) return DamageResult.IgnoredFriendly;

            applied = Math.Min(Current, Math.Max(0f, amount));
            Current -= applied;
            return Current <= 0f ? DamageResult.Killed : DamageResult.Applied;
        }

        /// <returns>Vida recuperada.</returns>
        public float Heal(float amount)
        {
            if (!IsAlive || amount <= 0f) return 0f;
            float before = Current;
            Current = Math.Min(Max, Current + amount);
            return Current - before;
        }

        public void Refill() => Current = Max;
    }
}
