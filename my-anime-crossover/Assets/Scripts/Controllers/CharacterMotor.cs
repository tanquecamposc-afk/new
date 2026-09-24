using UnityEngine;
using AnimeCrossover.Data;

namespace AnimeCrossover.Controllers
{
    /// <summary>
    /// Único dueño de la velocidad del Rigidbody. Los estados le piden moverse,
    /// quedarse quieto o aplicar un impulso; nadie más escribe en rigidbody.velocity.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public sealed class CharacterMotor : MonoBehaviour
    {
        [SerializeField] private CharacterStats _stats;
        [SerializeField] private Transform _cameraTransform;
        [Tooltip("Frenado del empuje recibido (por segundo)")]
        [SerializeField, Min(0f)] private float _knockbackDamping = 10f;

        private Rigidbody _rigidbody;
        private Vector3 _desiredPlanar;          // velocidad horizontal pedida este frame
        private Vector3 _externalVelocity;       // empuje de golpes, se amortigua solo
        private Vector3? _overrideVelocity;      // dash: velocidad exacta este frame
        private Vector3 _faceDirection;

        public Rigidbody Body => _rigidbody;
        public Vector3 PlanarVelocity { get { Vector3 v = _rigidbody.velocity; v.y = 0f; return v; } }
        public float MoveSpeed => _stats != null ? _stats.MoveSpeed : 7f;

        private void Awake()
        {
            _rigidbody = GetComponent<Rigidbody>();
            _rigidbody.interpolation = RigidbodyInterpolation.Interpolate;
            _rigidbody.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            _rigidbody.freezeRotation = true;
            if (_cameraTransform == null && Camera.main != null) _cameraTransform = Camera.main.transform;
        }

        /// <summary>Convierte la entrada 2D a una dirección en el plano, relativa a la cámara.</summary>
        public Vector3 ToWorldDirection(Vector2 input)
        {
            if (_cameraTransform == null) return Vector3.ClampMagnitude(new Vector3(input.x, 0f, input.y), 1f);
            Vector3 forward = Vector3.ProjectOnPlane(_cameraTransform.forward, Vector3.up).normalized;
            Vector3 right = Vector3.ProjectOnPlane(_cameraTransform.right, Vector3.up).normalized;
            return Vector3.ClampMagnitude(forward * input.y + right * input.x, 1f);
        }

        public void Move(Vector3 worldDirection, float speedScale = 1f)
        {
            _desiredPlanar = worldDirection * (MoveSpeed * speedScale);
            if (worldDirection.sqrMagnitude > 0.0001f) _faceDirection = worldDirection;
        }

        public void Stop() => _desiredPlanar = Vector3.zero;

        public void Face(Vector3 worldDirection)
        {
            worldDirection.y = 0f;
            if (worldDirection.sqrMagnitude > 0.0001f) _faceDirection = worldDirection;
        }

        public void SetVelocityOverride(Vector3 planarVelocity) => _overrideVelocity = planarVelocity;

        public void AddKnockback(Vector3 impulse)
        {
            _externalVelocity += new Vector3(impulse.x, 0f, impulse.z);
            if (impulse.y > 0f) _rigidbody.AddForce(Vector3.up * impulse.y, ForceMode.VelocityChange);
        }

        private void FixedUpdate()
        {
            float dt = Time.fixedDeltaTime;
            Vector3 velocity = _rigidbody.velocity;
            Vector3 planar = new Vector3(velocity.x, 0f, velocity.z);

            if (_overrideVelocity.HasValue)
            {
                planar = _overrideVelocity.Value;
                _overrideVelocity = null;
            }
            else
            {
                float accel = _stats != null ? _stats.Acceleration : 60f;
                planar = Vector3.MoveTowards(planar - _externalVelocity, _desiredPlanar, accel * dt) + _externalVelocity;
            }

            _externalVelocity = Vector3.MoveTowards(_externalVelocity, Vector3.zero, _knockbackDamping * dt * Mathf.Max(1f, _externalVelocity.magnitude));
            _rigidbody.velocity = new Vector3(planar.x, velocity.y, planar.z);

            if (_faceDirection.sqrMagnitude > 0.0001f)
            {
                float turn = _stats != null ? _stats.TurnSpeed : 720f;
                Quaternion look = Quaternion.LookRotation(_faceDirection, Vector3.up);
                _rigidbody.MoveRotation(Quaternion.RotateTowards(_rigidbody.rotation, look, turn * dt));
            }
        }
    }
}
