using NUnit.Framework;
using AnimeCrossover.Combat;
using AnimeCrossover.Core;

namespace AnimeCrossover.Tests
{
    public sealed class HealthModelTests
    {
        [Test]
        public void AppliesDamageAndReportsKill()
        {
            HealthModel h = new HealthModel(100f, Team.Enemy);
            Assert.AreEqual(DamageResult.Applied, h.TryDamage(30f, Team.Player, false, out float a1));
            Assert.AreEqual(30f, a1, 0.001f);
            Assert.AreEqual(70f, h.Current, 0.001f);

            Assert.AreEqual(DamageResult.Killed, h.TryDamage(500f, Team.Player, false, out float a2));
            Assert.AreEqual(70f, a2, 0.001f, "el daño aplicado no pasa de la vida que quedaba");
            Assert.IsFalse(h.IsAlive);
            Assert.AreEqual(DamageResult.IgnoredDead, h.TryDamage(1f, Team.Player, false, out _));
        }

        [Test]
        public void IgnoresFriendlyFireUnlessEnabled()
        {
            HealthModel h = new HealthModel(100f, Team.Enemy);
            Assert.AreEqual(DamageResult.IgnoredFriendly, h.TryDamage(10f, Team.Enemy, false, out _));
            h.FriendlyFire = true;
            Assert.AreEqual(DamageResult.Applied, h.TryDamage(10f, Team.Enemy, false, out _));
        }

        [Test]
        public void InvulnerableTakesNothing()
        {
            HealthModel h = new HealthModel(100f, Team.Player);
            Assert.AreEqual(DamageResult.IgnoredInvulnerable, h.TryDamage(99f, Team.Enemy, true, out float applied));
            Assert.AreEqual(0f, applied);
            Assert.AreEqual(100f, h.Current, 0.001f);
        }

        [Test]
        public void NegativeDamageNeverHeals()
        {
            HealthModel h = new HealthModel(100f, Team.Enemy);
            h.TryDamage(-50f, Team.Player, false, out float applied);
            Assert.AreEqual(0f, applied);
            Assert.AreEqual(100f, h.Current, 0.001f);
        }

        [Test]
        public void HealIsCappedAndDeadCannotHeal()
        {
            HealthModel h = new HealthModel(100f, Team.Enemy);
            h.TryDamage(40f, Team.Player, false, out _);
            Assert.AreEqual(40f, h.Heal(1000f), 0.001f);
            Assert.AreEqual(100f, h.Current, 0.001f);

            h.TryDamage(1000f, Team.Player, false, out _);
            Assert.AreEqual(0f, h.Heal(50f));
            h.Refill();
            Assert.IsTrue(h.IsAlive);
        }

        [Test]
        public void SetMaxKeepsOrRefills()
        {
            HealthModel h = new HealthModel(100f, Team.Enemy);
            h.TryDamage(50f, Team.Player, false, out _);
            h.SetMax(40f, refill: false);
            Assert.AreEqual(40f, h.Current, 0.001f, "no puede quedar por encima del nuevo máximo");
            h.SetMax(200f, refill: true);
            Assert.AreEqual(200f, h.Current, 0.001f);
        }
    }
}
