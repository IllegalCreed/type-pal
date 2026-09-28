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

- 候选 SHA：见 git log（本节随批固定）；父提交：批 B 回执头。
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
