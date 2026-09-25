# ARCH-REGRESSION-LAB-GLM-1 · 简短回执（GLM 十二组，r8 收窄补实）

任务卡：[ARCH-REGRESSION-LAB-GLM-1](../../ops/tasks/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)（draft）。
worktree `/Users/zhangxu/illegal/type-pal-glm-regression-lab`，分支 `codex/glm-architecture-regression-lab-r1`，
起点 `a3ceaf05`；产品冻结以最近授权主线合入点（`git merge-base origin/main HEAD`）为基准，
packages/scripts 活树零 diff。账本：[results.json](results.json)（45 条，与执行 JSON 一对一双射）；
机械对账器：[tools/verify.mjs](tools/verify.mjs)（v2 全硬判据）。

本轮（r8）回应七轮 Codex counter：最终树 Biome 修正（`configs/candidates-exec.json` 提交前格式化，
目录 Biome **exit0** 且与回执一致）；G03 钉保存事务终态、G05 钉旧 wait 进入/越过剩余窗口与卸载 stop 增量、
负控 runner 扩为**三针**；G06/G07/G08 未证轴补实，其余如实收窄。

## 十二组状态摘要

| 组 | 状态 | 案例（本轮实质变更加粗） |
|---|---|---|
| 启动小样 | candidate-green 1 + 负控针 detected | LAB-STARTUP-01；red-control v2 三针全部 detected（详见负控节） |
| G01 手势终结 | **部分 accept（Codex r7）** | 6 项：取消后无选区预览+正控选区删除实变；平移 view 轴维持 pending-contract |
| G02 会话失效 | **accept（Codex r7 当前三项候选合同）** | 3 项：深拷贝会话选区删除、新旧地图隔离 |
| G03 App 生命周期 | candidate-green 3 | **G03-03 钉保存事务终态**：`.type-pal/save-state.json` 真实写闭且落盘 `phase=committed`（终态机 staging/ready/applying/data-complete→committed，author-save-journal.ts:497/602），不再以静默窗口近似完成；卸载后零写盘 + 派发 fail-loud |
| G04 脚本草稿 | **accept（Codex r7 当前四项候选合同）** | 4 项：旧草稿丢弃+新草稿写回新对象 |
| G05 播放生命周期 | candidate-green 4 | **G05-02 旧 wait 进入见证**（tick(100) 后 facing=up 且 mode=running）+ 固定推进 1200ms **越过旧源剩余窗口（300ms）**后终值仍 left/done；**G05-04 同实例 stop 调用增量**（卸载前记录、卸载后 >0；生产启动即 stop 不再掩蔽），配套 g05-unmount-cleanup 反控针 |
| G06 跨校验器递归 | candidate-green 7 | **补 choreography 入口**（G06-06 正控 + G07 错误 path/深等），现覆盖 hooks/onDefeated/choreography 三入口；**收窄声明：七入口完整矩阵未证**，不再宣称全组闭环 |
| G07 一阶段边界 | candidate-green 4 | **补 G07-04 装备脚本经 event 表执行**：setGlobalEvents 全局命令表 L_90001 → updateAllEquipments → runEquipScriptSync 0x17 写效果层 → getter base+7；至此「装备脚本→event 表→真值层→0x30 战斗消费」主链各环有证 |
| G08 迁移隔离 | candidate-green 5 | **补 G08-05 真异常路径**（worldSpriteFrameCounts ≠ 636 抛出后模块态无残留——与 G08-04 gap 不抛相区分）+ **G08-06 globalRoots 消费见证**（scriptGraphReport.globalRoots 0→1，typed ScriptRoot）；**收窄声明：options 其余差异维度未证** |
| V01 表单键盘 | candidate-green 3 | 六类表单完整键盘/焦点矩阵**未证**（如实保留） |
| V02 工作区分隔条 | candidate-green + existing-proof | 非空三工作区/实际分隔条**未证** |
| V03 错误恢复 | candidate-green 1 | 读取失败→重试/A-B 乱序**未证** |
| V04 媒体/引用 | 1 candidate-green + 1 blocked-environment | beforeunload 预期中止 + 环境阻断分类维持；媒体矩阵**未证** |

## 负控 v2（tools/red-control.mjs，三针全 detected）

| 针 | 单点破坏 | 红例 |
|---|---|---|
| lab-startup | UpdateProjectMapLayerCommand.apply 早退（commands.ts） | 启动小样业务实变断言红（executed 1 / failed 1 / AssertionError） |
| g05-unmount-cleanup | 删 SceneScriptWorkspace 卸载 cleanup `return () => playback.stop()` | G05-04 同实例 stop 增量断言红：「expected 2 to be greater than 2」——证明生产启动即 stop 不再掩蔽清理缺失 |
| g03-committed | author-save-journal 最终 `publishState(receipt, 'committed')` 降为 `'data-complete'` | G03-03 终态断言红：「expected 'data-complete' to be 'committed'」——写盘照常、仅终态缺失即被鉴别 |

每针恰 exit1、目标测试全量执行、失败首行 AssertionError、注入 witness 命中、产品 hash 前后不变；
临时目录在系统 /tmp。

## 机械对账（verify.mjs v2 全硬判据）

- 账本 **45 条** = candidate-green **43** / existing-proof **1** / blocked-environment **1**；
  分包：startup 1 / G01 6 / G02 3 / G03 3 / G04 4 / G05 4 / G06 7 / G07 4 / G08 5 / V01 3 / V02 2 / V03 1 / V04 2。
- 执行 JSON **37/37 全绿**；candidate-green fullName 与执行 JSON 一对一双向映射。
- **最终树 Biome exit0**（含提交的 `configs/candidates-exec.json`——提交前已格式化，与回执口径一致）。
- 白名单双栏硬判据、commands exit 台账、负向自测同 v2。

## 未证项（如实保留）

1. G01 平移 view 增量断言 pending-contract（view 状态 jsdom 无公开可观测面）。
2. G06 七入口完整矩阵未证（现证 hooks/onDefeated/choreography 三入口代表组合）。
3. G08 options 其余差异维度未证（现证 worldSpriteFrameCounts 异常路径与 globalRoots 计数消费）。
4. V01 六类表单完整键盘/焦点矩阵、V02 非空工作区与实际分隔条操作、V03 读取失败三态与 A-B 乱序、V04 媒体矩阵 —— **未证**。
5. 部分案例隔离单点反控 pending（positiveControl 字段登记）；三针负控 detected 有效。

## 复算命令

```bash
cd /Users/zhangxu/illegal/type-pal-glm-regression-lab
node docs/testing/glm-architecture-regression-lab/tools/verify.mjs \
  docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json   # 机械对账（v2 硬判据）
npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/candidates.vitest.mts \
  --reporter=json --outputFile=docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json  # 候选 37/37（JSON 提交前 biome format）
node docs/testing/glm-architecture-regression-lab/tools/red-control.mjs       # 负控 v2 三针 verdict=detected
pnpm exec tsc --project docs/testing/glm-architecture-regression-lab/configs/tsconfig.json --noEmit  # 类型门 exit0
npx biome check docs/testing/glm-architecture-regression-lab                  # 目录 Biome exit0（含提交的 exec JSON）
pnpm run check:docs                                                           # 文档门 PASS
```
