# Cursor现行文档轻量核对回执

状态：Cursor 只读核对完成；待 Codex 审核建议并决定是否修订十二份源文档。
任务： [DOC-CURSOR-1](../ops/tasks/DOC-CURSOR-1-current-guide-check.md)。
证据冻结：`a3ceaf05`（源码/命令定义以此 commit 为准；本回执工作树起点 `26c4ae5c`，十二份正文与冻结树无 diff）。
只读核对；未执行 extract / migrate / bake / 部署 / 发布；未起服务、未跑覆盖率。静态对齐 ≠ 启动或业务通过。

## 检查完成情况

| # | 文档 | C1–C4 | 结果 |
|---|---|---|---|
| 1 | `README.md` | 已核 | H4 |
| 2 | `docs/README.md` | 已核 | 无问题 |
| 3 | `docs/ops/guides/dev-servers.md` | 已核 | H1、H3 |
| 4 | `docs/ops/guides/browser-verification.md` | 已核 | H2 |
| 5 | `docs/ops/guides/documentation.md` | 已核 | 无问题 |
| 6 | `docs/testing/coverage.md` | 已核现行操作段（两档/口径/ratchet/维护命令）；未核时点统计表数字 | 无问题 |
| 7 | `docs/phase2/README.md` | 已核 | 无问题 |
| 8 | `docs/phase2/specs/editor-architecture.md` | 已核目录/符号（未重审架构） | H5 |
| 9 | `docs/phase2/guides/debug-tools.md` | 已核 | H2、H6、T1 |
| 10 | `docs/phase2/guides/content-publication.md` | 已核 | 无问题（见 N1） |
| 11 | `docs/phase2/guides/shared-script-author-guide.md` | 已核 | 无问题 |
| 12 | `docs/phase2/guides/scene-entry-authoring.md` | 已核 | H7 |

## 问题与修订建议

| ID | 文档锚点及短原文 | 当前一手证据 | 建议替换文字 | 确定性 |
|---|---|---|---|---|
| H1 | `dev-servers.md` §一阶段：表行 `**6001** \| e2e 专用实例(playwright…)`；命令 ``pnpm --filter @type-pal/game run e2e`` | 冻结 `packages/game/package.json` scripts 仅有 `dev/build/typecheck/test/check`，无 `e2e`；无 `packages/game/e2e/`、无 playwright 配置。退役提交 `7aeef72ff`。`E2E=1 … run dev` 仍由 `packages/game/vite.config.ts` 识别，与「run e2e / 6001」无关 | 删除 6001 表行与 `run e2e` 命令块；保留 6005 与可选 `E2E=1` http SW 说明。可加一句：「第一阶段 Playwright L2 已退役，当前无 game e2e 脚本。」 | 确定不符 |
| H2 | `browser-verification.md` §1：`可加参数：…、?skill=…`；同根 `debug-tools.md` 导语：`?…/?skill/?give/…全部保持兼容` | 冻结 `packages/reforge/src/main.ts:267-268`：`startupParameters.has('skill')` → throw「旧试放链接…请从编辑器的战斗模拟器重新开始」。`main.boot-flows.test.ts` 用 `?skill=heal` 断言旧链。面板控制台命令 `skill` 仍在（`debug-tools.ts` / 本指南 G4 表） | 两处 URL 列表均去掉 `?skill`。保留 `?debug/?scene/?pos/?battle/?give/…`。可注明：旧 `?skill=` 启动已拒；授技改走 `?debug` 面板 `skill` 或战斗模拟器 | 确定不符 |
| H3 | `dev-servers.md` §新人前置：`（A7-4 前仍有五个 legacy family 过渡读取 extracted）。projects/pal/assets/** 也不进 git` | 冻结 `docs/phase2/capability-map.md` A7 行：done，「clone/save/export/runtime 无 extracted 或 legacy fallback」。冻结 `.gitignore` 仅 `projects/pal/assets/migrated/` 与 `runtime/`；`git ls-files projects/pal/assets/**` = `index.json` | `终态中 data/raw 与 data/extracted 都不是第二阶段运行时资源目录（A7 已 catalog-only）。projects/pal/assets/migrated/ 与 runtime/ 不进 git，须由 migrate --write 物化；assets/index.json 入库。` | 确定不符 |
| H4 | `README.md` §常用命令 PAL 段：`pnpm bake  # 单独重建可再生资产`（夹在 extract 与 migrate:content 之间） | 根 `package.json` `"bake"` → `@type-pal/migrate` `bake` → 冻结 `packages/migrate/scripts/bake-assets.mts` 只写 `packages/reforge/src/engine-chrome/assets/**`，不写 `projects/pal`。同文件 `dev-servers.md:24-26` 已写明 bake 非 PAL 修复命令；chrome 资源已入库 | 移出「PAL 数据与当前内容工程」块，改为维护者注：`pnpm bake  # 从 data/extracted 重建 reforge engine-chrome 默认 UI（不写 projects/pal）`；或从 README 速查删除并指向 migrate README / dev-servers | 确定不符 |
| H5 | `editor-architecture.md` §一级模块：`顶层固定为八个业务模块`（表无 simulator）；§UI 布局：`…/战斗/资源/工程八个一级入口` | 冻结 `packages/editor/src/ui/editor-navigation.ts`：`EDITOR_MODULE_IDS` 九项，含 `simulator`（战斗模拟器）与 `project`（项目设置）。`editor-navigation.test.ts`：「登记九个一级模块（含战斗模拟器）」。同表「当前权威子页」亦相对 registry 过时（map 缺组合库、item 缺炼蛊皿/紫金葫芦、battle 缺敌队、asset 缺图像/音效等） | `顶层固定为九个业务模块`；在战斗与资源之间插入 `| 战斗模拟器 | simulator | 试打方案、我方预设、敌方预设、背包预设 |`；左栏改为 `场景/地图/剧情/角色/物品/战斗/战斗模拟器/资源/项目设置`；「当前权威子页」按 `EDITOR_MODULES` 标签整表对齐 | 确定不符 |
| H6 | `debug-tools.md` §脚本/触发器：`点击触发走 **detached**（runDetachedV5ScriptChain）` | 冻结 `packages/reforge/src/main.ts:4489` 定义 `runDetachedScriptChain`；`:6081` 注入 `runDetached`。仓内无现行 `runDetachedV5ScriptChain` 符号（仅归档任务卡残留） | `点击触发走 **detached**（runDetachedScriptChain）` | 确定不符 |
| H7 | `scene-entry-authoring.md` §作者规则：`界面显示“默认场景淡变”` | 冻结 `packages/editor/src/ui/ScriptTree.tsx:668-673`：`!stage.entry` 时 note 为 `默认淡出 → 切场 → 淡入`。「恢复默认」按钮文案仍与指南一致 | `界面显示“默认淡出 → 切场 → 淡入”` | 确定不符 |
| T1 | `debug-tools.md` G4 表 `skill` 行复用路径：`内存态授技 + MP 拉满（?skill 语义）` | 控制台 `skill` 命令仍存在；括号是否易被读成「URL 仍可用」取决于读者。H2 已覆盖 URL 拒收 | 若修 H2：将括号改为「旧 URL 授技语义，现仅面板命令」或删括号 | 待确认 |
| N1 | `content-publication.md` / `README.md`：`pnpm --filter @type-pal/migrate migrate:content --write`（无 `run` / 无 `--`） | 冻结 `packages/migrate/scripts/migrate-content.mts:37` Usage 与 `packages/migrate/README.md` 即此写法；`dev-servers.md` 用等价更稳妥的 `run migrate:content -- --write` | 不必改；两写法并存，以 migrate 包自述为准。修订其它文档时可选统一为带 `--` 形式 | 历史或示例不改 |
| N2 | `coverage.md` 各「上一批实测」时点表与数字 | 任务卡明确：只核现行操作段，不改时点统计 | 保持原文 | 历史或示例不改 |
| N3 | `editor-architecture.md` 顶部 `interface EditorMode` 围栏草图 | 设计隐喻；无同名 TS export。MapMode/ActorMode/DataMode 为组件/适配器，非「符号移走」 | 保持原文 | 历史或示例不改 |
| N4 | `debug-tools.md` G4 控制台命令 `skill` 本身 | 现行面板命令，非 URL；与 H2 区分 | 保持命令行；仅随 H2/T1 处理 URL/措辞 | 历史或示例不改 |

同类根因已合并：H2 覆盖两份文档的 `?skill` URL；H5 覆盖模块计数、左栏与权威子页漂移。

摘要：**确定不符 7**（H1–H7）/ **待确认 1**（T1）/ **历史或示例不改 4**（N1–N4）。无空泛扫描项。

## 交付验证

- 候选 SHA：`650f9f9df2e1b67323818d2e8dea7c51dfe7df4a`（`docs(testing): record Cursor guide hygiene audit receipt`）。
- 分支：`codex/cursor-docs-hygiene-r1`（独立 worktree `/Users/zhangxu/illegal/type-pal-cursor-docs`，自 `26c4ae5c` 新建）。
- diff 白名单：相对起点 `26c4ae5c` 仅改本文件 `docs/testing/cursor-docs-hygiene.md`。
- `node scripts/docs/check.mjs`：exit 0（`docs: PASS (0 issues)`；545 Markdown / 2975 local links / 179 tasks / content20 SAVE8）。
- `git diff --check`：exit 0。
- 未执行文档中的开发、迁移、发布等命令；不以静态核对冒充执行成功。
