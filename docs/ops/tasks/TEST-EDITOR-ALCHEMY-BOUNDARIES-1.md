# TEST-EDITOR-ALCHEMY-BOUNDARIES-1 — 炼蛊与灵葫机制编辑边界

Status: build
Owner: GLM（新对话B，唯一测试写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / item alchemy boundaries
Visual Verification Timing: N/A（代码/DOM合同，不改布局，不宣称截图/像素或剧情E2E验收）

## 目标和路由

炼蛊与灵葫机制编辑边界。仅本卡B1–B10，每轴有直接证据和裁决即停止；不滚动扩围，不设例数、针数或覆盖率目标。

- 工作树 `/private/tmp/type-pal-editor-alchemy-boundaries.v3szHH/type-pal`；分支 `codex/glm-editor-alchemy-boundaries-r1`。本卡派发文档提交建树，产品冻结 `797a46a097640206a12b8f61dc014c8db277e457`。
- 推荐执行模型GLM-5.3，用户手工选择；贡献者不得自行切换套餐/权限。无需视觉模型。
- 先读[共同交付协议](../evidence/TEST-CONTRACT-BATCH-20261008/README.md)和[冻结及白名单](../evidence/TEST-CONTRACT-BATCH-20261008/targets.json)、[第二阶段纪律](../../phase2/READ-FIRST.md)、[测试质量验收](../agent-workflow.md)。

## 前提与源码锚点

产品/schema/UX不改变，原版机制前提门N/A；本卡只检查当前实现的公开合同。编码前核源码条件与旧实际断言；最强替代解释是旧测已证、前置guard抢先拒绝或caller无法合法产生输入。任一成立则登记而不造新测试。

- ItemAlchemyTab.tsx:86–160 owner/深链/referenceReady/commit错误；:210–325草稿提示、配方追加、奖励上限；:350–423 inspector状态与公开跳转。DataMode.tsx:302–333是真mechanism caller。
- ItemAlchemyEditors.tsx:20–101公开表单的当前缺引用选项/数量提交；CraftRecipeList与ResourceRewardTierList通过当前scope/revision写回，不允许直接调用私有helper。
- item-alchemy.ts:20–126 find/mutate/clone/resize是核心，只读；已有core.test/boundaries已证surface不存在、重复effect、mutator抛错、同值no-dispatch及resize独立副本，不复制。
- ItemAlchemyTab.test.tsx:117引用current；:434追加/删除单命令；:534重排no-op/undo；:645复合配方；:669非owner深链；:688零/多owner及重复effect；:731缺奖励引用。ItemAlchemyTab.glm-data-authoring与glm-m已证扩缩档、自动owner回报、提示清空。以上existing-proof。
- 本卡不涉及运行时炼蛊公式、原版优先级或UI形态取舍；只检查当前作者编辑提交。

## 有限工作清单

| 轴 | 合同域 | 必须完成的裁决 |
|---|---|---|
| B1 | 排重与可表达边界 | 逐条核旧实际断言；零/多owner、复合配方、单命令undo只登记。typed合法数据和损坏内容域分开，不能伪造effect kind/resource。 |
| B2 | 深链目标删除 | canonical owner仍在但focusObjectId指向真实已删除对象，明确deleted空态、无错误自动跳owner/生成第二owner；与已有非owner深链合同不同。 |
| B3 | 引用状态降级 | current但没有referenceIndex必须failed；checking/stale/failed的可观察状态与引用计数分列，真实ProjectReferenceIndex，不能强转假接口。 |
| B4 | 材料/产物缺引用 | 同一ID在多个材料/产物位置重复缺席，Inspector缺失集合去重但原配方不被自动修复；区别已测奖励单缺引用，不枚举数字。 |
| B5 | 最新会话权威及错误传播 | 合法公开EditSession命令使owner/目标effect在草稿commit前变化，commit依据最新state拒绝；UI精确alert+onStatusNotice，不吞错或误dispatch。若实际caller不能合法形成此窗口则举证停止该轴。 |
| B6 | 材料不足提示草稿 | crafting专属unavailable文本trim/空白省略与history边界；不能用spirit-gourd旧合同直接声称不同caller已证，也不复制整套字段矩阵。 |
| B7 | 消耗者唯一材料限制 | 只有consuming owner且无其它item时追加禁用，物品数组公开变化后恢复合法追加；两层门的独立业务路径，不点禁用按钮冒充执行。 |
| B8 | 灵葫上限边界 | 合法999档上限阻止追加且history不变，合法降回可追加；用实际数据，不扩大timeout，不创建999独立用例。已证一般maxRoll扩缩登记。 |
| B9 | 引用/对象重渲染 | 公开更换mechanism owner或surface后draftKey/syncToken不串旧提示/数量；只补未证生命周期，不添加私有state钩子。 |
| B10 | 承载跳转及拒绝收尾 | 正确owner/openItem身份的成功已证；补合法失效路径的零写与错误恢复，解除root/spies/globals。无法合法到达的最后catch-all只登记，不伪造输入。 |

## 独占白名单

仅可新增：
- `packages/editor/src/ui/ItemAlchemyTab.boundary-contracts.test.tsx`。
- `packages/editor/src/ui/ItemAlchemyEditors.boundary-contracts.test.tsx`。
- `packages/editor/src/ui/__tests__/item-alchemy-boundaries/`。
- `docs/ops/evidence/TEST-EDITOR-ALCHEMY-BOUNDARIES-1/`：README、逐合同ledger、fresh JSON/raw、反控runner/原件/receipt；以共同协议命名。
- 本卡“GLM贡献者回执”小节（只写自己的记录，不改顶部Status和Codex准入）。

全部产品、所有旧测试、共享fixture、配置/依赖/官方基准、真实数据、共享导航/看板/协议/targets及其它卡只读。白名单目标已有或其它Owner占用，停止该文件并通知Codex，不覆盖。可写新测不是保证每文件必须产生新用例；真实无缺口不建空文件。

## 冻结源

| 产品/调用源 | SHA256 |
|---|---|
| packages/editor/src/ui/ItemAlchemyTab.tsx | 059a2ff7827ea6a9541686001924d3fe1af282926a8d8c97567e82f1ae34fa22 |
| packages/editor/src/ui/ItemAlchemyEditors.tsx | c9fbfeab816f463c3adce633b4a26a06351de5b1e80a3dbcfd1bd0dcda92ee31 |
| packages/editor/src/core/item-alchemy.ts | 4ee30c2305583bd902a1b026acfde6e53a527615e361b43a30fb446e487c5470 |
| packages/editor/src/ui/DataMode.tsx | 5774d2289fb54828bad4d2397ba908455a3c78741bab822468b541010586e57f |

冻结变化只停受影响轴举证；不改产品、不rebase漂移、不用新接口或fallback解锁死分支。

## 验证与停止条件

定向（仅给已创建文件；零新增文件不强行跑不存在的名字）：

```bash
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run src/ui/ItemAlchemyTab.boundary-contracts.test.tsx src/ui/ItemAlchemyEditors.boundary-contracts.test.tsx src/ui/ItemAlchemyTab.test.tsx src/ui/ItemAlchemyTab.glm-data-authoring.test.tsx src/ui/ItemAlchemyTab.glm-m.test.tsx src/core/item-alchemy.test.ts src/core/item-alchemy.boundaries.test.ts
```

新增UI定向需零act/console.error/未处理异常；相邻旧日志如有原始诊断分列。每批定向+typecheck，最终一次本包test/typecheck、根lint完整0/0/0、docs/diff；不每针重复全仓门。贡献者不跑官方ratchet，覆盖只由Codex最终main并集结算。

反控/隔离/排重、执行身份多重集合与证据原件按共同协议；不用标题Set冒充运行次数。若白名单共享导航缺登记导致docs问题，只交精确诊断由Codex维护，不越界。

## 当前模式推进记录

- 2026-10-08 Codex：当前源、公开caller、代表旧断言及残余条件已直接读取；上述最强替代解释与停止线成立。build allowed仅新测试白名单。
- Coding Owner：GLM新对话B；三卡新测试/fixture/证据互斥，避开活动Game turn、E2E及质量治理产品Owner。
- 贡献者交付：pending；Codex独立验收：pending；done准入：blocked。
- 有限清单闭合后交付review即停，Codex自行接受/返工、必要串行check→官方ratchet→受保护fast、合并推送与退休树清理。

## GLM贡献者回执

待交付。不以自验替代Codex验收。

## 下一位Agent提示词

```text
你是 TEST-EDITOR-ALCHEMY-BOUNDARIES-1 的唯一Coding Owner，GLM新对话B。只在 /private/tmp/type-pal-editor-alchemy-boundaries.v3szHH/type-pal、分支 codex/glm-editor-alchemy-boundaries-r1 工作，禁止写main。先读AGENTS.md、docs/phase2/READ-FIRST.md、docs/ops/tasks/TEST-EDITOR-ALCHEMY-BOUNDARIES-1.md及docs/ops/evidence/TEST-CONTRACT-BATCH-20261008/README.md和targets.json；冻结 797a46a097640206a12b8f61dc014c8db277e457 不rebase，按卡面B1–B10有限清单核当前源码/caller/合法typed输入/旧fullName与实际断言/oracle，已有合同只登记，优先deleted深链、referenceIndex缺席、缺材料/产物引用及stale会话提交；一般增删改/undo已证，不包装重复。 仅原卡精确新测试/专属fixture/证据可写，产品/所有旧测/配置/官方baseline/共享文档/真实数据只读。禁止强转、私有state、核心mock、skip/ignore/扩timeout；只控外部IO，DOM/React act及全局清理真实闭环。每条新增合同原子且有最小有效反控，保留同进程native JSON/raw、执行身份多重集合、exit/signal/spawn、恰一业务AssertionError、真正恢复绿、最终源/测试/mutant/restored hash及mkdtemp清理。逐轴existing-proof/new-contract/unreachable/blocked/product-counter裁决，全部有锚即停，不追例数/针数/覆盖率。跑定向相邻与本包全包/typecheck、lint完整0/0/0、docs/diff；基点红如实对照，不越界修。共享导航缺口由Codex集成登记，不为docs过门改白名单外。完整真实testCandidate/receiptHead和docs-only区间提交推送，只维护自己的贡献者回执，不改Status、不合main、不done，待Codex独立验收。
```
