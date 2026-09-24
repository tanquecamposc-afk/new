using System.Collections.Generic;
using UnityEngine;

namespace AnimeCrossover.Core.Pooling
{
    /// <summary>
    /// Registro de pools por clave ("HitVFX", "SlashTrail"…). Se configura en el
    /// inspector de la escena y crea todos los pools en Awake.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public sealed class PoolService : MonoBehaviour
    {
        [System.Serializable]
        private struct PoolEntry
        {
            public string key;
            public GameObject prefab;
            [Min(1)] public int prewarm;
        }

        [SerializeField] private PoolEntry[] _pools = new PoolEntry[0];

        private readonly Dictionary<string, ObjectPool> _byKey = new Dictionary<string, ObjectPool>();

        public static PoolService Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            foreach (PoolEntry entry in _pools)
            {
                if (entry.prefab == null || string.IsNullOrEmpty(entry.key)) continue;
                Transform root = new GameObject($"Pool · {entry.key}").transform;
                root.SetParent(transform, false);
                _byKey[entry.key] = new ObjectPool(entry.key, entry.prefab, entry.prewarm, root);
            }
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        public bool TrySpawn(string key, Vector3 position, Quaternion rotation, out GameObject instance)
        {
            if (_byKey.TryGetValue(key, out ObjectPool pool))
            {
                instance = pool.Spawn(position, rotation);
                return true;
            }
            instance = null;
            return false;
        }

        /// <summary>Atajo que no falla si no hay servicio en la escena (p. ej. en pruebas).</summary>
        public static void Spawn(string key, Vector3 position, Quaternion rotation)
        {
            if (Instance != null && !string.IsNullOrEmpty(key)) Instance.TrySpawn(key, position, rotation, out _);
        }
    }
}
