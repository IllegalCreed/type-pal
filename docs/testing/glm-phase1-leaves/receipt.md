# GLM 第三对话交付回执（TEST-GLM-PHASE1-LEAVES-3）

逐批登记：SHA、diff 范围、新鲜 JSON 计数、反控、未证项。只填本人候选/自验；
不代签、不合 main、不标 done；官方统计与集成由 Codex 统一执行。

分支：`codex/glm-phase1-leaves-r1`；生产冻结 `4a9ad67faa07b004f259dcde1e175e864684dbd0`。
工具：`tools/leaves-mutants.mjs`（六批共用判据：判据自测 10 反例 + 对照 exit0 全绿 +
单针恰 exit1/恰一红/绝对文件/实际 fullName/AssertionError 拒混错 timeout；隔离 config loader
注入临时副本，生产源前后 sha256 一致断言；注入命中写 entered.json 见证）。

## 批 A — L01–L04（menu 数据层）

- 候选 SHA：`1c1d07010b7e47443346741d012c2f021655832d`；父提交：`65f44758`（派发提交）。
- diff 范围：仅 `packages/game/src/core/menu/*.glm-phase1-leaves.test.ts` ×8、
  `docs/testing/glm-phase1-leaves/{tools/leaves-mutants.mjs,receipt.md,evidence/batch-A/**}`。
- 新文件（50 tests / 50 passed / 0 failed，新鲜 JSON `evidence/batch-A/vitest-new.json`）：
  - L01 `primitives.glm-phase1-leaves.test.ts`（10）：pageUp/Down 落点跳 disabled 与全 disabled
    兜底、负 defaultCursor、空 getSelected、Triple 自定义 defaultSel 环绕、Switch 越上界 clamp、
    Confirm message、rightText 透传 identity。
  - L01 `item-select.glm-phase1-leaves.test.ts`（8）：matchesFilter potion 否决位/battle 三分支/
    important/sellable 直测、目录外 itemId 剔除、缺 `_name` 回退、空库存、pageSize 覆写、
    sell 奇数价 floor、建表期过滤+恒 disabled=false（区别 fullscreen 全显示）。
  - L02 `magic-select.glm-phase1-leaves.test.ts`（4）：spell 悬空 magicNumber 剔除、缺 `_name`
    回退 magic#id、costMP=0 在 MP=0 可选、空槽位+pageSize。全部完整 typed fixture（无 cast）。
  - L02 `in-game-magic-menu.glm-phase1-leaves.test.ts`（10）：DL22 施法人光标跨开启记忆/越界归 0、
    roles 缺失 id 剔除、错相 confirmCaster 零请求、单人队死亡成员仍直进 pick-spell
    （uigame.c:677-681）、空 spellMenu 八向兜底、pick-target Left/Right 边界、非 pick-spell 相
    翻页零触达、关菜单后 refresh 不复活。
  - L03 `inventory-menu.glm-phase1-leaves.test.ts`（6）：iCurInvMenuItem 恢复+clamp、缺 inUse
    默认 0、use-target 相 Up/Down 委派 targetMenu 且 list 相六键零触达、done 相全 no-op、
    cancel 路径 L40 记忆回写、无 selectedItemId 防御 null。
  - L03 `inventory-action-menu.glm-phase1-leaves.test.ts`（4）：defaultCursor 越上界、Down 双连
    环绕、词表 flat[22]/flat[23] 文案、空 selection 防御 undefined。
  - L04 `equip-menu.glm-phase1-leaves.test.ts`（4）：list 固定 filter='equip'、目录缺 item 确认
    no-op、done 相全 no-op、单人队环绕自返。
  - L04 `in-game-menu.glm-phase1-leaves.test.ts`（4）：两菜单首尾环绕、SystemMenu 词表
    flat[11..15]、负/越界 defaultCursor 归 0。
- 相邻回归：`src/core/menu/` 全量 120 文件 308/308 passed（`evidence/batch-A/vitest-adjacent.json`）。
- 命令：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/game exec vitest run <new 8 files>
  --maxWorkers=1 --reporter=json --outputFile=…`；`pnpm --filter @type-pal/game typecheck`（0 诊断）；
  `pnpm exec biome check <新文件+docs/testing/glm-phase1-leaves>`（0 error/warning/info）；
  `node scripts/docs/check.mjs` PASS；`git diff --check` 干净。
- 反控（`evidence/batch-A/needles-summary.json`，`node tools/leaves-mutants.mjs a`）：
  - control：8 新文件 50/50 exit0 全绿。
  - `inv-menu-icur-clamp`：`inventory-menu.ts` safeCur clamp 拆除 → 恰一红
    `L03 createInventoryMenu 起始光标与快照默认 > gs.iCurInvMenuItem 恢复为起始 cursor；越界 clamp 到末项`。
  - `magic-caster-cursor-memory`：`in-game-magic-menu.ts` DL22 回放拆除 → 恰一红
    `L02 DL22 施法人光标跨开启记忆（uigame.c:674/719 static w） > 确认即记忆；…`。
  - 生产源 hash 前后一致（summary.hashes）。
- 去重口径：现有 `__tests__/primitives|item-magic-select`、`primitives|magic-select|
  in-game-magic-menu|inventory-menu|inventory-action-menu|equip-menu|in-game-menu` 各
  `.test/.boundaries` 已核（头部去重表逐文件列明），未复制旧断言。
- 未证项：`matchesFilter` 的 `costMP ?? 0` 类运行时缺字段分支在 typed 输入下不可达（登记为防御，
  不凑针）；`createSelectionMenu(pageSize=0)` 语义异常窗口未断言（无生产 caller，留 Codex 裁量）；
  覆盖增量未执行（配置见 README，统计由 Codex 统一）。

## 批 B — L05–L08（shop/sell、save-slot/opening、battle-inspect、state-dump/detectors）

- 候选 SHA：`9b4972f1a0efb5c875dfab23a4e500a257e6839e`；父提交：批 A 回执头 `5aca67e182bb5de2696b0f534bfac822cf694515`。
- diff 范围：仅 7 个新测试文件（shop/sell/save-slot/opening/battle-inspect/state-dump/detectors
  各 `*.glm-phase1-leaves.test.ts`）、`tools/leaves-mutants.mjs` 增批 b 注册、
  `evidence/batch-B/**`、本 receipt。
- 新文件（31 tests / 31 passed / 0 failed，新鲜 JSON `evidence/batch-B/vitest-new.json`）：
  - L05 `shop-menu.glm-phase1-leaves.test.ts`（3）：缺 `_name` 回退 `?id`、pageSize 固定 8、
    错相 shopSelectItem 零请求、目录缺 item no-op、list 相 shopConfirm null。
  - L05 `sell-menu.glm-phase1-leaves.test.ts`（3）：grid 固定 filter='sellable'、空库存 `!slot`
    防御、错相 sellSelectItem/sellConfirm 零请求、刷新缩表（非空）clamp 分支。
  - L06 `save-slot-menu.glm-phase1-leaves.test.ts`（4）：**只同步合同**（不调 fetchSlotMetas/
    Save API/IndexedDB）——defaultSlot 自定义槽号 cursor=slot-1、非顺序 slot id 按 id 反查、
    defaultSlot 越界保持 0、空列表防御。
  - L06 `opening-menu.glm-phase1-leaves.test.ts`（3）：choice 'new-game'/'load-game' 映射、
    词表 flat[7]/flat[8] 同步两处、空表 choice 防御。
  - L07 `battle-inspect.glm-phase1-leaves.test.ts`（9）：persistent 来源 + slow 无持久位、
    rgPoisonStatus 毒条 entries/tags（知名/未知/ID0 跳过）、battle players[slot].roleId 投影与
    缺槽回退、hiddenExp 池级 next、steal 金钱/知名/缺名三分支、maxHealth??prevHp??health 链、
    defeated/巫抗行、敌状态敌毒、isBoss/screenWave、三收集器输入深保真（消费子树逐字段快照比对）。
    GameState 来自 createInitialGameState 真实工厂 + 完整 BattleState 字面量（createSeedableRng），
    无 as-cast 掩盖。
  - L08 `state-dump.glm-phase1-leaves.test.ts`（5）：dumpFrameJson 全字段深比对（dir 映射/
    wFrame 三来源/3 帧表 [0,1,0,2]/sprite 回退链/npcs 缺省回退）、initStateDump `?tp_dump=1`
    启用与关闭、push 帧号递增；jsdom 隔离 window + finally 恢复 location/全局，
    不启用真实页面 dump、不碰 E2E 日志。
  - L08 `detectors.glm-phase1-leaves.test.ts`（4）：atSpot 默认容差 ±48/±24 恰好边界、
    atAnySpot 多点任一命中（旧例未覆盖）、leaveScene prev=null 防御、enterAnyScene 集合外/空集、
    caiyiDetector 自定义敌 id。
- 相邻回归：`src/core/menu/ + src/core/inspect/ + src/tools/speedrun/` 404/404 passed
  （`evidence/batch-B/vitest-adjacent.json`）。
- 命令：同批 A 口径；typecheck 0 诊断、Biome 新文件 0 诊断、docs PASS、`git diff --check` 干净。
- 反控（`evidence/batch-B/needles-summary.json`，`node tools/leaves-mutants.mjs b`）：
  - control：7 新文件 31/31 exit0 全绿。
  - `sell-refresh-shrink-clamp`：refreshSellGrid 缩表 clamp 拆除 → 恰一红。
  - `steal-money-item-branch`：battle-inspect steal 金钱/物品分支反转 → 恰一红。
  - 生产源 hash 前后一致（summary.hashes）。
- 未证项：state-dump 无 window 分支（jsdom 恒有 window，防御不测）；detectors `enterScene`
  已证合同未重测；覆盖增量未执行，统计由 Codex 统一。

## 批 C — L09–L12（present/menu 绘制层）

- 候选 SHA：`38072e8d8bc4f6e6e0223bd2f3ba8ffcbeede56b`；父提交：批 B 回执头 `33fbbb15`。
- diff 范围：9 个新测试文件 + 本队列 fixture `packages/game/src/__tests__/glm-phase1-leaves/
  present-fixtures.ts`（自有一套字形/SPRITEUI/时钟冻结，不与 grok 或其它对话共享）+
  `tools/leaves-mutants.mjs` 批 c 注册 + `evidence/batch-C/**` + 本 receipt。
- 新文件（34 tests / 34 passed / 0 failed，新鲜 JSON `evidence/batch-C/vitest-new.json`）：
  - L09 draw-menu（5）：save-slot 槽位框+标签+savedTimes 黄数字、inventory-action 框+两标签
    选中色、system switch 相 关/开 层、shop-sell 栈项 confirm 相叠 否/是、缺 extra 三种占位框。
  - L09 draw-confirm（3）：否/是 两框、rightSelected 高亮互换、fShadow 三影黑点、关/开 复用。
  - L10 draw-magic（4）：施法人死亡未选中 0x18/被选中 0x1C、法术 MP 不足被选中 0x1C
    （预置 disabled 着色，不冒称 MP 判定已执行）、空法术表只画框+MP needed 0、
    spell 缺 catalog 回退 item.label。
  - L10 draw-inventory（3）：目录缺 item `?id` tofu + 0x1C/0x18、混列各归其色、
    use-target 缺 gs/playerRoles 不叠选人层。
  - L11 draw-equip（3）：非顺序 party [3,1] equipableBy 按 roleId 位、已装备槽缺 catalog
    画 `?id`、空槽不画、roles 缺 roleId 跳过。
  - L11 draw-player-status（4）：runtimeOrBase 0→base 回退与 runtime 优先、装备槽缺 catalog
    跳过（与 draw-equip `?id` 合同不同）、cursor 越界早退。
  - L12 draw-shop（4）：ownedCount=库存+跨队已装备、空店铺列表、sellOverlay 非 sellable/
    缺 cursorItemId 只画框、sellable 半价。
  - L12 draw-opening-menu（3）：选中 0xF9/非选中 0x4F 精确色+三影、fallback tofu 色、
    词表 label 同步、无 box（不依赖 uiSpriteFrames）。
  - L12 draw-box（5）：drawSingleLineBox 缺帧 fail-loud、shadowOffset 0 无阴影、box 越 fb
    界裁剪不抛错、menuTextMaxCols 空表/全角/缺字 ASCII 量化。
- 相邻回归：`src/present/` 全量 424/424 passed（`evidence/batch-C/vitest-adjacent.json`，
  含 grok-present/grok-composition 旧例零回归）。
- 命令：同前批口径；typecheck 0 诊断、Biome 0 诊断（含 fixture）、docs PASS、diff --check 干净。
- 反控（`evidence/batch-C/needles-summary.json`，`node tools/leaves-mutants.mjs c`）：
  - control：9 新文件 34/34 exit0 全绿。
  - `save-slot-saved-times`：savedTimes 显示断链 → 恰一红。
  - `shop-owned-equipped-count`：「现有」漏计已装备 → 恰一红。
- 未证项：绘制只证协议/坐标/色值（素色小图集），不冒称原版观感；真实字体/SPRITEUI 资源观感
  留 LV1 短视觉样本；覆盖增量未执行，统计由 Codex 统一。

## 批 D — L13–L16（战斗呈现 + font/framebuffer/screen-wave）

- 候选 SHA：`4f8fa63d0dbcd18552274b540b3885f4dc2213a0`；父提交：批 C 回执头 `d7db3d1b623fc14bf5e28bc7b95bc9c1f964f21e`。
- diff 范围：6 个新测试文件 + fixture 增补（SPRITEUI 40-43 战斗图标）+ runner 批 d 注册 +
  `evidence/batch-D/**` + 本 receipt。**present-battle.ts 登记 existing-proof**：
  present-battle.test + grok P12/P13/P14 已覆盖 draw 全管线/fade-only/消息条/召唤 crossfade/
  入场 dither，本组未发现新合同，不凑文件。
- 新文件（20 tests / 20 passed / 0 failed，`evidence/batch-D/vitest-new.json`）：
  - L13 draw-battle-ui（3）：当前行动队员箭头 frame69 at anchor+(-8,-74)（blink 冻结 40ms 相位）、
    uiState='wait'/selectingPlayerIdx 缺省无箭头、DL30 selectTargetEnemy 不画主菜单图标
    （对照 selectMove 选中全彩）。合法小 BattleState 字面量，不启动 battle-system。
  - L14 draw-battle-sprites（3）：blitFrame 底中锚右缘/完全出界/顶缘裁剪（不抛错、界内照写、
    colorShift 仍应用）。
  - L15 draw-battle-settlement（4）：exp-cash 右/中对齐精确数字、level-up 8 行 old→cur+slash+
    箭头+0xBB 标签、hidden-exp-up 词表拼字+涨点 x=167（公式交叉验证）、learn-magic ww 偏移+
    magicName 0x1B。
  - L16 font（3）：renderColoredText 逐字符色+缺色 0x4F 回退+fShadow 三影（全仓首测）、
    tofu 缺字形几何、measureText 空表 fallback。
  - L16 framebuffer（3）：writePixel 越界静默、自定义尺寸、toImageData 缺色 fallback。
  - L16 screen-wave（3）：advance=false 计数不推进（DM32）、循环卷动独立手算
    shift=trunc(60·w/256)、相位跨帧推进（帧1 左移 30、帧2 在已卷内容上再 56=总 86）。
- 相邻回归：`src/present/` 全量 444/444 passed（`evidence/batch-D/vitest-adjacent.json`）。
- 命令：同前批口径；typecheck 0 诊断、Biome 0 诊断、docs PASS、diff --check 干净。
- 反控（`evidence/batch-D/needles-summary.json`，`node tools/leaves-mutants.mjs d`）：
  - control：6 新文件 20/20 exit0 全绿。
  - `learn-magic-name-color`：练成屏 magicName 0x1B 色丢失 → 恰一红。
  - `wave-fade-only-advance`：fade-only 补帧误推进波幅（DM32 拆除）→ 恰一红。
- 未证项：箭头 blink 红/蓝两相只冻结证 frame69 相位（frame 68 未入 fixture，红相位留观感样本）；
  loadGlyphs fetch 失败分支需网络桩，登记防御不测；覆盖增量未执行，统计由 Codex 统一。

## 批 E — L17–L20（tools 面板与小工具）

- 候选 SHA：`a399a1fb04a6a4b446f628ad37594339db4da72e`；父提交：批 D 回执头 `36ea9f50`。
- diff 范围：9 个新测试文件 + runner 批 e 注册 + `evidence/batch-E/**` + 本 receipt。
- 新文件（19 tests / 19 passed / 0 failed，`evidence/batch-E/vitest-new.json`）：
  - L17 tools-panel（2）：缩放滑块 input → setPercent(posToPct(v))（0.75→316%）+ % 文案同步、
    全屏按钮 → toggleFullscreen、FPS 开关 → setFpsEnabled（tp-fps-show 持久可观察）。
    委托边界；不触真实缩放/全屏/存档写盘。
  - L18 minimap（4）：drawMinimap 真实 canvas 2D 像素（暗底占位、玩家白点在手算
    worldToThumb 坐标、宝物金色点 toggle 显隐整图扫描）、setupMinimap 控制器 toggle 与
    localStorage 持久读回、非法持久值回默认。真实 canvas（jsdom+canvas 包），自有 GameState。
  - L19 toast（2）：多条堆叠共存与按条到期移除、info 图标/class、空容器自删。
  - L19 display-scale + fps-overlay（4）：非整数 setPercent 四舍五入、居中锚定样式、
    MIN/MAX 常量可达、toggleFullscreen requestFullscreen/exitFullscreen 分支、
    hideFpsOverlay 从未创建 no-op、样式幂等留存、非法持久值视为关。
  - L20 time-format（2）：formatClock/formatHms 小时位进位手算（1:01:01.23）。
  - L20 countdown（2）：单例元素复用不重复建、null 移除幂等、移除后重建。
  - L20 timer（2）：两段式手动暂停（一按停表、再按 13000 倒计时窗）+
    getCountdownRemainingSec ceil 语义与清零后 null、consumeBestsDirty 一次性读、
    reset 保留 bests 只清本局。
- 相邻回归：`src/tools/` 全量 147/147 passed（`evidence/batch-E/vitest-adjacent.json`）。
- 命令：同前批口径；typecheck 0 诊断、Biome 0 诊断、docs PASS、diff --check 干净。
- 反控（`evidence/batch-E/needles-summary.json`，`node tools/leaves-mutants.mjs e`）：
  - control：8 新文件 19/19 exit0 全绿。
  - `toast-container-cleanup`：空容器自删拆除 → 恰一红。
  - `tools-panel-scale-delegate`：缩放滑块委托断链 → 恰一红。
- 未证项：minimap mountSceneView 的 rAF 自更新循环与底图 Image 异步加载未测（需 fake rAF +
  Image onload 桩，登记后续）；tools-panel 存档导入/导出委托按卡面边界不测；覆盖增量未执行。

## 批 F — L21–L24（speedrun 存储编排 + shell 装载与资产）

- 候选 SHA：`b6eaa15b3f1ccbaa08c15dff5ab35fa789ab7c0f`；父提交：批 E 回执头 `0439e0d7`。
- diff 范围：8 个新测试文件 + runner 批 f 注册 + `evidence/batch-F/**` + 本 receipt。
  **existing-proof 登记**：boot-loading.test（9 项 init/finish/fail/note/幂等/PROD 分流已密）、
  precache-ui.test（7 项两段进度/按钮/widget 生命周期已密）、tileset-blob.test（13 项
  RLE/GOP/gzip/角色锚点/全链路已密）——三源未发现新合同，不凑文件。
- 新文件（17 tests / 17 passed / 0 failed，`evidence/batch-F/vitest-new.json`）：
  - L21 store（2）：bests 非法 JSON 降级 defaults 副本、defaults 外存储 key 忽略、
    saveBests→loadBests 往返、settings 仅识别 '1'/'0'。
  - L21 speedrun index（2）：setupSpeedrunHotkeys 解绑函数移除监听（解绑后 F4 无新 toast）、
    未启用按键短路、解绑幂等。
  - L21 overlay（2）：renderOverlay 原位更新单根不重复建、样式注入幂等、hideOverlay 幂等。
  - L22 precache-client（2）：pause/resume 早于 ready 静默丢弃（仅 start 缓冲补发）、
    ready 后 start/pause/resume 协议载荷顺序直达 worker。fake ServiceWorkerContainer 桩，
    不注册真实 SW。
  - L23 fetch-retry（2）：uninstallFetchRetryForTest 还原后网络错误不再重试包装（恰 1 次）、
    还原后可重新装载（installed 复位）。
  - L23 png（2）：alpha=0 透明 / palette-0 opaque 双通道合同、坏 blob 失败上下文
    （带尺寸/类型，不裸抛）。
  - L23 dialog-assets（2，无既有测试）：manifest+PNG 成功就位、单张 404 skip、icons !ok
    降级空 map、portraits.json 500 → 空 map 不阻整体；fetch 全隔离不触真实 /extracted。
  - L24 audio + audio-midi（3，audio-midi 无既有测试）：setOggVolumeScale 对新建与播放中
    元素即时生效（0.6·scale）、setBgmVolume 合成器未就绪只暂存不抛、无 AudioContext →
    no-op backend。FakeAudio 端口，不 mock 本模块，不证听感。
- 相邻回归：`src/shell/ + src/assets/ + src/tools/speedrun/` 281 passed / 0 failed
  （12 skipped 为既有 skip；`evidence/batch-F/vitest-adjacent.json`）。
- 命令：同前批口径；typecheck 0 诊断、Biome 0 诊断、docs PASS、diff --check 干净。
- 反控（`evidence/batch-F/needles-summary.json`，`node tools/leaves-mutants.mjs f`）：
  - control：8 新文件 17/17 exit0 全绿。
  - `store-bests-key-merge`：bests 坏 JSON 降级拆除 → 恰一红。
  - `ogg-volume-live-refresh`：OGG 音量即时刷新拆除 → 恰一红。
- 未证项：audio-midi 真实 SpessaSynth 初始化/AudioWorklet 与真实 SW 离线行为不测（端口协议
  已按桩证）；听感/真实离线未证，不冒称；覆盖增量未执行，统计由 Codex 统一。

## 四项隔离短视觉样本（LV1–LV4，全部完成）

- 宿主：`browser-host/{host.html,main.mjs,vite.config.mjs}`，vite strictPort **6082**，
  `/extracted` 只读中间件指向主仓已提取数据（真实调色板/字形/SPRITEUI 帧就位）。
  只导入实际生产 draw/setup；不碰用户服务/E2E/真实存档/真实 SW/网络遥测。
- 证据表（截图 SHA256/尺寸/步骤/预期/实际/console 无错误）：[browser-host/evidence.md](browser-host/evidence.md)。
  截图存 `/tmp/type-pal-glm-phase1-leaves/`（12 张，LV1 三态 + LV2 四态 + LV3 两态 + LV4 三态）。
- 结论：LV1 菜单三态与像素断言一致（金钱框/switch 相/存档槽 savedTimes 数字可见）；
  LV2 战斗 selectMove 无异常覆盖、数字可见、结算三屏数字/颜色正确；LV3 面板真实 DOM 可达、
  场景 tab 只读信息（坐标/朝向/镜头）正确、小地图定位点/白框可见、点击委派已记录；
  LV4 假消息源推进到「必要资源就绪 — 可进入」、renderOverlay/hideOverlay 显隐与倒计时收尾正常。
- 未证项：真实地图底图（getMapThumbnail 链路）、真实 SW 离线、听感——均如实未证，不冒称。

## 事件记录：批 D/E 文档提交损坏与本次修复

- 36ea9f50（批 D docs）起 README.md 被逐行加污染前缀；0439e0d7/ee1651b8（批 E/F docs）
  把 receipt.md 错写成 README 内容（批 D/E 节一度丢失）。本提交逐行剥离前缀、按 36ea9f50
  恢复 receipt 批 A–D 并重建批 E/F 与视觉样本节；历史损坏提交不追溯改写，以本提交为准。
- README 批次表与 receipt 各批候选 SHA 已核对与对应测试提交一致（A=1c1d0701、B=9b4972f1、
  C=38072e8d、D=4f8fa63d、E=a399a1fb、F=b6eaa15b）。
