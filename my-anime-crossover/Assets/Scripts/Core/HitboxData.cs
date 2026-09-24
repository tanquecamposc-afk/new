using UnityEngine;

namespace AnimeCrossover.Core
{
    public enum AttackType { Light, Heavy, Knockback, Special }

    /// <summary>
    /// Datos de un golpe: daño, reacción, caja de impacto y frame data.
    /// Es un struct serializable para poder editarlo dentro de <see cref="Data.AttackDefinition"/>.
    /// </summary>
    [System.Serializable]
    public struct HitboxData
    {
        public string attackName;
        public float damage;
        [Tooltip("Segundos que el objetivo queda paralizado")]
        public float hitStunDuration;
        [Tooltip("Empuje en espacio local del atacante (z = hacia delante)")]
        public Vector3 knockbackForce;
        public AttackType type;
        public Vector3 boxSize;
        public Vector3 boxOffset;

        [Header("Frame Data (a 60 FPS)")]
        [Min(0)] public int startupFrames;   // frames antes de que el golpe esté activo
        [Min(1)] public int activeFrames;    // frames en los que la hitbox comprueba impactos
        [Min(0)] public int recoveryFrames;  // frames de recuperación antes de poder actuar

        [Header("Impacto")]
        [Tooltip("Frames de congelación al conectar (hit stop)")]
        [Min(0)] public int hitStopFrames;

        public int TotalFrames => startupFrames + activeFrames + recoveryFrames;
    }
}
