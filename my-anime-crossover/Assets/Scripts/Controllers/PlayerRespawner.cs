using UnityEngine;
using AnimeCrossover.Combat;
using AnimeCrossover.Core;

namespace AnimeCrossover.Controllers
{
    /// <summary>
    /// Devuelve al jugador a su punto de control unos segundos después de morir.
    /// Sin esto, la partida se quedaba parada con el personaje en estado Dead.
    /// </summary>
    [RequireComponent(typeof(CharacterMovement), typeof(Health))]
    public sealed class PlayerRespawner : MonoBehaviour
    {
        [SerializeField] private Transform _checkpoint = null;
        [SerializeField, Min(0f)] private float _delay = 3f;

        private CharacterMovement _character;
        private Health _health;   // propio: OnEnable puede ir antes que el Awake de CharacterMovement
        private Vector3 _startPosition;
        private Quaternion _startRotation;
        private float _respawnAt = float.PositiveInfinity;

        private void Awake()
        {
            _character = GetComponent<CharacterMovement>();
            _health = GetComponent<Health>();
            _startPosition = transform.position;
            _startRotation = transform.rotation;
        }

        private void OnEnable() => _health.Died += OnDied;
        private void OnDisable() => _health.Died -= OnDied;

        /// <summary>Cambia el punto de reaparición (por ejemplo al tocar una hoguera).</summary>
        public void SetCheckpoint(Transform checkpoint) => _checkpoint = checkpoint;

        private void OnDied(DamageInfo info) => _respawnAt = Time.time + _delay;

        private void Update()
        {
            if (Time.time < _respawnAt) return;
            _respawnAt = float.PositiveInfinity;
            Vector3 position = _checkpoint != null ? _checkpoint.position : _startPosition;
            Quaternion rotation = _checkpoint != null ? _checkpoint.rotation : _startRotation;
            _character.Revive(position, rotation);
        }
    }
}
