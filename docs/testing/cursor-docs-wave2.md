# Cursor十二组包说明与工具核对回执

状态：Cursor已完成C01–C12静态核对；Codex `ef825870` counter 后按 R1～R4 只改本回执（待再接收）。
范围和授权见[DOC-CURSOR-2](../ops/archive/tasks/done/DOC-CURSOR-2-package-tools-indexes.md)，证据冻结`dab017e7`。
只读准备，不代表源文档已修、命令已执行、产品/CI/覆盖率通过。未运行被审CLI/help（除本包授权的`node scripts/docs/check.mjs`）。
已核事实与资源 hash 不重做。

## 交付索引

| 组 | 状态 | 确定不符 | 待确认 | 已知关联 | 历史不改 | 未核输入 | 未执行 |
|---|---|---:|---:|---:|---:|---:|---:|
| C01 shared | 已核 | 0 | 0 | 0 | 0 | 0 | 0 |
| C02 pal-extract | 已核 | 0 | 0 | 0 | 0 | 0 | 0 |
| C03 game | 已核 | 1 | 0 | 1 | 0 | 0 | 0 |
| C04 content | 已核 | 0 | 0 | 0 | 0 | 0 | 0 |
| C05 reforge | 已核 | 0 | 1 | 0 | 0 | 0 | 0 |
| C06 editor | 已核 | 0 | 0 | 0 | 0 | 0 | 0 |
| C07 migrate | 已核 | 1 | 0 | 1 | 0 | 0 | 0 |
| C08 迁移CLI | 已核 | 0 | 0 | 0 | 0 | 1 | 1 |
| C09 提取/文档工具 | 已核 | 0 | 0 | 0 | 0 | 1 | 0 |
| C10 CI | 已核 | 0 | 0 | 0 | 0 | 0 | 0 |
| C11 资源/fixture | 已核 | 1 | 0 | 0 | 1 | 2 | 1 |
| C12 目录入口 | 已核 | 0 | 0 | 0 | 0 | 0 | 0 |
| **合计** | | **3** | **1** | **2** | **1** | **4** | **2** |

证据树：`dab017e7`。工作树开工：`7e52d514`（相对冻结仅分配文档）。
正文候选SHA：`4b75d1c397f7d86f3ac92a5adcfff7aa552aca9a`。相对开工提交仅改本回执。

### 原 16 条 ID 去向（R1/R4 分类纠正后）

| ID | 去向 |
|---|---|
| W2-C01-1 | 撤销「确定不符」；裸 `assets.ts` 归可选澄清引用（见 C01），不证断链 |
| W2-C03-H1 | 保持已知关联 |
| W2-C03-1 | 保持确定不符 |
| W2-C05-1 | 保持待确认 |
| W2-C07-N1 | 保持已知关联 |
| W2-C07-1 | 保持确定不符；替换句按 R2 收窄（不承诺目标无有的烘焙细节） |
| W2-C08-U1 | 保持未核输入 |
| W2-C08-U2 | 改归未执行边界（刻意未跑迁移） |
| W2-C09-U1 | 保持未核输入（缺 raw/extracted）；脚本未跑不另计缺陷 |
| W2-C11-1 | 保持确定不符 |
| W2-C11-U1 | 保持未核输入 |
| W2-C11-U2 | 保持未核输入 |
| W2-C11-U3 | 改归未执行边界（刻意未起服务） |
| W2-C11-H1 | 保持历史不改 |
| W2-C12-1 | 撤销「确定不符」；合法目录短名导航 |
| W2-C12-2 | 撤销「确定不符」；合法目录短名导航 |

## C01 shared

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/shared test` | `packages/shared/package.json:14` → `vitest run --passWithNoTests …`（`:15` 为 `check`） | 一致 |
| 导出入口 `index.ts` | `package.json:6-10` `main`/`exports["."]` → `./src/index.ts`；`index.ts` re-export `events/input/mkf/resources/rle/rle-encode/rng/tables/yj2` | 一致 |
| 点名资产类型 RLE / `RleFrame` / `Palette` | `rle.ts:13` `export interface RleFrame`；`resources.ts:31` `export interface Palette`；经 `index.ts` 再导出；reforge 产品码从 shared 导入（`packages/reforge/src/assets.ts:17-28`）并经 `packages/reforge/src/index.ts:112-114` 再导出类型/解码器 | 类型存在且被 Reforge 复用 |
| 「见 assets.ts 与 index.ts」 | `packages/shared/README.md:4` 未声明存在 `packages/shared/src/assets.ts`；冻结树无该路径。裸文件名可合理指 Reforge 消费者 `packages/reforge/src/assets.ts` + shared/`index.ts`，不能仅凭 shared 同目录无文件推出断链 | **一致（引用可澄清，非确定不符）** |

未核边界：不审 RLE/调色板解码算法与领域模型；未枚举全部导出 API。

### 可选澄清（非缺陷、不计小计）

**W2-C01-1**（原「确定不符」已撤销）· `packages/shared/README.md:4`

- 原文：`当前 Reforge 仍复用其中的 RLE codec、RleFrame / Palette 等资产格式代码（见 assets.ts 与 index.ts）；`
- 证据：无 `packages/shared/src/assets.ts`；定义在 `rle.ts`/`resources.ts`/`index.ts`；消费者为 `packages/reforge/src/assets.ts:17-28` 与 `packages/reforge/src/index.ts:112-114`。
- 若修订（可选）：写全「shared 定义路径 + Reforge 消费者路径」，勿丢掉 Reforge 复用证据，也勿冒称已证断链。示例：`当前 Reforge 仍复用其中的 RLE codec、RleFrame / Palette 等资产格式代码（定义见 shared 的 rle.ts / resources.ts，经 index.ts 再导出；消费者见 packages/reforge/src/assets.ts）。`

## C02 pal-extract

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/pal-extract extract` | `package.json:10` → `tsx src/cli.ts`（`:11` 为 `extract:videos`） | 一致 |
| `extract:videos` | `package.json:11` → `tsx scripts/extract-videos.ts` | 一致 |
| `test` / `typecheck` | `package.json:8-9` | 一致 |
| 读 `data/raw/`、写 `data/extracted/` | `cli.ts:75-76` `RAW`/`OUT`；`extract-videos.ts:34-35` `RAW` / `data/extracted/videos` | 一致 |
| 视频需 ffmpeg | `extract-videos.ts:90` `execFileP('ffmpeg', …)`；`:102-108` PATH 预检 | 一致 |
| 输入 AVI | `extract-videos.ts:5,37` `data/raw/{1-6}.avi` | 一致（未声称本机已有文件） |

未核边界：未执行 extract；不考证原版机制。本组静态已核，无确定不符。

## C03 game

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/game dev` 端口 6005 | `package.json:7` `vite --port 6005 --strictPort`（`:8` 为 `build`） | 一致 |
| `pnpm --filter @type-pal/game test` | `package.json:10`（`:11` 为 `check`） | 一致 |
| `pnpm --filter @type-pal/game e2e` 端口 6001 | `package.json:7-12` **无** `e2e` 脚本；Playwright 树已删（前批 H1） | **已知关联 H1** |
| 「只修阻断性缺陷，不再做架构演进」 | `CLAUDE.md:22`（2026-09-24）：「第一阶段允许架构治理」；`:23` Codex 独立治理队列 | **确定不符（政策冲突）** |
| v1.0.0 / 冻结产品面 | 根 `README.md` 与 `package.json:3` `version: 1.0.0` | 产品称谓一致；与「禁止架构演进」不同轴 |

### 已知关联

**W2-C03-H1** · `packages/game/README.md:11`（新增位置，不重算 H1 根因）

- 原文：`pnpm --filter @type-pal/game e2e      # Playwright e2e（端口 6001）`
- 关联：[cursor-docs-hygiene-review.md](cursor-docs-hygiene-review.md) H1。
- 不重复证明、不计入本包新发现数。

### 确定不符

**W2-C03-1** · `packages/game/README.md:3-5`

- 原文：`**v1.0.0 已上线并冻结**——只修阻断性缺陷，不再做架构演进；…（见根 CLAUDE.md 阶段边界）。`
- 证据：`CLAUDE.md:22` 明文授权第一阶段架构治理（行为不漂移下拆模块/整理依赖/优化）；`:23` 本轮治理由 Codex 推进。阶段边界仍成立，但「不再做架构演进」与现行协作规范冲突。
- 建议替换：`**v1.0.0 已上线并冻结为已发布产品与 UX 参考**——玩法与可见表现仍按忠实还原约束；允许在行为不漂移前提下做架构治理（见根 CLAUDE.md 协作规范）。现代化引擎在 \`@type-pal/reforge\`，两阶段世界观严禁混用。`
- 证伪观察：若用户废止 `CLAUDE.md:22` 并裁定 game 禁止一切重构，则本条降为历史不改。

## C04 content

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `pnpm --filter @type-pal/content test` / `typecheck` | `package.json:12` `typecheck`；`:13` `test` | 一致 |
| `CONTENT_VERSION` / `CURRENT_PROJECT_MINIMUM_SAVE_VERSION` 在 `character.ts`，content20 / SAVE8 | `character.ts:168` `= 20`；`:170` `= 8` | 一致 |
| `validateReferences` | `validate-refs.ts:954`；`index.ts` re-export | 一致 |
| typed leaf walker（引用收集） | 无同名导出；多组 `collect*References` + 规格用语「typed leaf rule」 | 叙述性能力，未点名错误符号 → 不报不符 |

未核边界：不审 schema 字段与旧版本政策。本组静态已核，无确定不符。

## C05 reforge

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `dev` 端口 6050 起 | `package.json:14` `vite --port 6050 --strictPort`；`dev:pal` → 6051（`:22`） | 一致 |
| 默认工程 | `boot.ts:10` `VITE_PROJECT_ID ?? 'demo'` | 一致（README 未写死工程名，与实现兼容） |
| `test` / `typecheck` | `package.json:19` `typecheck`；`:20` `test` | 一致 |
| 存档 SAVE8 | `save/current-codec.ts:16,74,80`；消费 `CURRENT_PROJECT_MINIMUM_SAVE_VERSION` | 一致 |
| 定位 authority/mount/follow（E6） | `debug-tools.ts` / `follower.ts` 等存在 `authority`/`mount`/`follow` 形态 | 点名能力存在（不审算法） |
| 不读第一阶段提取数据 | 产品 `src/` 无 `@type-pal/pal-extract` / 无读 `data/extracted` 业务导入；但 `vite.config.ts:15,109` 仍 `serveDir('/extracted', data/extracted)`；审计脚本可读 extracted | **待确认** |
| 依赖 `@type-pal/shared`（资产格式） | `package.json:25-26`；产品多文件 import Palette/RleFrame | 与 shared README 复用叙述一致，不报跨包违例 |

### 待确认

**W2-C05-1** · `packages/reforge/README.md:15-16`

- 原文：`不读第一阶段提取数据（归 migrate 桥接）。`
- 证据：`vite.config.ts:9-15,109` 仍映射 `/extracted/* → data/extracted`（注释称「尚未迁移的 tilemap/sprite/palette」）；`scripts/audit-dialog-wrap.mts:16,19` 读 extracted。产品 `file-source` 测试拒绝绝对 `/extracted` 路径。
- 最小证伪：在冻结树上证明默认 `demo`/`pal` 冷启动的生产加载链仍 `fetch('/extracted/…')`；若零命中，则 README 边界成立，本条可降为历史/dev 残留说明。
- 不给未经验证的替换句。

## C06 editor

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `dev` 端口 6010 | `package.json:8` `VITE_PROJECT_ID=pal vite --port 6010 --strictPort` | 一致 |
| `test` 固定 `maxWorkers=2` | `package.json:13` `vitest run … --maxWorkers=2`（`:14` 为 `check`） | 一致 |
| `typecheck` | `package.json:12` | 一致 |
| `audit:design-system` | `package.json:7` → `node scripts/audit-legacy-controls.mjs --gate` | 一致 |
| 依赖 content + reforge；不碰 shared/game/pal-extract | `package.json:18-21` 仅 content/reforge/react；`packages/editor` 无直接 `@type-pal/shared|game|pal-extract` import | 一致（Palette/RleFrame 经 reforge 再导出，不计入直接碰第一阶段包） |

未核边界：不验证 UI 功能；不把设计目标判为应删除。本组静态已核，无确定不符。

## C07 migrate

### 事实小表

| 文档声称 | 真实定义/脚本 | 判定 |
|---|---|---|
| `migrate:content` / `--write` | `package.json:16` → `tsx scripts/migrate-content.mts`；argv 仅允许 `--write`/`--help`（脚本 `:44-51`） | 一致 |
| `test:fast` / `check` | `package.json:9` `test:fast`；`:11` `check` | 一致 |
| 默认先 `recoverMigrationTransaction` | `migrate-content.mts:53` 在读 baseline 前调用；`migration-transaction.ts:264-270` 有 journal 则 `applyJournal`+`cleanup`（可写盘） | 一致；副作用见已知关联 |
| 目录文件存在 | `pal-migration.ts`、`pal-current-publication.ts`、`migration-{baseline,merge,plan,transaction,write-plan}.ts`、`baselines/pal/`、`scripts/migrate-content.mts` 均在冻结树 | 一致 |
| content20 / SAVE8 指针 | 指向 `packages/content/src/character.ts`（C04 已核） | 一致 |
| 「资产烘焙细节见 asset-pipeline.md（href→content-publication.md）」 | 可见标签 `asset-pipeline.md`；href 为 `content-publication.md`（存在）；目标全文仅 PAL 提取/发布入口，**无** engine-chrome 当前烘焙细节；`guides/asset-pipeline.md` 不存在；历史稿在 archive | **确定不符（标签/内容承诺与入口不匹配）** |

### 已知关联

**W2-C07-N1** · `packages/migrate/README.md:37-39`（关联前批 N1，不重算）

- 原文强调默认 dry-run / journal 前停止；实现上每次命令先 `recoverMigrationTransaction`（有 pending journal 时会写盘恢复）。
- 关联：[cursor-docs-hygiene-review.md](cursor-docs-hygiene-review.md) N1 结论——不得声称默认路径绝无写副作用。本包不扩展为新根因。

### 确定不符

**W2-C07-1** · `packages/migrate/README.md:61`

- 原文：链接可见文案为 `asset-pipeline.md`，href 为 `../../docs/phase2/guides/content-publication.md`。
- 证据：目标 H1「PAL 内容导入与发布」；`:3-12` 为提取/发布/校验入口，`:4` 回链 migrate README，`:15` 把早期烘焙方案归历史 archive；全文无 engine-chrome 当前烘焙细节。问题是「标签/内容承诺与实际入口不匹配」，不是一般短标签≠H1。
- 建议替换：`当前PAL内容导入与发布见[PAL内容导入与发布](../../docs/phase2/guides/content-publication.md)。`
- 若确需保留 chrome 烘焙说明，另指 `docs/ops/guides/dev-servers.md:24-26` 现有维护者说明；不得把历史 asset-pipeline 或当前指南中的回链循环包装成完整烘焙文档。本轮只改回执，不改这些指南。

## C08 迁移CLI六文件

静态只读参数/路径匹配；**未运行**。无帮助文案不算 bug。

| 脚本 | package.json | 参数 | cwd/根 | 输入 | 输出/副作用 | 外部工具 |
|---|---|---|---|---|---|---|
| `audit-pal-sprite-actions.mts` | `audit:sprite-actions` | 可选 `--json`（`process.argv.includes`） | `repo=…/../../..`（模块相对仓库根） | `loadPalMigrationSources`（需 extracted 等） | stdout 报告 | 无 |
| `audit-project-maps.mts` | `audit:maps` | 无 | `root=…/../../..` | `data/extracted/data/tilemap/*.json` | stdout JSON report | 无 |
| `bake-assets.mts` | `bake` | 无 argv | `ROOT` 仓库根 | `data/extracted` UI/FBP/palette0 | 写 `packages/reforge/src/engine-chrome/assets/**`；校验 UI 85/48629/`5e5315…` | `pngjs` |
| `generate-project-battle-placeholders.mts` | **无 script 登记** | 无 | `repo` | 无外部输入（内存生成） | 写 `projects/{demo,e2e-own}/assets/generated/battle-sprites/player-fighter.rle` | 无 |
| `migrate-content.mts` | `migrate:content`（`package.json:16`） | `--write` / `--help`；其它 throw | `repo` | baseline + extracted sources + `projects/pal` | 默认计划+校验；`--write` 事务发布；**先 recover** | 无 |
| `preview-fbp.mts` | **无 script 登记** | `argv[2]=chunkId` 默认1；`argv[3]=out` | `ROOT`（`:9`）解析输入与缺省输出；显式相对 `out` 原样传 `writeFileSync`（`:18,23`），按**进程 cwd** 解析，不等于一律相对 ROOT | 输入：`data/extracted/images/battle/bg/NNN.png` + palette0（相对 ROOT）。缺省 out：`resolve(ROOT,'fbp-preview.png')`；显式相对 out：相对进程 cwd | `pngjs` |

### 未核输入

**W2-C08-U1** · bake / preview / audit-maps / audit-sprite：本机 `data/extracted` 缺失（gitignore），未核运行期能否读到源。

### 未执行边界

**W2-C08-U2** · migrate-content：本任务刻意未执行；不验证 dry-run/write 成功。≠缺少输入。

侧写：`migrate-content` 无 `--` 分隔需求（前批 N1）；本表不重复计。

## C09 提取与文档工具五文件

| 脚本 | 参数 | cwd | 输入 | 输出 | 外部 |
|---|---|---|---|---|---|
| `extract-videos.ts` | 无 CLI 旗标（`package.json` `extract:videos`） | 模块算 repo（`:32-35`）；输入/输出相对 REPO_ROOT，不依赖进程 cwd | `data/raw/{1-6}.avi` | `data/extracted/videos/{1-6}.mp4`；mtime 增量 skip | **ffmpeg**（PATH） |
| `find-scenes-without-setpartypos.mjs` | 无 argv | 模块算 REPO_ROOT（`:26-31`） | `data/extracted/events`；`data/extracted/data/scene`；`data/extracted/data/tilemap` | **硬编码**写 `/tmp/scenes-without-setpartypos.json` | 无 |
| `grep-sdlpal-chunks.ts` | 无；stdout markdown | **依赖进程 cwd**：`:31,37-40` 把字面 `reference/sdlpal` 传给 grep；应从**仓库根**跑 | `reference/sdlpal/**/*.c,h` | stdout | **grep** via `execFileSync` |
| `scripts/docs/check.mjs` | 仅 `--json` / `--print-task-index` | 模块取 `repoRoot`（`:13`）；`git` 显式 `{ cwd: repoRoot }`（`:278-290`） | `git ls-files` 的 md + `character.ts` 版本常量 | stdout；有 issue 则 exitCode=1 | git |
| `scripts/docs/relocate.mjs` | `PLAN.json [--write]`；默认 dry-run | 模块取 repo（`:117`）；相对 PLAN 路径基于 repo 解析（`:118`） | plan 条目 + 源文件 sha | `--write` 才 rename/write | 无 |

### 未核输入

**W2-C09-U1** · extract-videos / find-scenes：依赖 `data/raw` 或 `data/extracted`，本环境未核齐输入。脚本本身按任务边界未执行，不另计「未核输入」。

本组无确定不符（硬编码 `/tmp/…` 是实现事实，文档未声称可配置输出；C09 无对应 README 声称）。

## C10 CI命令映射

### docs.yml

| 项 | 事实 |
|---|---|
| 触发 | `pull_request` / `push` branches `[main]` / `workflow_dispatch` |
| Node | `actions/setup-node@v4` `node-version: 22` |
| 步骤 cwd | 默认仓库根 |
| 命令 | `node --test scripts/docs/*.test.mjs`；`node scripts/docs/check.mjs` |
| 脚本存在 | `scripts/docs/check.mjs`、`check.test.mjs` 等在冻结树 |
| 无 pnpm | 本 workflow 不安装 pnpm（与 coverage 不同）——与步骤匹配，不报缺 |

### coverage.yml

| 项 | 事实 |
|---|---|
| 触发 | 同 docs（PR / main push / dispatch） |
| Node 22 + pnpm `10.29.2`（`pnpm/action-setup@v4`） | 根脚本存在 `coverage:fast` / `typecheck` / `lint` |
| `TYPE_PAL_COVERAGE_BASE_REF` | PR→`pull_request.base.sha`；push→`github.event.before`；dispatch 不设 |
| 真实消费者 | `scripts/coverage/run.mjs:493` `process.env.TYPE_PAL_COVERAGE_BASE_REF` → `readBaselineFromGit` |
| 报告路径 | artifact `coverage/fast` ← `path: coverage/fast` |
| 前置 | `pnpm install --frozen-lockfile`；`pnpm typecheck && pnpm lint` |

未远端触发、不评安全性。本组静态已核，无确定不符。脚本存在≠CI已绿。

## C11 资源与fixture说明

### data/raw/README.md

| 声称 | 判定 |
|---|---|
| 输入给 pal-extract → `data/extracted/` | 与 C02 `cli.ts` 一致 |
| 目录内容不进 git | `.gitignore:14-17` `data/raw/*` 但例外 `README.md` 与 **`unifont-cn.bdf`** | **确定不符（例外未写）** |
| 2026-05-23 文件数量表 | **历史不改**（不按现机文件数改历史） |
| 需自行提供原版数据 | 操作前提成立 |

**W2-C11-1** · `data/raw/README.md:43`

- 原文：`这个目录的内容**不会进 git**(见根目录 .gitignore)`
- 证据：`.gitignore:14-17` 显式 `!data/raw/README.md`、`!data/raw/unifont-cn.bdf`；本树 `unifont-cn.bdf` 已跟踪且 SHA 与 PROVENANCE 一致。
- 建议替换：`原版游戏数据默认不进 git（见根 .gitignore 的 data/raw/*）；例外跟踪 README.md 与 unifont-cn.bdf（字体，非原版版权数据）。其余 MKF/AVI/MIDI 等需自行提供。`

### projects/e2e-own/README.md

| 声称 | 判定 |
|---|---|
| 跑法 `VITE_PROJECT_ID=e2e-own … vite --port 6052` | 非 package.json 具名脚本；与 reforge vite 可用旗标一致（未执行） |
| `color.project-standard` / `sprite.pal.002` | `assets/index.json` 与 `content/sprites.json` 存在对应项；`assets/migrated/sprites/002.rle` 已跟踪 | 一致 |
| 生成器脚本见历史任务 | 历史指针，不扩审 | 历史不改范畴 |

### projects/pal/e2e-checkpoints/README.md

| 声称 | 判定 |
|---|---|
| 链到 `docs/testing/e2e.md` | 文件存在 | 一致 |
| 001/002 剧情边界文字 | 历史/验收叙述 | **历史不改** |
| 「尚未生成连续 checkpoint 链」 | 目录仅 README（无 `*.save.json` 于跟踪集） | 与现状一致 |

### PROVENANCE.md

| 声称 | 判定 |
|---|---|
| 已入库 `title.png` / `dialog-icons-raw.json` / licenses / `ui/**` 85 张 | 均跟踪；输出 hash 与文内一致（title/dialog/licenses/status seeds/equip-demo 抽样） | 一致 |
| UI aggregate `5e5315…`；85 files / 48629 bytes | 按 `bake-assets.mts:185-188` 算法复算命中：每项 `sha256(bytes) + 两个空格 + UI 相对路径 + 实际 LF 换行`，再整体 SHA256（勿把字面 `\\n` 当拼接字节） | 可复算（结果不重做） |
| Unifont BDF SHA | 本地 `data/raw/unifont-cn.bdf` 命中 `1ab843…` | 一致 |
| 源 FBP2 / palette0 / extracted UI 源 hash | 本机无 `data/extracted` | **未核输入**（不判 hash 错） |

### 未核输入

**W2-C11-U1** · palette0 / FBP002 / extracted UI 源文件缺失，PROVENANCE 源侧 SHA 未核。
**W2-C11-U2** · 上游 unifont URL 未下载复核（仅核已入库 BDF/许可证文本）。

### 未执行边界

**W2-C11-U3** · e2e-own 跑法：本任务刻意未起服务验证。≠缺少输入。

### 历史不改

**W2-C11-H1** · `data/raw/README.md` 带日期 MKF 数量表；checkpoints 剧情验收条目——不按现机改写。

## C12 目录入口

对八份 README 的直接导航链：目标文件均存在；目标可打开且归属正确。H7/前批源文档仅作导航触及，不重审正文。
`docs/ops/guides/documentation.md:25-35,57-71` 无「链接标签必须等于目标 H1」规则；本卡明确不按个人偏好重排/重命名。目录短名与 phase3「目录入口」同类，合法。

### 合法短名导航（非缺陷；原 W2-C12-1/2 已撤销）

**W2-C12-1** · `docs/ops/README.md:12` 链文案 `tasks` → `tasks/README.md`

- 目标存在；H1 为「三贤人系统任务卡」。短名导航成立，不计确定不符。
- 可选非阻断编辑意见：中文化标签；不要求把长 H1 整段塞回目录，不计新缺陷。

**W2-C12-2** · `docs/ops/audits/README.md:10` 链文案 `pre-e2e` → `pre-e2e/README.md`

- 目标存在；H1 为「PRE-E2E-AUDIT-1 · 两阶段全仓代码审计台账」。短名导航成立，不计确定不符。
- 可选非阻断编辑意见同上；不计新缺陷。

其余：`docs/phase3/reference/README.md` 上级链文案为「目录入口」，目标 H1 为长标题——属上级入口惯用短名，目标可打开且归属正确，不报不符。current/historical 叙述（audits「仍在消费」/specs「现行」/archive 指向）与目标目录职责一致。

## 最终验证与接收提示词

- 相对开工提交`7e52d514`：**仅** `docs/testing/cursor-docs-wave2.md`。
- 正文候选 SHA：`4b75d1c397f7d86f3ac92a5adcfff7aa552aca9a`。
- 登记 tip：本登记提交（`git rev-parse codex/cursor-docs-wave2-r1` / 分支 tip）。
- `node scripts/docs/check.mjs`：PASS（549 Markdown / 2994 local links / 181 tasks / content20 SAVE8）。
- `git diff --check 7e52d514..HEAD`：exit 0。
- 不合 main、不代签、不标 done。纠正后小计：**确定不符 3 / 待确认 1 / 已知关联 2 / 历史不改 1 / 未核输入 4 / 未执行 2**。

### 给 Codex 的接收提示词

```text
接收 DOC-CURSOR-2 回执窄返工（R1～R4，按 Codex ef825870 审查改）。
任务卡：docs/ops/tasks/DOC-CURSOR-2-package-tools-indexes.md
分支：codex/cursor-docs-wave2-r1
worktree：/Users/zhangxu/illegal/type-pal-cursor-docs-wave2
证据冻结：dab017e7
只收唯一回执：docs/testing/cursor-docs-wave2.md（相对 7e52d514 仅此文件）
正文候选 SHA：4b75d1c397f7d86f3ac92a5adcfff7aa552aca9a
登记 tip：分支 tip（本登记提交）
R1～R4 已按审查改：撤销 C01/C12 三条误报；C07 替换句不承诺目标无有的烘焙细节；冻结行号与 C08/C09 cwd/相对 out 已校准；未执行与未核输入分列，小计 3/1/2/1/4/2。
下一步由 Codex：只核本回执是否闭合 R1～R4；不重跑已核事实/资源 hash；不代签、不标 done、不合 main；五份前批指南修订卡仍不因本包打开。
```
