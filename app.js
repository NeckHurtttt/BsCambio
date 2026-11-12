'use strict';
const $ = s => document.querySelector(s);
const f2 = x => x == null || isNaN(x) ? '—' : x.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NOMBRES = { binancep2p: 'Binance P2P', bybitp2p: 'Bybit P2P', bitgetp2p: 'Bitget P2P', okexp2p: 'OKX P2P', vitawallet: 'Vita Wallet', saldo: 'Saldo', eldoradop2p: 'El Dorado P2P', airtm: 'Airtm', kucoinp2p: 'KuCoin P2P', huobip2p: 'HTX P2P', mexcp2p: 'MEXC P2P' };
const V = { of: null, pa: null, pac: null };
let historial = [], dias = 7;

async function json(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return r.json(); }

async function vivo() {
  try {
    const d = Object.fromEntries((await json('https://bo.dolarapi.com/v1/dolares')).map(x => [x.casa, x]));
    V.of = d.oficial?.venta; V.pa = d.binance?.venta; V.pac = d.binance?.compra;
    $('#vivo').className = 'ok'; $('#vivo span').textContent = 'en vivo · ' + new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    const u = historial.at(-1); // sin internet o API caída: último dato guardado
    if (u) { V.of = u.ov; V.pa = u.pv; V.pac = u.pc; }
    $('#vivo').className = ''; $('#vivo span').textContent = 'sin conexión · último registro';
  }
  pintarTarjetas(); calcular('usd');
  exchanges();
}

function pintarTarjetas() {
  $('#of').textContent = f2(V.of);
  $('#pa').textContent = f2(V.pa);
  $('#pa2').textContent = `compra ${f2(V.pac)} · venta ${f2(V.pa)}`;
  $('#br').textContent = V.of && V.pa ? ((V.pa / V.of - 1) * 100).toFixed(1).replace('.', ',') + ' %' : '—';
}

let ultimoCampo = 'usd';
function calcular(desde) {
  ultimoCampo = desde;
  const t = V[$('#tasa').value]; if (!t) return;
  if (desde === 'usd') $('#bob').value = (+$('#usd').value * t).toFixed(2);
  else $('#usd').value = (+$('#bob').value / t).toFixed(2);
  const usd = +$('#usd').value;
  if (V.of && V.pa && usd) $('#dif').innerHTML = `${f2(usd)} US$ al paralelo son <b>${f2(usd * (V.pa - V.of))} Bs</b> más que al oficial.`;
}
$('#usd').oninput = () => calcular('usd');
$('#bob').oninput = () => calcular('bob');
$('#tasa').onchange = () => calcular(ultimoCampo);

async function exchanges() {
  let ex, fecha;
  try { ex = await json('https://criptoya.com/api/usdt/bob/1'); fecha = 'en vivo'; }
  catch { try { const d = await json('datos/exchanges.json'); ex = d.exchanges; fecha = d.fecha; } catch { return; } }
  const filas = Object.entries(ex).filter(([, v]) => v && v.totalAsk > 0).sort((a, b) => a[1].totalAsk - b[1].totalAsk);
  const mejor = filas[0]?.[0];
  $('#ex tbody').innerHTML = filas.slice(0, 8).map(([k, v]) => `<tr class="${k === mejor ? 'mejor' : ''}"><td>${NOMBRES[k] || k}</td><td>${f2(v.totalBid)}</td><td>${f2(v.totalAsk)}</td></tr>`).join('');
  $('#exf').textContent = '· USDT, ' + fecha + ' · verde = más barato para comprar';
}

async function cargarHistorial() {
  try {
    const t = await (await fetch('datos/historial.csv', { cache: 'no-store' })).text();
    historial = t.trim().split('\n').slice(1).map(l => {
      const [fecha, oc, ov, pc, pv] = l.split(',');
      return { t: new Date(fecha.replace('Z', ':00Z')), oc: +oc || null, ov: +ov || null, pc: +pc || null, pv: +pv || null };
    }).filter(x => !isNaN(x.t));
  } catch { historial = []; }
  grafico();
}

function grafico() {
  const g = $('#graf'), W = 900, H = 300, m = { l: 52, r: 16, t: 14, b: 28 };
  const desde = dias ? Date.now() - dias * 864e5 : 0;
  const d = historial.filter(x => +x.t >= desde);
  if (d.length < 2) { g.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Juntando datos: la Action guarda uno por hora (${historial.length} hasta ahora).</text>`; return; }
  const t0 = +d[0].t, t1 = +d.at(-1).t;
  const vals = d.flatMap(x => [x.ov, x.pv]).filter(Boolean);
  let y0 = Math.min(...vals), y1 = Math.max(...vals); const pad = (y1 - y0) * .15 || .1; y0 -= pad; y1 += pad;
  const X = t => m.l + (t - t0) / (t1 - t0 || 1) * (W - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  let s = '<defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe14d" stop-opacity=".25"/><stop offset="1" stop-color="#ffe14d" stop-opacity="0"/></linearGradient></defs>';
  for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#23233a"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(2)}</text>`; }
  for (let i = 0; i <= 4; i++) { const t = t0 + (t1 - t0) * i / 4; s += `<text x="${X(t)}" y="${H - 8}" text-anchor="middle">${new Date(t).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}${dias === 1 ? ' ' + new Date(t).toLocaleTimeString('es-BO', { hour: '2-digit' }) + 'h' : ''}</text>`; }
  const linea = k => d.filter(x => x[k]).map((x, i) => `${i ? 'L' : 'M'}${X(+x.t).toFixed(1)},${Y(x[k]).toFixed(1)}`).join('');
  const lp = linea('pv');
  if (lp) s += `<path d="${lp}L${X(t1)},${H - m.b}L${X(+d.find(x => x.pv).t)},${H - m.b}Z" fill="url(#gp)"/>`;
  s += `<path d="${linea('ov')}" fill="none" stroke="#22e6ff" stroke-width="2"/><path d="${lp}" fill="none" stroke="#ffe14d" stroke-width="2.5" style="filter:drop-shadow(0 0 4px #ffe14d)"/>`;
  s += `<text x="${W - m.r}" y="${m.t + 10}" text-anchor="end" style="fill:#ffe14d">● paralelo</text><text x="${W - m.r - 100}" y="${m.t + 10}" text-anchor="end" style="fill:#22e6ff">● oficial</text>`;
  g.innerHTML = s;
}
document.querySelectorAll('.rangos button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.rangos button').forEach(x => x.classList.toggle('on', x === b));
  dias = +b.dataset.d; grafico();
});

cargarHistorial().then(vivo);
setInterval(vivo, 60000);
