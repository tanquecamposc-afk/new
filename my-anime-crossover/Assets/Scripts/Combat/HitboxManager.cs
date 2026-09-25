using System;
using System.Collections.Generic;
using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Detección de impactos con Physics.OverlapBoxNonAlloc frame a frame (sin triggers,
    /// sin tunneling y sin basura). El CombatEngine lo llama en cada frame activo.
    /// </summary>
    public sealed class HitboxManager : MonoBehaviour
    {
        [SerializeField] private LayerMask _hurtboxLayers = ~0;
        [SerializeField, Min(1)] private int _maxHitsPerCheck = 16;
        [SerializeField] private QueryTriggerInteraction _triggerInteraction = QueryTriggerInteraction.Collide;

        private Transform _ownerTransform;
        private IDamageable _self;
        private Team _ownerTeam = Team.Neutral;
        private Collider[] _hitBuffer;
        private readonly HashSet<IDamageable> _hitThisSwing = new HashSet<IDamageable>();

        private HitboxData _gizmoData;
        private bool _hasGizmoData;

        /// <summary>Se dispara por cada objetivo al que el golpe llega de verdad.</summary>
        public event Action<DamageInfo> HitLanded;

        private void Awake()
        {
            _ownerTransform = transform;
            _hitBuffer = new Collider[_maxHitsPerCheck];
            _self = GetComponentInParent<IDamageable>();
            if (_self != null) _ownerTeam = _self.Team;
        }

        /// <summary>Al empezar cada golpe: un objetivo solo recibe un impacto por golpe.</summary>
        public void BeginSwing() => _hitThisSwing.Clear();

        /// <returns>Cuántos objetivos nuevos recibieron el golpe este frame.</returns>
        public int CheckHitbox(in HitboxData data)
        {
            _gizmoData = data;
            _hasGizmoData = true;

            Quaternion rotation = _ownerTransform.rotation;
            Vector3 center = _ownerTransform.position + rotation * data.boxOffset;
            int count = Physics.OverlapBoxNonAlloc(center, data.boxSize * 0.5f, _hitBuffer, rotation, _hurtboxLayers, _triggerInteraction);
            int landed = 0;

            for (int i = 0; i < count; i++)
            {
                Collider hit = _hitBuffer[i];
                if (!Hurtbox.TryGet(hit, out Hurtbox hurtbox) || hurtbox.Owner == null) continue;
                if (hurtbox.Owner == _self) continue;                             // auto-impacto
                if (!_hitThisSwing.Add(hurtbox.Owner)) continue;                  // ya golpeado en este golpe

                Vector3 point = hit.ClosestPoint(center);
                DamageInfo info = new DamageInfo(data, gameObject, _ownerTeam, point, rotation * data.knockbackForce);
                bool applied = hurtbox.Owner is Health health
                    ? health.TakeDamage(info, hurtbox.DamageMultiplier)
                    : hurtbox.Owner.TakeDamage(info);

                if (applied)
                {
                    landed++;
                    HitLanded?.Invoke(info);
                }
            }
            return landed;
        }

        private void OnDrawGizmosSelected()
        {
            if (!_hasGizmoData) return;
            Gizmos.color = new Color(1f, 0.2f, 0.2f, 0.9f);
            Gizmos.matrix = Matrix4x4.TRS(transform.position + transform.rotation * _gizmoData.boxOffset, transform.rotation, Vector3.one);
            Gizmos.DrawWireCube(Vector3.zero, _gizmoData.boxSize);
        }
    }
}
