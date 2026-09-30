# Wave N — Reforge 非剧情运行时宿主与资源生命周期（TEST-GLM-WAVE-N-1）

Coding Owner: GLM N。分支 `codex/glm-wave-n-reforge-host-r1`，独立工作树，
派发提交 `784fb098789a64b21c45e6c942d87abfa9efac2f`，生产冻结 `f70db722`。
r1 `61dc0de1`、r2 `7bcd0fcd`、r3 `eb684211` 先后被 Codex counter（审核段见任务卡）；本文件描述 **r4 返工候选**。
不合 main、不标 done，待 Codex 复核与正式覆盖结算。

## r4 相对 r3 的改动（对应三审三项）

1. **canvas-host 弃 Partial 伪装**：`installGlmNCanvasHost` 现返回**真实 jsdom 2D 上下文**——
   `PRISTINE_GET_CONTEXT` 在模块求值期捕获 jsdom 原生 getContext（先于任何测试内 spy，
   不受 dom-host 接管影响），`getContext` mock 内调原实现取真 ctx，仅以 typed spy 控制
   外部 IO（getImageData 按测试值合成、drawImage 拦截假位图）；删除
   `as HTMLCanvasElement['getContext']` 函数强转与 Partial/`Fake2dContext` 伪装。
   函数体内仅剩 RenderingContext 联合按实参 `'2d'` 收窄到成员的单次断言（非 unknown 跳板）。
2. **mono 调制臂改回合法断言**：battle-ui 的 drawImage 宿主 spy 把源位图按不透明白像素
   写入真画布（getImageData→填白→putImageData 真写），mono 调制按白底 luma=1 真实执行；
   断言恢复真实调制色：中毒 `[200,100,50,255]`、可用灰带 `ICON_GRAY[11]=186`、
   不可用暗红带 `ICON_RED[11]=[203,89,77,255]`（readBack 从真画布 getImageData 读回）。
   三审指出的“宿主限制误记产品 unreachable”已改正；该臂并入覆盖账（battle-ui +12）。
3. **数量/覆盖账统一**：本文件主体统一为 **11 个测试文件 + 2 个专属 fixture、53 用例、
   隔离 1528→1623/3001（+95）、battle-ui +12**；r2 的 +96 为历史记录，
   15 色短色板轴已被二审否决（非现行合法输入），不再计作覆盖。

## r3 相对 r2 的改动（二审四项，历史记录）

1. **三处 `as unknown as CanvasRenderingContext2D` 清零**（menu-box/battle-ui/canvas-host）：
   探针证实本仓 jsdom 29 + canvas 3.2.3 提供**真实 2D 上下文**（fillRect/getImageData 真执行）。
   两个测试文件改为**类型化外部宿主边界**：`hostCtx()` 取真实画布 ctx，仅以
   `vi.spyOn(ctx, 'drawImage')` 实例层拦截假位图绘制、原型层兜底离屏路径，其余成员
   （save/clip/fillRect/putImageData/getImageData）保持真实行为；`canvas-host.ts` 的替身
   改为显式 `Partial<CanvasRenderingContext2D>` 标注 + 函数断言，三审否决；r4 已换真 ctx。
   r3 宿主画布透明底使调制循环跳过，曾误记产品 unreachable；这是宿主限制，
   r4 已经合法不透明像素路径改回调制色值断言，见顶部。
2. **删除 15 色非法 Palette 轴**：现行 loader 强制 256 色（`resources.ts:31-33`、
   `assets.ts:67`），短色板不是合法作者输入；状态字正常臂（256 全色）保留，
   固定索引缺色防御臂登记 unreachable。
3. **directed-vitest.json 在最终代码上重生成**：11 个测试文件 / **53/53**（含 fullName），
   已覆盖写入本目录（r2 误留 r1 的 55/55 文件）。
4. **四枚反控在最终格式化代码上重跑**：正/反控退出码、执行数、目标业务
   AssertionError 原文与三态 SHA256（original === restored === 最终候选文件）全部
   重采集进 `counter-controls.json`；隔离覆盖按删除非法轴后如实更新为 **+94**
   （1528→1622/3001，见 `coverage-delta.json`）。

## r2 相对 r1 的改动（对应审核四项）

1. **去除双强转**：`menu-box.glm-n.test.ts` 与 `battle-ui.glm-n.test.ts` 重写——
   `undefined as unknown as ImageBitmap`（稀疏九宫格）、`undefined as unknown as [r,g,b]`
   （调色洞）、`{...} as unknown as MenuAssets/WorldState/MenuState/ProjectImageCache`
   全部移除。替代：完整合法 `MenuAssets` fixture（全部字段真实 ImageBitmap）、
   完整合法 `CharacterInstance/WorldState` 字面量、`openMenu()` 官方构造、
   当时误称合法的短色板（15 色数组越界色号 0x5f/0xbf/0x3c，自二审起否决并删除）替代 undefined 强作调色值；
   mock 经 `Parameters<typeof actual.drawNumber>` 全型委托；画布替身同形实现对象只在
   每文件一处收敛 `as unknown as CanvasRenderingContext2D`（与 residual 同款单点转型）。
2. **排重修正**：删除与 status-residual 重复的 portraitFor 懒加载回落/就绪替换用例
   （existing-proof）；删除依赖 `slash/cursorDown = undefined` 强作的 MP 框/手指缺图用例
   （缺图臂对非可选字段不可合法到达，residual 已证正常路径）。menu-box 6→5、
   battle-ui 7→6，定向总数 55→**53**。
3. **RC4 换合法输入轴**：`paintProjectMapTiles` 编辑 `height: 2 → 5`（合法非负整数），
   目标断言 `draws[0].height === 2` 红。
4. **浏览器取证限定菜单内**：重做 `drive-n.mjs`——ArrowDown 可见选中移动 →
   「读取进度」存档浏览（空档）→ Escape 退回；**不选择开局项、无 `__rfWorld`**
   （脚本硬断言）。相位切换用 canvas 像素差分证明（menu→load 0.730、load→menu 0.730、
   菜单内移动 0.018），截图 3 张 SHA256 入账。

## 新增测试（11 个测试文件 + 2 个专属 fixture / 53 用例，全绿）

| 组 | 文件 | 用例 | 新合同（排重后未覆盖的公开入口臂） |
|---|---|---|---|
| N01 | `src/main.glm-n.test.ts` | 5 | `?gallery` 速查表直返不进主循环；`?battle-preview` 摆位渲染即返回 + 缺定义精确拒绝；`?party` 覆写队伍满血满蓝；空开局队伍 fail-loud |
| N01 | `src/project-map.glm-n.test.ts` | 9 | lattice 界外/-0 规范化；瓦片/碰撞非法输入精确诊断；heights 退役；floodFill 退化输入；tilesInView 越界/隐藏层；图层操作幂等；同尺寸缩放原引用；空作者态不物化 |
| N02 | `src/audio/bgm.glm-n.test.ts` | 3 | 无 AudioContext 生产工厂静音播放器全操作安全；init 失败降级不重试；dispose 与迟到初始化释放次序 |
| N02 | `src/audio/midi-preview.glm-n.test.ts` | 3 | 无窗口运行时探测 undefined；空传输快照；seek 钳制 |
| N02 | `src/audio/midi-preview.play-guards.glm-n.test.ts` | 2 | 未读前 play 精确拒绝；dispose 后 load AbortError 且成果不入账 |
| N03 | `src/video-player.glm-n.test.ts` | 7 | 播完/失败/跳过键/自定义键/autoplay overlay/取消/迟到 error 的完整生命周期（此源 0% → 15/18） |
| N03 | `src/menu/menu-box.glm-n.test.ts` | 5 | 九宫格退化尺寸 tileFill 早退；drawScroll 空 tiles 与 shadow:false；阴影画布缺 2d 静默；缺字形数字；无 imageCache 状态板回落（合法 fixture） |
| N04 | `src/battle/battle-ui.glm-n.test.ts` | 6 | 死亡滤镜/中毒单色化画布缓存；状态字调色门（256 色正常臂）；菜单盒禁用/确认金黄/蓝数字；网格分页钳制；空集只画框；主图标灰/暗红带单色化表面与缓存 |
| N04 | `src/battle/battle-anim.glm-n.test.ts` | 5 | 投掷多目标伤害数字分布/零伤不显数字/单目标 damageNum 形态；无目标 fail-loud；mateDied dead 帧；attackAll 可选音臂 |
| N05 | `src/battle-trial-assets.glm-n.test.ts` | 5 | snapshot catalog 校验长度/哈希臂 + urlFor 拒绝；预取消零 IO；asset 音乐+soundfont+物理特效精灵冻结准备；silent 零音乐 IO；缓存 seal 复读 |
| N05 | `src/battle/battle-launch-preparation.glm-n.test.ts` | 3 | 显式 options.music 直达 battleTrack；指定战场 fieldWave/索引背景/投掷 fire chunk；未知战场缺省黑底零 IO |

专属 fixture：`src/__tests__/glm-n/png.ts`（手构 stored-deflate PNG）、
`src/__tests__/glm-n/canvas-host.ts`（真实 jsdom 2D 上下文，可控外部像素 IO）。
复用只读共享 fixture：runtime-shell、battle-host-fixture、coverage-wave2/b-trial-catalog
（只调用其构建器，不改其文件）。

## 排重账（逐文件读旧 fullName 后的取舍）

- `existing-proof`（旧测已证，不重复）：bootGame 正常/入口/失败诊断 H1；`?menu` 标题选择 H1；
  `?scene/?pos/?give/?entry`、`]`/`[` 切场景 H6；F5/F9 H5；商店/状态/装备/道具/法术/存读档 H3/H5/H7/H8；
  `?e2e-load` observation；shop-trial 全链；bgm 生命周期/fade/逆序/dispose；midi transport/逆序/失败重试；
  sfx-readiness 全轴；battle-anim 主时间线/残部；battle-ui residual 布局（含 MP 框/双箭头/手指锚拍频）；
  menu-box 状态板/级联/立绘懒加载（r2 并入本账）；trial abortable/seal/漂移；launch-prep 槽位/覆盖/致命就绪；
  九宫格缺角块（glm-runtime-resource pop 臂）。
- `blocked/out-of-scope`：main.ts 剧情/E2E 路线（`?e2e-load` 恢复事务、checkpoint、演出）、
  E2E-R4-1 占用的 001/002 路线、真实 PAL 资产管线、`loadMenuAssets` engine-chrome 资产臂、
  非可选字段的缺图防御臂（无法合法构造）—— 未越界，未启动剧情。

## 覆盖对照（隔离，不更新官方 ratchet）

见 `coverage-delta.json`：11 源合计 **1528/3001 → 1623/3001（+95 臂）**。
video-player 0→15/18、main +26、project-map +11、midi-preview +10、battle-ui +12、
launch-prep +7、trial-assets +5、battle-anim +5、bgm +1、menu-box +3、sfx-readiness ±0。
历史：r1 曾报 +116；r2 去强转放弃非法 fixture 用例后报 +96；r3 删除被二审否决的
15 色非法短色板轴（非现行合法输入，不计覆盖）后报 +94；r4 恢复 mono 合法像素断言后为 +95，为本候选最终账。

## 业务反控（4 枚，最终 r4 文件哈希已复核：原始正反控输出/执行数/AssertionError 原文/三态 SHA256 见 `counter-controls.json`）

| id | 文件 | 合法输入单轴 | 正控 | 变异 |
|---|---|---|---|---|
| RC1 | battle-ui.glm-n | rows[0] `disabled:true` → 缺席 | exit0，6/6 | exit1，仅目标红（1败/5过） |
| RC2 | battle-launch-preparation.glm-n | `fieldId: 7 → 9` | exit0，3/3 | exit1，仅目标红（1败/2过） |
| RC3 | video-player.glm-n | `src 'videos/broken.mp4' → 'videos/other.mp4'` | exit0，7/7 | exit1，仅目标红（1败/6过） |
| RC4 | project-map.glm-n | paint `height: 2 → 5` | exit0，9/9 | exit1，仅目标红（1败/8过） |

每枚记录：目标 fullName、三态 SHA256（原/变异/恢复，且 original 与最终候选文件一致）、
正反控 raw Vitest summary 与目标业务 AssertionError 原文。判据拒绝 skip/timeout/收集错误/
额外用例红/零执行/仅改期望值；断言在变异中一律不动。r1 的 RC4（`-1 → -2` 双端非法）已撤，
r2 换为 `2 → 5` 合法轴并在 r3 最终代码上重采。

## 浏览器实际操作取证（`browser-evidence.json` + `browser-evidence/`，r2 重做）

真实 Chrome（headless 1440×900）→ `http://localhost:6051/?menu&skip-startup=1`
（reforge dev:pal，真实 pal 工程）。**严格停留标题菜单内**：ArrowDown 可见选中移动 →
连按至「读取进度」→ Enter 进存档浏览（空档，`读取进度 1/10` + 自动/快速/01 空槽可见）→
Escape 退回菜单。脚本硬断言 `__rfWorld` 未挂载（未进任何开局/叙事路线）。
相位切换以 160×100 可见像素差分证明：menu→load 0.7299、load→menu 0.7303、菜单内移动 0.0177。
3 张截图 SHA256 入账；console 无 pageerror；4 条失败请求全部归因
`/projects/pal/.type-pal/save-state.json` 404/ABORT（无存档档位合法探测）。
工作树运行取证需从主仓补拷 gitignored `projects/pal/assets/{migrated,runtime}`（不进提交）。

## 门禁（r4 Codex 独立复跑）

- Reforge 全包 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test`：259 文件/2052 例全绿。
- `typecheck`：0 error。根 `pnpm lint`：**0 error / 0 warning / 0 info**。
- 定向 Vitest JSON：`directed-vitest.json`（**53/53**、11 文件，与 Codex 新鲜 JSON 逐 file/fullName/status 相同）。
- `git diff --check 784fb098...HEAD`：干净；`node scripts/docs/check.mjs`：
  候选仅 1 项已知白名单导航问题，Codex 在隔离接收树补 wave-N 登记；统一门另记任务卡。

## 未证项

- main.ts 剧情侧缺口（E2E-R4-1 占用）未测，收益不结算。
- 状态字固定索引缺色与非可选字段缺图防御臂：现行合法输入下 unreachable。
- `loadMenuAssets` engine-chrome 资产臂、bgm 真实 AudioContext 路径：blocked/未证。
- mono 调制色值已由合法不透明像素断言证明，不属于未证或产品 unreachable。
- 隔离覆盖按同分母 3001 对照；官方 ratchet 由 Codex 串行结算，本包不宣称合并后净增。
