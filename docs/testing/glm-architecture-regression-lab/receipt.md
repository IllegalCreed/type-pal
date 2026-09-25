# ARCH-REGRESSION-LAB-GLM-1 · 简短回执（GLM 十二组，r7 收窄补实）

任务卡：[ARCH-REGRESSION-LAB-GLM-1](../../ops/tasks/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)（draft）。
worktree `/Users/zhangxu/illegal/type-pal-glm-regression-lab`，分支 `codex/glm-architecture-regression-lab-r1`，
起点 `a3ceaf05`；产品冻结以最近授权主线合入点（`git merge-base origin/main HEAD`）为基准，
packages/scripts 活树零 diff。账本：[results.json](results.json)（40 条，与执行 JSON 一对一双射）；
机械对账器：[tools/verify.mjs](tools/verify.mjs)（v2 全硬判据）。

本轮（r7）按六轮 Codex counter 逐组补真实业务断言；候选/fixture 相对上轮有**真实测试 diff**，
不是改账。类型门真实通过（TS5101 已消除，`pnpm exec tsc --project …/configs/tsconfig.json --noEmit` exit0）。

## 十二组状态摘要

| 组 | 状态 | 案例（本轮实质变更加粗） |
|---|---|---|
| 启动小样 | candidate-green 1 + 负控 detected | **LAB-STARTUP-01 已入账**（此前只记 startupValidation）；red-control.mjs（apply 单点，exit1/1执行/AssertionError/见证/hash 不变，临时目录已移 /tmp） |
| G01 手势终结 | candidate-green 6 | **G01-05 改为选区业务状态见证**：取消后无 `.map-content-selection-preview`、零通知、瓦片原样；正控提交选区后右键「删除」对 session 地图**真实删瓦片**（选区→业务操作→实变全链） |
| G02 会话失效 | candidate-green 3 | **G02-03 改为新会话业务选区**：迟到 up 后无选区；新会话重新选中后删除只写新会话地图（深拷贝隔离见证），老地图原样 |
| G03 App 生命周期 | candidate-green 3 | **G03-03 改为真实保存 IO 见证**：`App initialDir` 生产入口挂载，Cmd+S 经真实保存管线写出完整工程树（manifest.json + content/* + 去抖 save-state 终写，磁盘写闭事件见证）；卸载+静默后同样键入**零写盘**，派发 fail-loud |
| G04 脚本草稿 | candidate-green 4 | **G04-04 补草稿丢弃合同**：外部替换 body 后旧草稿弹层收口、onChange 零调用；重开新草稿确认恰一笔写回新 body 对象（2 行保形）——不再只数行数 |
| G05 播放生命周期 | candidate-green 4 | **G05-02 两源尾命令朝向可区分**（旧 right/新 left）：换源后旧源余量不复活、新源真实跑完 mode=done；**G05-04 改为真实工作区卸载**：CanonicalSceneScriptWorkspace + 真实「播放」按钮（playCanonical entered 见证），卸载后 Playback.stop 原型 spy 见证真实清理 |
| G06 跨校验器递归 | candidate-green 5 | **全部改走合法生产 caller `validateEnemies`**（validate.ts:1442→checkEnemyAi→checkEnemyHookFlow / checkEnemyOnDefeatedCommands），输入按 EnemyDef/EnemyHookFlow 真实类型构造、**合法路径零强转**（仅故意非法叶做单字段收窄突变）；错误 path 精确到 `enemies[0].ai.hooks…` 生产链 |
| G07 一阶段边界 | candidate-green 3 | **G07-01 改为 event-system 真实消费**：explore 对话经 pushDialogHistory 以 scene 写入的当前图号入账（event-system.ts:2160），切图后维度跟随；**G07-03 装备派生进战斗 opcode**：writeEquipmentEffectField 写槽 → battle-opcodes 0x30（STAT_ROW_BUFF）经 getPlayerAttackStrength 重算快照 base→base+7 |
| G08 迁移隔离 | candidate-green 3 | **G08-02 回调真实见证**：raw 0x47 playSound 经 translate-events.ts:1597 走 soundAssetForNum，`toHaveBeenCalledWith(5)` 且产物 sound.lab.005 进入输出 chunk；缺省路径 palSoundAssetId(5)；**G08-04 gap 携带源操作码 65535 见证**、翻译不抛 |
| V01 表单键盘 | candidate-green 3 | 三张截图可保留；六类表单完整键盘/焦点矩阵**未证**（如实未证，不重拍） |
| V02 工作区分隔条 | candidate-green + existing-proof | 720px 截图 + 旧 PanelResizeHandle 三组引用；非空三工作区/实际分隔条**未证** |
| V03 错误恢复 | candidate-green 1 | 无效 objectId 回退窄事实；读取失败→重试/A-B 乱序**未证** |
| V04 媒体/引用 | 1 candidate-green + 1 blocked-environment | 见下 |

## V04 口径（与 Codex 裁定一致）

- V04-01（candidate-green，browser）：脏会话整页深链被 `beforeunload` **预期中止**——保存保护正常工作，
  非产品缺陷（Codex 独立复核证实，reproduced-defect 归因已撤回）；截图 hash 完整登记。
- V04-02（blocked-environment）：候选 worktree 缺合法精灵二进制（catalog 登记 4031、实读 917=Vite 回退页），
  资源守卫正确拒绝；媒体 fit/1:1/替换与引用刷新矩阵未执行。

## 机械对账（verify.mjs v2 全硬判据）

- 账本 **40 条** = candidate-green **38** / existing-proof **1** / blocked-environment **1**；
  分包：startup 1 / G01 6 / G02 3 / G03 3 / G04 4 / G05 4 / G06 5 / G07 3 / G08 3 / V01 3 / V02 2 / V03 1 / V04 2。
- 执行 JSON **32/32 全绿**（success=true，passed=total）；candidate-green 全部 fullName 与执行 JSON
  **一对一双向映射**（无缺、无重、无未登记执行项）。
- 白名单双栏硬判据：`git diff <mergeBase(origin/main)>..HEAD -- packages/ scripts/` 必须为空（活树冻结）；
  本分支非 merge 提交触碰 docs/ 之外且**当前树仍存在**的路径 = 硬失败（历史已删除的早轮误提交 exec JSON 单列 `historicalStrays` 报告）。
- commands 台账每条带整数 exit；候选执行/业务负控/类型门三条关键命令必须登记。
- 负向自测（本轮验证）：缺 JSON exit1；篡改非全绿 JSON → FAIL；零执行 JSON → 32 条失败全部报出。

## 未证项

1. G01 平移 view 增量断言 pending-contract（view 状态 jsdom 无公开可观测面）；选区轴已改选区业务状态+删除实变见证。
2. V01 六类表单完整键盘/焦点矩阵、V02 非空三工作区与实际分隔条操作、V03 读取失败三态与 A-B 乱序、V04 媒体矩阵 —— **如实未证**。
3. 多个案例隔离单点反控 pending（positiveControl 字段登记）；启动小样负控 detected 有效。

## 复算命令

```bash
cd /Users/zhangxu/illegal/type-pal-glm-regression-lab
node docs/testing/glm-architecture-regression-lab/tools/verify.mjs \
  docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json   # 机械对账（v2 硬判据）
npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/candidates.vitest.mts \
  --reporter=json --outputFile=docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json  # 候选 32/32
node docs/testing/glm-architecture-regression-lab/tools/red-control.mjs       # 负控 verdict=detected（临时目录在 /tmp）
pnpm exec tsc --project docs/testing/glm-architecture-regression-lab/configs/tsconfig.json --noEmit  # 类型门 exit0（TS5101 已消除）
npx biome check docs/testing/glm-architecture-regression-lab                  # 目录 Biome exit0
pnpm run check:docs                                                           # 文档门 PASS
```
