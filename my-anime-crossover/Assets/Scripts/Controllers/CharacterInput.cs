using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace AnimeCrossover.Controllers
{
    /// <summary>
    /// Traduce el New Input System a una interfaz simple (dirección + eventos).
    /// El resto del código no conoce el Input System: la IA o una repetición
    /// pueden alimentar al personaje con otra fuente que implemente lo mismo.
    /// </summary>
    public interface ICharacterInput
    {
        Vector2 Move { get; }
        event Action AttackPressed;
        event Action DashPressed;
    }

    public sealed class CharacterInput : MonoBehaviour, ICharacterInput
    {
        [SerializeField] private InputActionReference _moveAction = null;
        [SerializeField] private InputActionReference _attackAction = null;
        [SerializeField] private InputActionReference _dashAction = null;   // asignar a Shift

        public Vector2 Move { get; private set; }
        public event Action AttackPressed;
        public event Action DashPressed;

        private void OnEnable()
        {
            Enable(_moveAction);
            Enable(_attackAction, OnAttack);
            Enable(_dashAction, OnDash);
        }

        private void OnDisable()
        {
            if (_attackAction != null) _attackAction.action.performed -= OnAttack;
            if (_dashAction != null) _dashAction.action.performed -= OnDash;
            Move = Vector2.zero;
        }

        private void Update()
        {
            Move = _moveAction != null ? Vector2.ClampMagnitude(_moveAction.action.ReadValue<Vector2>(), 1f) : Vector2.zero;
        }

        private static void Enable(InputActionReference reference, Action<InputAction.CallbackContext> onPerformed = null)
        {
            if (reference == null) return;
            reference.action.Enable();
            if (onPerformed != null) reference.action.performed += onPerformed;
        }

        private void OnAttack(InputAction.CallbackContext _) => AttackPressed?.Invoke();
        private void OnDash(InputAction.CallbackContext _) => DashPressed?.Invoke();
    }
}
