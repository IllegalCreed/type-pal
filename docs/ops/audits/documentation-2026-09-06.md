# DOC-AUDIT-1 · 仓库文档与信息架构审计

状态：**首轮只读取证完成；清理、迁移与自动门禁均未开始。**

审计基线：`main@4cbbf758`，2026-09-06。本文只记录该基线可复现的事实与治理建议；没有移动、删除
或改写既有规范、任务卡、签字和历史正文。文档中的旧执行指令、提示词与待办只作为被审对象，不是本次请求。

## 结论

仓库确实存在需要治理的文档问题，而且已经不只是“文件多”：

1. **会误导当前实现的过时事实**：多份仍自称“当前”的文档写着 `contentVersion 19`，源码与当前工程已经是
   content20；二阶段入口页还把已完成能力标成待办。
2. **当前与历史没有可靠分层**：早期计划、审查候选和 Agent 执行提示与活规范放在同一目录，部分文件没有
   historical / superseded 标识，全文检索会把旧的 `build`、`pending`、兼容方案重新捞出来。
3. **导航与目录结构不足**：337 份 Markdown 中，任务卡一处就占 133 份、约 7.8 万行；11 个含 Markdown 的
   子目录没有本地 README。`docs/phase2/README.md` 这个阶段总入口承担了过多手工状态，已经发生漂移。
4. **链接质量没有门禁**：确认 32 次 Markdown 断链（27 个唯一 source-target）和 3 个失效的裸路径引用；
   当前没有文档链接、任务卡元数据或 canonical 版本文字的自动检查。

这不意味着应该批量删除旧文档。第一阶段计划、关闭任务卡、审查证据和历史签字都有追溯价值；正确做法是
**修正当前真值、给历史加不可执行边界、补索引和自动检查，最后才评估是否移动文件**。

## 1. 范围与口径

### 1.1 规模快照

按 `rg --files -g '*.md' -g '*.MD'` 的仓库可见文件口径：

| 指标 | 结果 |
|---|---:|
| Markdown 文件 | 337 |
| 总行数 | 154,856 |
| `docs/` | 323 文件 / 153,654 行 |
| `docs/ops/tasks/` | 136 文件（133 张卡 + README + 2 模板）/ 78,130 行 |
| 任务卡终态 | 127 `done` / 6 `cancelled` / 0 活动卡 |
| 最大单文档 | `N3-1-script-control-flow-modernization.md`，11,269 行 / 839,231 B |
| 简单 Markdown 入链为 0 | 140，其中 95 张是已终态任务卡 |

`rg` 默认不纳入 vendored `reference/sdlpal/.github/` 隐藏模板；这不影响项目文档结论。入链为 0 只是
**可发现性候选**，不是删除依据：根 README、独立包 README、历史档案本来就可能没有 Markdown 入链。
上表是写审计报告前的 `4cbbf758` 快照，不计本文和新增的审计索引；两份审计产物入库后文件数与行数自然增加。

### 1.2 判断层级

本审计按以下优先级判断“现在是什么”：

1. 当前源码常量、loader/validator 与当前工程；
2. 根 README、`docs/phase2/READ-FIRST.md`、capability map、roadmap 的当前队列、ops board；
3. 已完成任务卡与审计证据；
4. 带日期的设计、计划、旧状态表和历史交接。

第四层可以保留当时事实，但不得继续自称当前契约或可执行待办。

## 2. P1：会把当前工作带错方向的问题

### DOC-01 · canonical 版本在“当前”文档中互相冲突

源码 `packages/content/src/character.ts:168` 定义 `CONTENT_VERSION = 20`；
`docs/phase2/foundation/content-schema.md:8-30`、`save-system-design.md:6-30` 和
`capability-map.md:4-8,132` 也明确当前为 content20 / SAVE8。以下文档却仍把 19 写成当前或适用版本：

- `packages/migrate/README.md:3-5`；
- `docs/phase2/migrate/asset-pipeline.md:3-6`；
- `docs/phase2/foundation/script-system-design.md:3-11`；
- `docs/phase2/editor/shared-script-author-guide.md:3-9,91-93,125-129`；
- `docs/phase2/editor/editor-design.md:251-256`；
- `docs/phase2/editor/project-lifecycle-design.md:326-335`。

风险不是版本数字难看，而是违反 current-only 合同：读者可能恢复旧 parser、fixture 或升级入口，或者按错误版本
制作工程与测试。清理时应把仍是当前指南的内容更新到 content20；属于 content19 当时结论的段落改成明确历史，
不能机械全局替换数字。

### DOC-02 · 二阶段总入口已经失去索引真值

`docs/phase2/README.md` 同时存在以下可证实漂移：

- `:4` 把第一阶段写成 `docs/` 顶层和 `docs/plans/`，真实入口是 `docs/phase1/` 与
  `docs/phase1/plans/`；`roadmap.md:4,64-65` 也有同样旧路径。
- `:28` 写“六条铁律”，`READ-FIRST.md:6` 已是十一条。
- `:31` 写决策 D1–D20，`decisions.md` 已到 D31。
- `:37,46,52,65,78,86` 把当前 schema 标草案、装备标待 GLM、鬼界民居标活跃/当前切片、对话视觉和
  使用菜单标待实现；capability map 已记录相应地基、C3、C8、D14-1 等完成，当前队列已经转到审计修复与 E2E。

该 README 应只维护稳定导航和“现状看哪里”，不再手抄每份计划的实施状态；否则它会继续成为漂移放大器。

### DOC-03 · 活路线图混入旧“下一步”和已被推翻的硬约束

`docs/phase2/roadmap.md` 自称活文档，但正文未把时间切片隔离清楚：

- `:10` 仍称第一阶段“接近尾声”，根 README 已明确 v1.0.0 上线并冻结。
- `:31,41,75` 仍以“为 MMO 留口”作为二阶段理由；
  `docs/phase3/future-gameplay-and-mmo-backlog.md:28-34` 后来明确裁决二阶段**不为 MMO 留任何口**，只因
  当前产品需要而选择干净、可测架构。
- `:66` 仍说 decisions 和现状表“待建”，`:83-87` 仍说下一步是 D17 菜单；同文件 `:212-223` 已有
  2026-09-05 的真实当前队列。

保留早期进展有历史价值，但应集中放入“历史推进记录（不可作为当前入口）”，北极星和当前队列不能夹着旧待办。

### DOC-04 · 包、工程与参考入口中有直接错误

这些文件是开发者很容易首先打开的入口，因此优先级高于普通历史计划：

- `packages/editor/README.md:3-10` 仍称编辑器是“空壳占位”、以后才嵌 Reforge；实际编辑器已经是主要产品面。
- `packages/migrate/README.md:4` 的当前 content19 已过时（同时属于 DOC-01）。
- `projects/e2e-own/README.md:1-6` 标题称“纯自有内容”，正文又登记 `sprite.pal.002`；根
  `README.md:8,139,184-185,210` 已明确 fixture 仍含少量 PAL 派生素材，尚非版权清理完成。
- `projects/pal/e2e-checkpoints/README.md:55-56` 仍把“两阶段全仓代码审计”写成下一步；审计已经完成，当前是
  修复其 E2E 阻断项。
- `reference/README.md:7` 说战斗公式、opcode 与格式“一切以 sdlpal C 源码为准”，与
  `CLAUDE.md:56,70-76` 的较新规则冲突：原版实际行为和数据优先，sdlpal 是参考实现，不能冒充原版。
- `data/raw/README.md:29,39` 两处仍指不存在的 `docs/04-decisions.md`，应指 `docs/phase1/04-decisions.md`。

此外七个 workspace package 只有 editor、migrate 有包内 README，而 editor 的还是占位文本。要么为主要包提供
统一的最小职责/命令/边界入口，要么明确根 README 是唯一包说明；当前半套状态最容易让人误判成熟度。

### DOC-05 · 第一阶段“当前真值”口径超过了证据有效期

- `docs/README.md:7` 仍称第一阶段“接近尾声”；根 README 已写 v1.0.0 上线、运行时冻结。
- `docs/phase1/README.md:3` 宣称“100% 字节级还原原版仙剑”。字节级可以用于特定提取/round-trip 证明，
  不能概括整个浏览器运行时；最近全仓审计仍确认一阶段存档、切场景、战斗调用和离线缓存等真实问题。
- `docs/phase1/README.md:8-16` 把 status 表称“当前真值”，但
  `status/feature-status.md:6` 是 2026-06-16 快照，`status/cutscene-status.md:3` 的逐场景 dump 是
  2026-06-07。`feature-status.md:31-33` 还声称没有玩家功能 partial；它不再是 2026-09 审计发现的完整
  状态来源，也不能据此推导当前没有缺陷。审计中的确认缺陷、条件性风险和待证项仍须保持各自分类，不能
  反过来把 status 表的所有条目机械改成 partial。
- `CLAUDE.md:36,120` 说 `pnpm check` 不含 Biome；根 `package.json:6-7` 明确 `check` 和 `check:fast`
  都会运行 `pnpm lint`。

第一阶段 status 表不应删除或把历史数值洗成新数值。建议把它们定义为“v1.0 冻结时覆盖快照”，另由当前 known
issues / 审计台账承接后续缺陷；真正仍由源码与原始数据证明的资源、公式条目可以继续作为专题真值。

### DOC-06 · ops 当前状态语义与现行流程入口不清

- `docs/ops/board.md:16` 把 PRE-E2E-AUDIT-1 写成 `review（审计已收口，修复未开工）`，事实描述与审计总
  收口一致；问题是没有对应任务卡说明这个 `review` 还等待哪项验收/签字、何时离开只保留当前工作的看板。
  应明确将审计闭合移出，或写清保留 `review` 的退出条件；后续修复仍须使用自己的任务身份和准入。
- `docs/ops/board.md:5-6` 把 2026-08-15 的 Kimi/GLM 额度快照放在当前看板顶部；额度是外部瞬时状态，
  旧快照不能成为今天的规则。
- `docs/ops/tasks/TASK-lite-template.md:3` 只给 `build | review | done`，缺现行状态机的 `draft`，也无法表达
  `blocked / rework / cancelled`。
- 5 张已关闭任务卡使用 `> **状态**` 而非模板的 `Status:`，简单扫描会漏掉：
  `ARCH-ENTRY-ACTOR-SEED-1`、`ED-DS-3`、`MIG-PAL-ITEM-SCHEME-LABEL-1`、
  `MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1`、`MIG-PAL-WORLD-SPRITE-ALIAS-1`。
- `docs/ops/acceptance-checklist.md` 混合 2026-07 已完成项目和未勾项目，仍写状态面板不存在等旧事实，且没有
  “历史验收批次”标识；它不能继续作为全项目当前验收清单。

`docs/ops/kimi-verification-manual.md` 和 acceptance checklist 也没有进入
`docs/ops/agent-workflow.md:7-15` 的文件分工表，读者无法判断其权威性和保鲜责任。

## 3. P2：历史边界与信息架构问题

### DOC-07 · 历史计划仍长得像可立即执行的指令

基线仓库有 28 份计划包含 `For agentic workers` / `REQUIRED SUB-SKILL` 一类直接执行文字，其中 15 份位于
`docs/phase2/`。第一阶段 `plans/README.md` 已明确整目录是历史，风险较低；二阶段没有同等总边界。

代表性问题：

- `docs/phase2/editor/project-lifecycle-p1-filesource-plan.md:3-17` 与
  `project-lifecycle-p2-assets-source-plan.md:3-17` 仍要求 `/extracted` 透传、兼容 fallback、旧 Agent 分工与
  co-author；这些方案已被 current-only/canonical 资产链取代。
- `docs/phase2/foundation/phase1-audit-tracker.md:59-69,81,94-99,107,122` 仍把投掷、毒、商店、过场、
  跟随者、资源 manifest 等写成未实现；capability map 已记录后续完成事实。它是 2026-07 审计快照，不是当前缺口表。
- `docs/phase2/editor/project-foundation-plan.md:5`、`foundation/actor-model-design.md:5`、
  `foundation/actor-c0-plan.md:5`、`foundation/e7-follower-riding-design.md:3` 仍写待审/待实现；对应架构和能力早已落地。
- `docs/phase2/dialogue/model-design.md:3` 仍写 C1-2 review，`dialogue/visual-design.md:3` 仍写草案；
  二阶段总入口又把 visual plan 标待实现。
- `docs/phase2/foundation/content-schema.md:1-8` 顶部仍叫 P0 草案，下面却追加 current content20 契约；
  这是“活规范 + 历史设计”混在一个文件的典型，应像 save-system 文档一样明确哪一节拥有当前合同。
- `docs/phase2/decisions.md:154-165` 的 D17 标题仍写暂搁，作为时点决策本身没有错，但决策日志缺统一的
  outcome / superseded-by 索引；搜索标题会把历史状态当今天状态。

关闭任务卡也有同类问题。133 张任务卡全部终态，但最大卡 N3-1 有 11,269 行，内部仍含大量当时的
“当前状态 build/review blocked”“等待 GLM”等文字；顶部虽为 done，局部搜索结果不带上下文时仍会误导。
历史签字和交接必须保留，治理应靠顶部终态、显式历史分界和索引，不能回写或删除过去意见。

### DOC-08 · 目录承担的职责不清晰

在 `4cbbf758` 基线上，以下 11 个目录含直接 Markdown，却没有本地 `README.md`（本审计已新增
`docs/ops/audits/README.md`，所以报告入库后的当前树剩 10 个）：

```text
docs/lore/dlc-01-guijie
docs/ops
docs/ops/audits
docs/ops/evidence
docs/phase1/status
docs/phase2/dialogue
docs/phase2/editor
docs/phase2/foundation
docs/phase2/menu
docs/phase2/migrate
docs/phase2/slice1-indoor
```

其中最明显的结构债：

- `docs/phase2/README.md` 被迫手工维护 70 多份子文档的选择性状态，却没有子目录 owner 帮它分流。
- `docs/ops/tasks/` 把 127 done、6 cancelled、模板和未来活动卡平铺；README 只讲如何建卡，没有 active / done /
  cancelled 索引，也没有说明“顶部终态覆盖正文历史状态”。
- `docs/ops/audits/` 混合扁平专项审计和 `pre-e2e/` 子树；`evidence/` 混合 Markdown、截图目录与单图，均无
  保存期限、命名和入口说明。
- 简单引用图中 140 份文档零入链，95 份终态任务卡可解释；剩余 45 份仍包含二阶段设计/计划、ops 证据、
  DLC beat sheet 与包/工程说明，至少需要一次“应入索引 / 纯历史 / 独立入口”分类。

### DOC-09 · 没有自动保鲜机制

根 `package.json` 没有 docs check，仓库也没有 Markdown 链接检查或任务卡索引生成器。现有漂移都属于可机械拦截：

- 本地相对链接目标不存在；
- 活文档写了非当前 `contentVersion` / SAVE 组合；
- 活任务卡未使用统一状态字段，或 board 指向终态审计；
- README 写死“六条”“D1–D20”“1218 行”等会自然变化的计数；
- 已关闭卡中的历史提示词没有明确不可执行边界。

## 4. 断链台账

保守解析普通 Markdown 本地链接，排除 URL、锚点、图片、代码围栏和公式后，确认 **32 次、27 个唯一
source-target、11 个源文件**：

| 源文件 | 次数 | 性质 / 处置 |
|---|---:|---|
| `docs/lore/dlc-01-guijie/beat-sheet.md:173,175` | 2 | `../../` 多退一级；当前目标存在 |
| `docs/ops/tasks/OPS-TST-PERF-release-wallclock.md:212-214,219,232` | 5 | 相对层级错；大部分目标又已被 current-only 删除，应改历史 commit/path，不恢复旧代码 |
| `docs/ops/tasks/OPS-TST-PERF-test-fixture-stratification.md:39-44` | 6 | 同上；仅部分当前目标仍存在 |
| `docs/ops/tasks/X7-1-manifest-project-workbench.md:46,54-63` | 11 | 全部少退一级；AGENTS 与大多数源码目标存在，历史 `EntryPointTab.tsx` 已删除 |
| `docs/phase1/plans/2026-05-27-m4-extract-audit.md:39,164` | 2 | 指向本地可再生产物，当前不存在；历史文档应标环境依赖 |
| `docs/phase2/decisions.md:407` | 1 | 把 `:2` 写进 Markdown 文件目标 |
| `docs/phase2/editor/project-design.md:42` | 1 | 历史 `editor/src/index.ts` 已删除 |
| `docs/phase2/editor/project-lifecycle-design.md:53` | 1 | 历史 `reforge/src/loader.ts` 已删除 |
| `docs/phase2/foundation/phase1-audit-tracker.md:149` | 1 | 重复 `foundation/` 路径 |
| `docs/phase2/menu/design.md:10` | 1 | 少退一级到 phase3 |
| `reference/sdlpal/docs/README.md:28` | 1 | vendored 文档从 docs/ 找 `LICENSE`；本地快照目标在上一层，宜白名单或随上游处理 |

另有 3 个不使用 Markdown 链接语法、但文件名已失效的裸路径：

- `docs/ops/tasks/ED-DS-3-editor-design-system-adoption-gate.md:69-70` 的两张旧卡名；
- `docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md:157` 的旧入口任务卡名。

## 5. 建议的整理顺序

### 批次 A · 先修会误导工作的现行入口

低风险、无需移动文件：

1. 对齐 DOC-01 的 content20 / SAVE8 当前文档，历史段保留版本日期，不做全局替换。
2. 重写 `docs/phase2/README.md` 为稳定导航；修 roadmap 的阶段路径、MMO 理由和历史/当前分界。
3. 更新 editor/migrate README、e2e 工程说明、reference 真值层级、CLAUDE 命令说明。
4. 关闭 board 上已完成的审计状态，修 lite 模板；把旧 acceptance checklist 标成历史批次。
5. 修仍指向当前目标的断链；已删除目标改成历史 `commit:path` 或普通文字，绝不恢复旧兼容实现。

### 批次 B · 建索引，不先搬历史

1. 为 `docs/ops/`、`audits/`、`evidence/`、`phase1/status/` 和各 phase2 主题目录补 README；每条只写
   `current / historical / evidence / superseded`、权威入口和 owner。
2. 扩展 `docs/ops/tasks/README.md`：活动任务只以 board 为准，列终态卡索引和 cancelled 原因；声明卡内旧
   “当前状态/下一位提示词”均是时间点历史。
3. 给二阶段旧 plan/design/audit 追加统一顶部 banner，不重写正文、不改历史签字。
4. 给 decisions 增加 D1–D31 的 outcome / superseded-by 索引；不篡改原决定。

### 批次 C · 增加自动检查

建立无第三方依赖的 `check:docs`，至少覆盖：

- 非代码围栏 Markdown 本地链接；
- 任务卡统一状态元数据与 board 引用；
- 指定 current 文档中的 canonical 版本与源码常量一致；
- 目录 README / 索引覆盖；
- 可维护的 vendored、可再生产物和历史 `commit:path` 白名单。

先以“基线报告 + 新增不得恶化”接入，再清零；不要因历史 vendored 文档或本地缺 `data/extracted` 让全仓门禁
永久红，也不要用忽略整个目录来掩盖项目自己的断链。

### 批次 D · 只对未来内容改变存放方式

- 现有 133 张终态任务卡先保持路径不动，避免破坏数百条引用。
- 新的大卡把顶部保留为短的当前摘要、准入与最终回执；大段独立复核、性能日志和截图清单放
  `docs/ops/evidence/<task-id>/`，卡内链接过去。
- 只有在 `check:docs` 能自动改写并验证所有入链后，才考虑把旧卡物理移动到 archive；移动不是本轮目标。

## 6. 明确保留、不能误删的内容

- `docs/phase1/plans/`：已经有“过程记录、不反映现状”的总边界，可继续作为历史档案。
- done/cancelled 任务卡与其中的 Opus/Kimi/GLM/Codex/User 签字：属于审计链，不追溯改名或洗稿。
- `docs/ops/audits/pre-e2e/`：是当前修复的证据输入，但不等于产品缺陷已修复。
- `docs/phase3/`：本轮未发现同等级的阶段边界冲突；README 和 backlog 都明确当前主线仍是第二阶段、远期
  设想不是承诺。
- phase1 机制、资源和提取台账中的可复现证据：过时的是“今天的完成状态”外壳，不是其中所有原始数据与公式。

## 7. 基线探针命令

```sh
# 在 main@4cbbf758 执行可得到上表；当前树会额外计入本文与 audits/README
# 仓库可见 Markdown 数量与行数
rg --files -g '*.md' -g '*.MD' | wc -l
rg --files -g '*.md' -g '*.MD' -0 | xargs -0 wc -l | tail -1

# 最大文件
rg --files -g '*.md' -g '*.MD' -0 | xargs -0 wc -l | sort -n | tail

# 含 Markdown、但没有本地 README 的 docs 目录
find docs -type d | while read -r dir; do
  if find "$dir" -maxdepth 1 -type f -iname '*.md' -print -quit | grep -q . \
    && ! test -f "$dir/README.md"; then
    echo "$dir"
  fi
done | sort

# 当前版本的一手代码锚点
rg -n 'CONTENT_VERSION|CURRENT_PROJECT_MINIMUM_SAVE_VERSION' packages/content/src/character.ts

# 当前文档中的旧版本候选（历史任务卡和第一阶段计划需另行分类，不能全局替换）
rg -n 'contentVersion 19|content19' \
  --glob '*.md' --glob '!docs/ops/tasks/**' --glob '!docs/phase1/plans/**'
```

链接、入链与 metadata 数字来自本轮只读 Node 扫描；批次 C 应把同一口径固化为仓库脚本，避免依赖一次性探针。
