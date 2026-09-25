using NUnit.Framework;
using AnimeCrossover.Combat;
using AnimeCrossover.Core;

namespace AnimeCrossover.Tests
{
    public sealed class AttackTimelineTests
    {
        private static HitboxData Data(int startup, int active, int recovery) =>
            new HitboxData { startupFrames = startup, activeFrames = active, recoveryFrames = recovery };

        [Test]
        public void RunsStartupThenActiveThenRecovery()
        {
            AttackTimeline t = new AttackTimeline();
            t.Begin(Data(2, 3, 1));

            Assert.AreEqual(AttackPhase.Startup, t.Step());
            Assert.AreEqual(AttackPhase.Startup, t.Step());
            Assert.AreEqual(AttackPhase.Active, t.Step());
            Assert.AreEqual(AttackPhase.Active, t.Step());
            Assert.AreEqual(AttackPhase.Active, t.Step());
            Assert.AreEqual(AttackPhase.Recovery, t.Step());
            Assert.IsFalse(t.IsRunning);
            Assert.AreEqual(AttackPhase.None, t.Step());
        }

        [Test]
        public void CancelableOnlyAfterActiveWindow()
        {
            AttackTimeline t = new AttackTimeline();
            t.Begin(Data(1, 2, 4));
            t.Step(); // startup
            Assert.IsFalse(t.IsCancelable);
            t.Step(); // active 1
            Assert.IsFalse(t.IsCancelable);
            t.Step(); // active 2
            Assert.IsTrue(t.IsCancelable);
        }

        [Test]
        public void FreezeHoldsTheFrameAndDoesNotRepeatActive()
        {
            AttackTimeline t = new AttackTimeline();
            t.Begin(Data(0, 2, 0));
            Assert.AreEqual(AttackPhase.Active, t.Step());
            t.Freeze(3);
            Assert.IsTrue(t.IsFrozen);
            Assert.AreEqual(AttackPhase.None, t.Step());
            Assert.AreEqual(AttackPhase.None, t.Step());
            Assert.AreEqual(AttackPhase.None, t.Step());
            Assert.IsFalse(t.IsFrozen);
            Assert.AreEqual(1, t.Frame);
            Assert.AreEqual(AttackPhase.Active, t.Step());
        }

        [Test]
        public void StopEndsImmediately()
        {
            AttackTimeline t = new AttackTimeline();
            t.Begin(Data(5, 5, 5));
            t.Stop();
            Assert.IsFalse(t.IsRunning);
            Assert.AreEqual(AttackPhase.None, t.Phase);
        }
    }
}
