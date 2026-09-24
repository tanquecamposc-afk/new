using System;
using UnityEngine;
using AnimeCrossover.Core;
using AnimeCrossover.Core.Pooling;
using AnimeCrossover.Data;

namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Ejecuta el combo por frame data en FixedUpdate. Guarda la pulsación durante
    /// el golpe (input buffer) y encadena el siguiente al terminar la ventana activa.
    /// Al conectar congela el golpe (hit stop) y lanza el VFX desde el pool.
    /// </summary>
    [RequireComponent(typeof(HitboxManager))]
    public sealed class CombatEngine : MonoBehaviour
    {
        [SerializeField] private ComboDefinition _lightCombo;
        [SerializeField] private Animator _animator;
        [Tooltip("Frames que se guarda una pulsación de ataque")]
        [SerializeField, Min(0)] private int _inputBufferFrames = 12;

        private HitboxManager _hitboxManager;
        private readonly AttackTimeline _timeline = new AttackTimeline();
        private AttackDefinition _current;
        private int _comboIndex;
        private float _lastAttackTime = float.NegativeInfinity;
        private int _bufferedFrames;

        public bool IsAttacking => _timeline.IsRunning;
        public bool CanCancel => _timeline.IsCancelable;
        public AttackPhase Phase => _timeline.Phase;
        public AttackDefinition CurrentAttack => _current;
        public int ComboStep => _comboIndex;

        public event Action<AttackDefinition> AttackStarted;
        public event Action AttackFinished;
        public event Action<DamageInfo> HitLanded;

        private void Awake()
        {
            _hitboxManager = GetComponent<HitboxManager>();
            if (_animator == null) _animator = GetComponentInChildren<Animator>();
        }

        private void OnEnable() => _hitboxManager.HitLanded += OnHitLanded;
        private void OnDisable() => _hitboxManager.HitLanded -= OnHitLanded;

        /// <summary>Pide un golpe ligero. Si ya hay uno en curso se guarda en el buffer.</summary>
        public bool RequestLightAttack()
        {
            if (_lightCombo == null || !_lightCombo.IsValid) return false;
            if (_timeline.IsRunning)
            {
                _bufferedFrames = _inputBufferFrames;
                return false;
            }
            StartNextAttack();
            return true;
        }

        public void CancelAttack()
        {
            bool wasRunning = _timeline.IsRunning;
            _timeline.Stop();
            _bufferedFrames = 0;
            if (_animator != null) _animator.speed = 1f;
            if (wasRunning) AttackFinished?.Invoke();
        }

        /// <summary>Velocidad de avance durante la preparación, para que el motor la aplique.</summary>
        public Vector3 LungeVelocity
        {
            get
            {
                if (_current == null || _timeline.Phase != AttackPhase.Startup) return Vector3.zero;
                int startup = Mathf.Max(1, _current.Hitbox.startupFrames);
                return transform.forward * (_current.LungeDistance / FrameTime.ToSeconds(startup));
            }
        }

        private void StartNextAttack()
        {
            if (Time.time - _lastAttackTime > _lightCombo.ComboWindow) _comboIndex = 0;

            _current = _lightCombo[_comboIndex];
            _comboIndex = (_comboIndex + 1) % _lightCombo.Length;
            _lastAttackTime = Time.time;
            _bufferedFrames = 0;

            HitboxData hitbox = _current.Hitbox;
            _timeline.Begin(hitbox);
            _hitboxManager.BeginSwing();
            if (_animator != null && !string.IsNullOrEmpty(_current.AnimatorTrigger))
                _animator.SetTrigger(_current.AnimatorTrigger);
            AttackStarted?.Invoke(_current);
        }

        private void FixedUpdate()
        {
            if (!_timeline.IsRunning) return;

            bool frozen = _timeline.IsFrozen;
            HitboxData data = _timeline.Data;
            AttackPhase phase = _timeline.Step();
            if (_animator != null) _animator.speed = _timeline.IsFrozen ? 0f : 1f;
            if (frozen) return;

            if (phase == AttackPhase.Active) _hitboxManager.CheckHitbox(data);
            if (_bufferedFrames > 0) _bufferedFrames--;

            // encadenar en cuanto se puede cancelar y hay pulsación guardada
            if (_bufferedFrames > 0 && _timeline.IsCancelable)
            {
                StartNextAttack();
                return;
            }

            if (!_timeline.IsRunning)
            {
                if (_animator != null) _animator.speed = 1f;
                AttackFinished?.Invoke();
            }
        }

        private void OnHitLanded(DamageInfo info)
        {
            _timeline.Freeze(info.Hit.hitStopFrames);
            if (_current != null) PoolService.Spawn(_current.HitVfxKey, info.HitPoint, Quaternion.LookRotation(-transform.forward));
            HitLanded?.Invoke(info);
        }
    }
}
