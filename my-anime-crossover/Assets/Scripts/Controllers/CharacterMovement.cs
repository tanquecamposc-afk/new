using UnityEngine;
using UnityEngine.InputSystem;
using AnimeCrossover.Combat;
using AnimeCrossover.Core;

namespace AnimeCrossover.Controllers
{
    public enum CharacterStateId { Idle, Move, Attack, HitStun, Dash }

    // Patrón State: cada acción del personaje es un estado que decide qué
    // entradas acepta y a qué estado puede pasar. Nada cambia de acción por fuera.
    public abstract class CharacterState
    {
        protected readonly CharacterMovement Owner;
        protected CharacterState(CharacterMovement owner) { Owner = owner; }
        public virtual void Enter() { }
        public virtual void Exit() { }
        public virtual void Tick(float dt) { }
        public virtual bool CanAttack => false;
        public virtual bool CanDash => false;
        public virtual bool CanMove => false;
    }

    public class IdleState : CharacterState
    {
        public IdleState(CharacterMovement o) : base(o) { }
        public override bool CanAttack => true;
        public override bool CanDash => true;
        public override bool CanMove => true;
        public override void Tick(float dt)
        {
            if (Owner.MoveInput.sqrMagnitude > 0.01f) Owner.ChangeState(CharacterStateId.Move);
        }
    }

    public class MoveState : CharacterState
    {
        public MoveState(CharacterMovement o) : base(o) { }
        public override bool CanAttack => true;
        public override bool CanDash => true;
        public override bool CanMove => true;
        public override void Tick(float dt)
        {
            if (Owner.MoveInput.sqrMagnitude <= 0.01f) Owner.ChangeState(CharacterStateId.Idle);
        }
    }

    public class AttackState : CharacterState
    {
        public AttackState(CharacterMovement o) : base(o) { }
        public override bool CanAttack => true;               // el CombatEngine lo guarda como buffer
        public override bool CanDash => Owner.Combat.CanCancel; // dash-cancel solo en la recuperación
        public override void Enter() { Owner.Combat.AttackFinished += OnFinished; }
        public override void Exit() { Owner.Combat.AttackFinished -= OnFinished; }
        private void OnFinished() { Owner.ChangeState(CharacterStateId.Idle); }
    }

    public class HitStunState : CharacterState
    {
        private float _timer;
        public HitStunState(CharacterMovement o) : base(o) { }
        public void SetDuration(float seconds) { _timer = seconds; }
        public override void Enter() { Owner.Combat.CancelAttack(); }
        public override void Tick(float dt)
        {
            _timer -= dt;
            if (_timer <= 0f) Owner.ChangeState(CharacterStateId.Idle);
        }
    }

    public class DashState : CharacterState
    {
        public DashState(CharacterMovement o) : base(o) { }
        public override void Enter() { Owner.Combat.CancelAttack(); }
        public override void Tick(float dt)
        {
            if (!Owner.Dash.IsDashing) Owner.ChangeState(CharacterStateId.Idle);
        }
    }

    [RequireComponent(typeof(Rigidbody))]
    public class CharacterMovement : MonoBehaviour, IDamageable
    {
        [Header("Movimiento")]
        [SerializeField] private float _moveSpeed = 7f;
        [SerializeField] private float _turnSpeed = 720f;
        [SerializeField] private Transform _cameraTransform;

        [Header("Referencias")]
        [SerializeField] private CombatEngine _combat;
        [SerializeField] private CharacterDash _dash;

        [Header("Input System")]
        [SerializeField] private InputActionReference _moveAction;
        [SerializeField] private InputActionReference _attackAction;
        [SerializeField] private InputActionReference _dashAction;

        private Rigidbody _rigidbody;
        private CharacterState _state;
        private IdleState _idle;
        private MoveState _move;
        private AttackState _attack;
        private HitStunState _hitStun;
        private DashState _dashState;

        public Vector2 MoveInput { get; private set; }
        public CharacterStateId StateId { get; private set; }
        public CombatEngine Combat => _combat;
        public CharacterDash Dash => _dash;

        private void Awake()
        {
            _rigidbody = GetComponent<Rigidbody>();
            _rigidbody.interpolation = RigidbodyInterpolation.Interpolate;
            _rigidbody.freezeRotation = true;
            if (_combat == null) _combat = GetComponent<CombatEngine>();
            if (_dash == null) _dash = GetComponent<CharacterDash>();
            if (_cameraTransform == null && Camera.main != null) _cameraTransform = Camera.main.transform;

            _idle = new IdleState(this);
            _move = new MoveState(this);
            _attack = new AttackState(this);
            _hitStun = new HitStunState(this);
            _dashState = new DashState(this);
            _state = _idle;
            StateId = CharacterStateId.Idle;
            _state.Enter();
        }

        private void OnEnable()
        {
            _moveAction.action.Enable();
            _attackAction.action.Enable();
            _dashAction.action.Enable();
            _attackAction.action.performed += OnAttack;
            _dashAction.action.performed += OnDash;
        }

        private void OnDisable()
        {
            _attackAction.action.performed -= OnAttack;
            _dashAction.action.performed -= OnDash;
        }

        private void Update()
        {
            MoveInput = _moveAction.action.ReadValue<Vector2>();
            _state.Tick(Time.deltaTime);
        }

        private void FixedUpdate()
        {
            if (StateId == CharacterStateId.Dash) return;   // el dash controla la velocidad

            Vector3 velocity = _rigidbody.velocity;
            if (_state.CanMove)
            {
                Vector3 dir = CameraRelative(MoveInput);
                velocity.x = dir.x * _moveSpeed;
                velocity.z = dir.z * _moveSpeed;
                if (dir.sqrMagnitude > 0.001f)
                {
                    Quaternion look = Quaternion.LookRotation(dir, Vector3.up);
                    _rigidbody.MoveRotation(Quaternion.RotateTowards(_rigidbody.rotation, look, _turnSpeed * Time.fixedDeltaTime));
                }
            }
            else
            {
                velocity.x = 0f;
                velocity.z = 0f;
            }
            _rigidbody.velocity = velocity;
        }

        public Vector3 CameraRelative(Vector2 input)
        {
            if (_cameraTransform == null) return new Vector3(input.x, 0f, input.y);
            Vector3 forward = Vector3.ProjectOnPlane(_cameraTransform.forward, Vector3.up).normalized;
            Vector3 right = Vector3.ProjectOnPlane(_cameraTransform.right, Vector3.up).normalized;
            Vector3 dir = forward * input.y + right * input.x;
            return dir.sqrMagnitude > 1f ? dir.normalized : dir;
        }

        public void ChangeState(CharacterStateId next)
        {
            if (next == StateId) return;
            _state.Exit();
            StateId = next;
            _state = next switch
            {
                CharacterStateId.Move => _move,
                CharacterStateId.Attack => _attack,
                CharacterStateId.HitStun => _hitStun,
                CharacterStateId.Dash => _dashState,
                _ => _idle,
            };
            _state.Enter();
        }

        private void OnAttack(InputAction.CallbackContext ctx)
        {
            if (!_state.CanAttack) return;
            _combat.ExecuteLightAttack();
            if (StateId != CharacterStateId.Attack) ChangeState(CharacterStateId.Attack);
        }

        private void OnDash(InputAction.CallbackContext ctx)
        {
            if (!_state.CanDash || _dash == null) return;
            Vector3 dir = CameraRelative(MoveInput);
            if (dir.sqrMagnitude < 0.01f) dir = transform.forward;
            if (_dash.TryDash(dir)) ChangeState(CharacterStateId.Dash);
        }

        // IDamageable: el golpe interrumpe cualquier acción salvo el dash con i-frames
        public void TakeDamage(HitboxData data)
        {
            if (_dash != null && _dash.IsInvulnerable) return;
            _hitStun.SetDuration(data.hitStunDuration);
            ChangeState(CharacterStateId.HitStun);
            _rigidbody.AddForce(transform.rotation * data.knockbackForce, ForceMode.VelocityChange);
            // aquí restaría vida el componente de salud del personaje
        }
    }
}
