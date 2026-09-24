using UnityEngine;

namespace AnimeCrossover.Core
{
    public enum AttackType { Light, Heavy, Knockback, Special }

    [System.Serializable]
    public struct HitboxData
    {
        public string attackName;
        public float damage;
        public float hitStunDuration; // Tiempo que el enemigo queda paralizado
        public Vector3 knockbackForce;
        public AttackType type;
        public Vector3 boxSize;
        public Vector3 boxOffset;

        [Header("Frame Data (a 60 FPS)")]
        public int startupFrames;   // frames antes de que el golpe esté activo
        public int activeFrames;    // frames en los que la hitbox comprueba impactos
        public int recoveryFrames;  // frames de recuperación antes de poder actuar

        public int TotalFrames => startupFrames + activeFrames + recoveryFrames;
    }
}
