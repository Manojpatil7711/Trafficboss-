# TrafficBoss Local k6 Runner (Advanced)

This is an optional, self-hosted execution companion. The Cloudflare Pages dashboard remains static; this runner executes approved k6 HTTP checks on a machine you control.

## Requirements
- Python 3.11+
- k6 installed and available as `k6` on PATH
- A machine with network access to your staging/QA site

## Setup
1. Copy `.env.example` to `.env` and set `TRAFFICBOSS_ALLOWED_HOSTS` to exact hostnames you own/control. Do not use wildcards.
2. Set `TRAFFICBOSS_API_TOKEN` to a long random secret.
3. Install dependencies: `python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt` (Windows: `.venv\\Scripts\\activate`).
4. Export the environment variables from `.env` in your shell, then run `uvicorn server:app --host 127.0.0.1 --port 8787` from this folder.
5. Check `http://127.0.0.1:8787/health`.

## API
- `GET /health` — runner readiness.
- `POST /runs` — start a conservative GET-only test. Requires `Authorization: Bearer <TRAFFICBOSS_API_TOKEN>` and JSON: `{"urls":["https://staging.example.com/"],"vus":3,"duration_seconds":30,"pause_seconds":2}`.
- `GET /runs/{id}` — current state and bounded log tail.
- `POST /runs/{id}/stop` — stop an active run.

Limits: 1–20 VUs, 10–300 seconds, at most 10 URLs, exact allowlisted hostname, HTTPS only, GET only, and one active run at a time. The runner generates its own k6 script; it does not accept arbitrary shell commands or uploaded scripts. Results are written to `runner/results/` as actual k6 summary JSON. Do not expose this service directly to the public internet.

This runner is intentionally for authorized staging/QA performance checks. It does not create fake human visitors, impersonate referral sources, rotate identities/proxies, click advertisements, or manipulate analytics. Browser click automation and device emulation are not part of this runner.
