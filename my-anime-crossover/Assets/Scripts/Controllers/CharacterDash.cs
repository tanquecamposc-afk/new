using System;
using UnityEngine;
using AnimeCrossover.Core;
using AnimeCrossover.Data;

namespace AnimeCrossover.Controllers
{
    /// <summary>
    /// Dash con i-frames (invulnerabilidad temporal). Cuenta en frames a 60 FPS y
    /// mueve al personaje a través del CharacterMotor. Health lo consulta como
    /// IInvulnerabilitySource, así los golpes lo atraviesan durante los i-frames.
    /// </summary>
    [RequireComponent(typeof(CharacterMotor))]
    [DefaultExecutionOrder(-10)]   // antes que el motor, para que la velocidad del dash valga este frame
    public sealed class CharacterDash : MonoBehaviour, IInvulnerabilitySource
    {
        [SerializeField] private CharacterStats _stats;
        [Tooltip("Velocidad que se conserva al terminar (0-1)")]
        [SerializeField, Range(0f, 1f)] private float _exitSpeedFactor = 0.2f;

        private CharacterMotor _motor;
        private Vector3 _direction;
        private int _frame;
        private float _readyTime;

        public bool IsDashing { get; private set; }
        public bool IsInvulnerable => IsDashing && _frame < InvulnerableFrames;
        public float CooldownLeft => Mathf.Max(0f, _readyTime - Time.time);
        public bool IsReady => !IsDashing && Time.time >= _readyTime;

        public event Action DashStarted;
        public event Action DashEnded;

        private float Speed => _stats != null ? _stats.DashSpeed : 22f;
        private int Frames => _stats != null ? _stats.DashFrames : 12;
        private int InvulnerableFrames => _stats != null ? _stats.DashInvulnerableFrames : 9;
        private float Cooldown => _stats != null ? _stats.DashCooldown : 0.6f;

        private void Awake() => _motor = GetComponent<CharacterMotor>();

        public bool TryDash(Vector3 worldDirection)
        {
            if (!IsReady) return false;
            worldDirection.y = 0f;
            _direction = worldDirection.sqrMagnitude > 0.0001f ? worldDirection.normalized : transform.forward;
            _frame = 0;
            IsDashing = true;
            _readyTime = Time.time + Cooldown;
            _motor.Face(_direction);
            DashStarted?.Invoke();
            return true;
        }

        public void Cancel()
        {
            if (!IsDashing) return;
            IsDashing = false;
            DashEnded?.Invoke();
        }

        private void FixedUpdate()
        {
            if (!IsDashing) return;

            _frame++;
            bool last = _frame >= Frames;
            _motor.SetVelocityOverride(_direction * (last ? Speed * _exitSpeedFactor : Speed));
            if (last)
            {
                IsDashing = false;
                DashEnded?.Invoke();
            }
        }
    }
}
