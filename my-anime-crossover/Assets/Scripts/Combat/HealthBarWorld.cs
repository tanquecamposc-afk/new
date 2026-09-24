using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Barra de vida sobre la cabeza sin depender de UGUI: escala el transform
    /// del relleno (pivote a la izquierda) y una estela que baja con retraso.
    /// Mira siempre a la cámara y se oculta con la vida llena si se quiere.
    /// </summary>
    public sealed class HealthBarWorld : MonoBehaviour
    {
        [SerializeField] private Health _health = null;
        [Tooltip("Relleno con el pivote en el borde izquierdo; se escala en X")]
        [SerializeField] private Transform _fill = null;
        [Tooltip("Opcional: estela clara que baja despacio detrás del relleno")]
        [SerializeField] private Transform _trail = null;
        [SerializeField, Min(0.1f)] private float _trailSpeed = 1.5f;
        [SerializeField] private bool _hideWhenFull = true;
        [SerializeField] private GameObject _visualRoot = null;

        private Transform _camera;
        private float _shown = 1f;
        private float _trailShown = 1f;

        private void Awake()
        {
            if (_health == null) _health = GetComponentInParent<Health>();
            if (_visualRoot == null) _visualRoot = gameObject;
        }

        private void OnEnable()
        {
            if (_health == null) return;
            _health.Damaged += OnChanged;
            _health.Healed += OnHealed;
            _health.Revived += OnRevived;
            OnRevived();
        }

        private void OnDisable()
        {
            if (_health == null) return;
            _health.Damaged -= OnChanged;
            _health.Healed -= OnHealed;
            _health.Revived -= OnRevived;
        }

        private void OnChanged(DamageInfo info, float amount) => _shown = _health.Normalized;
        private void OnHealed(float amount) => _shown = _health.Normalized;

        private void OnRevived()
        {
            _shown = _trailShown = _health != null ? _health.Normalized : 1f;
            Apply();
        }

        private void LateUpdate()
        {
            if (_health == null) return;
            if (_camera == null && Camera.main != null) _camera = Camera.main.transform;
            if (_camera != null) transform.rotation = Quaternion.LookRotation(transform.position - _camera.position);

            _trailShown = _trailShown > _shown ? Mathf.MoveTowards(_trailShown, _shown, _trailSpeed * Time.deltaTime) : _shown;
            Apply();
        }

        private void Apply()
        {
            if (_fill != null) _fill.localScale = new Vector3(Mathf.Max(0.0001f, _shown), 1f, 1f);
            if (_trail != null) _trail.localScale = new Vector3(Mathf.Max(0.0001f, _trailShown), 1f, 1f);
            bool visible = _health != null && _health.IsAlive && (!_hideWhenFull || _shown < 0.999f || _trailShown < 0.999f);
            if (_visualRoot != gameObject) _visualRoot.SetActive(visible);
        }
    }
}
