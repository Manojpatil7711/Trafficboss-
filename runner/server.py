from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
RESULTS.mkdir(exist_ok=True)
TOKEN = os.getenv("TRAFFICBOSS_API_TOKEN", "")
ALLOWED_HOSTS = {h.strip().lower() for h in os.getenv("TRAFFICBOSS_ALLOWED_HOSTS", "").split(",") if h.strip()}
ORIGIN = os.getenv("TRAFFICBOSS_CORS_ORIGIN", "https://trafficboss.pages.dev")
app = FastAPI(title="TrafficBoss Local Runner", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=[ORIGIN, "http://localhost:5500", "http://127.0.0.1:5500"], allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])
LOCK = threading.Lock()
RUNS: dict[str, dict[str, Any]] = {}

class RunRequest(BaseModel):
    urls: list[str] = Field(min_length=1, max_length=10)
    vus: int = Field(default=3, ge=1, le=20)
    duration_seconds: int = Field(default=30, ge=10, le=300)
    pause_seconds: int = Field(default=2, ge=1, le=30)


def authorize(header: str | None) -> None:
    if not TOKEN or len(TOKEN) < 24:
        raise HTTPException(503, "Runner is not configured: set a 24+ character TRAFFICBOSS_API_TOKEN.")
    if header != f"Bearer {TOKEN}":
        raise HTTPException(401, "Invalid runner token.")


def validate_urls(urls: list[str]) -> list[str]:
    if not ALLOWED_HOSTS:
        raise HTTPException(503, "No allowed hosts configured. Set TRAFFICBOSS_ALLOWED_HOSTS.")
    clean: list[str] = []
    for raw in urls:
        parsed = urlparse(raw)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise HTTPException(400, "Only absolute HTTPS URLs without embedded credentials are accepted.")
        if parsed.hostname.lower() not in ALLOWED_HOSTS:
            raise HTTPException(403, f"Host is not allowlisted: {parsed.hostname}")
        if parsed.port not in (None, 443):
            raise HTTPException(400, "Custom ports are not allowed.")
        clean.append(raw)
    return clean


def make_script(urls: list[str], vus: int, duration: int, pause: int, summary_path: Path) -> str:
    encoded = json.dumps(urls)
    summary = json.dumps(str(summary_path))
    return f'''import http from 'k6/http';
import {{ check, sleep }} from 'k6';
export const options = {{ vus: {vus}, duration: '{duration}s', thresholds: {{ http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<2000'] }} }};
const pages = {encoded};
export default function () {{
  for (const url of pages) {{
    const r = http.get(url, {{ timeout: '10s', redirects: 3 }});
    check(r, {{ 'status is 2xx/3xx': x => x.status >= 200 && x.status < 400 }});
  }}
  sleep({pause});
}}
export function handleSummary(data) {{ return {{ [{summary}]: JSON.stringify(data, null, 2) }}; }}
'''


def run_process(run_id: str, script_path: Path, summary_path: Path) -> None:
    item = RUNS[run_id]
    try:
        proc = subprocess.Popen(["k6", "run", str(script_path)], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        item["process"] = proc
        output, _ = proc.communicate()
        item["log"] = output[-12000:]
        item["state"] = "completed" if proc.returncode == 0 else "failed"
        item["return_code"] = proc.returncode
        item["summary_available"] = summary_path.exists()
    except Exception as exc:
        item["state"] = "failed"
        item["log"] = str(exc)
    finally:
        item["finished_at"] = int(time.time())
        item.pop("process", None)
        try:
            script_path.unlink(missing_ok=True)
        except OSError:
            pass


@app.get("/health")
def health():
    return {"ok": True, "k6_available": shutil.which("k6") is not None, "allowlist_configured": bool(ALLOWED_HOSTS)}


@app.post("/runs")
def start_run(body: RunRequest, authorization: str | None = Header(default=None)):
    authorize(authorization)
    urls = validate_urls(body.urls)
    if shutil.which("k6") is None:
        raise HTTPException(503, "k6 executable not found on PATH.")
    with LOCK:
        if any(x["state"] == "running" for x in RUNS.values()):
            raise HTTPException(409, "A test is already running. Stop or wait for it to finish.")
        run_id = str(uuid.uuid4())
        script_path = RESULTS / f"{run_id}.js"
        summary_path = RESULTS / f"{run_id}-summary.json"
        script_path.write_text(make_script(urls, body.vus, body.duration_seconds, body.pause_seconds, summary_path), encoding="utf-8")
        RUNS[run_id] = {"id": run_id, "state": "running", "created_at": int(time.time()), "urls": urls, "vus": body.vus, "duration_seconds": body.duration_seconds, "summary_file": str(summary_path)}
        threading.Thread(target=run_process, args=(run_id, script_path, summary_path), daemon=True).start()
    return {"id": run_id, "state": "running"}


@app.get("/runs/{run_id}")
def get_run(run_id: str, authorization: str | None = Header(default=None)):
    authorize(authorization)
    item = RUNS.get(run_id)
    if not item:
        raise HTTPException(404, "Run not found in this runner session.")
    safe = {k: v for k, v in item.items() if k not in {"process", "summary_file"}}
    summary = Path(item["summary_file"])
    if summary.exists():
        safe["summary"] = json.loads(summary.read_text(encoding="utf-8"))
    return safe


@app.post("/runs/{run_id}/stop")
def stop_run(run_id: str, authorization: str | None = Header(default=None)):
    authorize(authorization)
    item = RUNS.get(run_id)
    if not item:
        raise HTTPException(404, "Run not found.")
    proc = item.get("process")
    if proc and proc.poll() is None:
        proc.terminate()
        item["state"] = "stopping"
        return {"id": run_id, "state": "stopping"}
    return {"id": run_id, "state": item["state"]}
