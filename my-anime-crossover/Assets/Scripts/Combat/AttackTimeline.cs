using AnimeCrossover.Core;

namespace AnimeCrossover.Combat
{
    public enum AttackPhase { None, Startup, Active, Recovery }

    /// <summary>
    /// Reloj de frames de un golpe (Startup → Active → Recovery). C# puro, sin
    /// MonoBehaviour: se prueba en EditMode y lo mueve el CombatEngine en FixedUpdate.
    /// </summary>
    public sealed class AttackTimeline
    {
        private HitboxData _data;
        private int _frame;
        private int _freezeFrames;

        public bool IsRunning { get; private set; }
        public int Frame => _frame;
        public HitboxData Data => _data;
        public bool IsFrozen => _freezeFrames > 0;

        /// <summary>Fase del frame que toca ejecutar ahora.</summary>
        public AttackPhase Phase
        {
            get
            {
                if (!IsRunning) return AttackPhase.None;
                if (_frame < _data.startupFrames) return AttackPhase.Startup;
                if (_frame < _data.startupFrames + _data.activeFrames) return AttackPhase.Active;
                return AttackPhase.Recovery;
            }
        }

        /// <summary>Se puede cancelar (dash o siguiente golpe) una vez pasada la ventana activa.</summary>
        public bool IsCancelable => IsRunning && _frame >= _data.startupFrames + _data.activeFrames;

        public void Begin(in HitboxData data)
        {
            _data = data;
            _frame = 0;
            _freezeFrames = 0;
            IsRunning = data.TotalFrames > 0;
        }

        public void Stop()
        {
            IsRunning = false;
            _freezeFrames = 0;
        }

        /// <summary>Hit stop: el golpe se queda quieto unos frames al conectar.</summary>
        public void Freeze(int frames)
        {
            if (frames > _freezeFrames) _freezeFrames = frames;
        }

        /// <summary>
        /// Ejecuta un frame. Devuelve la fase de ese frame (Active = hay que comprobar la hitbox).
        /// Mientras está congelado devuelve la fase actual sin avanzar y no vuelve a golpear.
        /// </summary>
        public AttackPhase Step()
        {
            if (!IsRunning) return AttackPhase.None;
            if (_freezeFrames > 0)
            {
                _freezeFrames--;
                return AttackPhase.None;
            }

            AttackPhase phase = Phase;
            _frame++;
            if (_frame >= _data.TotalFrames) IsRunning = false;
            return phase;
        }
    }
}
