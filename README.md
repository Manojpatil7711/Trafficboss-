# TrafficBoss

TrafficBoss is a mobile-friendly web performance testing workspace. It opens directly to the dashboard; there is no login page or account system.

## Current capabilities
- Responsive dashboard for desktop and Android-sized screens
- Conservative k6 test-plan builder, capped at 20 virtual users
- Generates a k6 script with response-time and error-rate thresholds
- Copy and download generated test scripts
- Saved plans persist in the current browser using local storage
- Load, delete, and export saved-plan backups as JSON
- Import actual k6 summary JSON and view measured request count, average response time, p95 response time, and failed-request rate
- Export imported measurements as CSV
- Offline app-shell support through a service worker
- Baseline security response headers for Cloudflare Pages
- No fabricated traffic, metrics, or test results

## Deployment on Cloudflare Pages
Connect this GitHub repository to Cloudflare Pages. Use the repository root as the project root, leave the build command empty, and set the build output directory to `/` (root). The project is static HTML and does not require a build step. Every commit to the connected branch can trigger a new deployment.

## Run locally
Open `index.html` in a modern browser. Offline support requires serving the site over HTTPS or localhost. To execute generated scripts, install k6 separately and run the script only in an authorized test environment.

## Safety and scope
Use only against websites and systems you own or are explicitly authorized to test. This project is for controlled performance/load testing, not fake visits, analytics manipulation, ad manipulation, or traffic generation against third-party targets.

## Important compatibility note
The supplied Windows ZIP contains a compiled `Mass Site Visitor.exe`, browser drivers, and browser extensions, but no original application source code. Exact feature parity with that executable cannot be verified or guaranteed. TrafficBoss is a web rebuild; it is not a port of the original binary.

## Not yet implemented
- Hosted test execution engine (the dashboard currently generates scripts; it does not run them)
- Server-side database or cross-device plan synchronization
- Automated browser/device execution
- Live monitoring and test-run logs
