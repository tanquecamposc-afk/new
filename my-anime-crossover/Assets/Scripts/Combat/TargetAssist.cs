using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Asistencia de apuntado: al empezar un golpe busca al enemigo vivo más
    /// conveniente delante del atacante (cerca y en la dirección que se pulsa)
    /// para girarse hacia él. Se usa una vez por golpe, no en el bucle de impactos.
    /// </summary>
    public sealed class TargetAssist : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float _radius = 4f;
        [SerializeField, Range(0f, 180f)] private float _halfAngle = 75f;
        [SerializeField] private LayerMask _hurtboxLayers = ~0;
        [SerializeField, Min(1)] private int _maxCandidates = 16;

        private Collider[] _buffer;
        private IDamageable _self;
        private Team _team = Team.Neutral;

        private void Awake()
        {
            _buffer = new Collider[_maxCandidates];
            _self = GetComponentInParent<IDamageable>();
            if (_self != null) _team = _self.Team;
        }

        /// <param name="preferred">Dirección que pulsa el jugador (o forward si no pulsa nada).</param>
        /// <returns>true si encontró objetivo; <paramref name="direction"/> apunta a él en el plano.</returns>
        public bool TryFindTarget(Vector3 preferred, out Vector3 direction)
        {
            direction = Vector3.zero;
            preferred.y = 0f;
            if (preferred.sqrMagnitude < 0.0001f) preferred = transform.forward;
            preferred.Normalize();

            Vector3 origin = transform.position;
            int count = Physics.OverlapSphereNonAlloc(origin, _radius, _buffer, _hurtboxLayers, QueryTriggerInteraction.Collide);
            float bestScore = float.PositiveInfinity;
            float minDot = Mathf.Cos(_halfAngle * Mathf.Deg2Rad);

            for (int i = 0; i < count; i++)
            {
                if (!Hurtbox.TryGet(_buffer[i], out Hurtbox hurtbox)) continue;
                IDamageable owner = hurtbox.Owner;
                if (owner == null || owner == _self || !owner.IsAlive || owner.Team == _team) continue;

                Vector3 to = _buffer[i].bounds.center - origin;
                to.y = 0f;
                float dist = to.magnitude;
                if (dist < 0.001f) continue;
                Vector3 dir = to / dist;
                float dot = Vector3.Dot(preferred, dir);
                if (dot < minDot) continue;

                // más cerca y más alineado es mejor
                float score = dist * (2f - dot);
                if (score < bestScore)
                {
                    bestScore = score;
                    direction = dir;
                }
            }
            return bestScore < float.PositiveInfinity;
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 0.85f, 0.2f, 0.6f);
            Gizmos.DrawWireSphere(transform.position, _radius);
        }
    }
}
