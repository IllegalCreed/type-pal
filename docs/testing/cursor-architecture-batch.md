# ARCH-F2-CURSOR-BATCH-1 — 24组命令族与设计系统模块整理

2026-09-26。Cursor 在独立 worktree `/Users/zhangxu/illegal/type-pal-cursor-architecture-batch`、分支 `codex/cursor-architecture-batch-r1` 上连续实施 C00–C10、U00–U12。起点是当时最新 `origin/main` `8bf40b9094d9e43f6c3d146c1bda651962eb36c3`。卡面冻结 `0cb32631` 是它的祖先。没有合 main，没有标 done，没有跑官方覆盖率。

`commands.ts` / `controls.tsx` 保留旧公开出口；新模块对 `Command` 只 type-import `command-contract.ts`，不 runtime 回引旧 barrel。`design-system/index.ts` 仍是 `export * from './controls.js'`。`dsClasses` 在开工前的 main 已公开，本包只改成从 `control-utils.ts` 重导出。`withEnemy` 仍被本文件残留的 `SetEnemyBattleSpriteCommand` 使用，因此留在 `enemy-commands.ts` 并由 `commands.ts` runtime import。CSS、产品宿主、格式配置、超时、排除项和基线未改。

机械更新：`text-overflow-adoption.json` 的 producer 文件/符号改到真实拥有 class 的新组件；`adoption.test.ts` / `boundary.test.ts` 的静态路径改为读新生产模块，原违规反例仍拒绝。

附加公开类型（旧 barrel 现一并重导出，身份仍是原实现）：`DsDraftInputContract`、`DsFieldChromeProps`、`DsFieldControlProps`、`DsFieldHelp`、`DsDraftNumberInputProps`、`DsNumberInputProps`、`DsFormControlAppearance`。

## 24行状态总账

| 组 | 状态 | 提交 | 新模块 | 负控 JSON |
|---|---|---|---|---|
| C00 | 已实施 | `6fc7cc7f7e626c0de31ac92c433f5bbbed377cb3` | `command-contract.ts`、`battle-data-command-errors.ts` | [c00-mutant.json](cursor-architecture-batch/c00-mutant.json) |
| C01 | 已实施 | `06639683f4afda6b7f7036fcdf281bc49e5b52d9` | `world-variable-commands.ts` | [c01-mutant.json](cursor-architecture-batch/c01-mutant.json) |
| C02 | 已实施 | `2356dc0144cf88b4c154025f080df4eaeeff004c` | `enemy-commands.ts`（含 `withEnemy`） | [c02-mutant.json](cursor-architecture-batch/c02-mutant.json) |
| C03 | 已实施 | `84c1a0de85fcc95378f046da24fec272d29e9c87` | `enemy-team-commands.ts` | [c03-mutant.json](cursor-architecture-batch/c03-mutant.json) |
| C04 | 已实施 | `c00fe8859c1cebaa45decb662a22869d7a6d6906` | `item-commands.ts` | [c04-mutant.json](cursor-architecture-batch/c04-mutant.json) |
| C05 | 已实施 | `e62d76a44e018d9dc5074f3d623796736ff6dd91` | `skill-commands.ts` | [c05-mutant.json](cursor-architecture-batch/c05-mutant.json) |
| C06 | 已实施 | `594e8e6040f29903b4ddbe15efa602f06881068c` | `poison-commands.ts` | [c06-mutant.json](cursor-architecture-batch/c06-mutant.json) |
| C07 | 已实施 | `3d2cff75f36227b7fb6764f0c2106f8276fe0063` | `ambience-commands.ts` | [c07-mutant.json](cursor-architecture-batch/c07-mutant.json) |
| C08 | 已实施 | `c50c09b95c1e8a64f64bf9359e4c9499d9cc75c0` | `shop-commands.ts` | [c08-mutant.json](cursor-architecture-batch/c08-mutant.json) |
| C09 | 已实施 | `58edd015e03ab93b71b1cc43b12a09203d783336` | `locale-commands.ts`、`level-up-commands.ts`、`project-name-command.ts` | [c09-mutant.json](cursor-architecture-batch/c09-mutant.json)（针 `locale-commands.ts`） |
| C10 | 已实施 | `c9bcf0af2fbd2c435e30d3e69b8f16eacbe95c86` | `asset-label-command.ts` | [c10-mutant.json](cursor-architecture-batch/c10-mutant.json) |
| U00 | 已实施 | `3ddfd6c69204f16b0765fe4239c6a84b87d1dade` | `control-types.ts`、`control-utils.ts` | [u00-mutant.json](cursor-architecture-batch/u00-mutant.json) |
| U01 | 已实施 | `78dd837939c750431ffad91dcec3e2466c1c2f94` | `buttons.tsx` | [u01-mutant.json](cursor-architecture-batch/u01-mutant.json) |
| U02 | 已实施 | `0fcb6b2c8a1098b384dd75a779a8a415cee5abae` | `help-tips.tsx` | [u02-mutant.json](cursor-architecture-batch/u02-mutant.json) |
| U03 | 已实施 | `61ab432343dfc69a867079cf3aea466a57966e4b` | `icon-button.tsx` | [u03-mutant.json](cursor-architecture-batch/u03-mutant.json) |
| U04 | 已实施 | `4bc68eed40410f156dc02613203f048daaeb7dc2` | `native-inputs.tsx` | [u04-mutant.json](cursor-architecture-batch/u04-mutant.json) |
| U05 | 已实施 | `03511608b73b9691917a0b2e1e25d6317b929bdc` | `field-layout.tsx` | [u05-mutant.json](cursor-architecture-batch/u05-mutant.json) |
| U06 | 已实施 | `d419ecc0eb4f4b52fee5101f51a9537ea4c0b3c5` | `draft-input-state.ts`、`draft-text-inputs.tsx` | [u06-mutant.json](cursor-architecture-batch/u06-mutant.json)（针 `draft-input-state.ts`） |
| U07 | 已实施 | `125e754c0c6b07fe07bcd9e3fc4f71b39a363d27` | `number-inputs.tsx` | [u07-mutant.json](cursor-architecture-batch/u07-mutant.json) |
| U08 | 已实施 | `be4022bdc8971c70b80963adabce0d7e887dc26d` | `text-inputs.tsx`、`field-controls.tsx` | [u08-mutant.json](cursor-architecture-batch/u08-mutant.json)（针 `field-controls.tsx`） |
| U09 | 已实施 | `77c46796dca2f62e733c668e0ce83a5ed3fd593a` | `select.tsx` | [u09-mutant.json](cursor-architecture-batch/u09-mutant.json) |
| U10 | 已实施 | `141a4f4d1a35c96cb755807abf5a6b1cc4f84c4b` | `choice-controls.tsx` | [u10-mutant.json](cursor-architecture-batch/u10-mutant.json) |
| U11 | 已实施 | `ac452243e2929ccb6bcc439e89b8e5c6579259c0` | `list-header.tsx` | [u11-mutant.json](cursor-architecture-batch/u11-mutant.json) |
| U12 | 已实施 | `6a369f07e82fdf2f4ffc3aef17f625ec16d11250` | `tabs.tsx`、`card.tsx`、`feedback.tsx` | [u12-mutant.json](cursor-architecture-batch/u12-mutant.json)（针 `feedback.tsx`） |

无阻断组。组外机械提交：`c32cfdbbfbc3906628d32ddb4dc280beddc7d248` 把 `.ds-visually-hidden` 的 overflow producer 改到 `help-tips.tsx` / `DsHelpTip`。收尾提交含 `boundary.test.ts` 路径改读 `help-tips.tsx` / `list-header.tsx`、Biome 整理新文件、本回执。

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

## 验证

作者自验，不能替代 Codex 独立接收。

- 定向：32 files / 344 tests exit 0（新模块 + `commands.test.ts` + 相邻引用 + adoption / field-commit / boundary / controls）。
- 配方：`recipes.test.tsx` + `reorder.test.tsx` 57/57 exit 0。
- Biome 后复跑 8 files / 133 tests exit 0（含 adoption / boundary / controls）。
- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 改动源码 Biome：新文件 organizeImports / EOF 已整理。保留原签名上的 `void \| boolean` warning（`draft-input-state.ts`、`number-inputs.tsx`）。`boundary.test.ts` 原有 template-curly / unused `adoption` warning 未改。
- `git diff --check` 对 `packages/editor/src/core` 与 `ui/design-system` 干净。
- 24 组单点负控：Vite `enforce:'pre'` 只改内存视图，[module-mutants.mjs](cursor-architecture-batch/module-mutants.mjs) 跑对照绿 + 变异红。汇总 [evidence.json](cursor-architecture-batch/evidence.json)：`count=24`、`allOk=true`、全部 `redExit=1`、`hashUnchanged=true`、失败为 `AssertionError`。
- 全 `pnpm --filter @type-pal/editor check` 在本 worktree 第一次跑：typecheck 过；测试 77 file fail 为 Vite `Denied ID`，解析 `@type-pal/reforge` PNG `?url` 时走到 worktree `node_modules` 指向主仓的符号链接。另 2 个 PAL 预览用例当时 `ENOENT`：worktree `projects/pal/assets/migrated/sprites` 0 个文件，主仓同目录 636 个。按卡“只补环境、不入 Git”把该目录链到主仓后，`tests/world-sprite-behavior.pal.test.ts` 2/2 exit 0。当时另 2 条 `boundary.test.ts` 静态断言已改读新模块并在定向套件通过。未改预期凑绿。
- 未跑官方 coverage / ratchet / 受保护 strict。未开浏览器，6010 未动。

## 可复制命令

```bash
cd /Users/zhangxu/illegal/type-pal-cursor-architecture-batch
git fetch origin
git rev-parse origin/main HEAD
# 8bf40b9094d9e43f6c3d146c1bda651962eb36c3  + 本分支 HEAD

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
# Codex 在正常 checkout 上重跑：
# pnpm --filter @type-pal/editor check
```

任务卡：[ARCH-F2-CURSOR-BATCH-1](../ops/tasks/ARCH-F2-CURSOR-BATCH-1-domain-modules.md)。Cursor 自验不是独立证明。Codex 负责隔离 UI、全仓 check、官方 ratchet 与受保护严格 fast。
