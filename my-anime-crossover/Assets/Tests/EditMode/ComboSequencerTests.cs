using NUnit.Framework;
using AnimeCrossover.Combat;

namespace AnimeCrossover.Tests
{
    public sealed class ComboSequencerTests
    {
        [Test]
        public void ChainsAndWrapsAround()
        {
            ComboSequencer c = new ComboSequencer(3, 1.2f);
            Assert.AreEqual(0, c.Advance(0.0f));
            Assert.AreEqual(1, c.Advance(0.4f));
            Assert.AreEqual(2, c.Advance(0.8f));
            Assert.AreEqual(0, c.Advance(1.2f));
            Assert.AreEqual(0, c.Current);
        }

        [Test]
        public void ResetsAfterWindow()
        {
            ComboSequencer c = new ComboSequencer(3, 1.2f);
            c.Advance(0f);
            c.Advance(0.5f);
            Assert.AreEqual(0, c.Advance(0.5f + 1.21f), "pasada la ventana vuelve al primer golpe");
        }

        [Test]
        public void ResetAndConfigureStartOver()
        {
            ComboSequencer c = new ComboSequencer(4, 1f);
            c.Advance(0f);
            c.Advance(0.1f);
            c.Reset();
            Assert.AreEqual(-1, c.Current);
            Assert.AreEqual(0, c.Advance(0.2f));

            c.Configure(0, 1f);
            Assert.AreEqual(1, c.Length, "un combo nunca tiene menos de un golpe");
        }
    }
}
