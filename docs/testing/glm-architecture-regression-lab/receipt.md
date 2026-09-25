# ARCH-REGRESSION-LAB-GLM-1 · 简短回执（GLM 十二组，r10 剩余项批次）

> r9 前历史见 Git；本回执以 r10 批次为准。r10 批次在**新建独立检出**（origin/main f5f166aa →
> 分支 codex/glm-architecture-regression-lab-r2，worktree /Users/zhangxu/illegal/type-pal-glm-lab-r2）上交付，
> 不含旧 GLM 分支历史。宿主环境：VITE_PROJECT_ID=pal dev server（独立 6013 干净宿主 / 6014 反控宿主），
> 在含 gitignored 生成资源的主线检出运行（两检出 packages/ 冻结零 diff）；viewport 1440×900 CSS / DPR 1 / 画布缩放 38%。

任务卡：[ARCH-REGRESSION-LAB-GLM-1](../../ops/tasks/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)（draft）。
worktree `/Users/zhangxu/illegal/type-pal-glm-regression-lab`，分支 `codex/glm-architecture-regression-lab-r1`，
起点 `a3ceaf05`；产品冻结以最近授权主线合入点（`git merge-base origin/main HEAD`）为基准，
packages/scripts 活树零 diff。账本：[results.json](results.json)（45 条，与执行 JSON 一对一双射）；
机械对账器：[tools/verify.mjs](tools/verify.mjs)（v2 全硬判据）。

本轮（r9）回应八轮 counter（范围收窄至 G05-02 与 G08-05/06）：
- **G05-02** 换为可判别的挂起见证——play 后**全量冲刷宏任务边界（零 tick）**断言 facing=up 且 mode=running
  （宿主 wait 立即完成时流会直冲尾命令 done/right 即红），配 g05-immediate-wait 反控针实测红「expected 'right' to be 'up'」；
- **G08-06** 换为真实可达图结果——-2 表提供地址空间，全局根独占地址，断言 ownership
  global 0→1 / unreachable 3→2（不再断言 `globalRoots.length` 回显），配 g08-ignore-roots 反控针实测红「expected 1 to be 2」；
- **G08-05** 如实收窄为**预检层**（非法 options 预检拒绝后可重试），标题/机账/回执同步，不再涉称转换中段异常。

## 十二组状态摘要

| 组 | 状态 | 案例（本轮实质变更加粗） |
|---|---|---|
| 启动小样 | candidate-green 1 + 负控针 detected | LAB-STARTUP-01；red-control v2 五针全部 detected（详见负控节） |
| G01 手势终结 | candidate-green 6 + **G01-07 浏览器实证** | **平移取消轴转实证**：6013 干净宿主上正控（完整拖拽平移，像素 47b91a24→19ffdaad）/ 取消（同输入形状 pointercancel → 迟到真实鼠标移动，视图冻结 7fb3de57==7fb3de57）；6014 反控宿主（tools/g01-pan-cancel-needle.mjs 内存单点：cancel 不清 panRef）→ 同输入取消后视图漂移 ce853fe7→fa7b3405。画布截图 /tmp/type-pal-glm-lab-r2/g01-clean-map-canvas.jpg sha256 a2d51f7d…e1d8 |
| G02 会话失效 | **accept（Codex r7 当前三项候选合同）** | 3 项：深拷贝会话选区删除、新旧地图隔离 |
| G03 App 生命周期 | candidate-green 3 | **G03-03 钉保存事务终态**：`.type-pal/save-state.json` 真实写闭且落盘 `phase=committed`（终态机 staging/ready/applying/data-complete→committed，author-save-journal.ts:497/602），不再以静默窗口近似完成；卸载后零写盘 + 派发 fail-loud |
| G04 脚本草稿 | **accept（Codex r7 当前四项候选合同）** | 4 项：旧草稿丢弃+新草稿写回新对象 |
| G05 播放生命周期 | candidate-green 4 | **G05-02 旧 wait 挂起见证**（零 tick 冲刷宏任务后 facing=up 且 mode=running，随后 tick(100)）+ 固定推进 1200ms **越过旧源剩余窗口（300ms）**后终值仍 left/done；**G05-04 同实例 stop 调用增量**（卸载前记录、卸载后 >0），配套两针反控 |
| G06 跨校验器递归 | candidate-green 7 | **补 choreography 入口**（G06-06 正控 + G06-07 错误 path/深等），现覆盖 hooks/onDefeated/choreography 三入口；**收窄声明：七入口完整矩阵未证**，不再宣称全组闭环 |
| G07 一阶段边界 | candidate-green 4 | **补 G07-04 装备脚本经 event 表执行**：setGlobalEvents 全局命令表 L_90001 → updateAllEquipments → runEquipScriptSync 0x17 写效果层 → getter base+7；至此「装备脚本→event 表→真值层→0x30 战斗消费」主链各环有证 |
| G08 迁移隔离 | candidate-green 6 | **G08-07 转换中段真异常补实**：raw 0x65 引用无布局证据精灵号 → translate-events.ts:1624 → resolveSpriteIdForNum 中段抛「sprite 42 缺布局证据」，补证据后同脚本成功（模块态无残留）——与 G08-05 预检层相区分。**options 维度收窄**：globalScriptAliases（migrate-content.ts:2572-2576 要求可推导稳定 id，合成输入需生产 shard 配置）、palSemanticProfile/palReferenceSchema（translate-events.test + *.pal.test 真实 PAL 矩阵）、sceneSemanticSpriteIds（pal-migration.ts:497-500）登记 pending/既有引用，不合成冒充 |
| V01 表单键盘 | 3 旧证 + **1 blocked-automation（新增 V01-04）** | 角色 DsDraftTextInput：自动化 fill+Enter/blur 停留草稿态（撤销键 disabled），提交根因未定位 —— 登记自动化阻断，不断言产品缺陷；其余五类表单矩阵本轮未执行 |
| V02 工作区分隔条 | candidate-green + existing-proof | 非空三工作区/实际分隔条**未证** |
| V03 错误恢复 | candidate-green 1 | 读取失败→重试/A-B 乱序**未证** |
| V04 媒体/引用 | 1 candidate-green + 1 blocked-environment | beforeunload 预期中止 + 环境阻断分类维持；媒体矩阵**未证** |

## G01 浏览器反控（tools/g01-pan-cancel-needle.mjs）

- 宿主：LAB_REPO_ROOT=<完整检出> VITE_PROJECT_ID=pal node …/g01-pan-cancel-needle.mjs 6014 1200
- 内存单点：MapMode.cancelPointerInteraction 删除 `panRef.current = null`（load 插件，产品源零写盘；
  页面见证 `__G01_NEEDLE_LIVE__=true`，服务端日志 LAB_G01_NEEDLE_APPLIED）
- 结果：同输入取消 + 真实 CDP 迟到鼠标移动 → 干净宿主冻结 / 反控宿主漂移 —— 可证伪成立

## 负控 v2（tools/red-control.mjs，五针全 detected）

| 针 | 单点破坏 | 红例 |
|---|---|---|
| lab-startup | UpdateProjectMapLayerCommand.apply 早退（commands.ts） | 启动小样业务实变断言红（executed 1 / failed 1 / AssertionError） |
| g05-unmount-cleanup | 删 SceneScriptWorkspace 卸载 cleanup `return () => playback.stop()` | G05-04 同实例 stop 增量断言红：「expected 2 to be greater than 2」 |
| g03-committed | author-save-journal 最终 `publishState(receipt, 'committed')` 降为 `'data-complete'` | G03-03 终态断言红：「expected 'data-complete' to be 'committed'」 |
| g05-immediate-wait | Playback 宿主 wait 的 `timers.push` 改立即 `resolve()` | G05-02 挂起判别断言红：「expected 'right' to be 'up'」——旧等待从未真正挂起即暴露 |
| g08-ignore-roots | 图根从 `[...graphRoots, ...globalRoots]` 改为 `[...graphRoots]` | G08-06 可达图断言红：「expected 1 to be 2」（ownership 退回无根形态 global=0/unreachable=3） |

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
3. G08 options 其余差异维度未证；G08-05 为**预检层**拒绝（非法 options），转换中段异常隔离未证；globalRoots 现证可达图 owner/可达性结果（配反控针）。
4. V01 六类表单完整键盘/焦点矩阵、V02 非空工作区与实际分隔条操作、V03 读取失败三态与 A-B 乱序、V04 媒体矩阵 —— **未证**。
5. 部分案例隔离单点反控 pending（positiveControl 字段登记）；五针负控 detected 有效。

## 复算命令

```bash
cd /Users/zhangxu/illegal/type-pal
node docs/testing/glm-architecture-regression-lab/tools/verify.mjs \
  docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json   # 机械对账（v2 硬判据）
npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/candidates.vitest.mts \
  --reporter=json --outputFile=docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json  # 候选 37/37（JSON 提交前 biome format）
node docs/testing/glm-architecture-regression-lab/tools/red-control.mjs       # 负控 v2 五针 verdict=detected
pnpm exec tsc --project docs/testing/glm-architecture-regression-lab/configs/tsconfig.json --noEmit  # 类型门 exit0
npx biome check docs/testing/glm-architecture-regression-lab                  # 目录 Biome exit0（含提交的 exec JSON）
pnpm run check:docs                                                           # 文档门 PASS
```
