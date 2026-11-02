# TrafficBoss

TrafficBoss is being rebuilt as a mobile-friendly web performance testing workspace.

## Current foundation (v0.1)
- Responsive dashboard for desktop and Android-sized screens
- Conservative test-plan builder (maximum 20 virtual users)
- Generates a k6 script with response-time and error-rate thresholds
- Copy/download generated test script
- Local in-session plan list
- Clear distinction between plans and real test results (no fabricated metrics)

## Safety and scope
Use only against websites and systems you own or are explicitly authorized to test. This project is for controlled performance/load testing, not fake visits, analytics manipulation, ad manipulation, or traffic generation against third-party targets.

## Important compatibility note
The supplied Windows ZIP contains a compiled `Mass Site Visitor.exe`, browser drivers, and browser extensions, but no original application source code. Exact feature parity with that executable cannot be verified or guaranteed. This web app is a clean rebuild, not a port of the original binary.

## Run locally
Open `index.html` in a modern browser. To execute generated scripts, install k6 separately and run the script only in an authorized test environment.

## Roadmap
- Backend/API and persistent projects
- Authentication and workspace roles
- Test-runner integration with strict target allowlists and rate limits
- Real run history, logs, and downloadable reports
- URL groups, test profiles, and environment management
- Audit trail and usage controls
