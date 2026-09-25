using System;
using System.Collections.Generic;
using NUnit.Framework;
using AnimeCrossover.Core.StateMachine;

namespace AnimeCrossover.Tests
{
    public sealed class StateMachineTests
    {
        private enum S { A, B }

        private sealed class Recorder : State
        {
            private readonly string _name;
            private readonly List<string> _log;
            public Action OnEnter;
            public Recorder(string name, List<string> log) { _name = name; _log = log; }
            public override void Enter() { _log.Add("enter " + _name); OnEnter?.Invoke(); }
            public override void Exit() => _log.Add("exit " + _name);
            public override void Tick(float dt) => _log.Add("tick " + _name);
        }

        [Test]
        public void ChangesStateInOrderAndRaisesEvent()
        {
            List<string> log = new List<string>();
            StateMachine<S> m = new StateMachine<S>();
            m.Register(S.A, new Recorder("A", log));
            m.Register(S.B, new Recorder("B", log));
            S from = S.A, to = S.A;
            m.StateChanged += (a, b) => { from = a; to = b; };

            m.Start(S.A);
            m.Tick(0.016f);
            m.ChangeState(S.B);

            CollectionAssert.AreEqual(new[] { "enter A", "tick A", "exit A", "enter B" }, log);
            Assert.AreEqual(S.B, m.CurrentId);
            Assert.AreEqual(S.A, from);
            Assert.AreEqual(S.B, to);
        }

        [Test]
        public void ChangingToSameStateDoesNothing()
        {
            List<string> log = new List<string>();
            StateMachine<S> m = new StateMachine<S>();
            m.Register(S.A, new Recorder("A", log));
            m.Start(S.A);
            m.ChangeState(S.A);
            CollectionAssert.AreEqual(new[] { "enter A" }, log);
        }

        [Test]
        public void ChangingStateInsideEnterThrows()
        {
            List<string> log = new List<string>();
            StateMachine<S> m = new StateMachine<S>();
            Recorder b = new Recorder("B", log);
            m.Register(S.A, new Recorder("A", log));
            m.Register(S.B, b);
            b.OnEnter = () => m.ChangeState(S.A);
            m.Start(S.A);
            Assert.Throws<InvalidOperationException>(() => m.ChangeState(S.B));
        }

        [Test]
        public void UnregisteredStateThrows()
        {
            StateMachine<S> m = new StateMachine<S>();
            Assert.Throws<KeyNotFoundException>(() => m.Start(S.A));
        }
    }
}
