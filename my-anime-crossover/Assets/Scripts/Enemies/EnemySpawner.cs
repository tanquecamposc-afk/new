using System.Collections.Generic;
using UnityEngine;

namespace AnimeCrossover.Enemies
{
    /// <summary>
    /// Mantiene una zona poblada reciclando enemigos: los crea al empezar
    /// (una sola vez) y, cuando uno muere y se desactiva, lo reaparece en un
    /// punto libre tras un tiempo. No hay Instantiate ni Destroy durante la partida.
    /// </summary>
    public sealed class EnemySpawner : MonoBehaviour
    {
        [SerializeField] private EnemyBrain _prefab = null;
        [SerializeField, Min(1)] private int _count = 5;
        [SerializeField] private Transform[] _spawnPoints = new Transform[0];
        [Tooltip("Si no hay puntos, aparecen al azar dentro de este radio")]
        [SerializeField, Min(0f)] private float _radius = 8f;
        [SerializeField, Min(0f)] private float _respawnDelay = 5f;
        [Tooltip("No reaparecer si el jugador está más cerca que esto")]
        [SerializeField, Min(0f)] private float _minPlayerDistance = 6f;
        [SerializeField] private string _playerTag = "Player";

        private readonly List<EnemyBrain> _enemies = new List<EnemyBrain>();
        private readonly List<float> _deadSince = new List<float>();
        private Transform _player;
        private int _nextPoint;

        private void Start()
        {
            if (_prefab == null)
            {
                Debug.LogError("[EnemySpawner] Falta el prefab del enemigo.", this);
                enabled = false;
                return;
            }
            GameObject player = string.IsNullOrEmpty(_playerTag) ? null : GameObject.FindGameObjectWithTag(_playerTag);
            if (player != null) _player = player.transform;

            for (int i = 0; i < _count; i++)
            {
                EnemyBrain enemy = Instantiate(_prefab, NextPosition(), Quaternion.Euler(0f, Random.Range(0f, 360f), 0f), transform);
                _enemies.Add(enemy);
                _deadSince.Add(-1f);
            }
        }

        private void Update()
        {
            for (int i = 0; i < _enemies.Count; i++)
            {
                EnemyBrain enemy = _enemies[i];
                if (enemy.gameObject.activeSelf) { _deadSince[i] = -1f; continue; }
                if (_deadSince[i] < 0f) _deadSince[i] = Time.time;
                if (Time.time - _deadSince[i] < _respawnDelay) continue;

                Vector3 position = NextPosition();
                if (_player != null && (position - _player.position).sqrMagnitude < _minPlayerDistance * _minPlayerDistance) continue;
                enemy.Respawn(position, Quaternion.Euler(0f, Random.Range(0f, 360f), 0f));
                _deadSince[i] = -1f;
            }
        }

        private Vector3 NextPosition()
        {
            if (_spawnPoints.Length > 0)
            {
                Transform point = _spawnPoints[_nextPoint++ % _spawnPoints.Length];
                if (point != null) return point.position;
            }
            Vector2 offset = Random.insideUnitCircle * _radius;
            return transform.position + new Vector3(offset.x, 0f, offset.y);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 0.3f, 0.3f, 0.5f);
            Gizmos.DrawWireSphere(transform.position, _radius);
        }
    }
}
