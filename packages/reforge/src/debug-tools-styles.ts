export const ROOT_ID = 'tp-debug'
export const STYLE_ID = 'tp-reforge-debug-style'

/** Reforge 私有样式；复用一阶段视觉 token，但不建立跨包运行时依赖。 */
export function injectDebugToolsStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#${ROOT_ID} {
  --tpd-bg:rgba(24,24,28,.96); --tpd-surface:#1c1c20; --tpd-control:#2d2d34;
  --tpd-control-hover:#3a3a45; --tpd-border:#3a3a42; --tpd-border-strong:#45454f;
  --tpd-text:#e8e8e8; --tpd-text-dim:#a0a0aa; --tpd-title:#fdf6a8;
  --tpd-section:#c4d1ff; --tpd-accent:#6c8eef; --tpd-error:#ff7a70;
  --tpd-success:#75d38b; --tpd-warn:#f0b35a; --tpd-info:#8ab4d8;
  position:fixed; top:12px; left:12px; z-index:2147483000;
  width:min(420px, calc(100vw - 24px)); height:min(680px, 88vh); max-height:88vh;
  display:flex; flex-direction:column; overflow:hidden; color:var(--tpd-text);
  background:var(--tpd-bg); border:1px solid var(--tpd-border); border-radius:8px;
  box-shadow:0 4px 16px rgba(0,0,0,.5);
  font:12px/1.45 ui-monospace,"SF Mono",Menlo,Monaco,Consolas,monospace;
  color-scheme:dark;
}
#${ROOT_ID}[hidden] { display:none; }
#${ROOT_ID} * { box-sizing:border-box; }
#${ROOT_ID} .tpd-main { flex:1 1 auto; min-width:0; min-height:0; display:flex; flex-direction:column; }
#${ROOT_ID} .tpd-header {
  flex:0 0 auto; display:flex; align-items:flex-start; justify-content:space-between; gap:8px;
  padding:9px 10px 7px;
}
#${ROOT_ID} .tpd-title {
  flex:0 0 auto; color:var(--tpd-title); font-size:13px; font-weight:600; line-height:1.7;
  white-space:nowrap;
}
#${ROOT_ID} .tpd-header-meta {
  flex:1 1 auto; min-width:0; display:flex; flex-wrap:wrap; align-items:center;
  justify-content:flex-end; gap:3px 5px;
}
#${ROOT_ID} .tpd-badge {
  padding:1px 5px; border:1px solid currentColor; border-radius:999px;
  font-size:10px; line-height:1.45; white-space:nowrap;
}
#${ROOT_ID} .tpd-badge[data-state="idle"] { color:var(--tpd-success); }
#${ROOT_ID} .tpd-badge[data-state="busy"] { color:var(--tpd-warn); }
#${ROOT_ID} .tpd-status {
  flex:1 0 100%; min-height:1.45em; overflow:hidden; color:var(--tpd-text-dim);
  font-size:11px; text-align:right; text-overflow:ellipsis; white-space:nowrap;
}
#${ROOT_ID} [data-tone="success"] { color:var(--tpd-success); }
#${ROOT_ID} [data-tone="warn"] { color:var(--tpd-warn); }
#${ROOT_ID} [data-tone="error"] { color:var(--tpd-error); }
#${ROOT_ID} [data-tone="info"] { color:var(--tpd-info); }
#${ROOT_ID} .tpd-close {
  flex:0 0 auto; width:24px; height:24px; padding:0; border:1px solid transparent;
  border-radius:4px; color:var(--tpd-text-dim); background:transparent;
  font:18px/1 system-ui,sans-serif; cursor:pointer;
}
#${ROOT_ID} .tpd-close:hover { color:var(--tpd-text); background:var(--tpd-control); }
#${ROOT_ID} .tpd-tabbar {
  flex:0 0 auto; display:flex; gap:2px; padding:0 10px; overflow-x:auto;
  border-bottom:1px solid var(--tpd-border);
}
#${ROOT_ID} .tpd-tab {
  flex:1 0 58px; min-height:28px; padding:5px 7px; margin:0 0 -1px;
  border:1px solid var(--tpd-border); border-bottom-color:var(--tpd-border);
  border-radius:5px 5px 0 0; color:var(--tpd-text-dim); background:#24242a;
  font:11px/1.2 inherit; cursor:pointer; transition:background .15s,color .15s;
}
#${ROOT_ID} .tpd-tab:hover { color:var(--tpd-text); background:#30303a; }
#${ROOT_ID} .tpd-tab[aria-selected="true"] {
  color:var(--tpd-title); font-weight:600; background:#3a3a48;
  border-color:var(--tpd-accent); border-bottom-color:#3a3a48;
}
#${ROOT_ID} .tpd-body { flex:1 1 auto; min-height:0; }
#${ROOT_ID} .tpd-panel { height:100%; overflow:auto; padding:7px 10px 12px; }
#${ROOT_ID} .tpd-panel[hidden] { display:none; }
#${ROOT_ID} .tpd-section { margin:0 0 10px; padding:0 0 8px; }
#${ROOT_ID} .tpd-section:last-child { margin-bottom:0; border-bottom:0; }
#${ROOT_ID} .tpd-section-title {
  margin:7px 0 6px; padding:3px 6px; color:var(--tpd-section);
  background:linear-gradient(90deg,var(--tpd-border) 0%,transparent 100%);
  border-left:3px solid var(--tpd-accent); font-size:12px; font-weight:600;
}
#${ROOT_ID} .tpd-section-title:first-child { margin-top:1px; }
#${ROOT_ID} button:not(.tpd-tab):not(.tpd-close) {
  border:1px solid var(--tpd-border-strong); border-radius:4px; padding:5px 8px;
  color:var(--tpd-text); background:var(--tpd-control); font:inherit;
  cursor:pointer; transition:background .15s,border-color .15s;
}
#${ROOT_ID} button:not(.tpd-tab):not(.tpd-close):hover { background:var(--tpd-control-hover); border-color:#5a5a68; }
#${ROOT_ID} button:not(.tpd-tab):not(.tpd-close):active { background:#24242a; }
#${ROOT_ID} input:not([type="checkbox"]):not([type="radio"]),
#${ROOT_ID} select, #${ROOT_ID} textarea {
  min-width:0; width:100%; border:1px solid var(--tpd-border-strong); border-radius:4px;
  padding:5px 7px; color:var(--tpd-text); background:var(--tpd-surface); font:inherit;
}
#${ROOT_ID} input::placeholder, #${ROOT_ID} textarea::placeholder { color:var(--tpd-text-dim); }
#${ROOT_ID} input[type="checkbox"], #${ROOT_ID} input[type="radio"] { flex:0 0 auto; accent-color:var(--tpd-accent); }
#${ROOT_ID} button:focus-visible, #${ROOT_ID} input:focus-visible, #${ROOT_ID} select:focus-visible,
#${ROOT_ID} textarea:focus-visible, #${ROOT_ID} [role="tab"]:focus-visible,
#${ROOT_ID} [role="tabpanel"]:focus-visible {
  outline:2px solid var(--tpd-accent); outline-offset:1px; border-color:var(--tpd-accent);
}
#${ROOT_ID} .tpd-console, #${ROOT_ID} .tpd-inspector {
  width:100%; margin:0 0 6px; padding:7px; overflow:auto; white-space:pre-wrap;
  color:var(--tpd-text); background:#141417; border:1px solid var(--tpd-border); border-radius:4px;
  font:11px/1.45 inherit;
}
#${ROOT_ID} .tpd-console { height:160px; }
#${ROOT_ID} .tpd-inspector { height:390px; }
#${ROOT_ID} .tpd-console-line { display:block; }
#${ROOT_ID} .tpd-motion-list { margin:0 0 6px; background:var(--tpd-surface); }
#${ROOT_ID} .tpd-motion-row {
  display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 8px; padding:6px;
  border-bottom:1px solid var(--tpd-border);
}
#${ROOT_ID} .tpd-motion-row:last-child { border-bottom:0; }
#${ROOT_ID} .tpd-motion-identity { min-width:0; overflow-wrap:anywhere; }
#${ROOT_ID} .tpd-motion-identity strong { margin-right:6px; color:var(--tpd-text); }
#${ROOT_ID} .tpd-motion-identity code { color:var(--tpd-info); font:inherit; }
#${ROOT_ID} .tpd-motion-authority {
  align-self:start; padding:1px 5px; border:1px solid currentColor; border-radius:999px;
  color:var(--tpd-section); font-size:10px; white-space:nowrap;
}
#${ROOT_ID} .tpd-motion-authority[data-authority="script"] { color:var(--tpd-warn); }
#${ROOT_ID} .tpd-motion-authority[data-authority="mount"] { color:var(--tpd-accent); }
#${ROOT_ID} .tpd-motion-authority[data-authority="follow"] { color:var(--tpd-success); }
#${ROOT_ID} .tpd-motion-meta {
  grid-column:1 / -1; min-width:0; color:var(--tpd-text-dim); font-size:10px;
  line-height:1.45; overflow-wrap:anywhere;
}
#${ROOT_ID} .tpd-scrollbox { max-height:180px; overflow:auto; padding:6px;
  background:var(--tpd-surface); border:1px solid var(--tpd-border); border-radius:4px; }
#${ROOT_ID} .tpd-scrollbox-compact { max-height:110px; }
#${ROOT_ID} .tpd-scrollbox-tall { max-height:150px; }
#${ROOT_ID} .tpd-option { display:flex; align-items:center; gap:5px; min-height:24px; white-space:nowrap; }
#${ROOT_ID} .tpd-trigger-button { display:block; width:100%; margin:2px 0; text-align:left; }
#${ROOT_ID} .tpd-trigger-kind { color:var(--tpd-info); }
#${ROOT_ID} .tpd-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:4px 0; }
#${ROOT_ID} .tpd-row-label { flex:0 0 3.5em; color:var(--tpd-text-dim); }
#${ROOT_ID} .tpd-row > :not(.tpd-row-label) { flex:1 1 140px; }
#${ROOT_ID} .tpd-inline-options { display:flex; align-items:center; gap:6px 9px; flex-wrap:wrap; margin:4px 0; }
#${ROOT_ID} .tpd-inline-label { display:inline-flex; align-items:center; gap:4px; }
#${ROOT_ID} .tpd-member-row { display:grid; grid-template-columns:auto 48px 54px 54px minmax(100px,1fr);
  align-items:center; gap:5px; margin:4px 0; }
#${ROOT_ID} .tpd-member-extra { grid-column:2 / -1; display:grid;
  grid-template-columns:minmax(105px,1.3fr) minmax(88px,1fr) minmax(72px,.8fr); gap:5px; }
#${ROOT_ID} .tpd-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:8px; }
#${ROOT_ID} .tpd-note { margin-top:7px; color:var(--tpd-text-dim); font-size:11px; line-height:1.5; }
#${ROOT_ID} .tpd-toggle { display:flex; align-items:center; gap:7px; padding:6px 2px;
  border-bottom:1px solid var(--tpd-border); cursor:pointer; }
#${ROOT_ID} .tpd-toggle input { width:16px; height:16px; }
#${ROOT_ID} .tpd-panel, #${ROOT_ID} .tpd-scrollbox, #${ROOT_ID} pre { scrollbar-color:#555560 var(--tpd-surface); }
#${ROOT_ID} .tpd-panel::-webkit-scrollbar, #${ROOT_ID} .tpd-scrollbox::-webkit-scrollbar,
#${ROOT_ID} pre::-webkit-scrollbar { width:7px; height:7px; }
#${ROOT_ID} .tpd-panel::-webkit-scrollbar-track, #${ROOT_ID} .tpd-scrollbox::-webkit-scrollbar-track,
#${ROOT_ID} pre::-webkit-scrollbar-track { background:var(--tpd-surface); }
#${ROOT_ID} .tpd-panel::-webkit-scrollbar-thumb, #${ROOT_ID} .tpd-scrollbox::-webkit-scrollbar-thumb,
#${ROOT_ID} pre::-webkit-scrollbar-thumb { background:#555560; border-radius:4px; }
@media (max-width:480px) {
  #${ROOT_ID} { top:8px; left:8px; width:calc(100vw - 16px); height:min(700px, 90vh); max-height:90vh; }
  #${ROOT_ID} .tpd-header { flex-wrap:wrap; }
  #${ROOT_ID} .tpd-header-meta { order:3; flex-basis:100%; justify-content:flex-start; }
  #${ROOT_ID} .tpd-status { text-align:left; }
}
@media (max-width:430px) {
  #${ROOT_ID} .tpd-member-row { grid-template-columns:auto repeat(3, minmax(42px,1fr)); }
  #${ROOT_ID} .tpd-member-row > input:nth-of-type(n+4) { grid-column:2 / -1; }
}
`
  document.head.appendChild(style)
}

export function createDebugElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { className?: string; text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (attrs.className) node.className = attrs.className
  if (attrs.text !== undefined) node.textContent = attrs.text
  return node
}

export function createDebugSection(title: string): HTMLElement {
  const box = createDebugElement('section', { className: 'tpd-section' })
  box.appendChild(createDebugElement('h2', { className: 'tpd-section-title', text: title }))
  return box
}
