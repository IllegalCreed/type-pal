# Wave N — Reforge 非剧情运行时宿主与资源生命周期（TEST-GLM-WAVE-N-1）

Coding Owner: GLM N。分支 `codex/glm-wave-n-reforge-host-r1`，独立工作树，
派发提交 `784fb098789a64b21c45e6c942d87abfa9efac2f`，生产冻结 `f70db722`。
`verify-targets.mjs` 通过（62 源、与 A–K 零交集）。不合 main、不标 done，
待 Codex 独立验收与正式覆盖结算。

## 新增测试（13 文件 / 55 用例，全绿）

| 组 | 文件 | 用例 | 新合同（排重后未覆盖的公开入口臂） |
|---|---|---|---|
| N01 | `src/main.glm-n.test.ts` | 5 | `?gallery` 速查表直返不进主循环；`?battle-preview` 摆位渲染即返回 + 缺定义精确拒绝；`?party` 覆写队伍满血满蓝；空开局队伍 fail-loud |
| N01 | `src/project-map.glm-n.test.ts` | 9 | lattice 界外/-0 规范化；瓦片/碰撞非法输入精确诊断；heights 退役；floodFill 退化输入；tilesInView 越界/隐藏层；图层操作幂等；同尺寸缩放原引用；空作者态不物化 |
| N02 | `src/audio/bgm.glm-n.test.ts` | 3 | 无 AudioContext 生产工厂静音播放器全操作安全；init 失败降级不重试；dispose 与迟到初始化释放次序 |
| N02 | `src/audio/midi-preview.glm-n.test.ts` | 3 | 无窗口运行时探测 undefined；空传输快照；seek 钳制 |
| N02 | `src/audio/midi-preview.play-guards.glm-n.test.ts` | 2 | 未读前 play 精确拒绝；dispose 后 load AbortError 且成果不入账 |
| N03 | `src/video-player.glm-n.test.ts` | 7 | 播完/失败/跳过键/自定义键/autoplay overlay/取消/迟到 error 的完整生命周期（此源 0% → 83%） |
| N03 | `src/menu/menu-box.glm-n.test.ts` | 6 | 九宫格缺块/零尺寸早退/阴影画布缺 2d 静默；drawScroll 空 tiles 与 shadow:false；缺字形数字；portraitFor 无缓存与加载中回落 |
| N04 | `src/battle/battle-ui.glm-n.test.ts` | 7 | 死亡滤镜/中毒单色化缓存；状态字调色门；菜单盒禁用/确认金黄/蓝数字；网格分页钳制；主图标灰/暗红带与缓存；MP 框缺斜杠；手指缺图 |
| N04 | `src/battle/battle-anim.glm-n.test.ts` | 5 | 投掷多目标伤害数字分布/零伤不显数字/单目标 damageNum 形态；无目标 fail-loud；mateDied dead 姐；attackAll 可选音臂 |
| N05 | `src/battle-trial-assets.glm-n.test.ts` | 5 | snapshot catalog 校验长度/哈希臂 + urlFor 拒绝；预取消零 IO；asset 音乐+soundfont+物理特效精灵冻结准备；silent 零音乐 IO；缓存 seal 复读 |
| N05 | `src/battle/battle-launch-preparation.glm-n.test.ts` | 3 | 显式 options.music 直达 battleTrack；指定战场 fieldWave/索引背景/投掷 fire chunk；未知战场缺省黑底零 IO |

专属 fixture：`src/__tests__/glm-n/png.ts`（手构 stored-deflate PNG）、
`src/__tests__/glm-n/canvas-host.ts`（可控 getImageData 画布替身）。
复用只读共享 fixture：runtime-shell、battle-host-fixture、coverage-wave2/b-trial-catalog
（只调用其构建器，不改其文件）。

## 排重账（逐文件读旧 fullName 后的取舍）

- `existing-proof`（旧测已证，不重复）：bootGame 正常/入口/失败诊断 H1；`?menu` 标题选择 H1；
  `?scene/?pos/?give/?entry`、`]`/`[` 切场景 H6；F5/F9 H5；商店/状态/装备/道具/法术/存读档 H3/H5/H7/H8；
  `?e2e-load` observation；shop-trial 全链；bgm 生命周期/fade/逆序/dispose；midi transport/逆序/失败重试；
  sfx-readiness 全轴（本包零新增）；battle-anim 主时间线/残部；battle-ui residual 布局；menu-box 状态板/级联；
  trial abortable/seal/漂移；launch-prep 槽位/覆盖/致命就绪。
- `blocked/out-of-scope`：main.ts 剧情/E2E 路线（`?e2e-load` 恢复事务、checkpoint、演出）、
  E2E-R4-1 占用的 001/002 路线、真实 PAL 资产管线、`loadMenuAssets` 的 engine-chrome 资产臂（需整包 chrome）
  —— 未越界，未启动剧情。
- 新增仅打冻结源当前公开合同的未覆盖臂；未按文件覆盖数字机械加 case。

## 覆盖对照（隔离，不更新官方 ratchet）

见 `coverage-delta.json`：11 源合计 **1528/3001 → 1644/3001（+116 臂）**。
video-player 0→15/18、menu-box +21、battle-ui +15、main +26、project-map +11、
midi-preview +10、launch-prep +7、trial-assets +5、battle-anim +5、bgm +1、sfx-readiness ±0。
main.ts 仍有大量缺口属剧情/E2E 与不可达臂，本卡不承诺。

## 业务反控（4 枚，判据与原始输出见 `counter-controls.json`）

| id | 文件 | 输入轴（非期望值） | 结果 |
|---|---|---|---|
| RC1 | battle-ui.glm-n | rows[0] `disabled:true` → 缺席 | 正控 exit0；变异 exit1 仅目标用例红；恢复后 sha256 不变 |
| RC2 | battle-launch-preparation.glm-n | `fieldId: 7 → 9` | 同上 |
| RC3 | video-player.glm-n | `src 'videos/broken.mp4' → 'videos/other.mp4'` | 同上 |
| RC4 | project-map.glm-n | `height: -1 → -2`（精确诊断断言） | 同上 |

补充过程记录：曾试过 `confirmed:true→false`（RC1 初版）与“自然播完 muted”轴（RC3 初版）——
前者对禁用行配色无观测差（源码 confirmed 只作用于非禁用选中行，已补真实金黄断言臂）、
后者因失败用例遗留监听泄漏致相邻用例超时（被判据拒绝并弃用），均换轴重做。

## 浏览器实际操作取证（`browser-evidence.json` + `browser-evidence/`）

真实 Chrome（playwright channel:chrome，headless 1440×900）→ `http://localhost:6051/?menu&skip-startup=1`
（reforge dev:pal，真实 pal 工程）。操作：标题菜单出现 → `ArrowDown`→`ArrowUp`→`Enter`
选择第一入口 → `__rfWorld` 挂载（party `li-xiaoyao`，scene `s000`，菜单关闭）。
截图 `menu-title.png`（标题菜单 FBP+入口文本）与 `world-after-entry.png`（开场演出）均 SHA256 记录。
console 无 pageerror；4 条失败请求全部归因为 `/projects/pal/.type-pal/save-state.json` 404/ABORT
（`readProjectSaveState` NotFound→无存档档位的合法探测）。工作树缺 gitignored pal 资产已从主仓补拷
（仅运行取证用，不进提交）。

## 门禁（全部新鲜，本分支实跑）

- Reforge 全包 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test`：259 文件 / **2054 通过 / 0 失败**。
- `typecheck`：0 error。根 `pnpm lint`：**0 error / 0 warning / 0 info**（2777 files）。
- 定向 Vitest JSON：`directed-vitest.json`（55/55，含 fullName）。
- `git diff --check`：干净（见提交前记录）；`node scripts/docs/check.mjs`：通过。

## 未证项

- main.ts 剧情侧缺口（E2E-R4-1 占用）未测，收益不结算。
- `loadMenuAssets`/engine-chrome 资产臂、bgm 真实 AudioContext 路径未在单测展开（需真实浏览器音频，超出本卡）。
- 隔离覆盖按同分母 3001 对照；官方 ratchet 由 Codex 串行结算，本包不宣称合并后净增。
