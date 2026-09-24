using UnityEngine;

namespace AnimeCrossover.Controllers
{
    // Dash con i-frames (invulnerabilidad temporal) usando Rigidbody.
    // Se activa con Shift a través de CharacterMovement (acción "Dash" del Input System),
    // que solo lo permite desde los estados que aceptan dash.
    [RequireComponent(typeof(Rigidbody))]
    public class CharacterDash : MonoBehaviour
    {
        [SerializeField] private float _dashSpeed = 22f;
        [SerializeField] private int _dashFrames = 12;          // duración a 60 FPS
        [SerializeField] private int _invulnerableFrames = 9;   // i-frames desde el inicio
        [SerializeField] private float _cooldown = 0.6f;

        private Rigidbody _rigidbody;
        private Vector3 _direction;
        private int _frame;
        private float _readyTime;

        public bool IsDashing { get; private set; }
        public bool IsInvulnerable => IsDashing && _frame < _invulnerableFrames;
        public float CooldownLeft => Mathf.Max(0f, _readyTime - Time.time);

        private void Awake()
        {
            _rigidbody = GetComponent<Rigidbody>();
        }

        public bool TryDash(Vector3 direction)
        {
            if (IsDashing || Time.time < _readyTime) return false;
            _direction = new Vector3(direction.x, 0f, direction.z).normalized;
            if (_direction.sqrMagnitude < 0.001f) _direction = transform.forward;
            _frame = 0;
            IsDashing = true;
            _readyTime = Time.time + _cooldown;
            _rigidbody.MoveRotation(Quaternion.LookRotation(_direction, Vector3.up));
            return true;
        }

        private void FixedUpdate()
        {
            if (!IsDashing) return;

            // velocidad constante durante el dash; se frena de golpe al final
            Vector3 velocity = _direction * _dashSpeed;
            velocity.y = _rigidbody.velocity.y;
            _rigidbody.velocity = velocity;

            _frame++;
            if (_frame >= _dashFrames)
            {
                IsDashing = false;
                Vector3 stop = _rigidbody.velocity;
                stop.x *= 0.2f;
                stop.z *= 0.2f;
                _rigidbody.velocity = stop;
            }
        }
    }
}
