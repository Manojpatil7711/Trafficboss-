/* TrafficBoss Complete Platform layer. Keeps the original builder, reports and storage intact. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const style = document.createElement('style');
  style.textContent = `
    .tb-section{margin-top:18px}.tb-section h2{margin:0 0 5px;font-size:17px}
    .tb-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
    .tb-kpi{background:#0a1423;border:1px solid #263750;border-radius:11px;padding:13px}
    .tb-kpi b{display:block;font-size:20px;margin-top:5px}.tb-kpi small{color:#91a2bb}
    .tb-inline{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
    .tb-inline input{min-width:0;flex:1}
    .tb-state{font-size:12px;color:#91a2bb;margin-top:10px;white-space:pre-wrap;overflow-wrap:anywhere}
    .tb-ok{color:#5be0ae}.tb-bad{color:#ff9b9b}
    .tb-chip{display:inline-block;border:1px solid #31445f;border-radius:30px;padding:4px 8px;font-size:11px;color:#b8c8dd}
    .tb-navextra{border-top:1px solid #22324a;margin-top:12px;padding-top:12px}
    @media(max-width:600px){.tb-kpis{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const main = document.querySelector('.main');
  if (!main || $('tb-runner')) return;
  const section = document.createElement('section');
  section.className = 'panel tb-section';
  section.id = 'tb-runner';
  section.innerHTML = `
    <div class="tb-inline" style="justify-content:space-between">
      <div><h2>Live Test Runner</h2><div class="muted">Connect your own authorized k6 runner to execute real tests.</div></div>
      <span class="tb-chip" id="tb-connection-state">Not connected</span>
    </div>
    <div class="two">
      <div class="field"><label for="tb-runner-url">Runner API URL</label><input id="tb-runner-url" type="url" value="http://127.0.0.1:8787" placeholder="http://127.0.0.1:8787"></div>
      <div class="field"><label for="tb-runner-token">Runner API token (session only)</label><input id="tb-runner-token" type="password" autocomplete="off" placeholder="Paste your local runner token"></div>
    </div>
    <div class="actions"><button class="secondary" id="tb-connect">Check runner</button><button class="primary" id="tb-start" disabled>Start real test</button><button class="secondary" id="tb-refresh" disabled>Refresh run</button><button class="secondary" id="tb-stop" disabled>Stop run</button></div>
    <div class="tb-state" id="tb-runner-message">No test has been started. Runner credentials stay in this browser tab and are never sent anywhere except the runner URL you enter.</div>
    <div class="tb-kpis">
      <div class="tb-kpi"><small>Run state</small><b id="tb-run-state">—</b></div>
      <div class="tb-kpi"><small>Measured requests</small><b id="tb-run-requests">—</b></div>
      <div class="tb-kpi"><small>p95 response</small><b id="tb-run-p95">—</b></div>
    </div>
    <p class="footnote">Execution is limited by the runner's exact hostname allowlist, HTTPS-only checks, GET-only requests, 1–20 VUs and 10–300 seconds. Never expose the runner publicly. A browser page cannot start tests unless your own runner is installed and running.</p>
  `;
  main.appendChild(section);

  const nav = document.querySelector('.nav');
  if (nav) {
    const b = document.createElement('button');
    b.innerHTML = '<b>◉</b> Live Runner';
    b.addEventListener('click', () => section.scrollIntoView({behavior:'smooth'}));
    nav.appendChild(b);
  }

  let activeRun = null;
  let runnerReady = false;
  const message = (s, bad=false) => { $('tb-runner-message').textContent=s; $('tb-runner-message').className='tb-state '+(bad?'tb-bad':'tb-ok'); };
  const base = () => $('tb-runner-url').value.trim().replace(/\/+$/,'');
  const token = () => $('tb-runner-token').value.trim();
  const setState = s => { $('tb-connection-state').textContent=s; };
  async function api(path, options={}) {
    const headers = Object.assign({'Content-Type':'application/json'}, options.headers||{});
    if (token()) headers.Authorization = 'Bearer '+token();
    const response = await fetch(base()+path, Object.assign({},options,{headers}));
    const data = await response.json().catch(()=>({detail:'Runner returned a non-JSON response.'}));
    if (!response.ok) throw new Error(data.detail || data.message || ('HTTP '+response.status));
    return data;
  }
  $('tb-connect').addEventListener('click', async () => {
    try {
      if (!/^https?:\/\//i.test(base())) throw new Error('Enter a valid runner URL.');
      const h = await api('/health');
      runnerReady = !!h.ok && !!h.k6_available && !!h.allowlist_configured;
      setState(runnerReady?'Runner ready':'Runner needs setup');
      message('Runner reachable. k6: '+(h.k6_available?'installed':'not installed')+' · hostname allowlist: '+(h.allowlist_configured?'configured':'missing')+'.');
      $('tb-start').disabled = !runnerReady;
    } catch(e) { runnerReady=false; setState('Connection failed'); message(e.message+' Check that the runner is running and CORS allows this dashboard origin.',true); $('tb-start').disabled=true; }
  });
  $('tb-start').addEventListener('click', async () => {
    try {
      if (!runnerReady) throw new Error('Connect to a ready runner first.');
      const cfg = typeof config === 'function' ? config() : null;
      if (!cfg || !validURL(cfg.url)) throw new Error('Enter a valid target URL in Test Builder.');
      const payload = {urls:[cfg.url],vus:cfg.vus,duration_seconds:Math.min(300,Math.max(10,parseInt(cfg.duration,10)||30)),pause_seconds:2};
      const result = await api('/runs',{method:'POST',body:JSON.stringify(payload)});
      activeRun = result.id;
      $('tb-run-state').textContent=result.state||'running';
      $('tb-refresh').disabled=false; $('tb-stop').disabled=false; $('tb-start').disabled=true;
      message('Real test started. Run ID: '+activeRun+'. Refresh to retrieve measured results.');
    } catch(e) { message(e.message,true); }
  });
  $('tb-refresh').addEventListener('click', async () => {
    if (!activeRun) return;
    try {
      const r = await api('/runs/'+encodeURIComponent(activeRun));
      $('tb-run-state').textContent=r.state||'unknown';
      const m = r.summary && r.summary.metrics || {};
      const req = m.http_reqs && m.http_reqs.values || {};
      const dur = m.http_req_duration && m.http_req_duration.values || {};
      $('tb-run-requests').textContent=req.count==null?'—':Number(req.count).toLocaleString();
      $('tb-run-p95').textContent=dur['p(95)']==null?'—':Number(dur['p(95)']).toFixed(1)+' ms';
      message('Run '+r.state+'. '+(r.finished_at?'Finished at '+new Date(r.finished_at*1000).toLocaleString():'Still running.')+(r.log?'\\n'+r.log.slice(-1800):''));
      if (r.state!=='running' && r.state!=='stopping') { $('tb-start').disabled=!runnerReady; $('tb-stop').disabled=true; }
    } catch(e) { message(e.message,true); }
  });
  $('tb-stop').addEventListener('click', async () => {
    if (!activeRun) return;
    try { const r=await api('/runs/'+encodeURIComponent(activeRun)+'/stop',{method:'POST',body:'{}'}); $('tb-run-state').textContent=r.state; message('Stop requested. Refresh to confirm final state.'); $('tb-stop').disabled=true; }
    catch(e){message(e.message,true);}
  });

  // Add a focused navigation map without replacing any original controls or sections.
  const history = $('history');
  if (history) {
    const note = document.createElement('div');
    note.className='notice';
    note.textContent='Professional workspace: Overview · Test Builder · Script Export · Test History · Real Reports · Advanced Journeys · Live Runner. Device and attribution labels remain test metadata; they do not spoof users or traffic sources.';
    history.parentNode.insertBefore(note, history);
  }
})();
