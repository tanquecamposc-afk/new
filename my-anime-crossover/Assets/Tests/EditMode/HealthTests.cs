using NUnit.Framework;
using UnityEngine;
using AnimeCrossover.Combat;
using AnimeCrossover.Core;

namespace AnimeCrossover.Tests
{
    public sealed class HealthTests
    {
        private GameObject _go;
        private Health _health;

        [SetUp]
        public void SetUp()
        {
            _go = new GameObject("Target");
            _health = _go.AddComponent<Health>();
            _health.SetTeamForTests(Team.Enemy);
            _health.ResetHealth();
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_go);

        private static DamageInfo Hit(float damage, Team from = Team.Player) =>
            new DamageInfo(new HitboxData { damage = damage }, null, from, Vector3.zero, Vector3.zero);

        [Test]
        public void TakesDamageAndDies()
        {
            bool died = false;
            _health.Died += _ => died = true;

            Assert.IsTrue(_health.TakeDamage(Hit(40f)));
            Assert.AreEqual(60f, _health.Current, 0.001f);
            Assert.IsFalse(died);

            _health.TakeDamage(Hit(100f));
            Assert.AreEqual(0f, _health.Current, 0.001f);
            Assert.IsTrue(died);
            Assert.IsFalse(_health.IsAlive);
            Assert.IsFalse(_health.TakeDamage(Hit(10f)), "un muerto no recibe más golpes");
        }

        [Test]
        public void IgnoresFriendlyFire()
        {
            Assert.IsFalse(_health.TakeDamage(Hit(10f, Team.Enemy)));
            Assert.AreEqual(100f, _health.Current, 0.001f);
        }

        [Test]
        public void MultiplierScalesDamage()
        {
            _health.TakeDamage(Hit(10f), 2.5f);
            Assert.AreEqual(75f, _health.Current, 0.001f);
        }

        [Test]
        public void InvulnerabilityBlocksDamage()
        {
            GameObject go = new GameObject("Dashing");
            go.AddComponent<TestInvulnerableSource>();
            Health h = go.AddComponent<Health>();
            h.SetTeamForTests(Team.Enemy);
            Assert.IsFalse(h.TakeDamage(Hit(50f)));
            Assert.AreEqual(h.Max, h.Current, 0.001f);
            Object.DestroyImmediate(go);
        }

        [Test]
        public void HealIsCappedAtMax()
        {
            _health.TakeDamage(Hit(30f));
            _health.Heal(1000f);
            Assert.AreEqual(_health.Max, _health.Current, 0.001f);
        }
    }
}
