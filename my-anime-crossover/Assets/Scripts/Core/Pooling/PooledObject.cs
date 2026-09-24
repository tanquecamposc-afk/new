using UnityEngine;

namespace AnimeCrossover.Core.Pooling
{
    /// <summary>
    /// Se añade solo a cada instancia del pool. Sabe a qué pool volver y, si tiene
    /// vida útil, se devuelve sola (útil para VFX de impacto).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class PooledObject : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float _lifetime = 0f;   // 0 = no se devuelve solo

        private ObjectPool _pool;
        private IPoolable[] _poolables;
        private float _despawnAt = float.PositiveInfinity;

        internal void Bind(ObjectPool pool)
        {
            _pool = pool;
            _poolables = GetComponentsInChildren<IPoolable>(true);   // una vez, al crear la instancia
        }

        internal void NotifySpawned()
        {
            _despawnAt = _lifetime > 0f ? Time.time + _lifetime : float.PositiveInfinity;
            for (int i = 0; i < _poolables.Length; i++) _poolables[i].OnSpawned();
        }

        internal void NotifyDespawned()
        {
            for (int i = 0; i < _poolables.Length; i++) _poolables[i].OnDespawned();
        }

        private void Update()
        {
            if (Time.time >= _despawnAt) Release();
        }

        public void Release()
        {
            if (_pool != null) _pool.Despawn(this);
            else gameObject.SetActive(false);
        }
    }
}
