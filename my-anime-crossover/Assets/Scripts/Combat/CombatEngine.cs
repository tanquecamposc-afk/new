using System;
using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    // Ejecuta los golpes por frame data (Startup → Active → Recovery) a paso fijo.
    // CharacterMovement lo usa desde su estado de ataque.
    public class CombatEngine : MonoBehaviour
    {
        [SerializeField] private HitboxManager _hitboxManager;
        [SerializeField] private HitboxData[] _lightComboChain;

        private int _comboIndex = 0;
        private float _lastAttackTime = -999f;
        private const float COMBO_WINDOW = 1.2f;

        private HitboxData _current;
        private int _frame;
        private bool _attacking;
        private bool _bufferedAttack;   // pulsación guardada durante la recuperación

        public bool IsAttacking => _attacking;
        public bool CanCancel => _attacking && _frame >= _current.startupFrames + _current.activeFrames;
        public event Action AttackFinished;

        // Pide un golpe ligero. Si ya hay uno en curso, se guarda y encadena en la recuperación.
        public bool ExecuteLightAttack()
        {
            if (_lightComboChain == null || _lightComboChain.Length == 0) return false;
            if (_attacking)
            {
                _bufferedAttack = true;
                return false;
            }
            StartAttack();
            return true;
        }

        public void CancelAttack()
        {
            _attacking = false;
            _bufferedAttack = false;
        }

        private void StartAttack()
        {
            if (Time.time - _lastAttackTime > COMBO_WINDOW)
            {
                _comboIndex = 0;
            }

            _current = _lightComboChain[_comboIndex];
            _frame = 0;
            _attacking = true;
            _bufferedAttack = false;
            _hitboxManager.BeginSwing();

            // Avanzar en la cadena de combos
            _comboIndex = (_comboIndex + 1) % _lightComboChain.Length;
            _lastAttackTime = Time.time;
        }

        // FixedUpdate a 60 Hz (Project Settings → Time → Fixed Timestep = 0.01666)
        private void FixedUpdate()
        {
            if (!_attacking) return;

            int activeStart = _current.startupFrames;
            int activeEnd = _current.startupFrames + _current.activeFrames;

            if (_frame >= activeStart && _frame < activeEnd)
            {
                _hitboxManager.CheckHitbox(_current);
            }

            _frame++;

            // El combo encadena en cuanto termina la ventana activa si había pulsación guardada
            if (_bufferedAttack && _frame >= activeEnd)
            {
                StartAttack();
                return;
            }

            if (_frame >= _current.TotalFrames)
            {
                _attacking = false;
                AttackFinished?.Invoke();
            }
        }
    }
}
