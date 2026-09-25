# DOC-CURSOR-6 — 第二阶段作者指南八组只读事实核对

Status: done
Phase: phase2 documentation
Capability: 只读取证，不改变产品或正式规范
Contribution Owner: Cursor
Review/Integration Owner: Codex
Branch: `codex/cursor-author-guides-audit-r1`（独立 worktree）
Evidence freeze: `4594f0a5`（开卡前 main；交付记录实际起点）

## 目标与去重边界

Cursor 完成 DOC-CURSOR-5 后可连续做本批八组，不需逐组等签。只核**现行作者指南的可执行入口、
引用、命令及 UI 可达性**，提交一份事实回执供 Codex 决定是否另行窄修。
这是 draft 只读包，不准改指南、产品、测试、资源或统计基线。

前批 DOC-CURSOR-1/2 已核过根入口/包 README/CLI/CI；DOC-CURSOR-3 已核 fast 说明；
DOC-CURSOR-4 已核场景入场 H7。**不重领**这些旧问题，也不把新旧同根因换名计新发现。
当文档描述的是设计目标或带日期历史，而当前 UI 尚未实现，须先标清其时态，不要求产品迁就文档。
现行 UI 的一手依据是 `packages/editor/src/ui/` 的实际 App→子组件渲染链与注册表，
不以未被渲染的组件、字符串、测试 fixture 或类型声明单独证明用户能看到某控件。

## 八组固定核对

| 组 | 源文档与窄问题 | 边界 |
|---|---|---|
| A1 | [`actor-presets.md`](../../../../phase2/guides/actor-presets.md) §三种放置/共享：现行 App/场景对象入口、创建命令及身份复制关系 | 不审角色战斗数值或外观像素 |
| A2 | 同文 §解除关联/创建复制删除：是否真有可达控件与删除引用保护，撤销/重做属于哪条命令链 | 不用“类存在”冒充 UI 可达 |
| B1 | [`battlefield-authoring.md`](../../../../phase2/guides/battlefield-authoring.md) §创建复制删除与三层选择：当前战场模块/场景引用/开战覆写实际 owner | 不跑浏览器战斗、不重设计字段 |
| B2 | 同文 §背景资产/验收示例：catalog 路径、预览消费者及“能看到”声称的输入前提 | 缺 gitignored PAL 字节记 `blocked-input`，不运行迁移补环境 |
| C1 | [`shared-script-author-guide.md`](../../../../phase2/guides/shared-script-author-guide.md) §创建/编辑/统一工作台：现行脚本库 UI、共享绑定与稳定 id | 不重领 DOC-CURSOR-4 入场 H7 |
| C2 | 同文 §self/跳转/物品私有/删除：当前 canonical 命令和 guard 的真实调用边界 | 仅核指南明确声称的可用性，不做 schema 审计 |
| D1 | [`debug-tools.md`](../../../../phase2/guides/debug-tools.md) §战斗构建器/帧步进：现行 Reforge dev 注册、触发命令与显式禁用域 | 旧 `?skill`/runDetached 符号 H2/H6 已修，不重计；不启动用户 6051 |
| D2 | [`content-publication.md`](../../../../phase2/guides/content-publication.md) §导入发布：当前 PAL 路径和只读/dry-run/write 含义是否超出实际入口 | DOC-CURSOR-5 的 migrate README 错链另修；不运行 publish/迁移/删除 |

每组仅给明示原句的 `file:line`、生产 source/调用点、强替代解释与可证伪观察，分类
`confirmed / wrong / pending / blocked-input / historical`，并给最窄替换句或不改理由。
某组全对也须写“已核无确定错误”，但不设发现数指标。若 UI 是否可见必须亲眼确认而当前无自有
隔离浏览器，记 `pending-ui`；**不访问用户 6010/6051 工程，不拿源码字符串当截图**。

## 白名单与验收

- 唯一可写 `docs/testing/cursor-author-guides-batch.md`；不修改上表五份指南、包 README、
  根/phase2 索引、源代码、脚本、测试、CI、锁文件、资产、基线、任务卡或看板。
- 可用 `rg`、`git show`、文件读取、只读 `node -e` 解析现成 JSON；不运行 extract/migrate/bake、
  保存/导出、部署、覆盖率、E2E、全仓 test/check，也不安装依赖或改环境。
- 每两组提交一次，八组连续做完统一推送；最终核相对开工提交只有上述一份回执。
  只跑 `node scripts/docs/check.mjs` 与 `git diff --check`，交正文 SHA、分支 tip、检查结果、
  八组分类/待证清单。Codex 独立接受后会直接选择性接入材料、再按确证项修正式指南；
  Cursor 不自行合 main、不标 done。Kimi/GLM 固定签字当前不适用。

## 阶段门

Codex 已按当前委派模式核八组与并行 Owner 无源文件写冲突：**draft 只读工作 allowed**。
产品/规范 build 未开放；任何需要新产品能力或用户取舍的发现只登记，不擅改。

## Codex 独立接收与收口（2026-09-25）

- **accept，仅只读审计材料**：候选 `f569853b` 的八组回执经 Codex 对照当前 App/组件接线、`assertProjectSaveValid`、`collectScriptReferenceIssuesFromVisits`、`BattleFieldPicker` 与试玩 URL 独立核验；详见 [Codex 接收记录](../../../../testing/cursor-author-guides-review.md)。审计材料已接入 main；五份正式指南未被 Cursor 修改，本卡 done 不表示其中的七处误导文字已修。
- 候选比白名单多一条 `docs/testing/README.md` 导航，系 `check.mjs` 对新增报告的索引要求。Codex 明确接收该只读导航例外；不是指南或产品改动。候选 `node scripts/docs/check.mjs` 与 `git diff --check` 均通过。
- `C2-4` 发现的是现行保存门没有 canonical `callScript` 环检测；**不可把未实现的保障写成已实现，也不可用本审计授权产品改动**。正式指南纠偏和产品缺口分别后续处理；没有浏览器视觉验收的项保持 pending-ui。无下一位 Agent 提示词。

### 下一位 Cursor 提示词

```text
完成 DOC-CURSOR-5 的隔离提交后，从包含 DOC-CURSOR-6 的 origin/main 新建第二个 worktree
/Users/zhangxu/illegal/type-pal-cursor-author-guides，分支 codex/cursor-author-guides-audit-r1。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、DOC-CURSOR-6 卡、五份目标指南，
并查 DOC-CURSOR-1/2/4 已接收事实以去重。连续核 A1/A2/B1/B2/C1/C2/D1/D2 八组，
仅写 docs/testing/cursor-author-guides-batch.md：每项原句file:line、真实App/模块调用链、
confirmed/wrong/pending/blocked-input/historical分类、可证伪反例和可直接用的窄替换句。
不能用未渲染组件字符串证明当前 UI；资源缺失或无自有隔离浏览器时如实待证。
不改正式指南、产品、测试、配置或基线，不触碰用户6010/6051，不运行迁移/覆盖率/E2E。
每两组提交一次，整包推送精确SHA；只跑 node scripts/docs/check.mjs 与 git diff --check。
Grok/GLM/其它任务不在本包范围。Cursor不合main、不标done；Codex审核通过即直接接入推送。
```
