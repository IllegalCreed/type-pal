# CONTENT-DEFEATED-REFERENCE-DIAGNOSTICS-1 — 战后条件引用的诊断归属

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 本次准入

**build allowed**。Codex 准入，单一 Coding Owner。仅处理战后条件的场景与实体诊断归属，以及同一敌人条件角色的重复引用报错。保持唯一错误的首次位置与阻断级别，用原作者敌人、缺场景和两独立引用回归核验。范围为 validate-refs.ts 与敌人引用定向测试。

## 目标

确定战后条件的场景、实体及角色引用各由哪个扫描层诊断，保持引用缺失会阻断保存和发布的现行合同。

## 范围

核作者战后分支的引用诊断、顺序和输出归属。战后动作的执行由 Reforge 负责。

## 前提与证据

合法的作者态敌人可在 `onDefeated` 条件引用场景或实体。结构允许声明该地址，跨表验证负责判断目标是否存在。修复前，统一命令目标扫描与敌人专用校验均发现同一条战后实体边。真实 `validateReferences` 的失败用例期望一条精确错误，实际收到两条完全相同的错误。普通场景剧情是否存在这种无效引用未核证。

敌人 hook 条件还观察到同一角色边经战斗校验和通用角色扫描形成两种路径写法和文案。初审将它与逐字相同的实体诊断分别登记。

### 调用与原件

- [统一跨表校验](../../../packages/content/src/validate-refs.ts#L607)先扫描敌人完整文档，再由敌人校验检查战后条件。
- [编辑器项目诊断](../../../packages/editor/src/core/project-diagnostics.ts#L526)和状态诊断各按路径与文案折叠逐字相同的错误。迁移发布直接使用[原错误列表的前五十条](../../../packages/migrate/src/pal-current-publication.ts#L363)，重复项可能占用其中一条。
- [唯一执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)的 `defeated-entity-duplicate-red` 原生报告保留唯一失败及实际两个相同对象，`defeated-entity-duplicate.fixture.txt` 可临时加入 `enemy-reference-validation.test.ts` 重放。

## 本次修复

场景和实体条件沿用统一目标扫描的首次诊断。战斗角色的存在和参战资格由敌人专用校验继续负责，quoted 状态 ID 保留。通用角色扫描仍检查本域的对白身份，两个独立引用继续分别报告。发布报告的阻断级别与其它诊断次序沿用原合同。

| 文件 | A 正确性 | B 注释 | C 职责 | D 复用 | E 测试 | F 可读性 | G 简洁 | H 可测试 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| validate-refs.ts | 合法战后条件的缺实体、缺场景和敌 hook 角色各报一次，两个地址各保留一条 | 注明场景扫描和战斗角色诊断各自负责的边 | 跨表诊断独立于战后执行和编辑器陈列 | 复用场景/实体目标扫描，敌人路保留资格检查 | 实际 validateAuthorEnemies 与 validateReferences，精确位置和已有可参战约束 | validateDefeatedCondition 说明剩余条件职责，保留原聚合入口 | 删除第二套场景/实体检查和角色重报 | 同一个合法工程夹具可改一处输入复验完整列表 |

## 验收

原卡缺实体用例进入敌人引用专测。新一轮先复现缺场景重复以及含点号状态 ID 的角色重复，再验证原位置、分开的两条引用和修复后清空诊断。保存与发布继续消费相同错误等级及首项合同。归档内 diagnostics-red 和 content-after-diagnostic-path 保留前后命令和原生报告。

## 状态与交接

集中门已通过，实际命令和零诊断回执见后继归档。战后执行与作者剧情无修改。当前技术选择落实既定引用合同。

[本次执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-review-closeout.tar.gz)固定实际命令、候选文件、失败与通过。
