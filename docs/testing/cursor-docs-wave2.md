# Cursor十二组包说明与工具核对回执

状态：Cursor执行中（C01–C04已核）。
范围和授权见[DOC-CURSOR-2](../ops/tasks/DOC-CURSOR-2-package-tools-indexes.md)，证据冻结`dab017e7`。
只读准备，不代表源文档已修、命令已执行、产品/CI/覆盖率通过。未运行被审CLI/help。

## 交付索引

| 组 | 状态 | 确定不符 | 待确认 | 已知关联 | 历史不改 | 未核输入 |
|---|---|---:|---:|---:|---:|---:|
| C01 shared | 已核 | 1 | 0 | 0 | 0 | 0 |
| C02 pal-extract | 已核 | 0 | 0 | 0 | 0 | 0 |
| C03 game | 已核 | 1 | 0 | 1 | 0 | 0 |
| C04 content | 已核 | 0 | 0 | 0 | 0 | 0 |
| C05–C12 | 待执行 | — | — | — | — | — |

证据树：`dab017e7`。工作树开工：`7e52d514`（相对冻结仅分配文档）。正文候选SHA待四组提交后回填。

## C01 shared

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/shared test` | `packages/shared/package.json:15` → `vitest run --passWithNoTests …` | 一致 |
| 导出入口 `index.ts` | `package.json:6-10` `main`/`exports["."]` → `./src/index.ts`；`index.ts` re-export `events/input/mkf/resources/rle/rle-encode/rng/tables/yj2` | 一致 |
| 点名资产类型 RLE / `RleFrame` / `Palette` | `rle.ts:13` `export interface RleFrame`；`resources.ts:31` `export interface Palette`；经 `index.ts` 再导出；reforge 产品码多处 `from '@type-pal/shared'`（如 `assets.ts`、`render.ts`） | 类型存在且被复用 |
| 「见 assets.ts 与 index.ts」 | 冻结树无 `packages/shared/src/assets.ts`（`git cat-file -e dab017e7:…/assets.ts` 失败） | **确定不符** |

未核边界：不审 RLE/调色板解码算法与领域模型；未枚举全部导出 API。

### 确定不符

**W2-C01-1** · `packages/shared/README.md:4`

- 原文：`当前 Reforge 仍复用其中的 RLE codec、RleFrame / Palette 等资产格式代码（见 assets.ts 与 index.ts）；`
- 证据：无 `assets.ts`；`RleFrame`=`packages/shared/src/rle.ts:13`；`Palette`=`packages/shared/src/resources.ts:31`；入口=`packages/shared/src/index.ts`。
- 建议替换：`当前 Reforge 仍复用其中的 RLE codec、RleFrame / Palette 等资产格式代码（见 rle.ts、resources.ts，经 index.ts 再导出）；`

## C02 pal-extract

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/pal-extract extract` | `package.json:11` → `tsx src/cli.ts` | 一致 |
| `extract:videos` | `package.json:12` → `tsx scripts/extract-videos.ts` | 一致 |
| `test` / `typecheck` | `package.json:8-9` | 一致 |
| 读 `data/raw/`、写 `data/extracted/` | `cli.ts:75-76` `RAW`/`OUT`；`extract-videos.ts:34-35` `RAW` / `data/extracted/videos` | 一致 |
| 视频需 ffmpeg | `extract-videos.ts:90` `execFileP('ffmpeg', …)`；`:102-108` PATH 预检 | 一致 |
| 输入 AVI | `extract-videos.ts:5,37` `data/raw/{1-6}.avi` | 一致（未核本地是否有文件） |

未核边界：未执行 extract；不考证原版机制；`data/raw` 是否在本机存在记未测环境（本组无「未核输入」项——文档未声称本机已有素材）。

本组静态已核，无确定不符。

## C03 game

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/game dev` 端口 6005 | `package.json:8` `vite --port 6005 --strictPort` | 一致 |
| `pnpm --filter @type-pal/game test` | `package.json:11` | 一致 |
| `pnpm --filter @type-pal/game e2e` 端口 6001 | `package.json:7-12` **无** `e2e` 脚本；Playwright 树已删（前批 H1） | **已知关联 H1** |
| 「只修阻断性缺陷，不再做架构演进」 | `CLAUDE.md:22`（2026-09-24）：「第一阶段允许架构治理」——行为不漂移下可拆模块/整理依赖/优化；另有 Codex 独立治理队列 `CLAUDE.md:23` | **确定不符（政策冲突）** |
| v1.0.0 / 冻结产品面 | 根 `README.md` 与 `package.json:3` `version: 1.0.0` 仍称冻结运行时/UX 参考 | 产品称谓一致；与「禁止架构演进」不同轴 |

### 已知关联

**W2-C03-H1** · `packages/game/README.md:11`（新增位置，不重算 H1 根因）

- 原文：`pnpm --filter @type-pal/game e2e      # Playwright e2e（端口 6001）`
- 关联：[cursor-docs-hygiene-review.md](cursor-docs-hygiene-review.md) H1；证据同前批 `package.json` 无 e2e。
- 不重复证明、不计入本包新发现数。

### 确定不符

**W2-C03-1** · `packages/game/README.md:3-5`

- 原文：`**v1.0.0 已上线并冻结**——只修阻断性缺陷，不再做架构演进；…（见根 CLAUDE.md 阶段边界）。`
- 证据：`CLAUDE.md:22` 明文授权第一阶段架构治理（拆模块、整理依赖、优化；行为不漂移）；`:23` 本轮治理由 Codex 推进。阶段边界（一/二阶段世界观）仍成立，但「不再做架构演进」与现行协作规范冲突。
- 建议替换：`**v1.0.0 已上线并冻结为已发布产品与 UX 参考**——玩法与可见表现仍按忠实还原约束；允许在行为不漂移前提下做架构治理（见根 CLAUDE.md 协作规范）。现代化引擎在 \`@type-pal/reforge\`，两阶段世界观严禁混用。`
- 证伪观察：若用户另裁「game 包禁止一切重构」且废止 `CLAUDE.md:22`，则本条降为历史不改。

## C04 content

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/content test` / `typecheck` | `package.json:12-13` | 一致 |
| `CONTENT_VERSION` / `CURRENT_PROJECT_MINIMUM_SAVE_VERSION` 在 `character.ts`，当前 content20 / SAVE8 | `character.ts:168` `CONTENT_VERSION = 20`；`:170` `CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 8` | 一致 |
| `validateReferences` | `validate-refs.ts:954` `export function validateReferences`；`index.ts` `export * from './validate-refs.js'` | 一致 |
| typed leaf walker（引用收集） | 无同名符号；存在多组 `collect*References`（如 `actor-reference.ts`、`validate-refs.ts`）及规格用语「typed leaf rule」 | 叙述性能力描述，未点名错误符号 → 不报不符 |

未核边界：不审 schema 字段与旧版本政策。本组静态已核，无确定不符。

## C05 reforge

待执行。

## C06 editor

待执行。

## C07 migrate

待执行。

## C08 迁移CLI六文件

待执行。

## C09 提取与文档工具五文件

待执行。

## C10 CI命令映射

待执行。

## C11 资源与fixture说明

待执行。

## C12 目录入口

待执行。

## 最终验证与接收提示词

待交付；不得预填成功、代签或标done。
