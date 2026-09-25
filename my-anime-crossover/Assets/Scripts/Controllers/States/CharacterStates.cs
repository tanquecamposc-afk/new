using UnityEngine;
using AnimeCrossover.Core.StateMachine;

namespace AnimeCrossover.Controllers.States
{
    public enum CharacterStateId { Idle, Move, Attack, HitStun, Dash, Dead }

    /// <summary>Qué acepta cada estado. CharacterMovement consulta esto antes de actuar.</summary>
    public abstract class CharacterState : State
    {
        protected readonly CharacterMovement Owner;
        protected CharacterState(CharacterMovement owner) { Owner = owner; }

        public virtual bool CanMove => false;
        public virtual bool CanAttack => false;
        public virtual bool CanDash => false;
    }

    public sealed class IdleState : CharacterState
    {
        public IdleState(CharacterMovement owner) : base(owner) { }
        public override bool CanMove => true;
        public override bool CanAttack => true;
        public override bool CanDash => true;

        public override void Enter() => Owner.Motor.Stop();

        public override void Tick(float deltaTime)
        {
            if (Owner.Controls.Move.sqrMagnitude > 0.01f) Owner.ChangeState(CharacterStateId.Move);
        }
    }

    public sealed class MoveState : CharacterState
    {
        public MoveState(CharacterMovement owner) : base(owner) { }
        public override bool CanMove => true;
        public override bool CanAttack => true;
        public override bool CanDash => true;

        public override void Tick(float deltaTime)
        {
            Vector2 input = Owner.Controls.Move;
            if (input.sqrMagnitude <= 0.01f) { Owner.ChangeState(CharacterStateId.Idle); return; }
            Owner.Motor.Move(Owner.Motor.ToWorldDirection(input));
        }
    }

    public sealed class AttackState : CharacterState
    {
        public AttackState(CharacterMovement owner) : base(owner) { }
        public override bool CanAttack => true;                       // el CombatEngine lo guarda en el buffer
        public override bool CanDash => Owner.Combat.CanCancel;        // dash-cancel solo en la recuperación

        public override void Enter()
        {
            Owner.Motor.Stop();
            // girar hacia donde apunta el jugador; con TargetAssist, hacia el enemigo más conveniente
            Vector3 aim = Owner.Motor.ToWorldDirection(Owner.Controls.Move);
            if (Owner.Assist != null && Owner.Assist.TryFindTarget(aim, out Vector3 toTarget)) aim = toTarget;
            if (aim.sqrMagnitude > 0.01f) Owner.Motor.Face(aim, snap: true);
            Owner.Combat.AttackFinished += OnFinished;
        }

        public override void Exit() => Owner.Combat.AttackFinished -= OnFinished;

        public override void FixedTick(float fixedDeltaTime)
        {
            Vector3 lunge = Owner.Combat.LungeVelocity;
            if (lunge.sqrMagnitude > 0f) Owner.Motor.SetVelocityOverride(lunge);
        }

        private void OnFinished() => Owner.ChangeState(Owner.Controls.Move.sqrMagnitude > 0.01f ? CharacterStateId.Move : CharacterStateId.Idle);
    }

    public sealed class HitStunState : CharacterState
    {
        private float _timer;
        public HitStunState(CharacterMovement owner) : base(owner) { }

        public void SetDuration(float seconds) => _timer = Mathf.Max(_timer, seconds);

        public override void Enter()
        {
            Owner.Combat.CancelAttack();
            Owner.Dash.Cancel();          // un golpe tras los i-frames corta el dash
            Owner.Motor.Stop();
        }

        public override void Exit() => _timer = 0f;

        public override void Tick(float deltaTime)
        {
            _timer -= deltaTime;
            if (_timer <= 0f) Owner.ChangeState(CharacterStateId.Idle);
        }
    }

    public sealed class DashState : CharacterState
    {
        public DashState(CharacterMovement owner) : base(owner) { }

        public override void Enter()
        {
            Owner.Combat.CancelAttack();
            Owner.Dash.DashEnded += OnEnded;
        }

        public override void Exit() => Owner.Dash.DashEnded -= OnEnded;

        private void OnEnded() => Owner.ChangeState(Owner.Controls.Move.sqrMagnitude > 0.01f ? CharacterStateId.Move : CharacterStateId.Idle);
    }

    public sealed class DeadState : CharacterState
    {
        public DeadState(CharacterMovement owner) : base(owner) { }

        public override void Enter()
        {
            Owner.Combat.CancelAttack();
            Owner.Dash.Cancel();
            Owner.Motor.Stop();
        }
    }
}
