# TEST-GLM-RUNTIME-RESOURCE-2 · GLM 第二对话交付回执

分支 `codex/glm-runtime-resource-r1`（隔离工作树）。生产冻结 `f6878b3cd18d916d3cac8aba3e50dc8c70556a2c`。
每批四组固定候选推送；本文件只记 GLM 自验，Codex 独立验收另录。

| 批 | 组 | 候选 | 自验摘要 | 未证项 |
|---|---|---|---|---|
| A | R01–R04 | b9d6ce54 | 44 新断言 / 三包定向+相邻全绿 / TC 零错 / Biome 零诊断 / 2 针业务反控恰一红 / RV1 取证 | 见各批末 |
| B | R05–R08 | 见推送 | 34 新断言 / 定向+相邻 95 全绿 / TC 零错 / Biome 零诊断 / 2 针业务反控恰一红 | 见批B末 |
| C | R09–R12 | 见推送 | 39 新断言 / 定向+相邻 60 全绿 / TC 零错 / Biome 零诊断 / 2 针业务反控恰一红 / RV2 取证 | 见批C末 |
| D | R13–R16 | 见推送 | 17 新断言 / 定向+相邻 74 全绿 / TC 零错 / Biome 零诊断 / 2 针业务反控恰一红 / RV3+RV4 取证 | 见批D末 |
| E | R17–R20 | 见推送 | 6 新断言 / 定向+相邻 77 全绿 / TC 零错 / Biome 零诊断 / 2 针业务反控恰一红 | 见批E末 |

## 批A（R01–R04）

**候选 SHA**：批次推送 HEAD（见推送回执；本文件所在提交后一行更新）。

### 去重账（旧断言 → 新差异 → 新合同 → 归属）

- R01 `rle.test/boundaries + rle-encode.test/boundaries + game rle-decode.test`：已覆盖基础游程、
  palette-0、sentinel/坏尾、126-128 run oracle、roundtrip、128KB 拒绝、skipFilePrefix 单正控 →
  本批新做 **skipFilePrefix 选项矩阵（4 例）、帧后尾随字节、subarray byteOffset 四入口、
  严格容器末帧未消费 payload、legacy 两个合法邻接拒绝、不透明起头短游程 oracle、view 输入
  编码、frameCount≥256 chunk** → 13 新断言，全为新合同（skipFilePrefix 与 game 旧例仅共享
  正控一支，矩阵轴为新）。
- R02 `quantize.test + palette.test/boundaries`：已覆盖精确/最近命中、alpha<128、列裁剪、
  1536 双半、768 无 night、偶偏移 subarray → 本批新做 **alpha 恰界 127/128、稀疏调色盘跳洞、
  等距平局取低 index、Uint8ClampedArray、行裁剪/空输出、输入零突变、默认 cycles 显断、
  1536+cycles 三键组合 + cycles 引用透传、三通道独立值防错位** → 10 新断言。
- R03 `ball/rgm/fire`：**此前零测试** → 空槽 null、标记头矩阵（剥离/半标记不剥离/非标记直解/
  零尺寸 null）、PNG 以 pngjs `sync.read` 真解码逐像素核（透明 alpha0 / opaque-0 alpha255）、
  fire 空 chunk / 已知输出 YJ2 压缩向量 / 退化 raw / uncompLen<2 → 12 新断言。
- R04 `scene.test + sprite.test`：已覆盖 dumpScene 基本字段、trigger0、末景兜底、triggerMode、
  PNG 魔数、extractCharacterSprites 空 chunk/缺 id → 本批新做 **dumpAllEventObjects（零覆盖→
  全局 id/区间/末景兜底/零突变）、场景 0 入口 + onTeleportLabel、中间场景非零起点全局 id 保留、
  未知 sceneId 抛错、encodeIndexedPng mask 真解码像素、framesToOut 多帧真解码、多 id 顺序** →
  9 新断言。

### 验证证据

- 定向+相邻（单 worker，新鲜 JSON）：
  - shared：`vitest run src/rle.glm-runtime-resource.test.ts src/rle-encode.glm-runtime-resource.test.ts src/rle.test.ts src/rle-encode.test.ts src/rle.boundaries.test.ts src/rle-encode.boundaries.test.ts --maxWorkers=1 --reporter=json` → 48/48 绿（新 13 / 邻 35）
  - reforge：`src/quantize.glm-runtime-resource.test.ts src/quantize.test.ts` → 10/10 绿（新 7 / 邻 3）
  - pal-extract：10 文件（6 新 + 4 邻）→ 41/41 绿（新 24 / 邻 17）
- typecheck：shared / reforge / pal-extract 三包 `tsc --noEmit` 全过。
- Biome：9 新测试 + fixture + wave 目录 `biome check` error/warning/info 全零。
- docs：`node scripts/docs/check.mjs` PASS；`git diff --check` 干净。
- 源 hash：批A 9 个源文件 sha256 与 targets.json 冻结值一致（开工时核对）。

### 业务反控（判据同 glm-state-commands，runner：`tools/runtime-resource-mutants.mjs`）

- 判据自测 10 例全符合预期；对照跑恰 exit0 全绿（41）。
- 针1 `ball-marker-prefix-misread`：ball.ts 标记头分支 `if (false)` → 恰 exit1、恰一红，
  红 = `ball.glm-runtime-resource.test.ts` 指定 fullName，AssertionError，loader 命中有见证，
  6 个产品源 hash 前后不变。
- 针2 `scene-label-zero-entry`：scene.ts `labelOf` `ip > 0` → `ip >= 0` → 恰 exit1、恰一红
  （入口 0 被伪造成 `L_0` 假 label），其余同上。
- 反控原始 JSON/日志：`/var/folders/.../type-pal-glm-runtime-resource-mutants-*`（runner 输出目录，summary.json 已附 hashes）。

### RV1 视觉取证（固定输入，不走游戏）

- 宿主：`hosts/rv1/index.html`（127.0.0.1:6072，临时 python http.server，已停）。
- 输入全部来自真实函数：`parseFirSprite(YJ2_SPRITE_CHUNK_2X2)` 真实 YJ2 解压 + PNG 编码；
  `quantizeToRleFrame` 真实最近邻量化（artifact 由 `tools/rv1-artifact.ts` 生成）。
- 页面内代码断言：PNG 4× 画布逐像素 = 独立预期 RGBA（PASS）；量化 4× 画布逐像素 =
  盘色/透明（PASS）；console/page errors = 0。
- 截图：`/tmp/type-pal-glm-runtime-resource/rv1-batchA.png`
  sha256 `44fbbb43623fb6e6ed70a01393ecea36c7307e598ccceaf855aaa1b531fb8c81`（130120 B，1280×720 全页）。

### 未证项 / 受限登记

1. fire.ts「raw 分支成功解析多帧」不可达：chunk 计数字段与 YJ2 uncompLen 双用 byte0..3，
   公开入口下无法构造「YJ2 拒绝 + raw 又是合法多帧 chunk」的输入（见 fire 测试文件头注）。
2. shared rle.ts `parseIndexedRleChunk` 的 `未找到可解释的坏尾槽` 分支结构性不可达
   （slot0 word offset 恒等于 frameCount，canonical 的 frame0==表长检查无法先失败）；
   未强造，登记待 Codex 判断是否属防御死支。
3. decodeRle 截断指令流会死循环（lenient 解码器无界读）——**未**写进测试（挂起不可作断言），
   合法输入上侧截断（尾随字节）已测；如需防御属产品改动，交 Codex 裁决。
4. RV1 样本为自包含合成帧（披露：非原版资源观感，不冒充原版全部资源验收）。

## 批B（R05–R08）

**候选 SHA**：批次推送 HEAD。

### 去重账（旧断言 → 新差异 → 新合同 → 归属）

- R05 `disasm.test/boundaries + recompile.test/boundaries`：已覆盖具名命令/goto 标签/入口 ip/
  L29 13 跳/u16 无符号/messageIndex/8 类命令字节 oracle；且 R04 boundaries 明确「缺 label 目标
  默认值政策未定，不补绿」——本批遵守 → 本批新做 **0xA2 随机跳相对目标收集（含 op0=0）、
  0x04/0x24 脚本入口 raw 目标收集、具名未处理 op（startBattle）raw fallback 保号、标签越界
  丢弃、bytecode subarray、authored 结构化命令（sequence/if/choice）拒绝、entry+goto+raw+
  style 混合往返（原始字节为独立预期）** → 10 新断言。
- R06 `slice.test/boundaries + annotate.test`：已覆盖单/双场景、shared 改写、globalEntries、
  end 变体、全部跳转目标收集、choice 之外的递归、_item/off-by-61/symbols 优先 → 本批新做
  **跨文件标签 goto 的 BFS 死端、越界目标忽略、globalEntries 非正入口过滤、choice 递归、
  if 无 else、wordAt 邻位边界（id=start 空词 / start-1 / 恰出表）、输入零突变** → 8 新断言。
  `_spell/_person/_enemy` 三条 RULES 无具名命令携带（Command 联合仅 itemId/enemyTeamId/
  sceneId），合法 typed 输入不可达，不写强转绿测，登记待具名命令出现后补。
- R07 `enemy-teams/items/stores`（各自 boundaries + tables.test 已覆盖翻译模式/全字段/截断）→
  本批新做 **纯模式精确对象形状（无可选键）、非整除 throw、奇偏移 subarray、_name 空串
  假臂、满 9 与紧邻空记录边界不串位** → 7 新断言。
- R08 `bdf-to-json/asset-manifest/battle-fields`：bdf 已有完整位图/base64 oracle → 本批新做
  **ENCODING -1/0 排除、缺 ENCODING、缺 BBX 默认 16×16、短行零填充、EOF 终止、空输入**；
  **asset-manifest 的 targets.json existingTestPointers 为空但实际已有两份覆盖
  （asset-manifest.test + boundaries，TB-05/RESOURCE-TOOLS R09，均在冻结基线）——指针过期
  已登记，仅补空 entries 清单与全剔除同 version 两个未占用轴**；battle-fields 补奇偏移
  subarray → 9 新断言。

### 验证证据

- 定向+相邻（25 文件，单 worker，新鲜 JSON `/tmp/glm-runtime-B-palextract.json`）：
  95/95 绿（新 34 / 邻 61）；新增文件单独复跑 34/34。
- typecheck pal-extract 通过；Biome 10 新文件 + wave 目录 error/warning/info 全零；
  docs PASS（wave README 目录索引补 receipt/evidence 链接）；`git diff --check` 干净。
- 反控（`runtime-resource-mutants.mjs b`）：判据自测 10 例；对照 95 全绿 exit0；
  - 针1 `disasm-random-jump-skip-first-target`：0xA2 起点漏收 → 恰一红 AssertionError。
  - 针2 `stores-truncation-sentinel-dropped`：首-0 哨兵失效（买菜单读穿）→ 恰一红 AssertionError。
  - 首版针2（annotate 空词 `|| undefined`）被下游 `if (name)` 掩蔽（变异经公开入口不可见，
    判据按 exit0 拒收）——已换针并在本节留痕，无凑绿。
- 10 个产品源 hash 反控前后不变（runner 内置断言）。

### 未证项 / 受限登记

1. recompile 对缺失 goto 目标写 0 的默认值政策：前一队列 R04 已明示未定，本批不补绿测。
2. annotate `_spell/_person/_enemy` RULES 合法 typed 输入不可达（无具名命令携带），待补。
3. annotate 空词哨兵（`|| undefined`）与下游 `if (name)` 双重防护，无法经公开入口单点变异
   区分——不构成新合同，仅留痕。
4. asset-manifest 冻结表指针过期（existingTestPointers 空 vs 实际两份测试），本批未重做旧合同。

## 批C（R09–R12）

**候选 SHA**：批次推送 HEAD。

### 去重账（旧断言 → 新差异 → 新合同 → 归属）

- R09 `glyph.test` 已覆盖 decodeGlyph 2×2/宽10、真实 Unifont 57k、loadGlyphs 失败路径 →
  本批新做 **decodeGlyph 截断位图缺字节暗臂、codepoint 0/.notdef 与 ENCODING -1 排除、
  同码点后者覆盖、CRLF 等价、空表 fail-loud（默认 source）、loadGlyphs 成功路径**；
  `text-render.ts` 此前**零测试** → **measureSpans 半/全宽/缺字回退/空、renderSpans 光标推进、
  三层影 (+1,0)/(0,+1)/(+1,+1)、加粗双画、缺字跳过、maxChars 提前返回、forceRgba 覆盖与
  colorRgba 映射**（bakeGlyph 为浏览器端口替身，decodeGlyph 不在本文件重复证明）→ 13 新断言。
- R10 `registry.test/lifecycle` 已覆盖 85 slot/失败重试/缓存身份 → 本批新做
  **default-title 非 UI slot 通道**（engineChromeUiUrl 缺 slot 支：85 slot 全部物理存在，
  合法 typed 入口不可达，不写强转绿测）；`item-list.ts` 此前**零测试** → **3 列网格坐标、
  三色（普通/选中闪烁/穿戴绿）、数量>1 青数字、光标 blit、描述 ≤3 行静态与 >3 行裁剪滚动
  （两个固定时间点窗口平移 + 裁剪矩形）、noDesc、空列表** → 7 新断言。
- R11 `menu-box.residual/status-residual` 已覆盖数字边界/卷轴自然宽高/确认框/状态板 →
  本批新做 **drawSlicedBox 默认阴影路径（离屏镂空+source-in+(x+6,y+6) 半透明贴回）、
  tileFill 平铺精确坐标（15 块）、缺角块跳过、drawScroll 零尺寸早退**；`system-box.ts`
  此前**零测试** → **inactive 早退、5 项四色布局、confirm 否/是互斥、switch 关/开、占位提示** →
  7 新断言。
- R12 magic/use/equip-box 此前**零测试** → **pick-caster 竖列与死人灰红、选人早退、
  pick-spell 网格/MP 不足禁用/光标/MP 框 needed+current/术描述、use pick-item 纯委托、
  pick-target 8 属性行（level/hp/mp 池/有效属性）+斜杠+蓝 max+角色名+选中物、
  equip list 委托 + pick-role 面板（状态板/金名/青数量/6 槽深灰影 label/穿戴名 ?166 缺表/
  5 有效属性）** → 12 新断言。world/skills/items 复用仓库既有 `src/test-fixtures.ts`。

### 验证证据

- 定向+相邻（14 文件，单 worker，新鲜 JSON）：60/60 绿（新 39 / 邻 21）。
- typecheck reforge 通过；Biome 10 新文件 + fixture + wave 目录零诊断；docs PASS；
  `git diff --check` 干净。
- 反控（`runtime-resource-mutants.mjs c`）：判据自测 10；对照 60 绿 exit0；
  - 针1 `item-desc-scroll-rate-slowed`（滚动速率 ÷10）→ 恰一红 AssertionError。
  - 针2 `system-disabled-color-dropped`（禁用色拆除）→ 恰一红 AssertionError。
  - 9 个产品源 hash 反控前后不变。

### RV2 视觉取证（固定输入，不走游戏）

- 宿主 `hosts/rv2/`（esbuild 打包真实 reforge 源；import.meta.glob/url 按 bundler 桩等价替换，
  见 entry 头注；127.0.0.1:6073 临时服务已停，web 根 = 仓库根只读）。
- 真实函数链：drawItemGridList（真实 renderSpans/bakeGlyph/drawNumber/drawSlicedBox）+
  真实 unifont-cn.bdf（parseBdfGlyphs 真解析）+ 真实 engine chrome PNG（只读 fetch）。
- 页面内像素断言（ASSERT PASS）：P1 数量区/光标区有像素；P2→P3 同输入不同 now 说明区
  差异像素 99360（滚动窗口平移）；P4 空列表条目区 lit=0；console/page errors 0。
- 截图：`/tmp/type-pal-glm-runtime-resource/rv2-batchC.png`
  sha256 `78acfb06587293e3a25f4e5011506140b644ce181634650565fba41e9c3913f5`（207383 B）。

### 未证项 / 受限登记

1. bakeGlyph 的 canvas 涂绘在 RV2 宿主经真实浏览器间接验证；fast 套件内以端口替身隔离（jsdom 无 2d）。
2. engineChromeUiUrl 缺 slot 抛错支合法 typed 入口不可达（85 slot 全存在），未强测。
3. magic use/equip 的 desc 渲染文本来自 fixtures desc（空串已用覆写样本覆盖），原版多行说明的
   观感不属本卡（RV2 已示真实说明滚动）。
4. RV2 样本物品为自包含合成输入（披露：非原版资源观感验收）。

## 批D（R13–R16）

**候选 SHA**：批次推送 HEAD。

### 去重账（旧断言 → 新差异 → 新合同 → 归属）

- R13 shop：shop-box.test + residual 已覆盖买/卖输入、八行窗、卖光重算、绘制派发（含确认框），
  **无剩余合法新合同 → 未建新文件**（README 允许：无新合同不强建）；`save-browser-box.ts`
  此前**零测试** → **inactive 早退、标题黄/页码/翻页三角（fillRect 像素行计数）、auto 两行
  标签 + save 模式禁用色、手动槽 meta 行（队伍/存次黄注/地图/右对齐时间）、覆盖确认框** →
  5 新断言。
- R14 battle-ui / present-battle：residual + test 已覆盖信息框/菜单网格/MP 框/详情/箭头/
  遮挡排序/溶解 → **无剩余合法新合同 → 未建新文件**（登记，不强凑）。
- R15 `battle-positions.ts` 此前**零测试** → **按人数选表、>3 钳 3、idx 越界 undefined、
  敌方 yPosOffset、表形状**；battle-anim 已有大流程覆盖 → 本批只做 **AnimPlayer 剩余简单
  边界（播完 tick 立即 true、流末 onOverlay(null)、单帧多副作用一次性派发）** → 8 新断言。
- R16 `settlement.ts` 此前**零测试**（presentation 类已有测试不重复）→ **buildSettlementScreens
  原版屏序（升级者分组/未升级收尾/空报告）、drawSettlementScreen exp-cash 居中双卷轴逐字段
  手算 + hidden-up 文本** → 4 新断言。

### 验证证据

- 定向+相邻（12 文件，单 worker，新鲜 JSON）：74/74 绿（新 17 / 邻 57）。
- typecheck reforge 通过；Biome 4 新文件 + wave 目录零诊断；docs PASS；`git diff --check` 干净。
- 反控（`runtime-resource-mutants.mjs d`）：判据自测 10；对照 74 绿 exit0；
  - 针1 `settlement-hidden-duplicated`（隐藏提升重复成屏）→ 恰一红 AssertionError。
  - 针2 `save-browser-blocked-dropped`（auto/quick 存档保护拆除）→ 恰一红 AssertionError。
  - 8 个产品源 hash 反控前后不变。

### RV3/RV4 视觉取证（固定输入，不走游戏）

- 宿主 `hosts/rv3-rv4/`（esbuild 打包真实 reforge 源；127.0.0.1:6074 临时服务已停）。
- RV3：真实 drawBattleGrid 两种菜单/禁用态（选中黄闪 vs 禁用红/禁用亮红）、drawMpBox
  非零哨兵 23/8（黄/青数字 + 斜杠）、drawItemDetailBox、drawCurrentFinger/drawPlayerTargetArrow。
- RV4：真实 buildSettlementScreens 非空报告（exp-cash → level-up → hidden-up → learn-magic）
  逐屏 drawSettlementScreen + 空报告 0 屏对照。
- 页面内像素断言（ASSERT PASS）：P1 选中行/P2 禁用行/MP 数字区/头指/箭头 lit 均 >阈值；
  RV4 结算条 lit=94377；console/page errors 0。
- 截图：`/tmp/type-pal-glm-runtime-resource/rv3-rv4-batchD.png`
  sha256 `6abdb5abbf09d659a35da6165a08ac030b3d8926521ed6f524eca499d2230e2b`（214787 B）。

### 未证项 / 受限登记

1. shop/battle-ui/present-battle 未建新文件：旧测试已覆盖本卡轴（登记非跳过）。
2. battle-anim 大流程（施法/合击/召唤）不属本卡窄入口，未触碰。
3. RV3 面板 320×200 内 MAGIC_GRID 宽 301 导致相邻面板轻微视觉重叠（绘制本身 1:1 保真，
   断言按各自面板坐标取样）。

## 批E（R17–R20）

**候选 SHA**：批次推送 HEAD。

### 去重账（旧断言 → 新差异 → 新合同 → 归属）

- R17 midi-preview：旧测已覆盖 createMidiNoteActivity 归一化/空轨与 transport → 本批新做
  **analyzeMidiBytes（真实 spessasynth_core 解析手构 SMF，非模拟解析器）：时长/单音符/
  桶数参数与绝对刻度归一化合同（peak = max(1, 实际)，vel64 → 每桶 64/127）**；collectTurnActionSounds
  由 sfx-readiness.test 'turn 只收实际 cast/item/throw' 等覆盖 → 无新合同不建文件。
- R18 bgm/sfx：bgm.test/dispose/runtime-boundaries + sfx.test/staged-failures 已覆盖生命周期/
  停止/释放/失败分级 → **无剩余合法新合同 → 未建新文件**（登记）。
- R19 battle-sprite-readiness/launch-preparation：既有测试覆盖闭包/预载/快照 → 剩余未占用轴
  仅 **isBattleAbort 分类矩阵**（归入 R20 文件，组合 trialAbortError）→ collectBattleSkillFireChunks
  等已覆盖不重复。
- R20 trial-config：wave2 已覆盖 parse* 组合/trialObject/abortableTrial/createTrialFileSnapshot →
  本批新做 **trialInteger/trialBoolean/trialId 原语校验（合法回读 + 带 where 拒绝消息）**；
  trial-prepare/assets 已覆盖不重复 → 6 新断言。

### 验证证据

- 定向+相邻（10 文件，单 worker，新鲜 JSON）：77/77 绿（新 6 / 邻 71）。
- typecheck reforge 通过；Biome 2 新文件零诊断；docs PASS；`git diff --check` 干净。
- 反控（`runtime-resource-mutants.mjs e`）：判据自测 10；对照 77 绿 exit0；
  - 针1 `trial-integer-upper-bound-dropped`（上界拆除）→ 恰一红 AssertionError。
  - 针2 `battle-abort-classification-blinded`（AbortError 分类失明）→ 恰一红 AssertionError。
  - 3 个产品源 hash 反控前后不变。控制/针计数以全套件实际数为准（修正过一轮 control=77、
    针=4，修正留痕：初版按坏套件少算了 battle-trial-config.glm）。

### 未证项 / 受限登记

1. R17/R18/R19 其余轴（transport 生命周期、BGM/SFX 播放器、sprite 闭包）既有测试已覆盖，
   本批未重建（登记非跳过）。
2. analyzeMidiBytes 未测损坏 MIDI 字节路径（BasicMIDI 抛错行为属库合同；未占用轴仅合法输入）。
