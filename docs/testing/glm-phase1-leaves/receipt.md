# GLM 第三对话交付回执（TEST-GLM-PHASE1-LEAVES-3）

逐批登记：SHA、diff 范围、新鲜 JSON 计数、反控、未证项。只填本人候选/自验；
不代签、不合 main、不标 done；官方统计与集成由 Codex 统一执行。

分支：`codex/glm-phase1-leaves-r1`；生产冻结 `4a9ad67faa07b004f259dcde1e175e864684dbd0`。
工具：`tools/leaves-mutants.mjs`（六批共用判据：判据自测 10 反例 + 对照 exit0 全绿 +
单针恰 exit1/恰一红/绝对文件/实际 fullName/AssertionError 拒混错 timeout；隔离 config loader
注入临时副本，生产源前后 sha256 一致断言；注入命中写 entered.json 见证）。

## 批 A — L01–L04（menu 数据层）

- 候选 SHA：`d2cc22b27c824810e3b9d81bca3935721e7215ef`；父提交：`65f44758`（派发提交）。
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
