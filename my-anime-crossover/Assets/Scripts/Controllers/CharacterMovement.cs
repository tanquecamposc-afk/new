using System;
using UnityEngine;
using AnimeCrossover.Combat;
using AnimeCrossover.Controllers.States;
using AnimeCrossover.Core;
using AnimeCrossover.Core.StateMachine;

namespace AnimeCrossover.Controllers
{
    /// <summary>
    /// Cerebro del personaje jugable: une entrada, motor, combate, dash y vida a
    /// través de una máquina de estados. Toda acción pasa por un estado; ningún
    /// componente cambia de acción por su cuenta.
    /// </summary>
    [RequireComponent(typeof(CharacterMotor), typeof(CharacterDash), typeof(Health))]
    [RequireComponent(typeof(CombatEngine))]
    [DefaultExecutionOrder(-20)]   // los estados piden movimiento antes de que el motor lo aplique
    public sealed class CharacterMovement : MonoBehaviour
    {
        [Tooltip("Vacío = usa el CharacterInput de este objeto")]
        [SerializeField] private MonoBehaviour _inputSource = null;
        [SerializeField] private Animator _animator = null;

        private readonly StateMachine<CharacterStateId> _machine = new StateMachine<CharacterStateId>();
        private HitStunState _hitStun;

        private static readonly int SpeedParam = Animator.StringToHash("Speed");
        private static readonly int HitParam = Animator.StringToHash("Hit");
        private static readonly int DeadParam = Animator.StringToHash("Dead");
        private static readonly int DashParam = Animator.StringToHash("Dash");

        public ICharacterInput Controls { get; private set; }
        public CharacterMotor Motor { get; private set; }
        public CharacterDash Dash { get; private set; }
        public CombatEngine Combat { get; private set; }
        public Health Health { get; private set; }
        /// <summary>Opcional: si existe, el ataque se gira hacia el enemigo más conveniente.</summary>
        public TargetAssist Assist { get; private set; }

        public CharacterStateId StateId => _machine.CurrentId;
        public event Action<CharacterStateId, CharacterStateId> StateChanged
        {
            add => _machine.StateChanged += value;
            remove => _machine.StateChanged -= value;
        }

        private CharacterState CurrentState => (CharacterState)_machine.Current;

        private void Awake()
        {
            Motor = GetComponent<CharacterMotor>();
            Dash = GetComponent<CharacterDash>();
            Combat = GetComponent<CombatEngine>();
            Health = GetComponent<Health>();
            Assist = GetComponent<TargetAssist>();
            Controls = _inputSource as ICharacterInput ?? GetComponent<ICharacterInput>();
            if (Controls == null) Debug.LogError($"[CharacterMovement] {name} no tiene una fuente de entrada (ICharacterInput).", this);
            if (_animator == null) _animator = GetComponentInChildren<Animator>();

            _hitStun = new HitStunState(this);
            _machine.Register(CharacterStateId.Idle, new IdleState(this));
            _machine.Register(CharacterStateId.Move, new MoveState(this));
            _machine.Register(CharacterStateId.Attack, new AttackState(this));
            _machine.Register(CharacterStateId.HitStun, _hitStun);
            _machine.Register(CharacterStateId.Dash, new DashState(this));
            _machine.Register(CharacterStateId.Dead, new DeadState(this));
        }

        private void Start() => _machine.Start(CharacterStateId.Idle);

        private void OnEnable()
        {
            if (Controls != null)
            {
                Controls.AttackPressed += OnAttackPressed;
                Controls.DashPressed += OnDashPressed;
            }
            Health.Damaged += OnDamaged;
            Health.Died += OnDied;
        }

        private void OnDisable()
        {
            if (Controls != null)
            {
                Controls.AttackPressed -= OnAttackPressed;
                Controls.DashPressed -= OnDashPressed;
            }
            Health.Damaged -= OnDamaged;
            Health.Died -= OnDied;
        }

        private void Update()
        {
            _machine.Tick(Time.deltaTime);
            if (_animator != null) _animator.SetFloat(SpeedParam, Motor.PlanarVelocity.magnitude / Mathf.Max(0.01f, Motor.MoveSpeed));
        }

        private void FixedUpdate() => _machine.FixedTick(Time.fixedDeltaTime);

        public void ChangeState(CharacterStateId next) => _machine.ChangeState(next);

        /// <summary>Resucita en una posición (lo usa PlayerRespawner).</summary>
        public void Revive(Vector3 position, Quaternion rotation)
        {
            Motor.Teleport(position, rotation);
            Health.Revive();
            if (_animator != null) _animator.SetBool(DeadParam, false);
            ChangeState(CharacterStateId.Idle);
        }

        private void OnAttackPressed()
        {
            if (_machine.Current == null || !CurrentState.CanAttack) return;
            bool started = Combat.RequestLightAttack();
            if (started && StateId != CharacterStateId.Attack) ChangeState(CharacterStateId.Attack);
        }

        private void OnDashPressed()
        {
            if (_machine.Current == null || !CurrentState.CanDash) return;
            Vector3 direction = Motor.ToWorldDirection(Controls.Move);
            if (direction.sqrMagnitude < 0.01f) direction = transform.forward;
            if (!Dash.TryDash(direction)) return;
            ChangeState(CharacterStateId.Dash);
            if (_animator != null) _animator.SetTrigger(DashParam);
        }

        private void OnDamaged(DamageInfo info, float amount)
        {
            if (!Health.IsAlive) return;
            Motor.AddKnockback(info.Knockback);
            if (info.Hit.hitStunDuration > 0f)
            {
                _hitStun.SetDuration(info.Hit.hitStunDuration);
                ChangeState(CharacterStateId.HitStun);
                if (_animator != null) _animator.SetTrigger(HitParam);
            }
        }

        private void OnDied(DamageInfo info)
        {
            ChangeState(CharacterStateId.Dead);
            if (_animator != null) _animator.SetBool(DeadParam, true);
        }
    }
}
