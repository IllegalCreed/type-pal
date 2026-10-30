// 静态面板样式的幂等安装；调用时读取DOM，不在模块加载时创建节点。
const STYLE_ID = 'tp-tools-style'

/** 注入面板样式(幂等)。 */
export function injectToolsPanelStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#tp-tools-panel {
  --tp-gold:#d8b365; --tp-cream:#f0e0b0; --tp-crimson:#8a2a2a; --tp-crimson-dark:#5a1414;
  --tp-slot:#2a1515; --tp-border:#553322; --tp-text:#cbb890; --tp-text-dim:#a38f70;
  --tp-error:#e06c5a; --tp-glow:rgba(160,30,30,0.5);
  --tp-control-height:32px; --tp-control-font-size:14px; --tp-control-radius:5px;
  --tp-control-gap:8px; --tp-control-padding:10px;
  position:fixed; top:16px; left:16px; width:min(430px,calc(100vw - 32px)); max-height:84vh; z-index:30;
  display:flex; background:rgba(17,17,17,0.93); backdrop-filter:blur(7px);
  border:1px solid var(--tp-gold); border-radius:8px;
  box-shadow:0 0 22px var(--tp-glow), 0 6px 26px rgba(0,0,0,0.62);
  font:14px/1.6 "Songti SC","SimSun",serif; color:var(--tp-text);
  overflow:hidden; animation:tp-panel-in .18s ease; }
html[lang="en"]:not([data-tp-layout="mobile"]) #tp-tools-panel { width:min(550px,calc(100vw - 32px)); }
html[lang="en"] #tp-tools-panel .tp-title,
html[lang="en"] #tp-tools-panel .tp-tab,
html[lang="en"] #tp-tools-panel .tp-section-title { letter-spacing:normal; }
html[lang="en"]:not([data-tp-layout="mobile"]) #tp-tools-panel .tp-tabbar { flex-basis:96px; }
html[lang="en"]:not([data-tp-layout="mobile"]) #tp-tools-panel .tp-tab { padding-left:12px; }
html[lang="en"] #tp-tools-panel .tp-stat-line .k { flex-basis:6em; }
html[lang="en"] #tp-tools-panel .tp-time-row { flex-wrap:wrap; }
html[lang="en"] #tp-tools-panel .tp-time-row .tp-ctrl-label { min-width:110px; }
@keyframes tp-panel-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
#tp-tools-panel[hidden], #tp-tools-panel [hidden] { display:none; }
.tp-tabbar { flex:0 0 88px; display:flex; flex-direction:column; padding:14px 0;
  background:rgba(0,0,0,0.25); border-right:1px solid var(--tp-border); }
.tp-tab { font:16px/1 "Songti SC","SimSun",serif; color:var(--tp-text-dim);
  background:transparent; border:none; border-left:3px solid transparent;
  padding:12px 0 12px 20px; text-align:left; cursor:pointer; letter-spacing:3px;
  transition:color .12s, background .12s; }
.tp-tab:hover { color:var(--tp-text); background:rgba(216,179,101,0.07); }
.tp-tab.tp-tab-active { color:#1a140c; font-weight:bold; border-left-color:var(--tp-crimson);
  background:linear-gradient(90deg, var(--tp-gold), #c9a456); }
.tp-main { flex:1 1 auto; display:flex; flex-direction:column; min-width:0; }
.tp-header { display:flex; align-items:center; justify-content:space-between;
  padding:13px 18px 12px; border-bottom:1px solid var(--tp-border); }
.tp-title { color:var(--tp-gold); font-size:17px; letter-spacing:5px;
  text-shadow:0 0 10px rgba(160,30,30,0.45); }
.tp-title-wrap { display:flex; align-items:baseline; flex-wrap:wrap; min-width:0; gap:4px 12px; }
.tp-gh-link { color:var(--tp-text-dim); font-size:12px; text-decoration:none;
  border-bottom:1px dotted var(--tp-text-dim); transition:color .12s, border-color .12s; }
.tp-gh-link:hover { color:var(--tp-gold); border-bottom-color:var(--tp-gold); }
.tp-close { background:transparent; border:none; color:var(--tp-text-dim);
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--tp-control-height); height:var(--tp-control-height); flex:0 0 var(--tp-control-height);
  font-size:20px; line-height:1; cursor:pointer; padding:0; transition:color .12s; }
.tp-close:hover { color:var(--tp-cream); }
/* Pointer clicks use themed states; keyboard navigation keeps a shared visible focus ring. */
.tp-tab:focus, .tp-btn:focus, .tp-close:focus { outline:none; }
.tp-body { flex:1 1 auto; overflow-y:auto; overscroll-behavior:contain; padding:6px 18px 18px; }
.tp-body::-webkit-scrollbar { width:8px; }
.tp-body::-webkit-scrollbar-track { background:var(--tp-slot); }
.tp-body::-webkit-scrollbar-thumb {
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-gold)); border-radius:4px; }
.tp-row { display:flex; align-items:baseline; gap:10px; padding:4px 0; }
.tp-row-label { color:var(--tp-text-dim); flex:0 0 auto; min-width:84px; }
.tp-row-value { color:var(--tp-gold); font-family:ui-monospace,Menlo,monospace; font-size:13px;
  min-width:0; overflow-wrap:anywhere; }
.tp-section-title { color:var(--tp-cream); font-size:15px; letter-spacing:2px;
  margin:20px 0 12px; padding-bottom:6px; border-bottom:1px solid var(--tp-border); }
.tp-section-title:first-child { margin-top:4px; }
.tp-ctrl-row { display:flex; align-items:center; gap:var(--tp-control-gap);
  min-height:var(--tp-control-height); margin-bottom:var(--tp-control-gap); }
.tp-ctrl-label { color:var(--tp-text-dim); flex:0 0 auto; min-width:40px; }
.tp-ctrl-val { color:var(--tp-gold); font-family:ui-monospace,Menlo,monospace; font-size:13px;
  flex:0 0 auto; min-width:54px; text-align:right; }
.tp-btn, .tp-input { box-sizing:border-box; height:var(--tp-control-height);
  border-radius:var(--tp-control-radius);
  font:var(--tp-control-font-size)/20px "Songti SC","SimSun",serif; }
.tp-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:0 var(--tp-control-padding); white-space:nowrap; color:var(--tp-cream);
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-crimson-dark));
  border:1px solid var(--tp-gold); cursor:pointer; letter-spacing:1px;
  box-shadow:0 0 7px var(--tp-glow); transition:transform .1s, filter .1s; }
.tp-btn:not(:disabled):hover { transform:translateY(-1px); filter:brightness(1.12); }
.tp-btn:not(:disabled):active { transform:translateY(0); }
.tp-btn:disabled, .tp-input:disabled { opacity:.5; cursor:not-allowed; }
.tp-body > .tp-btn { margin-top:var(--tp-control-gap); }
.tp-range { accent-color:var(--tp-gold); flex:1 1 auto; min-width:0;
  height:var(--tp-control-height); margin:0; cursor:pointer; }
.tp-input { background:var(--tp-slot); color:var(--tp-cream); border:1px solid var(--tp-border);
  padding:0 var(--tp-control-padding); width:100%; min-width:0; color-scheme:dark; }
.tp-input:hover { border-color:var(--tp-gold); }
.tp-input:focus { outline:none; border-color:var(--tp-gold); }
.tp-input::placeholder { color:var(--tp-text-dim); }
select.tp-input { appearance:none; flex:1 1 auto; padding-right:34px; cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='m1 1 4 4 4-4' fill='none' stroke='%23d8b365' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 12px center; }
.tp-input:focus-visible, .tp-btn:focus-visible, .tp-tab:focus-visible,
.tp-close:focus-visible, #tp-tools-launcher:focus-visible {
  outline:2px solid var(--tp-gold, #d8b365); outline-offset:2px; }
.tp-tab:focus-visible { outline-offset:-3px; }
.tp-muted { color:var(--tp-text-dim); }
.tp-dialog-line { padding:6px 0; border-bottom:1px solid var(--tp-border); line-height:1.55; }
.tp-unit { border:1px solid var(--tp-border); border-radius:6px; padding:9px 12px 7px;
  margin-bottom:11px; background:rgba(0,0,0,0.18); }
.tp-unit-head { display:flex; justify-content:space-between; align-items:baseline;
  flex-wrap:wrap; min-width:0; gap:4px var(--tp-control-gap);
  margin-bottom:7px; padding-bottom:6px; border-bottom:1px solid rgba(85,51,34,0.55); }
.tp-unit-name { color:var(--tp-cream); font-size:15px; letter-spacing:1px;
  min-width:0; overflow-wrap:anywhere; }
.tp-unit-hp { font-family:ui-monospace,Menlo,monospace; font-size:13px;
  min-width:0; overflow-wrap:anywhere; }
.tp-stat-line { font-size:13px; line-height:1.85; display:flex; align-items:baseline; }
.tp-stat-line .k { color:var(--tp-text-dim); margin-right:8px; flex:0 0 3.2em; }
.tp-stat-chips { display:flex; flex-wrap:wrap; flex:1 1 0; min-width:0; }
.tp-chip { display:inline-block; margin:0 8px 1px 0; font-family:ui-monospace,Menlo,monospace; font-size:12.5px; }
.e-wind{color:#6fcf97} .e-thunder{color:#bb8fce} .e-water{color:#5dade2} .e-fire{color:#ec7063}
.e-earth{color:#d4ac6e} .e-phys{color:#9aa6a8} .e-poison{color:#a3d977} .e-sorcery{color:#e3a3d6}
.s-debuff{color:#e06c5a} .s-buff{color:#7fc88a} .s-poison{color:#b88fd6} .s-steal{color:#f0c674} .s-collect{color:#caa6e8}
.tp-mm-wrap { display:flex; justify-content:center; margin:4px 0 9px; }
.tp-minimap-canvas { border:1px solid var(--tp-border); border-radius:5px; background:#0d0b08; max-width:100%; }
.tp-mm-legend { display:flex; gap:18px; justify-content:center; margin-bottom:12px;
  font-size:12.5px; color:var(--tp-text-dim); }
.tp-mm-leg { display:inline-flex; align-items:center; gap:5px; }
.tp-mm-leg i { width:9px; height:9px; border-radius:50%; display:inline-block; box-shadow:0 0 2px rgba(0,0,0,0.6); }
.tp-toggle { display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:8px 2px; cursor:pointer; border-bottom:1px solid rgba(85,51,34,0.4); }
.tp-toggle span { color:var(--tp-text); }
.tp-toggle input { accent-color:var(--tp-gold); width:16px; height:16px; cursor:pointer; flex:0 0 auto; }
#tp-minimap-widget { position:fixed; bottom:12px; right:12px; z-index:28; pointer-events:none; }
#tp-minimap-widget canvas { display:block; border-radius:6px; padding:5px;
  background:rgba(17,17,17,0.82); border:1px solid #d8b365;
  box-shadow:0 0 14px rgba(160,30,30,0.4),0 2px 10px rgba(0,0,0,0.5); }
.tp-mm-zoom { position:absolute; top:9px; right:9px; display:flex; flex-direction:column; gap:5px; pointer-events:auto; }
.tp-mm-zoom button { width:19px; height:19px; padding:0; line-height:1;
  background:rgba(17,17,17,0.7); color:#d8b365; border:1px solid #d8b365; border-radius:4px;
  font:13px/1 ui-monospace,monospace; cursor:pointer; opacity:0.7; transition:opacity .12s, background .12s; }
.tp-mm-zoom button:hover { opacity:1; background:rgba(160,30,30,0.55); }
#tp-tools-launcher { position:fixed; bottom:12px; left:12px; z-index:29;
  width:38px; height:38px; background:rgba(17,17,17,0.85); color:#d8b365;
  border:1px solid #d8b365; border-radius:7px; font:21px/1 system-ui,"Segoe UI Symbol",sans-serif;
  cursor:pointer; opacity:0.5; transition:opacity .15s, box-shadow .15s; }
.tp-action-row { display:flex; align-items:center; flex-wrap:wrap;
  gap:var(--tp-control-gap); margin:8px 0; min-width:0; }
.tp-action-row > .tp-btn { flex:1 1 auto; }
.tp-action-row > .tp-input { flex:1 1 144px; width:auto; }
.tp-time-row .tp-ctrl-label { flex:1 1 0; min-width:0; overflow-wrap:anywhere; }
.tp-time-row .tp-input { flex:0 0 120px; width:120px; max-width:50%;
  font-family:ui-monospace,Menlo,monospace; font-variant-numeric:tabular-nums; }
.tp-save-row { display:flex; align-items:center; gap:var(--tp-control-gap); padding:8px 0;
  border-bottom:1px solid rgba(85,51,34,0.35); }
.tp-save-label { color:var(--tp-text); flex:0 0 auto; min-width:60px; font-size:14px; }
.tp-save-row .tp-btn { flex:1 1 0; min-width:0; }
#tp-tools-launcher:hover { opacity:1; box-shadow:0 0 12px rgba(160,30,30,0.5); }
.tp-key-row { display:flex; align-items:flex-start; gap:12px; padding:6px 0;
  border-bottom:1px solid rgba(85,51,34,0.3); }
.tp-key-caps { flex:0 0 152px; display:flex; flex-wrap:wrap; align-items:center; gap:4px 3px; }
.tp-key-sep { color:var(--tp-text-dim); font-size:11px; }
.tp-kbd { display:inline-block; font-family:ui-monospace,Menlo,monospace; font-size:12px; line-height:1.1;
  color:var(--tp-cream); background:var(--tp-slot); border:1px solid var(--tp-border);
  border-bottom-width:2px; border-radius:4px; padding:3px 6px; white-space:nowrap; }
.tp-key-desc { flex:1 1 auto; color:var(--tp-text); font-size:13.5px; line-height:1.5; padding-top:2px; }
@media (max-width:420px) {
  .tp-key-row { flex-direction:column; gap:6px; }
  .tp-key-caps { flex:0 0 auto; }
  .tp-key-desc { padding-top:0; }
}
@media (prefers-reduced-motion:reduce) {
  #tp-tools-panel { animation:none; }
  .tp-tab, .tp-btn, .tp-close, .tp-gh-link, #tp-tools-launcher { transition:none; }
  .tp-btn:not(:disabled):hover { transform:none; }
}
`
  document.head.appendChild(style)
}
