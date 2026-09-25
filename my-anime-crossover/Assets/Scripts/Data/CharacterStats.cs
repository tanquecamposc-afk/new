using UnityEngine;

namespace AnimeCrossover.Data
{
    /// <summary>
    /// Números de un personaje en un solo asset, para equilibrar sin tocar prefabs.
    /// Create → Anime Crossover → Character Stats.
    /// </summary>
    [CreateAssetMenu(fileName = "Stats_", menuName = "Anime Crossover/Character Stats", order = 2)]
    public sealed class CharacterStats : ScriptableObject
    {
        [Header("Vida")]
        [SerializeField, Min(1f)] private float _maxHealth = 100f;

        [Header("Movimiento")]
        [SerializeField, Min(0f)] private float _moveSpeed = 7f;
        [SerializeField, Min(0f)] private float _acceleration = 60f;
        [SerializeField, Min(0f)] private float _turnSpeed = 720f;

        [Header("Dash")]
        [SerializeField, Min(0f)] private float _dashSpeed = 22f;
        [SerializeField, Min(1)] private int _dashFrames = 12;
        [SerializeField, Min(0)] private int _dashInvulnerableFrames = 9;
        [SerializeField, Min(0f)] private float _dashCooldown = 0.6f;

        public float MaxHealth => _maxHealth;
        public float MoveSpeed => _moveSpeed;
        public float Acceleration => _acceleration;
        public float TurnSpeed => _turnSpeed;
        public float DashSpeed => _dashSpeed;
        public int DashFrames => _dashFrames;
        public int DashInvulnerableFrames => Mathf.Min(_dashInvulnerableFrames, _dashFrames);
        public float DashCooldown => _dashCooldown;
    }
}
