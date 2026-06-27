import argparse
import os
import signal
import socket
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DEFAULT_API_HOST = "0.0.0.0"
DEFAULT_API_PORT = 8000
DEFAULT_AGENT_HOST = "0.0.0.0"
DEFAULT_AGENT_PORT = 8081
LOG_LOCK = threading.Lock()


def _bootstrap_venv() -> None:
    venv_python = ROOT / ".venv" / "Scripts" / "python.exe"
    if not venv_python.exists():
        return
    try:
        current_python = Path(sys.executable).resolve()
        target_python = venv_python.resolve()
    except Exception:
        return
    if current_python == target_python:
        return
    os.execv(str(target_python), [str(target_python), str(Path(__file__).resolve()), *sys.argv[1:]])


_bootstrap_venv()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start the backend-only SPXAgent local stack.")
    parser.add_argument("--no-api", action="store_true", help="Skip the FastAPI backend API.")
    parser.add_argument("--no-agent", action="store_true", help="Skip the LiveKit voice agent worker.")
    parser.add_argument("--no-kb-worker", action="store_true", help="Skip the knowledge-base ingestion worker.")
    parser.add_argument("--api-port", type=int, default=None, help="Preferred backend API port. Falls forward to the next free port if busy.")
    parser.add_argument("--agent-port", type=int, default=None, help="Preferred LiveKit worker health port. Falls forward to the next free port if busy.")
    parser.add_argument(
        "--log-level",
        choices=("debug", "info", "warning", "error"),
        default=str(os.environ.get("LOG_LEVEL", "info")).strip().lower(),
        help="Console log detail for all services (default: LOG_LEVEL or info).",
    )
    return parser.parse_args()


def _parse_port(raw_value: str | None, default: int) -> int:
    if raw_value in (None, ""):
        return default
    try:
        port = int(str(raw_value).strip())
    except (TypeError, ValueError):
        return default
    return max(0, min(port, 65535))


def _is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        if os.name == "nt":
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def _find_available_port(host: str, preferred_port: int) -> int:
    if preferred_port == 0:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((host, 0))
            return int(sock.getsockname()[1])

    port = preferred_port
    for _ in range(200):
        if _is_port_available(host, port):
            return port
        port += 1
        if port > 65535:
            break
    raise RuntimeError(f"Could not find a free port starting from {preferred_port} on host {host}.")


def build_services(
    args: argparse.Namespace,
    *,
    api_host: str,
    api_port: int,
    agent_host: str,
    agent_port: int,
) -> list[dict]:
    python_cmd = str(Path(sys.executable))
    services: list[dict] = []
    if not args.no_api:
        services.append(
            {
                "name": "api",
                "cmd": [
                    python_cmd,
                    "-m",
                    "uvicorn",
                    "backend_api:app",
                    "--host",
                    api_host,
                    "--port",
                    str(api_port),
                    "--log-level",
                    args.log_level,
                ],
                "cwd": str(ROOT),
                "env": {
                    "HOST": api_host,
                    "PORT": str(api_port),
                },
            }
        )
    if not args.no_agent:
        services.append(
            {
                "name": "agent",
                "cmd": [python_cmd, "agent.py", "start"],
                "cwd": str(ROOT),
                "env": {
                    "AGENT_HOST": agent_host,
                    "AGENT_PORT": str(agent_port),
                },
            }
        )
    if not args.no_kb_worker:
        services.append(
            {
                "name": "kb",
                "cmd": [python_cmd, "kb_worker.py"],
                "cwd": str(ROOT),
            }
        )
    return services


def log_console(service: str, message: str) -> None:
    timestamp = datetime.now().astimezone().isoformat(timespec="milliseconds")
    with LOG_LOCK:
        print(f"{timestamp} [{service}] {message}", flush=True)


def stream_output(name: str, process: subprocess.Popen[str]) -> None:
    if not process.stdout:
        return
    for line in process.stdout:
        text = line.rstrip()
        if text:
            log_console(name, text)


def stop_process(name: str, process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    try:
        if os.name == "nt":
            try:
                process.send_signal(signal.CTRL_BREAK_EVENT)
                time.sleep(1.5)
            except Exception:
                pass
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
    except Exception as exc:
        log_console("stack", f"ERROR: Failed to stop {name}: {type(exc).__name__}: {exc}")


def start_services(services: list[dict], log_level: str) -> list[tuple[str, subprocess.Popen[str], float]]:
    procs: list[tuple[str, subprocess.Popen[str], float]] = []
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    for service in services:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONUTF8"] = "1"
        env["PYTHONFAULTHANDLER"] = "1"
        env["LOG_LEVEL"] = log_level.upper()
        env.update(service.get("env", {}))
        log_console("stack", f"Starting {service['name']}: {subprocess.list2cmdline(service['cmd'])}")
        process = subprocess.Popen(
            service["cmd"],
            cwd=service["cwd"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            creationflags=creationflags,
        )
        started_at = time.monotonic()
        procs.append((service["name"], process, started_at))
        thread = threading.Thread(target=stream_output, args=(service["name"], process), daemon=True)
        thread.start()
        log_console("stack", f"Started {service['name']} (pid {process.pid})")
        time.sleep(0.5)
    return procs


def main() -> int:
    args = parse_args()
    api_host = str(os.environ.get("HOST", DEFAULT_API_HOST)).strip() or DEFAULT_API_HOST
    agent_host = str(os.environ.get("AGENT_HOST", DEFAULT_AGENT_HOST)).strip() or DEFAULT_AGENT_HOST
    preferred_api_port = args.api_port if args.api_port is not None else _parse_port(os.environ.get("PORT"), DEFAULT_API_PORT)
    preferred_agent_port = args.agent_port if args.agent_port is not None else _parse_port(os.environ.get("AGENT_PORT"), DEFAULT_AGENT_PORT)
    api_port = _find_available_port(api_host, preferred_api_port) if not args.no_api else preferred_api_port
    agent_port = _find_available_port(agent_host, preferred_agent_port) if not args.no_agent else preferred_agent_port

    if not args.no_api and api_port != preferred_api_port:
        log_console("stack", f"WARNING: API port {preferred_api_port} is busy. Using {api_port} instead.")
    if not args.no_agent and agent_port != preferred_agent_port:
        log_console("stack", f"WARNING: Agent port {preferred_agent_port} is busy. Using {agent_port} instead.")

    services = build_services(
        args,
        api_host=api_host,
        api_port=api_port,
        agent_host=agent_host,
        agent_port=agent_port,
    )
    if not services:
        log_console("stack", "Nothing to start.")
        return 0

    log_console("stack", f"Log level: {args.log_level.upper()}")
    procs = start_services(services, args.log_level)
    log_console("stack", "Local stack is starting. Press Ctrl+C once to stop everything.")
    if not args.no_api:
        log_console("stack", f"Backend API: http://127.0.0.1:{api_port}")
    if not args.no_agent:
        log_console("stack", f"Agent health: http://127.0.0.1:{agent_port}")
    try:
        while True:
            for name, process, started_at in procs:
                code = process.poll()
                if code is not None:
                    uptime = time.monotonic() - started_at
                    level = "ERROR" if code else "INFO"
                    log_console(
                        "stack",
                        f"{level}: {name} exited with code {code} after {uptime:.1f}s. "
                        "Shutting down the rest of the stack.",
                    )
                    return code
            time.sleep(1)
    except KeyboardInterrupt:
        log_console("stack", "Stopping services ...")
        return 0
    finally:
        for name, process, _started_at in reversed(procs):
            stop_process(name, process)


if __name__ == "__main__":
    raise SystemExit(main())
