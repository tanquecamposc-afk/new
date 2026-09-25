using System.Collections.Generic;
using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Zona que puede recibir golpes. Se registra con su collider en un diccionario
    /// estático, así la hitbox encuentra al dueño sin llamar a GetComponent en el combate.
    /// Pon uno por collider (cuerpo, cabeza…) y usa el multiplicador para puntos débiles.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class Hurtbox : MonoBehaviour
    {
        private static readonly Dictionary<Collider, Hurtbox> Registry = new Dictionary<Collider, Hurtbox>(128);

        [SerializeField, Min(0f)] private float _damageMultiplier = 1f;

        private Collider _collider;

        public IDamageable Owner { get; private set; }
        public float DamageMultiplier => _damageMultiplier;

        private void Awake()
        {
            _collider = GetComponent<Collider>();
            Owner = GetComponentInParent<IDamageable>();
            if (Owner == null) Debug.LogError($"[Hurtbox] {name} no tiene un IDamageable en sus padres.", this);
        }

        private void OnEnable() { if (_collider != null) Registry[_collider] = this; }
        private void OnDisable() { if (_collider != null) Registry.Remove(_collider); }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics() => Registry.Clear();   // sin recarga de dominio

        public static bool TryGet(Collider collider, out Hurtbox hurtbox) => Registry.TryGetValue(collider, out hurtbox);
    }
}
