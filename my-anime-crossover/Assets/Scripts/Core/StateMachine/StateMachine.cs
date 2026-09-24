using System;
using System.Collections.Generic;

namespace AnimeCrossover.Core.StateMachine
{
    public interface IState
    {
        void Enter();
        void Exit();
        void Tick(float deltaTime);
        void FixedTick(float fixedDeltaTime);
    }

    /// <summary>Base vacía para no repetir métodos que un estado no usa.</summary>
    public abstract class State : IState
    {
        public virtual void Enter() { }
        public virtual void Exit() { }
        public virtual void Tick(float deltaTime) { }
        public virtual void FixedTick(float fixedDeltaTime) { }
    }

    /// <summary>
    /// Máquina de estados genérica indexada por un enum. Sin asignaciones por frame:
    /// los estados se registran una vez al iniciar y se reutilizan.
    /// </summary>
    public sealed class StateMachine<TId> where TId : struct, Enum
    {
        private readonly Dictionary<TId, IState> _states = new Dictionary<TId, IState>();
        private bool _changing;

        public TId CurrentId { get; private set; }
        public IState Current { get; private set; }
        public TId PreviousId { get; private set; }

        /// <summary>(anterior, nuevo)</summary>
        public event Action<TId, TId> StateChanged;

        public void Register(TId id, IState state)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));
            _states[id] = state;
        }

        public bool Has(TId id) => _states.ContainsKey(id);

        public void Start(TId initial)
        {
            if (Current != null) throw new InvalidOperationException("La máquina de estados ya está iniciada.");
            CurrentId = initial;
            PreviousId = initial;
            Current = Get(initial);
            Current.Enter();
        }

        /// <summary>Cambia de estado. Cambiar al mismo estado no hace nada salvo que se fuerce.</summary>
        public void ChangeState(TId next, bool force = false)
        {
            if (Current == null) { Start(next); return; }
            if (!force && EqualityComparer<TId>.Default.Equals(next, CurrentId)) return;
            if (_changing) throw new InvalidOperationException($"Cambio de estado a {next} dentro de Enter/Exit de {CurrentId}.");

            IState nextState = Get(next);
            _changing = true;
            try
            {
                Current.Exit();
                PreviousId = CurrentId;
                CurrentId = next;
                Current = nextState;
                Current.Enter();
            }
            finally
            {
                _changing = false;
            }
            StateChanged?.Invoke(PreviousId, CurrentId);
        }

        public void Tick(float deltaTime) => Current?.Tick(deltaTime);
        public void FixedTick(float fixedDeltaTime) => Current?.FixedTick(fixedDeltaTime);

        private IState Get(TId id)
        {
            if (!_states.TryGetValue(id, out IState state))
                throw new KeyNotFoundException($"Estado {id} no registrado.");
            return state;
        }
    }
}
