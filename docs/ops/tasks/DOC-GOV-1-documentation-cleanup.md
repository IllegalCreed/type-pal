# DOC-GOV-1 - 文档审计整改与自动检查

Status: done
Owner: Codex（检查脚本、集成与终审）
Contributor: GLM（文档整改）
Phase: ops
Capability: ops
Visual Verification Timing: N/A

## 授权与范围

2026-09-06 用户批准按“文档整改 → 审计缺陷修复与补测 → R4 薄基线 → N6b → 完整 E2E”推进；
随后明确要求利用 GLM 额度并行工作，由 Codex 在其完成后审核。本卡按本轮授权由 GLM 整改文档、
Codex 编写检查工具并终审，不另请 Kimi 签纯文档维护。没有授权改产品行为、schema、存档或迁移管线。

依据 [DOC-AUDIT-1](../audits/documentation-2026-09-06.md) 的 DOC-01 至 DOC-09，落实批次 A/B/C，
批次 D 只记录未来文档存放规则。本卡与后续高风险修复卡分开；代码审计问题不在本卡冒充已修复。

## 上下文锚点与前提

- 用户本轮授权：GLM 并行整改，Codex 审核；不要求用户搬运审查正文。
- [AGENTS](../../../AGENTS.md)、[工作流](../agent-workflow.md)、[第二阶段铁律](../../phase2/READ-FIRST.md)。
- [文档审计](../audits/documentation-2026-09-06.md)：首轮取证已完成，整改未实施。
- [代码审计总收口](../audits/pre-e2e/summary.md)：A–E 首轮取证完成，产品缺陷尚未修复。
- [当前源码版本](../../../packages/content/src/character.ts)：CONTENT_VERSION 与 CURRENT_PROJECT_MINIMUM_SAVE_VERSION；
  [当前工程](../../../projects/pal/manifest.json) 为对应实物证据。
- [路线图](../../phase2/roadmap.md)：R4 content20 薄基线 → N6b content21 → 完整 E2E，不能漏掉薄基线。
- [覆盖率](../coverage.md)：已建立真实基线，最终百分比不阻塞薄 E2E，覆盖率不替代业务断言。

前提门：产品行为/原版机制 N/A，本卡只修文档叙述与仓库检查；不重新裁决任何机制或能力状态。
工程前提已核实：源码 content20 / SAVE8，而审计列出的现行指南仍有 content19；
阶段总入口含旧待办。若源码/当前产品证明某段实际为历史记录，应保留原文并标明历史，不能全局替换版本。

## 文件所有权（避免并行覆盖）

GLM 可修改：

- 根 `CLAUDE.md`、`README.md`；`docs/`、`packages/*/README.md`、`projects/*/README.md`、
  `projects/pal/e2e-checkpoints/README.md`、`reference/README.md`、`data/raw/README.md` 中的 Markdown。
- 只做审计整改与必要索引：更新 current 内容、修链接、追加 historical/superseded 边界；现有任务卡仅修
  链接/裸路径和追加顶部历史说明，绝不改历史签字、状态或当时审查结论。
- `docs/ops/tasks/README.md` 的维护说明由 GLM 更新；独立的 `docs/ops/tasks/index.md` 由 Codex 的工具生成。
- 本卡只允许修改“GLM 整改回执”和自己的交接日志。

Codex 独占：

- 所有非 Markdown 实现/配置，尤其 `scripts/docs/`、`package.json`、`.github/workflows/`。
- `docs/ops/documentation.md`（检查规则）、`docs/ops/tasks/index.md`（生成索引）、`docs/ops/board.md`。
- 本卡共享范围、状态、Codex 验证与收口。

只读保留：`AGENTS.md` 协议；`docs/ops/audits/documentation-2026-09-06.md` 和
`docs/ops/audits/pre-e2e/` 原审计证据；`reference/sdlpal/` vendored 文档。
`agent-workflow.md` 只补文档职责/索引链接，不修改准入、三签和分工规则。
`capability-map.md` 不改能力状态；队列若需同步，只链接路线图，不重新拍板能力格。

## 验收条件

1. DOC-01 至 DOC-09 各有处置、证据和剩余项；真实 current 版本与历史版本明确分界。
2. 现行入口不再宣称编辑器是空壳、不再使用旧阶段路径或“为 MMO 留口”作二阶段约束。
3. 含 Markdown 的项目文档目录有索引，关闭任务可发现且历史提示不再作为当前任务入口。
4. 不移动/删除历史文档，不改签字与已批准产品决策；失效源码引用指向 Git 历史，不恢复旧实现。
5. 无依赖 `check:docs` 检查本地链接、目录索引、任务元数据/看板、选定现行合同版本。
   vendored/环境产物仅接受逐项带理由例外，不能忽略整个项目文档目录。
6. Codex 复核 GLM diff，实际运行检查及必要反例测试；产品代码和内容 JSON 零改动。

## 推进记录

- Codex：工程前提 verified（审计对照源码版本与入口内容）；design agree。普通文档治理，无产品行为变更。
- 用户流程授权：本轮指定 GLM 整改 + Codex 终审，按此两席推进；未代签 Kimi/GLM。
- GLM：文档整改已交付，候选 `e1314089`；原回执保留如下。
- Codex：accept（2026-09-06，复核并修正下列遗漏；文档与覆盖率 CI 均通过，按本轮用户授权收口）。

## GLM 整改回执

**2026-09-06 GLM 完成（整改 + 按 Codex 已落检查器清零）。最终 `node scripts/docs/check.mjs`
输出 `docs: PASS (0 issues)`（362 Markdown / 1598 local links / 134 tasks / content20 SAVE8）。**
共 89 个文件（约 73 修改 + 16 新增 README），全部在 GLM 所有权内；未触碰 scripts/docs、
package.json、工作流、docs/ops/documentation.md、board.md、tasks/index.md 与产品代码。

### DOC-01（canonical 版本冲突）→ 已修

- `packages/migrate/README.md:3-5` → content20/SAVE8 + SceneIndex 来源与版本常量真源注记。
- `docs/phase2/migrate/asset-pipeline.md` 现行结果节 → 20，旧版本字样改为「旧版本号均为当时快照」（避免检查器字面量红）。
- `docs/phase2/foundation/script-system-design.md` → 头部 20；契约节标题去版本号。
- `docs/phase2/editor/shared-script-author-guide.md` → 适用版本 20 + 正文两处 19→20。
- `docs/phase2/editor/editor-design.md:255`、`docs/phase2/editor/project-lifecycle-design.md` §19 → 20 + 真源注记。
- 残留 `content19` 字样仅为合法历史叙述（content-schema 否定句、a7 审计阶段史、审计原文）。

### DOC-02（二阶段入口漂移）→ 重写为稳定导航

`docs/phase2/README.md` 全文重写：「现状看哪里」权威入口表 + 目录索引表 + 导航原则；修正
六条→十一条、D20→D31+、旧阶段路径。新增「顶层专题文档」索引链接 dev-tools/ambience/battle
等顶层散文件。

### DOC-03（活路线图混旧）→ 已分层

roadmap 头部加「§0–§7 为起草期历史」阅读提示；阶段一改「v1.0.0 已上线冻结」；MMO 留口两处
改为「按当前产品需要设计 + phase3 backlog 裁决链接」；§6 旧路径→phase1/、「待建」→已建；
§7 加历史边界。文末真实当前队列未动。

### DOC-04（入口直接错误）→ 已修 + 包 README 补齐

- editor README 重写（空壳→主力产品面）；e2e-own 标题去「纯自有」+ sprite.pal.002 PAL 派生
  标注；e2e-checkpoints「下一步审计」→「审计取证已完成、当前修复阻断项」；reference README
  真值层级改写（data/raw 最终真值、sdlpal 参考实现）；data/raw 两处 04-decisions 路径修复。
- **新增 4 包 README**（content/game/reforge/shared）——七个 workspace package 全部有最小
  职责/命令/边界入口。

### DOC-05（一阶段口径超期）→ 已修

docs/README「接近尾声」→「已上线冻结」；phase1/README 去「100% 字节级」总括、status 表节改
「v1.0 冻结时点覆盖快照」+ 当前缺陷以 pre-E2E 审计为准的边界注（**未改任何 status 数值**）；
CLAUDE.md 两处 `pnpm check` 说法修正（check/check:fast 均含 `pnpm lint`，根 package.json:6-7）。

### DOC-06（ops 语义，board 归 Codex）→ 已修

lite 模板状态枚举补 draft/blocked/rework/cancelled；**5 张卡 `> **状态**：` 归一 `Status:`
字段（值原样）**；acceptance-checklist 顶部加历史批次标注；agent-workflow 文件分工表补
acceptance-checklist 与 kimi-verification-manual 两行。board 两项留 Codex。

### DOC-07（历史边界）→ 已加

- **22 份 phase2 旧 plan/design/audit 加统一顶部历史 banner**（审计点名 9 份 + 含 agentic
  执行文字的 13 份），banner 只加顶部、正文/签字零改动。
- content-schema 标题重写为「现行契约 + 历史设计」分层声明。
- decisions.md 新增 **D1–D31 outcome/superseded-by 导航索引**（正文零改动；D17「暂搁」注明
  为当时状态）；顺带修头部 READ-FIRST 错链。

### DOC-08（目录索引）→ 已补齐并过检

新增 11 个目录 README（ops、ops/evidence、phase1/status、phase2 六主题目录、lore/dlc-01）；
按 Codex 检查器「主题 README 链接目录全部直接 Markdown」规则补齐目录文件索引块（phase1、
phase1/plans、phase2、editor、foundation、menu、slice1-indoor、lore、ops、audits、evidence）；
tasks/README 扩展维护说明并链接生成的 `index.md`。

### DOC-09 / 断链台账 → 清零

- 审计 32 处断链全部修复：层级错（beat-sheet/X7-1/stratification/menu-design/phase2 README）；
  历史路径改 `commit:path` 引用（OPS-TST-PERF 两卡 11 处、EntryPointTab、editor/src/index.ts、
  reforge loader.ts——**未恢复任何旧实现**）；环境产物改代码标注（m4-audit）；decisions
  `render.ts:2` 改 fragment；tracker 重复前缀；另修本人引入的一处层级错。
- 3 处裸路径：ED-DS-3 两处旧卡名、ED-PROJECT-STARTUP-IA-1 一处 → 改为真实卡名。
- 按检查器补修 11 处 CJK/数值伪链接（`数组[下标](注释)` 形）——按 Codex 指引**只加代码标记
  修正呈现**，文字内容不变。
- vendored `reference/sdlpal/` 2 处在检查器白名单内（Codex 工具已处理）。

### 一手复核位置

- `node scripts/docs/check.mjs` → **PASS (0 issues)**；`--json` 复核 0。
- `find docs -type d` 含直接 md 无 README = 0。
- 版本真源 `packages/content/src/character.ts`（=20）；`package.json:6-7`（check 含 lint）。

### 留待 Codex

1. `docs/ops/board.md` DOC-06 两项（审计 review 语义、旧额度快照）——Codex 独占。
2. vendored/可再生白名单口径的最终确认（本轮按检查器现状全部通过，未见需新增例外的项目文档目录）。
3. 根 check/CI 接入与反例测试（批次 C 收口）。

**提交 hash：见交接日志。**

## Codex 验证与终审

### 独立复核（2026-09-06）

已读取 GLM 候选 `995244d1..e1314089` 的实际 diff，并复跑检查。原回执中的统计以 Git 为准：
**84 个 Markdown 文件，14 个新增 README**（不是 89/16）；没有修改产品代码、内容 JSON、
原审计报告、AGENTS 协议或能力状态。GLM 候选的机器检查确为 362 Markdown / 1598 local links / 0 issues。

机器检查仍漏掉了叙述与证据问题，Codex 已完成以下修正：

1. **阶段和门禁**：D21 的浏览器 Web 编辑器仍属二阶段；三阶段是登录/云存档等用户系统。依据决策正文
   与 phase3 backlog 修正新增索引；D22/D24/D25/D26 指向后续取代关系，不再笼统标“全部有效”。
   CLAUDE 的“lint 不阻塞”说法与 package.json 矛盾，已改为失败会令完整 check 失败。
2. **历史引用**：逐项 `git cat-file -e` 检查 GLM 新写的历史路径；文件删除提交本身不再包含文件。
   migrate/loader 改 `f1466374^`；EntryPointTab 改 `d0a42191^`；editor/index 改
   `57ae2b95^`。全部验证存在，不恢复旧实现。
3. **证据文字完整**：部分伪链接清理丢失数组括号及括号说明，例如 `trail[m](=队长+m×offset)`。
   已从 `995244d1` 原稿恢复，仅转义 Markdown 链接起始括号，保留原文字与公式；五张早期终态卡恢复
   原中文状态标签，维持既定历史读取例外。
4. **遗漏和过度历史化**：补齐菜单/B0/B1/FSA 等漏标历史计划；旧 WebGL 切片是“被取代”而非“已按计划完成”。
   content-schema 按实际章节明确当前与历史，roadmap 不再把现行硬约束一起降为历史；N6b 是已拍板未实现。
5. **入口与持续维护**：补缺失的 pal-extract README，修正 shared 的领域边界与 editor 的绝对化说明；
   删除重复的历史计划二次索引，根 README/路线图/审计索引/看板同步到本轮队列。

### 验证与边界

- `pnpm check:docs`：全仓通过；工具反例测试 11/11（链接解析、历史状态、版本边界、索引漂移、例外失效）。
- `pnpm exec biome check scripts/docs package.json` 与 `git diff --check`：通过。
- 本地链接的仓库可发现性复核：不存在靠本机未入库文件才成立的目标。
- `check:docs` 已加入根 check/check:fast；Documentation CI 用 Node 直接执行，无 PAL 素材或新依赖。
- 覆盖率基线与生产源码范围未改；本轮不需要重跑产品浏览器/剧情 E2E。全仓既有 lint 债仍由 E-06 处理，
  不将文档检查通过称为整个 `pnpm check` 通过。
- 远端候选 `042228d8`： [Documentation](https://github.com/IllegalCreed/type-pal/actions/runs/33984102907)
  与 [Coverage ratchet](https://github.com/IllegalCreed/type-pal/actions/runs/33984102999) 均 success。
  文档门禁在不安装依赖、不提供 PAL 素材的 Linux 干净环境通过。
- 收口：DOC-01～09 文档整改及检查工具完成；代码审计原有业务缺陷未被本卡标为已修复。

## 交接日志

- 2026-09-06 Codex：对 GLM 候选完成实质终审，修正阶段误读、证据文字损失、不可解析 Git 引用与历史分界遗漏。
  `042228d8` 文档/覆盖率 CI 均通过；按用户指定的 GLM 整改 + Codex 终审流程 accept，移出进行中看板。
- 2026-09-06 GLM：完成 DOC-01～09 全部文档整改并按 Codex 已落检查器清零——
  `node scripts/docs/check.mjs` → **PASS (0 issues)**。要点：六份现行文档 content19→20
  分段修正（残留仅为合法历史叙述）；phase2/README 重写为稳定导航；roadmap 历史/当前分层 +
  MMO 口径修正；editor README 去空壳 + 补 4 包 README；phase1 status 表定义冻结快照口径；
  CLAUDE check 命令说法修正；lite 模板补状态枚举 + 5 卡 Status 归一 + acceptance-checklist
  历史化；22 份旧 plan/audit 加历史 banner；content-schema 分层声明；decisions 增 D1–D31
  outcome 索引；新增 11 目录 README 并按检查器补齐目录文件索引；32+3 断链清零（历史路径
  commit:path 引用、伪链接按指引只加代码标记）。89 文件全部在 GLM 所有权内；未触碰
  Codex 独占文件与产品代码。提交 hash：见 git log（本条随整改同一提交）。
  Next: Codex 复核 diff、运行检查与反例、处置 board 两项后收口。
- 2026-09-06 Codex：按用户指定划分文件所有权；GLM 负责文档，Codex 同步建设自动检查工具。
- 2026-09-06 Codex：交付无新增依赖的文档检查器、生成任务索引和维护规则；反例测试 11/11。
  GLM 可用 `pnpm check:docs` 查看实时整改项，完成后由 Codex 终审并接入 CI。只提交 Codex 负责文件，
  保留 GLM 工作树改动。

## 下一位 Agent 提示词

无下一位 Agent 提示词；本卡已由 Codex 复核并收口，无需用户再做技术验收。下方首次交接仅保留历史。

### 历史：首次 GLM 交接

```text
请在 /Users/zhangxu/illegal/type-pal 接手 DOC-GOV-1 的 GLM 文档整改。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/tasks/DOC-GOV-1-documentation-cleanup.md、docs/ops/audits/documentation-2026-09-06.md。
用户本轮明确指定你并行整改、Codex 做完后终审；请直接执行卡中 GLM 范围，不再索取三签。
落实 DOC-01 至 DOC-09 的文档部分：逐段核源码纠正现行版本/状态/入口；修断链；给主题目录和历史计划补索引与边界；补决策 outcome/superseded-by 导航。保持历史任务签字、终态和审计原文，不机械替换历史版本，不移动文件，不改产品代码和能力状态。
严格遵守卡中的文件所有权；scripts/docs、package.json、工作流配置、docs/ops/documentation.md、docs/ops/board.md、docs/ops/tasks/index.md 由 Codex 处理，勿碰。
在本卡“GLM 整改回执”和自己的交接日志写处置与验证，直接提交推送，只提交你负责的文件，保留其他人的未提交改动。不得标 done，交 Codex 复核；不要让用户复制审查正文。发现真实冲突记录具体文件/证据，不擅改产品决定。
```
