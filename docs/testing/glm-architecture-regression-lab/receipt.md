# ARCH-REGRESSION-LAB-GLM-1 · 简短回执（GLM 十二组，r1）

任务卡：[ARCH-REGRESSION-LAB-GLM-1](../../ops/tasks/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)（draft）。
worktree `/Users/zhangxu/illegal/type-pal-glm-regression-lab`，分支 `codex/glm-architecture-regression-lab-r1`，
起点 `a3ceaf05`（对冻结 86e928b5 的 packages/scripts 零 diff）。账本：[results.json](results.json)；
机械对账器：[tools/verify.mjs](tools/verify.mjs)。

## 十二组状态摘要

| 组 | 状态 | 案例 |
|---|---|---|
| 启动小样 | 绿正控 1/1 + 负控 detected | lab-startup.test 1 项；tools/red-control.mjs（apply 单点，exit1/1执行/AssertionError/见证/hash不变） |
| G01 手势终结 | candidate-green | 6 项：正控 + pointercancel/lostcapture/blur 三通道零提交 + 选区通知计数 + 平移存活 |
| G02 会话失效 | candidate-green | 3 项：同 mapId 换会话/跨 mapId 清场/选区拖动换会话，迟到 up 双向零提交 |
| G03 App 生命周期 | candidate-green | 3 项：挂载接线+派发上屏、卸载后旧会话派发 fail-loud（历史绑定断开）、Cmd+S 收口 |
| G04 脚本草稿 | candidate-green | 3 项：外部 body 替换跟随、确认 ≤1 笔、Esc 取消零命令 |
| G05 播放生命周期 | candidate-green | 4 项：stop 幂等+view 冻结、换源丢弃旧源、onUi 解绑零通知 |
| G06 跨校验器递归 | candidate-green | 5 项：双向递归正控、七臂/嵌套叶、错误 path、输入深保真 |
| G07 一阶段边界 | candidate-green | 3 项：scene→event mapNum、双 GameState 隔离+id0 拒收、装备派生入 battle getter |
| G08 迁移隔离 | candidate-green | 4 项：重复调用幂等+输入保真、sound 回调不越权、globalRoots 计数 1/0、异常不污染 |
| V01 表单键盘 | candidate-green | 3 项：1440 初始态、名称双 Enter 值稳定、Esc+undo 恢复（截图实际看图） |
| V02 工作区分隔条 | candidate-green + existing-proof | 720px 收缩截图 1 项；分隔条键盘/指针终结引用 PanelResizeHandle-interaction 三组（已读断言，本轮未执行） |
| V03 错误恢复 | candidate-green | 无效 objectId 深链归一化回退无崩溃（截图） |
| V04 媒体/引用 | **1 reproduced-defect + 1 blocked-environment** | 见下 |

## V04 reproduced-defect（交 Codex 裁定）

`?module=asset&page=sprite` 深链（含 `domain=battle&view=asset` 变体与模块级 `?module=asset`）在会话存在
未保存改动时被覆写回 `?module=actor&page=workspace`，三次变体 + reload 复现；scene/map/story/simulator
深链对照正常。可能机制：未保存改动守卫（App.tsx:647 起）与持久化导航（App.tsx:502-514/529-560）的
覆盖次序；**未做源码归因定级**，保留失败操作链与截图（v04-01），交 Codex。精灵库媒体矩阵因无法进入
该页记 blocked-environment（V04-02），不把未证当缺陷。

## 机械对账

- 候选案例 **40** = candidate-green **38** / existing-proof **1** /  / blocked-environment **1**。
- 分包：G01 6 / G02 3 / G03 3 / G04 3 / G05 4 / G06 5 / G07 3 / G08 4 / V01 3 / V02 2 / V03 1 / V04 2。
- 有效负控 1（启动小样单点破坏 runner）；隔离单点反控按组以 positiveControl 字段登记。
- 候选/诊断均不进官方测试集与覆盖率；不跑全仓 check/ratchet/strict-fast/迁移写盘/剧情 E2E。

## 未证项与环境失败

1. G01 平移 view 增量断言 pending-contract（view 无 jsdom 公开观测面）。
2. V02 分隔条拖拽/键盘本轮未执行（引用既有三组测试为已读断言）。
3. V04 精灵库页受 V04-01 阻断，媒体矩阵未走查。
4. 多个 G04/G05/G06 案例单点反控 pending（positiveControl 字段已登记）。

## 复算命令

```bash
cd /Users/zhangxu/illegal/type-pal-glm-regression-lab
git diff 86e928b5..a3ceaf05 --stat -- packages/ scripts/   # 空（冻结核验）
node docs/testing/glm-architecture-regression-lab/tools/verify.mjs a3ceaf05   # 白名单/账本/截图机械对账
npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/candidates.vitest.mts  # 候选绿套件
node docs/testing/glm-architecture-regression-lab/tools/red-control.mjs  # 负控 verdict=detected
pnpm run check:docs   # PASS
npx biome check docs/testing/glm-architecture-regression-lab/results.json  # exit0
```
