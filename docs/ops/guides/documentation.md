# 文档维护与自动检查

维护者：当前 Coding Owner。纠错门禁见 [DOC-GOV-1](../archive/tasks/done/DOC-GOV-1-documentation-cleanup.md)，
全仓结构整理见 [DOC-IA-2](../tasks/DOC-IA-2-repository-documentation-structure.md)。
本轮依据 [文档审计](../archive/audits/documentation-2026-09-06.md) 修正信息与导航；产品缺陷仍由
[代码审计台账](../audits/pre-e2e/summary.md) 及后续修复任务追踪。

## 文档的有效范围

| 类型 | 用途 | 维护方式 |
|---|---|---|
| current | 当前规范、作者指南、操作入口 | 改实现时同步核对；版本声明须与源码一致 |
| historical | 当时的计划、交接、完成快照 | 保留原文和日期，顶部说明不作为当前执行入口 |
| evidence | 审计、复现、运行回执 | 保留原始证据；整改结果另写回执并链接回来源 |
| superseded | 已被新决定取代的方案 | 指向替代决定或任务，不复活旧方案中的升级器/兼容层 |

混合文档必须标清现行段与历史段。历史签字、作者归属和终态不得因整理而重写；修正断链时保留原标签，
目标已删除则指向核准的 Git 历史路径或改成标明历史的普通文字。字段/公式后的方括号若意外形成 Markdown
链接，可加代码标记或转义，只修呈现，不改证据含义。

一次性调试截图和手工上传样例先检查当前代码、自动测试、工程和实质文档引用。已退役且只服务历史批次的
文件可退出工作树，在历史记录中注明 Git 恢复位置；不为了保留无用附件而新建索引。仍承担具体任务证明的
附件与原始签字继续保留，不能按“没有代码引用”一刀切删除证据。

## 索引与文件存放

- `docs/` 下每个直接含 Markdown 的目录都有 README；README 链接该目录的每份直接文档，按上述类型说明。
- 活动任务放 `docs/ops/tasks/`；终态任务按 `done/cancelled` 放 `docs/ops/archive/tasks/`，模板放
  `docs/ops/templates/`。任务卡使用 [独立生成索引](../tasks/index.md)。当前行动只从 [看板](../board.md) 进入；已完成卡内的旧交接提示
  不构成新的授权，历史状态也不覆盖卡片顶部终态。
- 新任务顶部写 `Status: draft`，使用既定状态机；既有五张终态卡的中文状态标签按确切文件名单读取，
  无需为工具统一字段而改写历史。索引不根据正文中零散的 `build/done` 判断状态。
- 新增长任务将当前摘要、准入和最终回执留在卡中，大段日志、独立复核和截图按任务 ID 放证据目录。
  关闭卡归档时同步更新全部入链和机器索引，保留签字与正文；目录移动必须先有显式映射和预检。
- 现行入口尽量链接单一权威来源，不手抄“铁律数量”“决策编号上限”“文档行数”等易漂移计数。

## 检查命令

```sh
pnpm check:docs
node scripts/docs/check.mjs --json
node scripts/docs/check.mjs --print-task-index
```

最后一个命令只输出确定性 Markdown；核对后更新 `docs/ops/tasks/index.md`。检查器自身用
`pnpm test:docs-tools` 验证，独立于 Vitest 覆盖率与 PAL 真实素材，不需要安装新依赖。

## 目录职责

- 阶段顶层：方针、路线和进度。第一阶段保留编号概要、status 快照和 plans 历史目录。
- 第二阶段 `specs/`：现行规范；`guides/`：具体使用方法；`reference/`：知识参考；`archive/`：
  历史设计、计划、审计与切片。混合稿的现行部分提取成规范，完整旧稿归档作时点证据。
- `docs/testing/`：跨阶段的覆盖率、E2E 合同；`docs/ops/`：协作、活动看板、模板、操作指南和过程证据。
- `docs/lore/`：已登记的世界观资料；未承诺制作的故事设想放 `ideas/`。第三阶段保留 backlog 和参考输入。
- 包、工程与资源的 README/PROVENANCE 就地维护，第三方源码内文档保持其原始结构。

目录 README 应先说明职责，再按语义链接子目录与直接文档；不追加“其他文件（续）”来回避分类。

检查范围：Git 跟踪及未忽略的新 Markdown（含 vendored 隐藏模板），使用工作树中的实际内容；检查普通
Markdown 链接、图片、引用式链接的本地文件目标，忽略代码围栏、行内代码与 HTML 注释。文件锚点
`#section` / `#L12` 仅剥离后检查目标文件；不检查锚点是否存在、不联网验证 HTTP、不解析任意 HTML/MDX。

链接目标必须属于 Git 跟踪或未忽略的新文件，以及这些文件的父目录；本机存在的 `.DS_Store`、忽略产物或
空目录不构成有效目标。这样索引不能依赖只在某台开发机上存在的文件。

`scripts/docs/config.mjs` 明确现行合同的检查段，比较源码的 `CONTENT_VERSION` 与
`CURRENT_PROJECT_MINIMUM_SAVE_VERSION`；不是全文替换版本号。检查段边界消失也报错，需要一起更新规则
并由 reviewer 核实。历史旧版本、未来 N6b 的版本规划、地图/catalog 的局部格式轴不作为当前产品版本。

本地目标缺失、索引漏项、活动任务未进入看板、终态任务留在看板、生成索引漂移或选定现行合同版本错配均失败。
工具无法判断叙述是否真实、历史是否归档正确，仍需 Codex 对 GLM 的修改逐项审核。

## 例外与准入

`check:docs` 已接入根 `check/check:fast`；GitHub 的 Documentation workflow 在 PR、main 推送及手动触发时
执行同一组工具测试与仓库检查，不依赖 pnpm 安装、PAL 素材或浏览器。首次接入与远端回执见 DOC-GOV-1。
文档检查通过不等于产品缺陷修复，也不代表全仓 lint/E2E 已通过。

允许的例外只精确到 `source + target + reason`，当前仅记录未改写的 vendored SDLPal 上游断链。
例外未命中、目标恢复或缺少理由会失败；不忽略整片项目文档，也不把历史问题数量转成可任意新增的额度。
本地可再生产物的历史引用优先说明生成条件并改为普通代码路径，避免机器是否有 PAL 素材影响文档检查。
