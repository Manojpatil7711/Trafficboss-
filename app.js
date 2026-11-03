/* TrafficBoss browser-only additions. Original dashboard, builder, history and report features remain intact. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const main = document.querySelector('.main');
  if (!main || $('tb-browser-check')) return;

  const style = document.createElement('style');
  style.textContent = `
    .tb-browser-check{margin-top:18px}
    .tb-browser-check .tb-result{margin-top:12px;padding:12px;border:1px solid #263750;border-radius:10px;background:#091321;color:#aebdd1;white-space:pre-wrap;overflow-wrap:anywhere}
    .tb-browser-check .tb-result.ok{color:#5be0ae}.tb-browser-check .tb-result.bad{color:#ffb0a8}
    .tb-browser-check .tb-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
    .tb-browser-check .tb-kpi{background:#0a1423;border:1px solid #263750;border-radius:10px;padding:12px}
    .tb-browser-check .tb-kpi small{color:#91a2bb}.tb-browser-check .tb-kpi b{display:block;font-size:19px;margin-top:4px}
    @media(max-width:600px){.tb-browser-check .tb-kpis{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('section');
  panel.className='panel tb-browser-check';
  panel.id='tb-browser-check';
  panel.innerHTML=`
    <h2>Browser Website Check</h2>
    <div class="muted">Run a real, single-request availability and timing check directly from this browser. No server, account token, Python service or database required.</div>
    <div class="field"><label for="tb-check-url">Website URL (HTTPS recommended)</label><input id="tb-check-url" type="url" placeholder="https://your-website.example"></div>
    <div class="actions"><button class="primary" id="tb-check-start">Run browser check</button><button class="secondary" id="tb-check-clear">Clear result</button></div>
    <div class="tb-kpis">
      <div class="tb-kpi"><small>HTTP status</small><b id="tb-check-status">—</b></div>
      <div class="tb-kpi"><small>Response time</small><b id="tb-check-time">—</b></div>
      <div class="tb-kpi"><small>Content size</small><b id="tb-check-size">—</b></div>
    </div>
    <div class="tb-result" id="tb-check-result" role="status">No check run yet.</div>
    <p class="footnote">Browser security note: many websites block cross-origin reads. If that happens, the browser cannot reveal their HTTP status or response body; this is a CORS restriction, not proof the website is down. This tool intentionally sends one request per click and does not generate fake visitors or load-test traffic.</p>
  `;
  const history=document.getElementById('history');
  if(history) history.parentNode.insertBefore(panel,history);
  else main.appendChild(panel);

  const status=$('tb-check-status'),time=$('tb-check-time'),size=$('tb-check-size'),result=$('tb-check-result'),run=$('tb-check-start');
  run.addEventListener('click',async()=>{
    const raw=$('tb-check-url').value.trim();
    let target;
    try{target=new URL(raw);if(!['https:','http:'].includes(target.protocol))throw new Error();}
    catch{result.className='tb-result bad';result.textContent='Enter a valid HTTP or HTTPS URL.';return;}
    run.disabled=true;run.textContent='Checking…';
    status.textContent='…';time.textContent='…';size.textContent='…';
    result.className='tb-result';result.textContent='Sending one browser request…';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    const started=performance.now();
    try{
      const response=await fetch(target.href,{method:'GET',mode:'cors',cache:'no-store',redirect:'follow',signal:controller.signal});
      const elapsed=performance.now()-started;
      const body=await response.arrayBuffer();
      status.textContent=String(response.status);
      time.textContent=elapsed.toFixed(0)+' ms';
      size.textContent=body.byteLength.toLocaleString()+' B';
      result.className='tb-result '+(response.ok?'ok':'bad');
      result.textContent='Request completed. '+(response.ok?'Website returned a successful HTTP response.':'Website returned a non-success HTTP response.')+' Final URL: '+response.url;
    }catch(error){
      if(error.name==='AbortError'){
        status.textContent='Timed out';time.textContent=(performance.now()-started).toFixed(0)+' ms';size.textContent='—';
        result.className='tb-result bad';
        result.textContent='No response within 12 seconds. The site may be slow, unreachable, or blocking the request.';
      } else {
        /* Retry in no-cors mode: an opaque response confirms the browser request completed,
           but deliberately does not expose HTTP status, headers, or body. */
        try{
          const fallbackController=new AbortController();
          const fallbackTimer=setTimeout(()=>fallbackController.abort(),12000);
          const fallbackStart=performance.now();
          await fetch(target.href,{method:'GET',mode:'no-cors',cache:'no-store',signal:fallbackController.signal});
          clearTimeout(fallbackTimer);
          status.textContent='Opaque response';
          time.textContent=(performance.now()-fallbackStart).toFixed(0)+' ms';
          size.textContent='Hidden by browser';
          result.className='tb-result ok';
          result.textContent='Browser request completed. The website is reachable from this browser, but its HTTP status and response content are hidden by cross-origin security (CORS). This is a connectivity check, not a verified HTTP 200 result.';
        }catch(fallbackError){
          status.textContent='Unconfirmed';time.textContent=(performance.now()-started).toFixed(0)+' ms';size.textContent='—';
          result.className='tb-result bad';
          result.textContent='The browser could not complete the request. Possible causes include network/TLS failure, timeout, or site restrictions. This does not conclusively prove the website is down.';
        }
      }
    }finally{clearTimeout(timeout);run.disabled=false;run.textContent='Run browser check';}
  });
  $('tb-check-clear').addEventListener('click',()=>{
    status.textContent='—';time.textContent='—';size.textContent='—';result.className='tb-result';result.textContent='No check run yet.';
  });
})();
