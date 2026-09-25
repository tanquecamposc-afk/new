using System.Collections.Generic;
using UnityEngine;

namespace AnimeCrossover.Core.Pooling
{
    /// <summary>Opcional: los objetos del pool se enteran de cuándo salen y vuelven.</summary>
    public interface IPoolable
    {
        void OnSpawned();
        void OnDespawned();
    }

    /// <summary>
    /// Pool de un prefab. Se precalienta al crearse para que el combate nunca
    /// llame a Instantiate. Si se agota, crece (y avisa en el editor).
    /// Los componentes <see cref="IPoolable"/> se buscan una sola vez, al crear cada instancia.
    /// </summary>
    public sealed class ObjectPool
    {
        private readonly GameObject _prefab;
        private readonly Transform _root;
        private readonly Stack<PooledObject> _free;

        public string Key { get; }
        public int CountInactive => _free.Count;

        public ObjectPool(string key, GameObject prefab, int prewarm, Transform root)
        {
            Key = key;
            _prefab = prefab;
            _root = root;
            _free = new Stack<PooledObject>(Mathf.Max(1, prewarm));
            for (int i = 0; i < prewarm; i++) _free.Push(Create());
        }

        public GameObject Spawn(Vector3 position, Quaternion rotation)
        {
            PooledObject instance;
            if (_free.Count > 0)
            {
                instance = _free.Pop();
            }
            else
            {
#if UNITY_EDITOR
                Debug.LogWarning($"[ObjectPool] '{Key}' agotado: creando otra instancia. Sube el precalentado.");
#endif
                instance = Create();
            }

            instance.transform.SetPositionAndRotation(position, rotation);
            instance.gameObject.SetActive(true);
            instance.NotifySpawned();
            return instance.gameObject;
        }

        internal void Despawn(PooledObject instance)
        {
            if (instance == null || !instance.gameObject.activeSelf) return;
            instance.NotifyDespawned();
            instance.gameObject.SetActive(false);
            instance.transform.SetParent(_root, false);
            _free.Push(instance);
        }

        private PooledObject Create()
        {
            GameObject go = Object.Instantiate(_prefab, _root);
            go.SetActive(false);
            if (!go.TryGetComponent(out PooledObject tag)) tag = go.AddComponent<PooledObject>();
            tag.Bind(this);
            return tag;
        }
    }
}
