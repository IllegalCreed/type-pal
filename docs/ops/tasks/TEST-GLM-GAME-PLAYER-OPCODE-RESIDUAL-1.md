# TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 — player opcode residual contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / player opcode semantics
Branch: `codex/glm-game-player-opcode-residual-r1`
Visual Verification Timing: e2e-deferred

## 目标与范围

补齐 `packages/game/src/core/event-opcode-player.ts` 中仍未被旧测、GLM event contracts、已归档 Game 卡证明的玩家 opcode 合同；不以覆盖率或例数作为本卡指标。重点核对合法 role/equipment/magic/status 输入、HP/MP 钳制、装备/魔法/状态写回、升级随机字段和失败返回。

先对照 `event-opcode-player.test.ts`、`event-opcode-player.cov85.test.ts`、`event-opcode-player.glm-next-wave.test.ts` 和全量 fullName 排重；已证同 caller/同 oracle 只登记，不包装测试。

## 硬约束与交付

只写本卡专属测试、合法 typed fixture 和证据；不得改产品、旧测、配置、baseline、真实 PAL 数据、私有 state 或后门。不得强转、skip、ignore、扩大 timeout、业务核心 mock。每条合同记录 source/caller/input/oracle/fullName；反控必须原始绿→指定业务红→恢复绿并保存 raw/JSON/exit/执行集/三态 hash/清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check；覆盖率只记录到整体 main。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及已归档 Game 卡；只在 codex/glm-game-player-opcode-residual-r1 工作。先对 event-opcode-player.ts 与三套旧测做 fullName/caller/input/oracle 排重，再补合法 role/equipment/magic/status/level-up 合同。不得改产品、旧测、配置、baseline、真实数据、私有 state、强转、skip、ignore、扩大 timeout 或业务核心 mock。反控须三态绿红绿、唯一业务 AssertionError、执行集、raw/JSON、三态 hash 和清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```

---

## GLM r1 交付回执（2026-10-05，分支 codex/glm-game-player-opcode-residual-r1，base 053ae5bb4）

**结论：6 条未重复语义合同全绿（1 个新测试文件），反控 7/7 VALID，全门通过；不请求 done，
等待 Codex 独立验收。** 逐 opcode 排重账（REG/NEW/防御守卫）见
[evidence/TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1/dedup-ledger.md](../evidence/TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1/dedup-ledger.md)。

### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实 PAL 数据改动）

`packages/game/src/core/event-opcode-player.glm-opcode-residual.test.ts`（6 it，公开 caller
applyPlayerOpcode，效果观察走公开 getter getPlayerAttackStrength；效果层种入用生产路径 0x17）：

| 组 | it | 主要合同轴（源锚 / oracle） |
|---|---|---|
| 装备效果层撤除接线 | 3 | 0x18 换装先撤旧部位效果层（:96，script.c:768-775；种入加成清 0 + 有效攻击回落 base）；0x23 单槽卸下有物槽撤/空槽残留不动（:227 `itemId!==0` 守卫两侧）；0x23 全卸无条件清含无物槽残留（:221 循环臂，与单槽臂不对称） |
| 0x1c/0x1d applyAll | 2 | 全队 MP / 全队 HP+MP 双轨（:161/:173）：活人改动+钳制、死人跳过（:346，global.c:1282 PAL_IncreaseHPMP 只处理活人）、fScriptSuccess 不写（与 0x1b applyAll=anyChanged 相异，script.c:896-947 真值）；重复施放零改相位钉住 `!applyAll` 守卫 |
| 0x29 抗性边界 | 1 | `roll <= resist` inclusive（:244）：50 掷对 50 抗被挡、51 掷命中（mockReturnValueOnce 两掷） |

### 反控三态（mutation-results.json 7/7 VALID；42 份规整日志）

| 针 | 源行 | 变异 | 唯一指定业务 AssertionError（节选） |
|---|---|---|---|
| MUT-01 | 96 | 删 0x18 入口 removeEquipmentEffect | `expected 12 to be +0`（换装残留旧加成） |
| MUT-02 | 227 | 删单槽卸下 removeEquipmentEffect | `expected 9 to be +0` |
| MUT-03 | 221 | 删全卸循环 removeEquipmentEffect | `expected 30 to be +0`（空槽残留不清） |
| MUT-04 | 161 | `!applyAll &&` 删（0x1c） | `expected false to be true`（零改相位误写标志） |
| MUT-05 | 173 | `!applyAll &&` 删（0x1d） | `expected false to be true` |
| MUT-06 | 244 | `<=`→`<` | `expected true to be false`（等值边界翻转） |
| MUT-07 | 346 | 删死人 continue | `expected [ 27, 45, 45 ] to deeply equal [ 7, 45, 45 ]`（死人 MP 被改；C4/C5 两红均业务 AssertionError） |

每相位保留 command(argv)/cwd/env 快照/stdout/stderr（trimEof + 恰一换行 + bytes/sha256 按落盘
字节）/exitCode/signal/spawnError/JSON 摘要/逐套件 status/全量 identitySet（6 条
file×fullName×status，红绿相位零漂移）；判据含零执行/red-json-unparsable/red-pending>0/
red-runtime-error/red-no-business-assertion/restored-not-green/restore-sha-mismatch/
green-identity-drift。恢复后 event-opcode-player.ts sha 与原始 byte-identical
（cleanupRestored=true），git diff 产品文件为空。

### 排重登记要点（REG，不新增包装测试）

- 0x18/0x23 的装备行、背包、wLastUnequippedItem、iCurEquipPart、回包、守卫全部旧证（旧测 +
  cov85 r1/r3 + glm-next-wave + equip-effect runEquipScript 三测 + menu-driver:340 管线集成）；
  0x23 全卸**有物槽**撤效果层 event-system.test.ts:3008 已证（管线级）。本卡只补效果层接线残余
  （:96/:221/:227）与空槽不对称臂。
- 0x1c/0x1d 单体钳制/失败语义 cov85 r1/r3 + 旧测 + magic-script.test.ts 全证；applyAll 臂
  （含死跳、不写标志）全仓零覆盖。0x1b applyAll=anyChanged 已证，作为相异对照写入 C4 名。
- 0x19 负向 delta = E3-01（helper）+ 0x17 共享 signExtendI16（caller 级）合成，不另包装；
  0x1a 路由 E3-02；0x2b/0x2c 空目标臂经共享 playerTargets 由 0x29 已证。
- 0x20 removeItem 装备槽补足撤效果（event-system.test.ts:3111、glm-event-contracts）是另一
  opcode 的另一接线，不覆盖本卡三针。
- 防御守卫（:98 !eqRow、:271/:292 !row、operands ?? 0 稀疏）维持 cov85 r1 账登记，不伪造覆盖。

### 质量门

- 定向 1 文件 6/6；相邻 12 文件 469/469（player 族 4 + equip-effect + equipment-state +
  magic-script + stats e2~e5 + event-system）；game 全量 3466/3466（worktree 补 data 软链后全绿）。
- typecheck 0 error；`pnpm lint` 全仓 0/0/0（3354 files）；`pnpm check:docs` PASS
  （含 board.md / evidence/README.md / tasks/index.md 三处 after-SHA 按 8494b465c 外科判例刷新：
  本卡开卡提交 053ae5bb4 与前两张卡交付提交改写的是运维索引行，非被审内容；仅同步
  afterSha256/implementationSha 两 pin + history 追加 content-review-sha-refresh）；
  `git diff --check` 0。diff 仅新增：1 测试文件 + evidence 目录 + evidence README 一行 + review
  JSON 三条目刷新 + 本回执。

### 环境备注

隔离 worktree 缺 gitignored data/extracted（软链主仓）与 data/raw MKF（逐文件软链），不改任何
tracked 文件；worktree 环境处置，非仓库改动。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 Codex，负责独立验收 TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 的 r1 交付（分支
codex/glm-game-player-opcode-residual-r1，回执在本卡上方）。
先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
docs/ops/evidence/TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1/（README/dedup-ledger/
mutation-points/mutation-results/mutation-logs），再核：
1) event-opcode-player.glm-opcode-residual.test.ts 6 合同的原子性、合法 typed 输入、真实公开
   caller、oracle 判别力与 fullName 排重（对照 dedup-ledger 的 REG 锚点是否属实，尤其
   event-system.test.ts:3008 只证全卸有物槽、0x1c/0x1d applyAll 全仓零覆盖、menu-driver:340
   只证 wLastUnequippedItem 三项登记）；
2) 反控 7 针三态证据（identitySet/hash/清理）与判据（MUT-07 允许 C4/C5 两红并存，均为指定
   业务 AssertionError 口径）；
3) 门禁复算（定向/相邻/typecheck/lint 0-0-0/docs/diff --check）与 review JSON 三条目
   after-SHA 外科刷新是否符合 8494b465c 判例。
输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
```

**r1 工作提交 SHA**：`6172c0df4a8e7ee5e7763c4a1dee837a270de703`（单一 commit 含 6 合同测试 +
证据目录 + 回执 + review JSON 三条目外科刷新；本行为 SHA 登记追加笔，base `053ae5bb4`）。
