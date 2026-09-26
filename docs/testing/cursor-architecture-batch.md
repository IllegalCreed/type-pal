# ARCH-F2-CURSOR-BATCH-1 — 24组命令族与设计系统模块整理

> Codex已独立接收fc09645e并完成统一门禁、最小功能验证与done收口，见[最终验收](cursor-architecture-batch-integration.md)。下文保留作者交付时的“不合main/不标done”职责说明，不代表当前集成状态。

2026-09-26。Cursor 在独立 worktree `/Users/zhangxu/illegal/type-pal-cursor-architecture-batch`、分支 `codex/cursor-architecture-batch-r1` 上连续实施 C00–C10、U00–U12。起点是当时最新 `origin/main` `8bf40b9094d9e43f6c3d146c1bda651962eb36c3`。卡面冻结 `0cb32631` 是它的祖先。没有合 main，没有标 done，没有跑官方覆盖率。

`commands.ts` / `controls.tsx` 保留旧公开出口；新模块对 `Command` 只 type-import `command-contract.ts`，不 runtime 回引旧 barrel。`design-system/index.ts` 仍是 `export * from './controls.js'`。`dsClasses` 在开工前的 main 已公开，本包只改成从 `control-utils.ts` 重导出。`withEnemy` 仍被本文件残留的 `SetEnemyBattleSpriteCommand` 使用，因此留在 `enemy-commands.ts` 并由 `commands.ts` runtime import。CSS、产品宿主、格式配置、超时、排除项和基线未改。

机械更新：`text-overflow-adoption.json` 的 producer 文件/符号改到真实拥有 class 的新组件；`adoption.test.ts` / `boundary.test.ts` 的静态路径改为读新生产模块，原违规反例仍拒绝。

旧 `controls.tsx` barrel 已恢复开工前的 **50** 个公开出口。r1 回执把新增写成 7 个类型是错的：真实多出来的是 **2 个 runtime 值**（`draftSource`、`useDsDraftController`）+ **5 个类型**（`DsDraftInputContract`、`DsFieldChromeProps`、`DsDraftNumberInputProps`、`DsNumberInputProps`、`DsFormControlAppearance`）。`DsFieldControlProps` / `DsFieldHelp` 本来已公开，仍留在桶上。下层模块继续导出内部协议；没有现有产品消费者必须从旧 barrel 取那 7 个新出口。

## 24行状态总账

| 组 | 状态 | 提交 | 新模块 | 负控 JSON |
|---|---|---|---|---|
| 组 | 状态 | 提交 | 文案/属性针 | 守卫 / undo / 交互证据 | 负控 JSON |
|---|---|---|---|---|---|
| C00 | 已实施 | `6fc7cc7f7e626c0de31ac92c433f5bbbed377cb3` | 引用文案 | 同文件 `DeleteEnemy still throws…` 首次 apply | [c00-mutant.json](cursor-architecture-batch/c00-mutant.json) |
| C01 | 已实施 | `06639683f4afda6b7f7036fcdf281bc49e5b52d9` | in-use 文案 | 同文件构造器 + `world-variable-references` | [c01-mutant.json](cursor-architecture-batch/c01-mutant.json) |
| C02 | 已实施 | `2356dc0144cf88b4c154025f080df4eaeeff004c` | `label` | 同文件首次 apply / invert | [c02-mutant.json](cursor-architecture-batch/c02-mutant.json) |
| C03 | 已实施 | `84c1a0de85fcc95378f046da24fec272d29e9c87` | 槽位截断 | 同文件 + 既有敌队引用套件 | [c03-mutant.json](cursor-architecture-batch/c03-mutant.json) |
| C04 | 已实施 | `c00fe8859c1cebaa45decb662a22869d7a6d6906` | 重复 id 文案 | 同文件 duplicate-id throw | [c04-mutant.json](cursor-architecture-batch/c04-mutant.json) |
| C05 | 已实施 | `e62d76a44e018d9dc5074f3d623796736ff6dd91` | 默认 power | 同文件 add/update/invert | [c05-mutant.json](cursor-architecture-batch/c05-mutant.json) |
| C06 | 已实施 | `594e8e6040f29903b4ddbe15efa602f06881068c` | 默认 curability | 同文件 scaffold | [c06-mutant.json](cursor-architecture-batch/c06-mutant.json) |
| C07 | 已实施 | `3d2cff75f36227b7fb6764f0c2106f8276fe0063` | 新例只证构造器/add-invert/错误文案，**不称守卫** | 既有 `commands.test.ts`「DeleteAmbience:脚本显式引用…」；负控改针删除门 | [c07-mutant.json](cursor-architecture-batch/c07-mutant.json) |
| C08 | 已实施 | `c50c09b95c1e8a64f64bf9359e4c9499d9cc75c0` | overflow 文案 | 同文件 `nextShopId` throw | [c08-mutant.json](cursor-architecture-batch/c08-mutant.json) |
| C09 | 已实施 | `58edd015e03ab93b71b1cc43b12a09203d783336` | locale `label` | 同文件 locale apply | [c09-mutant.json](cursor-architecture-batch/c09-mutant.json) |
| C10 | 已实施 | `c9bcf0af2fbd2c435e30d3e69b8f16eacbe95c86` | 清空 label 分支 | 同文件 apply/invert | [c10-mutant.json](cursor-architecture-batch/c10-mutant.json) |
| U00 | 已实施 | `3ddfd6c69204f16b0765fe4239c6a84b87d1dade` | `describedBy` 空串 | 同文件 class join | [u00-mutant.json](cursor-architecture-batch/u00-mutant.json) |
| U01 | 已实施 | `78dd837939c750431ffad91dcec3e2466c1c2f94` | busy 文案 | 同文件 SSR/身份 | [u01-mutant.json](cursor-architecture-batch/u01-mutant.json) |
| U02 | 已实施 | `0fcb6b2c8a1098b384dd75a779a8a415cee5abae` | help-tip `aria-label` | 同文件 Escape dismiss | [u02-mutant.json](cursor-architecture-batch/u02-mutant.json) |
| U03 | 已实施 | `61ab432343dfc69a867079cf3aea466a57966e4b` | compact class | 同文件 aria-label | [u03-mutant.json](cursor-architecture-batch/u03-mutant.json) |
| U04 | 已实施 | `4bc68eed40410f156dc02613203f048daaeb7dc2` | file-picker class | 同文件身份 | [u04-mutant.json](cursor-architecture-batch/u04-mutant.json) |
| U05 | 已实施 | `03511608b73b9691917a0b2e1e25d6317b929bdc` | inline class | 同文件 required 星号 | [u05-mutant.json](cursor-architecture-batch/u05-mutant.json) |
| U06 | 已实施 | `d419ecc0eb4f4b52fee5101f51a9537ea4c0b3c5` | — | Enter 提交 / Escape 取消（交互针） | [u06-mutant.json](cursor-architecture-batch/u06-mutant.json) |
| U07 | 已实施 | `125e754c0c6b07fe07bcd9e3fc4f71b39a363d27` | `step` 属性 | 同文件 parse 字符串 | [u07-mutant.json](cursor-architecture-batch/u07-mutant.json) |
| U08 | 已实施 | `be4022bdc8971c70b80963adabce0d7e887dc26d` | field `id` | 同文件 label 关联 | [u08-mutant.json](cursor-architecture-batch/u08-mutant.json) |
| U09 | 已实施 | `77c46796dca2f62e733c668e0ce83a5ed3fd593a` | combobox role | 同文件 listbox 语义 | [u09-mutant.json](cursor-architecture-batch/u09-mutant.json) |
| U10 | 已实施 | `141a4f4d1a35c96cb755807abf5a6b1cc4f84c4b` | switch role | 同文件 checkbox/switch ARIA | [u10-mutant.json](cursor-architecture-batch/u10-mutant.json) |
| U11 | 已实施 | `ac452243e2929ccb6bcc439e89b8e5c6579259c0` | count class | 同文件 title/count | [u11-mutant.json](cursor-architecture-batch/u11-mutant.json) |
| U12 | 已实施 | `6a369f07e82fdf2f4ffc3aef17f625ec16d11250` | alert role | 同文件 tablist | [u12-mutant.json](cursor-architecture-batch/u12-mutant.json) |

无阻断组。组外机械提交：`c32cfdbbfbc3906628d32ddb4dc280beddc7d248` overflow producer；`d0684e78928088ae969b989aa44095cb49e12790` r1 回执。本轮 r2 窄修另记最终 SHA。

## 出口与运行期依赖

`commands.ts` 对迁出符号只做 `export { … } from './<family>.js'`（及 `export type { Command }`）。新命令模块 runtime 依赖：

| 模块 | runtime | type-only |
|---|---|---|
| `command-contract.ts` | — | `edit-session.js` |
| `battle-data-command-errors.ts` | — | `project-reference.js` |
| `world-variable-commands.ts` | `@type-pal/content`、`project-reference-adapters.js` | `command-contract.js`、`edit-session.js` |
| `enemy-commands.ts` | `battle-data-command-errors.js`、`project-reference-adapters.js` | `command-contract.js`、`edit-session.js`、content |
| `enemy-team-commands.ts` / `item-commands.ts` / `ambience-commands.ts` | `project-reference-adapters.js` | `command-contract.js`、`edit-session.js`、`project-reference.js`、content |
| `skill-commands.ts` / `poison-commands.ts` | `battle-data-command-errors.js`、`project-reference-adapters.js` | `command-contract.js`、`edit-session.js`、content |
| `shop-commands.ts` | `@type-pal/content`、`project-reference-adapters.js` | `command-contract.js`、`edit-session.js`、`project-reference.js` |
| `locale-commands.ts` / `project-name-command.ts` | — | `command-contract.js`、`edit-session.js` |
| `level-up-commands.ts` / `asset-label-command.ts` | — | `command-contract.js`、`edit-session.js`、content |

`controls.tsx` 现为重导出桶。新 UI 模块 runtime 只走 `control-utils` / `help-tips` / `floating-layer` / `icons` / `text-inputs` / `draft-input-state` / `field-layout` 等单向依赖，不回引 `controls.js`。

身份合同：各组测试断言 `controls.<X> === moved.<X>` 或 `commands.<X> === moved.<X>`。命令组覆盖首次 apply、invert/undo、引用阻断或 id 冲突。UI 组覆盖 SSR class/ARIA，U02/U06 另钉 Escape 取消与 Enter 提交。

## r2 窄修（对照 Codex R1–R3）

- R1 fixture：C00 `enemyState` 改为现行 `EnemyDef`（`name` + `health`/`attackStrength` 等）；C05 技能补 `animation` / `usableOutsideBattle`；C10 资源路径改为 `assets/authored/sprites/hero.png`。测试里先跑 `validateEnemies` / `validateSkills` / `validateAssetCatalog` 再进命令。C07 新标题改为 add/invert 身份，不再称 in-use delete；守卫证据是既有 `commands.test.ts` 用例，负控针 `if (references.length) throw new AmbienceInUseError(...)`。
- R2 判据：绝对源路径、唯一替换、`MUTANT_HIT:<id>`、锚定 `fullName`、正控必须执行 1 项、红侧恰 exit 1、逐条 `failureMessage` 必须以 `AssertionError` 开头且拒绝 `caused by` / timeout / 错文件。`--self-test` 覆盖 Codex 双反例、0 执行、exit2/null、未命中、混错、超时。JSON/日志在系统临时目录（各 JSON 的 `evidence` 字段）。
- R3：旧 barrel 回到 50 出口；`module-mutants.mjs` 与 `text-overflow-adoption.json` 已格式化。插值针保持字面量（5 条 template-curly **warning**，不是 formatter error）。

## 验证

作者自验，不能替代 Codex 独立接收。

- 定向+配方：34 files / 401 tests exit 0。
- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 改动 Biome：formatter error 已清。保留变异字面量 warning 与原 `void \| boolean` / boundary template-curly warning。
- `git diff --check` 干净。
- 负控自测 `--self-test` exit 0；24 针 [evidence.json](cursor-architecture-batch/evidence.json)：`count=24`、`allOk=true`、`allHit=true`、全部 `redExit=1`、`hashUnchanged=true`。C07 红侧为既有守卫 `expected function to throw an error, but it didn't`。
- `pnpm --filter @type-pal/editor check`：typecheck exit 0，**313 files / 2813 tests exit 0**（本 worktree 本地 `pnpm install --frozen-lockfile` + 环境内 PAL sprites 链接；不入 Git）。
- 未跑官方 coverage / ratchet / 受保护 strict。未开浏览器，6010 未动。

## 可复制命令

```bash
cd /Users/zhangxu/illegal/type-pal-cursor-architecture-batch
git fetch origin
git rev-parse origin/main HEAD
# 起点 8bf40b9094d9e43f6c3d146c1bda651962eb36c3；当前 HEAD 见提交

node docs/testing/cursor-architecture-batch/module-mutants.mjs --self-test

pnpm --filter @type-pal/editor typecheck

pnpm --filter @type-pal/editor exec vitest run \
  src/core/command-contract.test.ts \
  src/core/world-variable-commands.test.ts \
  src/core/enemy-commands.test.ts \
  src/core/enemy-team-references.test.ts \
  src/core/item-commands.test.ts \
  src/core/skill-commands.test.ts \
  src/core/poison-commands.test.ts \
  src/core/ambience-commands.test.ts \
  src/core/shop-lifecycle.test.ts \
  src/core/locale-commands.test.ts \
  src/core/asset-label-command.test.ts \
  src/core/commands.test.ts \
  src/core/world-variable-references.test.ts \
  src/core/item-references.test.ts \
  src/core/battle-data-delete-commands.test.ts \
  src/ui/design-system/adoption.test.ts \
  src/ui/design-system/field-commit-boundary.test.ts \
  src/ui/design-system/boundary.test.ts \
  src/ui/design-system/controls.test.tsx \
  src/ui/design-system/buttons.test.tsx \
  src/ui/design-system/help-tips.test.tsx \
  src/ui/design-system/icon-button.test.tsx \
  src/ui/design-system/native-inputs.test.tsx \
  src/ui/design-system/field-layout.test.tsx \
  src/ui/design-system/draft-text-inputs.test.tsx \
  src/ui/design-system/number-inputs.test.tsx \
  src/ui/design-system/field-controls.test.tsx \
  src/ui/design-system/select.test.tsx \
  src/ui/design-system/choice-controls.test.tsx \
  src/ui/design-system/list-header.test.tsx \
  src/ui/design-system/tabs-card-feedback.test.tsx \
  src/ui/design-system/control-utils.test.ts

pnpm --filter @type-pal/editor exec vitest run \
  src/ui/design-system/recipes.test.tsx \
  src/ui/design-system/reorder.test.tsx

node docs/testing/cursor-architecture-batch/module-mutants.mjs
# 或单组：node docs/testing/cursor-architecture-batch/module-mutants.mjs c01

pnpm check:docs
git diff --check origin/main -- packages/editor/src/core packages/editor/src/ui/design-system
pnpm --filter @type-pal/editor check
```

任务卡：[ARCH-F2-CURSOR-BATCH-1](../ops/archive/tasks/done/ARCH-F2-CURSOR-BATCH-1-domain-modules.md)。Cursor 自验不是独立证明。Codex 负责隔离 UI、全仓 check、官方 ratchet 与受保护严格 fast。
