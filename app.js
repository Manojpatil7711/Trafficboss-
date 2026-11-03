/* TrafficBoss frontend-only browser test panel. Original builder, storage, exports and reports remain in index.html. */
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
    <div class="muted">Send one real request from this browser. No backend, API token, Python service or runner required.</div>
    <div class="field"><label for="tb-check-url">Website URL (HTTPS recommended)</label><input id="tb-check-url" type="url" placeholder="https://example.com"></div>
    <div class="actions"><button class="primary" id="tb-check-start">Run browser check</button><button class="secondary" id="tb-check-clear">Clear result</button></div>
    <div class="tb-kpis">
      <div class="tb-kpi"><small>HTTP status</small><b id="tb-check-status">—</b></div>
      <div class="tb-kpi"><small>Response time</small><b id="tb-check-time">—</b></div>
      <div class="tb-kpi"><small>Content size</small><b id="tb-check-size">—</b></div>
    </div>
    <div class="tb-result" id="tb-check-result" role="status">Enter a website URL and run a check.</div>
    <p class="footnote">If the site blocks CORS, the browser can confirm basic connectivity but cannot reveal its HTTP status or content. One request only; this is not a load test.</p>
  `;
  const history=$('history');
  if(history) history.parentNode.insertBefore(panel,history); else main.appendChild(panel);
  const status=$('tb-check-status'),time=$('tb-check-time'),size=$('tb-check-size'),result=$('tb-check-result'),run=$('tb-check-start');
  run.addEventListener('click',async()=>{
    const raw=$('tb-check-url').value.trim();
    let target;
    try{target=new URL(raw);if(!['https:','http:'].includes(target.protocol))throw new Error();}
    catch{result.className='tb-result bad';result.textContent='Enter a valid HTTP or HTTPS URL.';return;}
    run.disabled=true;run.textContent='Checking…';
    status.textContent='Checking';time.textContent='—';size.textContent='—';
    result.className='tb-result';result.textContent='Sending one request…';
    const started=performance.now();
    const controller=new AbortController();
    let timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(target.href,{method:'GET',mode:'cors',cache:'no-store',redirect:'follow',signal:controller.signal});
      const body=await response.arrayBuffer();
      status.textContent=String(response.status);time.textContent=(performance.now()-started).toFixed(0)+' ms';size.textContent=body.byteLength.toLocaleString()+' B';
      result.className='tb-result '+(response.ok?'ok':'bad');
      result.textContent='HTTP response received: '+response.status+'. '+(response.ok?'Request succeeded.':'Server returned a non-success status.')+' Final URL: '+response.url;
    }catch(error){
      if(error.name==='AbortError'){
        status.textContent='Timed out';time.textContent=(performance.now()-started).toFixed(0)+' ms';
        result.className='tb-result bad';result.textContent='No response within 12 seconds. The site may be slow, unreachable, or restricting browser requests.';
      }else{
        clearTimeout(timer);const fallback=new AbortController();timer=setTimeout(()=>fallback.abort(),12000);
        try{
          const t=performance.now();
          await fetch(target.href,{method:'GET',mode:'no-cors',cache:'no-store',signal:fallback.signal});
          status.textContent='Opaque';time.textContent=(performance.now()-t).toFixed(0)+' ms';size.textContent='Hidden by browser';
          result.className='tb-result ok';result.textContent='Connectivity confirmed: the browser request completed. CORS hides the HTTP status and response body, so this does not confirm HTTP 200.';
        }catch(e){
          status.textContent='Unconfirmed';time.textContent=(performance.now()-started).toFixed(0)+' ms';
          result.className='tb-result bad';result.textContent='Browser could not complete the request. Possible causes: network/TLS issue, timeout, or website restrictions. This is not conclusive proof of downtime.';
        }
      }
    }finally{clearTimeout(timer);run.disabled=false;run.textContent='Run browser check';}
  });
  $('tb-check-clear').addEventListener('click',()=>{
    status.textContent='—';time.textContent='—';size.textContent='—';result.className='tb-result';result.textContent='Enter a website URL and run a check.';
  });
})();
