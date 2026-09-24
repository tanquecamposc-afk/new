using UnityEngine;
using AnimeCrossover.Core;

namespace AnimeCrossover.Tests
{
    /// <summary>Componente de prueba siempre invulnerable (en su propio archivo, como pide Unity).</summary>
    public sealed class TestInvulnerableSource : MonoBehaviour, IInvulnerabilitySource
    {
        public bool IsInvulnerable => true;
    }
}
