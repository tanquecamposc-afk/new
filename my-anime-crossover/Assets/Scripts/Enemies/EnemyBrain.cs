using UnityEngine;
using AnimeCrossover.Combat;
using AnimeCrossover.Controllers;
using AnimeCrossover.Core;
using AnimeCrossover.Core.StateMachine;

namespace AnimeCrossover.Enemies
{
    public enum EnemyStateId { Idle, Chase, Attack, HitStun, Dead }

    /// <summary>
    /// IA básica de enemigo cuerpo a cuerpo con las mismas piezas que el jugador
    /// (CharacterMotor, CombatEngine, Health) y su propia máquina de estados:
    /// espera → persigue → ataca → se recupera, y reacciona a los golpes.
    /// </summary>
    [RequireComponent(typeof(CharacterMotor), typeof(CombatEngine), typeof(Health))]
    [DefaultExecutionOrder(-20)]
    public sealed class EnemyBrain : MonoBehaviour
    {
        [SerializeField] private Transform _target;
        [Tooltip("Si no hay objetivo asignado, se busca una vez por esta etiqueta")]
        [SerializeField] private string _targetTag = "Player";
        [SerializeField, Min(0f)] private float _aggroRange = 12f;
        [SerializeField, Min(0f)] private float _attackRange = 1.8f;
        [SerializeField, Min(0f)] private float _attackCooldown = 1.1f;
        [SerializeField, Range(0f, 1f)] private float _chaseSpeedScale = 0.8f;
        [SerializeField] private float _despawnDelay = 3f;

        private readonly StateMachine<EnemyStateId> _machine = new StateMachine<EnemyStateId>();
        private Health _targetHealth;
        private float _hitStunTimer;
        private float _nextAttackTime;

        public CharacterMotor Motor { get; private set; }
        public CombatEngine Combat { get; private set; }
        public Health Health { get; private set; }
        public EnemyStateId StateId => _machine.CurrentId;

        private void Awake()
        {
            Motor = GetComponent<CharacterMotor>();
            Combat = GetComponent<CombatEngine>();
            Health = GetComponent<Health>();

            _machine.Register(EnemyStateId.Idle, new Idle(this));
            _machine.Register(EnemyStateId.Chase, new Chase(this));
            _machine.Register(EnemyStateId.Attack, new Attack(this));
            _machine.Register(EnemyStateId.HitStun, new Stunned(this));
            _machine.Register(EnemyStateId.Dead, new Dead(this));
        }

        private void Start()
        {
            if (_target == null && !string.IsNullOrEmpty(_targetTag))
            {
                GameObject found = GameObject.FindGameObjectWithTag(_targetTag);
                if (found != null) _target = found.transform;
            }
            if (_target != null) _target.TryGetComponent(out _targetHealth);   // una vez, no por frame
            _machine.Start(EnemyStateId.Idle);
        }

        private void OnEnable()
        {
            Health.Damaged += OnDamaged;
            Health.Died += OnDied;
        }

        private void OnDisable()
        {
            Health.Damaged -= OnDamaged;
            Health.Died -= OnDied;
        }

        private void Update() => _machine.Tick(Time.deltaTime);
        private void FixedUpdate() => _machine.FixedTick(Time.fixedDeltaTime);

        private Vector3 ToTarget()
        {
            if (_target == null) return Vector3.zero;
            Vector3 d = _target.position - transform.position;
            d.y = 0f;
            return d;
        }

        private bool TargetAlive()
        {
            if (_target == null || !_target.gameObject.activeInHierarchy) return false;
            return _targetHealth == null || _targetHealth.IsAlive;
        }

        private void OnDamaged(DamageInfo info, float amount)
        {
            if (!Health.IsAlive) return;
            Motor.AddKnockback(info.Knockback);
            if (info.Hit.hitStunDuration <= 0f) return;
            _hitStunTimer = Mathf.Max(_hitStunTimer, info.Hit.hitStunDuration);
            _machine.ChangeState(EnemyStateId.HitStun);
        }

        private void OnDied(DamageInfo info) => _machine.ChangeState(EnemyStateId.Dead);

        /// <summary>Reaparece reciclado (lo usa EnemySpawner en vez de Instantiate).</summary>
        public void Respawn(Vector3 position, Quaternion rotation)
        {
            gameObject.SetActive(true);
            Motor.Teleport(position, rotation);
            Health.Revive();
            _hitStunTimer = 0f;
            _nextAttackTime = Time.time + _attackCooldown;
            if (_machine.Current != null) _machine.ChangeState(EnemyStateId.Idle);
        }

        // ---------------------------------------------------------------- estados

        private sealed class Idle : State
        {
            private readonly EnemyBrain _b;
            private float _checkTimer;
            public Idle(EnemyBrain b) { _b = b; }
            public override void Enter() => _b.Motor.Stop();

            public override void Tick(float dt)
            {
                _checkTimer -= dt;
                if (_checkTimer > 0f) return;
                _checkTimer = 0.25f;                                     // no hace falta mirar cada frame
                if (_b.TargetAlive() && _b.ToTarget().sqrMagnitude <= _b._aggroRange * _b._aggroRange)
                    _b._machine.ChangeState(EnemyStateId.Chase);
            }
        }

        private sealed class Chase : State
        {
            private readonly EnemyBrain _b;
            public Chase(EnemyBrain b) { _b = b; }

            public override void Tick(float dt)
            {
                if (!_b.TargetAlive()) { _b._machine.ChangeState(EnemyStateId.Idle); return; }
                Vector3 to = _b.ToTarget();
                float sq = to.sqrMagnitude;
                float leash = _b._aggroRange * 1.5f;
                if (sq > leash * leash) { _b._machine.ChangeState(EnemyStateId.Idle); return; }

                if (sq <= _b._attackRange * _b._attackRange)
                {
                    _b.Motor.Stop();
                    _b.Motor.Face(to);
                    if (Time.time >= _b._nextAttackTime) _b._machine.ChangeState(EnemyStateId.Attack);
                    return;
                }
                _b.Motor.Move(to.normalized, _b._chaseSpeedScale);
            }
        }

        private sealed class Attack : State
        {
            private readonly EnemyBrain _b;
            private bool _failed;
            public Attack(EnemyBrain b) { _b = b; }

            public override void Enter()
            {
                _b.Motor.Stop();
                _b.Motor.Face(_b.ToTarget(), snap: true);
                _b.Combat.AttackFinished += OnFinished;
                // no se puede cambiar de estado dentro de Enter: si no hay combo, se sale en Tick
                _failed = !_b.Combat.RequestLightAttack();
            }

            public override void Tick(float dt)
            {
                if (_failed) _b._machine.ChangeState(EnemyStateId.Chase);
            }

            public override void Exit()
            {
                _b.Combat.AttackFinished -= OnFinished;
                _b._nextAttackTime = Time.time + _b._attackCooldown;
            }

            public override void FixedTick(float fdt)
            {
                Vector3 lunge = _b.Combat.LungeVelocity;
                if (lunge.sqrMagnitude > 0f) _b.Motor.SetVelocityOverride(lunge);
            }

            private void OnFinished() => _b._machine.ChangeState(EnemyStateId.Chase);
        }

        private sealed class Stunned : State
        {
            private readonly EnemyBrain _b;
            public Stunned(EnemyBrain b) { _b = b; }

            public override void Enter()
            {
                _b.Combat.CancelAttack();
                _b.Motor.Stop();
            }

            public override void Exit() => _b._hitStunTimer = 0f;

            public override void Tick(float dt)
            {
                _b._hitStunTimer -= dt;
                if (_b._hitStunTimer <= 0f) _b._machine.ChangeState(EnemyStateId.Chase);
            }
        }

        private sealed class Dead : State
        {
            private readonly EnemyBrain _b;
            private float _timer;
            public Dead(EnemyBrain b) { _b = b; }

            public override void Enter()
            {
                _b.Combat.CancelAttack();
                _b.Motor.Stop();
                _timer = _b._despawnDelay;
            }

            public override void Tick(float dt)
            {
                _timer -= dt;
                if (_timer <= 0f) _b.gameObject.SetActive(false);   // un spawner con pool lo recicla
            }
        }
    }
}
