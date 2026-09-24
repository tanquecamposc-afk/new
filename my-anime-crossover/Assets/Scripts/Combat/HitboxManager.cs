using System.Collections.Generic;
using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    public class HitboxManager : MonoBehaviour
    {
        [SerializeField] private LayerMask _enemyLayer;
        [SerializeField] private int _maxHitsPerCheck = 16;

        private Transform _ownerTransform;
        private Collider[] _hitBuffer;                       // pre-reservado: sin basura por frame
        private readonly HashSet<IDamageable> _hitThisSwing = new HashSet<IDamageable>();
        private HitboxData _lastData;
        private bool _hasLastData;

        private void Awake()
        {
            _ownerTransform = transform;
            _hitBuffer = new Collider[_maxHitsPerCheck];
        }

        // Llamar al empezar cada golpe: un mismo objetivo solo recibe un impacto por golpe,
        // aunque la hitbox siga activa varios frames o tenga varios colliders.
        public void BeginSwing()
        {
            _hitThisSwing.Clear();
        }

        // Ejecutado en cada frame activo (frame-counter del CombatEngine o Animation Events)
        public void CheckHitbox(HitboxData data)
        {
            _lastData = data;
            _hasLastData = true;

            Vector3 center = _ownerTransform.position + (_ownerTransform.rotation * data.boxOffset);
            int count = Physics.OverlapBoxNonAlloc(center, data.boxSize / 2f, _hitBuffer, _ownerTransform.rotation, _enemyLayer);

            for (int i = 0; i < count; i++)
            {
                Collider hit = _hitBuffer[i];

                // Previene auto-impactos
                if (hit.transform.root == _ownerTransform.root) continue;

                if (hit.TryGetComponent<IDamageable>(out IDamageable target) && _hitThisSwing.Add(target))
                {
                    target.TakeDamage(data);
                    ApplyHitEffects(hit.ClosestPoint(center), data);
                }
            }
        }

        private void ApplyHitEffects(Vector3 hitPoint, HitboxData data)
        {
            // Tomar del Pool los VFX de impacto; nunca Instantiate en el bucle de combate.
            // P.ej. ObjectPooler.Instance.SpawnFromPool("HitVFX", hitPoint, Quaternion.identity);
        }

        private void OnDrawGizmosSelected()
        {
            // Visualización en editor: dibuja la última hitbox comprobada con su tamaño real
            Gizmos.color = Color.red;
            if (_hasLastData)
            {
                Gizmos.matrix = Matrix4x4.TRS(transform.position + transform.rotation * _lastData.boxOffset, transform.rotation, Vector3.one);
                Gizmos.DrawWireCube(Vector3.zero, _lastData.boxSize);
            }
            else
            {
                Gizmos.DrawWireCube(transform.position, new Vector3(1, 2, 1));
            }
        }
    }

    public interface IDamageable
    {
        void TakeDamage(HitboxData data);
    }
}
