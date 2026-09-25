// Stub con las mismas firmas que com.unity.inputsystem 1.x, solo para compilar fuera de Unity.
using System;
namespace UnityEngine.InputSystem
{
    public sealed class InputAction
    {
        public struct CallbackContext
        {
            public InputAction action => null;
            public TValue ReadValue<TValue>() where TValue : struct => default;
        }
        public event Action<CallbackContext> started;
        public event Action<CallbackContext> performed;
        public event Action<CallbackContext> canceled;
        public void Enable() { }
        public void Disable() { }
        public bool enabled => false;
        public TValue ReadValue<TValue>() where TValue : struct => default;
        public bool WasPressedThisFrame() => false;
        internal void Touch() { started?.Invoke(default); performed?.Invoke(default); canceled?.Invoke(default); }
    }
    public class InputActionReference : ScriptableObject
    {
        public InputAction action => null;
    }
}
