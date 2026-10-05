# TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — main orchestration family ledger

排重口径：fullName×公开 caller×合法输入×业务 oracle。基线 = `origin/main` `cb12a63e2`。
审计域：`packages/reforge/src/main.ts` 公开宿主编排（场景进入/离开、script continuation/abort、
save/readback、world mutation、battle trial 公开回执、stale async 与 cleanup），四个相邻模块
（runtime-frame-session / runtime-input-router / scene-entry-session / world-async-commit 流）
只在 main 的真实组合流缺口处纳入。

## 一、新交付合同（5，`main.host-boundaries-1.test.ts`）

| 合同 | source:line | 公开 caller | 合法输入 | 业务 oracle |
|---|---|---|---|---|
| MHB-ENTRY-REVEAL-1 | `main.ts:2105-2191`（loadScene entry 分支）+ `main.ts:1412-1442`（hostSceneEntryReveal） | 场景 a onEnter 的 `loadScene` 作者命令 → prepareAndCommitSceneSwitch → pendingOnEnter → `s:b` runSceneEntry | 合法场景对 a→b，b 的 onEnter 段声明 `entry: { prepare: [], reveal: { kind: 'fade', outMs: 260, inMs: 260 } }` | 入场事务持有旧帧 fade-out 至全黑（renderDebug.fadeBlack 峰值 ≥0.999）、提交后由 b 的 onEnter runner 显式 fade-in 收口（终态 fade=0）、正文 giveMoney+9 在揭幕后入账（50→59）、runner 槽释放 |
| MHB-SCRIPT-ERR-1 | `main.ts:4501-4536`（startScript catch/finally） | 实体 interact 触发（空格/回车 → routeRuntimeInput → fireTrigger → startScript） | 合法触发器行为 `loadScene b`，b 的地图外部读取（fixture read 钩子）抛错 | 公开 `脚本错误: Error: content/maps/b.json …` 回执（40 字符截断）、runner 槽同步释放（script.running=false）、世界/场景/幕布保持原状（world 深比较、sceneId=a、fade=0）、修复外部源后同一公开入口重试成功（sceneId=b） |
| MHB-TRIAL-DONE-1 | `main.ts:5842-5890`（`?battle=` 试打开场分支） | bootGame URL 参数 `?battle=encounter` → scriptRuntime.host.startBattle | 合法敌队 encounter（foe cash 7）；场景 a onEnter 含 giveMoney+5 作重放探针 | 跳过入口 onEnter（战前 money=50 非 55）、真实战斗经公开宿主启动并打完（inBattle true→false）、终局公开回执 `试打结束:victory`、真实结算入账恰一次（money=57） |
| MHB-TRIAL-ERROR-1 | `main.ts:5887-5889`（试打失败回执臂） | 同上，`?battle=missing-team` | 非法敌队 id（启动前置校验允许的公开入口输入） | 公开回执 `试打失败: … 敌队没有有效敌人`（48 字符截断内含定位）、零战斗会话（inBattle=false）、宿主保持可操作（Escape 开菜单）、世界不变 |
| MHB-SAVE-FAIL-1 | `main.ts:4850-4901`（doSave 失败臂 + 写队列） | F5（routeRuntimeInput → quickSave → doSave('quick', captureThumbnail)） | 缩略图外部 canvas IO 失败形状（toBlob null 回调；jsdom 无实现，同一边界的合法结果） | 公开 `存档失败` 回执、失败不消费 wSavedTimes（槽未写：payload null）、写队列不毒化（修复 IO 后重试成功且 savedTimes=1 而非 2） |

反控（counterproof.json）：每针绿→指定业务红→恢复绿；红相位全量执行集恰 1 failed 且 fullName
精确等于目标合同、唯一 AssertionError、零 pending/todo/collection-error；恢复与 final-replay 的
identity 集合 sha256 与 baseline 一致；四态源 hash + argv/env + mkdtemp finally 全记。

## 二、existing-proof（不重复堆叠）

| 轴 | 既有证明（fullName/文件） |
|---|---|
| host 初始化/重入、标题读档、启动视频/取消窗口、战败读档/无档重开、场景 BGM 三态、switchScene 世界失效门 | `main.host-lifecycle-1.test.ts`（29 合同，归档 HOST-LIFECYCLE） |
| boot 管线/标题选择/资源失败 | `main.boot-flows.test.ts`（H1） |
| 调试切场景成功/IO 失败重试/迟到响应（`切场景失败:` 回执） | `main.scene-flows.test.ts`（H6）——与本卡 MHB-SCRIPT-ERR-1 的 caller（debug 键 vs 作者触发脚本）、回执文案、清理 owner 均不同轴 |
| F5/F9 快存快读、空槽/损坏快照、单调计数（成功臂 1→2）、迟到 IDB 读 | `main.save-flows.test.ts`（H5）——失败不消费计数+队列不毒化为本卡新轴 |
| 菜单写槽/拒读/成功关菜单 | `main.menu-storage-flows.test.ts` |
| auto 槽写入、F9 取消、手动菜单持有 chase terminal | `main.auto-save-flows.test.ts` |
| battle host startBattle 脚本链/defeat/onLose/缺敌队拒绝（`__reforge.startBattle` dev 口） | `main.battle-host-flows.test.ts`（H9）——与本卡 TRIAL 族 caller（boot 参数分支 vs dev 观察口）与回执面不同轴 |
| H9-6 延迟战斗精灵不得跨场景提交 | 同上 |
| loadScene 提交 + fade 权威（普通无 entry 路径） | `main.frame-animation-owner.test.ts`（scene commit 清 cinematic + fade） |
| 对话阻塞菜单/多页对话 | `main.dialog-flows.test.ts`（H4） |
| give/pos/facing boot 参数、party 覆写 | `main.effect-flows.residual.test.ts`、`main.glm-n.test.ts` |
| runtime-frame-session 帧拍/暂停/单步/等待/清除 | `runtime-frame-session.test.ts` + `.runtime-session-1.test.ts`（归档 RUNTIME-SESSION） |
| runtime-input-router 忙锁/层序/探索分支 | `runtime-input-router.test.ts` + `.runtime-session-1.test.ts`（module 级饱和） |
| scene-entry-session begin/reveal/complete/cancel | `scene-entry-session.test.ts` + `.boundaries.test.ts` + motion-transition 卡 6 轴 existing-proof（module 级饱和） |
| world-async-commit（mapOverride 提交点/预检依赖/选择叶取消） | `world-async-commit.test.ts`（归档 WORLD-ASYNC-COMMIT-1） |
| abortScript 兑现在途走位、迟到 abort 不二次结算 | `world-motion-runtime.motion-transition-1.test.ts`（MT-PARTY-RESOLVE-RELEASE-1） |
| confirm/startBattle/teleportOut 续跑控制帧、setCheckpointReady、帧深熔断 | `script-runner-core.host-lifecycle-1.test.ts` |
| battle 终局/敌逃/战果会计 | battle-flow + battle-core-session 归档卡（BF-01..12、BCS-1..6） |

## 三、blocked / unreachable / 产品缺陷登记

| 项 | 状态 | 证据锚点 |
|---|---|---|
| **D-1 `?battle-scene=` 遭遇演出接线死路（产品缺陷，交 Codex/用户裁决）** | blocked（不修产品） | 试打 walk（`main.ts:5862` `getSceneDef(choreoScene)`）消费 `runtimeSceneView`→`baseSceneView`（`runtime-project-view.ts:163-173` 删 hooks 重建）投影，而 `projectRuntimeHookBinding`（`runtime-project-view.ts:97-111`）把 onEnter 段 `body` 无条件投影为 `[]`，实体页 trigger/auto 同样 `emptyProjectedStages()`（`:113-137`）——递归 walk（`main.ts:5864-5874`）在投影 def 上永远找不到任何 `startBattle` 命令，`?battle-scene=` 的 choreography 永远为 undefined。实证：本卡调试靴 `?battle=encounter&battle-scene=b`（b 的 onEnter 含匹配敌队的 startBattle+choreography，装载器校验通过）战斗正常开打但遭遇台词零呈现、battleLog 空。修法应在产品侧（如 walk 改读 `getCanonicalScene`）；测试卡白名单不含 main.ts，不越界修。 |
| refreshSaveMetas 失败降级臂（存档成功但浏览缓存刷新失败不反报） | unreachable（公开输入无法合法触发 listMeta 在 putSlot 成功后失败） | `main.ts:4885-4897` |
| quickLoad 顶层 `.catch`（`快速读档失败` toast） | unreachable（doLoad 已捕获全部非 abort 存储错误并自回报） | `main.ts:5066-5071` vs `5018-5033` |
| entry reveal 的 dither 入场呈现（零帧备份/diff 旁证） | 视觉轴，按 AGENTS.md 分层走 E2E 集中验证登记 | `main.ts:1419-1427`、dither-transition 单测族 |

## 四、结论

卡面审计域内，scene enter/leave、script continuation/abort、save/readback、world mutation、
battle trial 公开 done/error、stale async/cleanup 逐轴排重后仅上述 5 条真实未证合同；
world mutation 所有权与 stale async 主轴均 existing-proof（第二节）；1 条产品缺陷（D-1）按
「测试卡不修产品」登记待裁决。无覆盖率/例数门槛，不为过门堆叠弱断言。
