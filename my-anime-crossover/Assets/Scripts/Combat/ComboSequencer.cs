namespace AnimeCrossover.Combat
{
    /// <summary>
    /// Qué golpe del combo toca y cuándo se reinicia, en C# puro.
    /// El CombatEngine le pasa el reloj; así se prueba sin escena.
    /// </summary>
    public sealed class ComboSequencer
    {
        private int _next;
        private float _lastTime = float.NegativeInfinity;

        public int Length { get; private set; }
        public float Window { get; private set; }
        /// <summary>Índice del golpe que se lanzó por última vez (-1 si ninguno).</summary>
        public int Current { get; private set; } = -1;

        public ComboSequencer(int length, float window)
        {
            Configure(length, window);
        }

        public void Configure(int length, float window)
        {
            Length = length < 1 ? 1 : length;
            Window = window;
            Reset();
        }

        /// <summary>Devuelve el índice del golpe a lanzar ahora y avanza la cadena.</summary>
        public int Advance(float time)
        {
            if (time - _lastTime > Window) _next = 0;   // demasiado tiempo sin atacar: vuelve al primero
            Current = _next;
            _next = (_next + 1) % Length;
            _lastTime = time;
            return Current;
        }

        public void Reset()
        {
            _next = 0;
            Current = -1;
            _lastTime = float.NegativeInfinity;
        }
    }
}
