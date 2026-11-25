#!/usr/bin/env python3
"""Multiplayer integration tests with REAL processes and REAL UDP sockets.

Launches one headless dedicated server and two independent headless game
clients (host + guest) per scenario, then checks the JSON reports the
clients write. Usage (from the repo root or anywhere):

    python3 velocity-arena/tests/multiplayer/run_mp_tests.py [--godot godot] [--quick]

Scenarios: clean localhost network, then the same match with the client-side
network simulator adding latency / jitter / packet loss.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time

PROJECT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

SCENARIOS = [
    {"name": "localhost_0ms", "net": []},
    {"name": "sim_60ms_jitter5", "net": ["--lag", "60", "--jitter", "5"]},
    {"name": "sim_150ms_jitter20_loss5", "net": ["--lag", "150", "--jitter", "20", "--loss", "5"]},
]

REQUIRED = [
    "connected_and_welcomed", "match_started_and_snapshots", "two_cars_in_match",
    "has_own_car", "own_car_moves_on_server", "remote_car_movement_visible",
    "goal_event_received", "score_synchronized_1_0", "match_end_received",
    "returned_to_lobby",
]
HOST_ONLY = ["room_code_format", "guest_visible_in_lobby"]
GUEST_ONLY = ["wrong_password_rejected", "joined_with_code_and_password",
              "non_host_cannot_start", "reconnected_into_same_match"]


def run_scenario(godot, sc, port, workdir, quick):
    code_file = os.path.join(workdir, f"code_{port}.txt")
    if os.path.exists(code_file):
        os.remove(code_file)
    server_log = open(os.path.join(workdir, f"server_{sc['name']}.log"), "w")
    server = subprocess.Popen(
        [godot, "--headless", "--path", PROJECT, "--", "--server", "--port", str(port), "--allow-debug"],
        stdout=server_log, stderr=subprocess.STDOUT)
    time.sleep(2.5)
    clients = {}
    for role in ("host", "guest"):
        out = os.path.join(workdir, f"{sc['name']}_{role}.json")
        if os.path.exists(out):
            os.remove(out)
        log = open(os.path.join(workdir, f"client_{sc['name']}_{role}.log"), "w")
        args = [godot, "--headless", "--path", PROJECT, "res://tests/multiplayer/mp_test_client.tscn", "--",
                "--test-role", role, "--address", "127.0.0.1", "--port", str(port),
                "--out", out, "--code-file", code_file, "--name", role, "--fresh"] + sc["net"]
        if quick:
            args.append("--quick")
        clients[role] = (subprocess.Popen(args, stdout=log, stderr=subprocess.STDOUT), out, log)
        time.sleep(1.0)
    for role, (proc, out, log) in clients.items():
        try:
            proc.wait(timeout=120)
        except subprocess.TimeoutExpired:
            proc.kill()
        log.close()
    server_alive = server.poll() is None
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
    server_log.close()
    reports = {}
    for role, (_, out, _) in clients.items():
        try:
            with open(out) as f:
                reports[role] = json.load(f)
        except (OSError, json.JSONDecodeError):
            reports[role] = {"checks": {}, "metrics": {}, "reason": "no report"}
    return reports, server_alive


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--godot", default="godot")
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--workdir", default=tempfile.mkdtemp(prefix="va_mp_"))
    a = ap.parse_args()
    total_ok = True
    summary = []
    port = 7800
    for sc in SCENARIOS:
        if a.only and a.only not in sc["name"]:
            continue
        port += 3
        t0 = time.time()
        reports, alive = run_scenario(a.godot, sc, port, a.workdir, a.quick)
        dur = time.time() - t0
        lines = [f"## {sc['name']}  ({dur:.0f} s)  servidor vivo al final: {'sí' if alive else 'NO'}"]
        ok = alive
        cars = []
        for role in ("host", "guest"):
            r = reports[role]
            need = REQUIRED + (HOST_ONLY if role == "host" else GUEST_ONLY)
            for name in need:
                passed = r["checks"].get(name, False)
                ok = ok and passed
                lines.append(f"  {'PASS' if passed else 'FAIL'}  {role:5s} {name}")
            m = r.get("metrics", {})
            cars.append(m.get("your_car"))
            lines.append(f"  ·  {role}: rtt {m.get('rtt_ms', 0):.1f} ms, jitter {m.get('jitter_ms', 0):.1f} ms, "
                         f"error predicción medio {m.get('avg_prediction_error_m', 0):.3f} m, "
                         f"reconciliaciones {m.get('reconciliations', 0)}, snapshots {m.get('snapshots', 0)}, "
                         f"bajada {m.get('bytes_in', 0) / 1024:.0f} KB, subida {m.get('bytes_out', 0) / 1024:.0f} KB, "
                         f"marcador final {m.get('final_score', '?')}, motivo '{r.get('reason')}'")
        distinct = len(set(cars)) == 2 and None not in cars
        ok = ok and distinct
        lines.append(f"  {'PASS' if distinct else 'FAIL'}  each client controls a different car ({cars})")
        total_ok = total_ok and ok
        summary.extend(lines)
        print("\n".join(lines), flush=True)
    print(f"\nLogs: {a.workdir}")
    print("RESULTADO GLOBAL:", "OK" if total_ok else "FALLOS")
    sys.exit(0 if total_ok else 1)


if __name__ == "__main__":
    main()
