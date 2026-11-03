# TrafficBoss

TrafficBoss is a frontend-only website performance and QA workspace. It opens directly to the dashboard; there is no login page, backend service, API token, server-side database, or account system.

## Current browser-only capabilities
- Responsive dashboard for desktop and Android-sized screens
- Conservative k6 test-plan builder (generates scripts for optional manual use; does not execute them)
- Copy and download generated test scripts
- Saved plans persist in this browser using local storage
- Load, delete, and export saved-plan backups as JSON
- Import actual k6 summary JSON and view measured request count, average response time, p95 response time, and failed-request rate
- Export imported measurements as CSV
- Browser Website Check: one user-initiated GET request, response status/time/size when the target permits cross-origin access (CORS)
- Advanced multi-page k6 script generation
- Offline app-shell support through a service worker
- Baseline security response headers for Cloudflare Pages
- No fabricated traffic, metrics, or test results

## Deployment on Cloudflare Pages
Connect this GitHub repository to Cloudflare Pages. Use the repository root as the project root, leave the build command empty, and set the build output directory to `.` (repository root). The project is static HTML and does not require a build step. Every commit to the connected branch can trigger a new deployment.

## Run locally
Open `index.html` in a modern browser. Offline support requires serving the site over HTTPS or localhost.

## Browser and testing limitations
Browsers enforce same-origin and CORS restrictions. The Browser Website Check can read status, response time and size only when the target allows the browser origin. A CORS failure is not proof that a website is down. The browser-only app does not run sustained load tests, create virtual users, emulate physical devices, or provide continuous 24/7 monitoring. Generated k6 scripts can be downloaded and run separately by an authorized operator, but TrafficBoss itself does not require or host a runner.

## Safety and scope
Use only against websites and systems you own or are explicitly authorized to test. This project is for controlled QA and performance inspection, not fake visits, analytics manipulation, ad manipulation, or traffic generation against third-party targets.

## Original software compatibility
The supplied Windows ZIP contains a compiled `Mass Site Visitor.exe`, browser drivers, and browser extensions, but no original application source code. Exact feature parity with that executable cannot be verified or guaranteed. TrafficBoss is a web rebuild; it is not a port of the original binary.
