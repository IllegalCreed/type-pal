# TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 — 当前工程加载与跨表引用边界

Status: build
Owner: GLM（新对话C，唯一测试写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / project loading boundaries
Visual Verification Timing: N/A（代码/DOM合同，不改布局，不宣称截图/像素或剧情E2E验收）

## 目标和路由

当前工程加载与跨表引用边界。仅本卡C1–C10，每轴有直接证据和裁决即停止；不滚动扩围，不设例数、针数或覆盖率目标。

- 工作树 `/private/tmp/type-pal-reforge-project-loading.4BGFoB/type-pal`；分支 `codex/glm-reforge-project-loading-r1`。本卡派发文档提交建树，产品冻结 `797a46a097640206a12b8f61dc014c8db277e457`。
- 推荐执行模型GLM-5.3，用户手工选择；贡献者不得自行切换套餐/权限。无需视觉模型。
- 先读[共同交付协议](../evidence/TEST-CONTRACT-BATCH-20261008/README.md)和[冻结及白名单](../evidence/TEST-CONTRACT-BATCH-20261008/targets.json)、[第二阶段纪律](../../phase2/READ-FIRST.md)、[测试质量验收](../agent-workflow.md)。

## 前提与源码锚点

产品/schema/UX不改变，原版机制前提门N/A；本卡只检查当前实现的公开合同。编码前核源码条件与旧实际断言；最强替代解释是旧测已证、前置guard抢先拒绝或caller无法合法产生输入。任一成立则登记而不造新测试。

- project-loader.ts:154–170 validateAuthorScene；:173–319 assembleCurrentProject；:325–445公开FileSource内容加载；:464–532惰性scene/map入口。file-source.ts是真实unknown/JSON读取边界；author-io.ts:23–30为编辑器headless公开调用域，main.ts:347为runtime scene caller。
- project-loader.test.ts:176–212 interrupted/generation change已证；:214–262 author identity及initialMagic缺技能已证；:272–300indexed path；:305–382非默认入口和读取失败已证；这些只登记。
- project-loader.current-boundaries.test.ts已证author/runtime形态、输入不变、顺序、整批失败与stamp加载；image-cache-binding已证catalog字节绑定。runnable-project-loader.glm-q.test.ts已证版本门，不复刻。
- validateActorConditionCommandReferences、validateEquipBattleSpriteReferences及其content旧测只读排重：validator局部红不等于loader接线已证，loader红也必须确认真正到目标校验而非更早形状门。
- CurrentManifest由上游validateCurrentManifestStartup限制；typed无法表示的旧version/content.scripts/missing必须路径不伪装成正常工程。冗余后置guard、缺owner find臂或不可达默认entry仅登记caller证据，不建坏产品输入。

## 有限工作清单

| 轴 | 合同域 | 必须完成的裁决 |
|---|---|---|
| C1 | 公开入口层划分 | assembleCurrentProject纯组装与loadCurrentProjectFrom真实IO分开；before/fullName/断言行和schema合法域账。版本与读取锁旧合同只登记。 |
| C2 | 场景map引用接线 | 通过合法author scene与合法map index，仅scene.mapId悬空，公开loader/惰性scene精确路径拒绝；坏grid/schema不是同合同。 |
| C3 | actor条件引用接线 | 合法apply/clear条件在入口场景引用缺actor或缺poison的实际校验；guard/schema与cross-reference分别标，不能同时坏两轴。 |
| C4 | items条件接线 | 合法作者item脚本通过结构校验后，条件引用不闭合由items精确路径拒收；对照content旧validator证明caller差异，不抄局部validator断言。 |
| C5 | enemies条件接线 | 合法author enemy条件script的独立组装接线；无需战斗session或公式，不造私有world，不克隆C4算法作oracle。 |
| C6 | sharedScripts条件接线 | 合法shared actor/poison条件经实际组装拒收，与已有dialog身份缺expression和initialMagic旧合同分清；所有合法链都有正对照。 |
| C7 | 装备战斗精灵引用 | 合法item/actor/equip输入通过前置门，缺battle sprite在组装后置接线精确拒收；不要用错误schema抢先红。若旧caller已证则existing-proof。 |
| C8 | 入口IO错误上下文 | FileSource.readJson真实抛Error与可合法外部IO抛非Error时，entry ID/indexed path/detail保持且不返回半个project；缺文件已有普通合同登记，两个错误类别不换文案堆矩阵。 |
| C9 | 地图公开入口闭环 | loadProjectMapById未登记map不读IO；已登记map通过真实loadProjectMap；loadAllProjectMaps不同完成顺序仍按稳定ID归位、单个IO拒绝不返回部分成功。排重全仓author-io/asset tests。 |
| C10 | optional表与冻结隔离 | 合法可缺表的undefined和非空当前表保真，以项目公开合同判断；malformed ambiences无validator等疑点只交product-counter，不把疑似宽松错误行为固化为绿。只用合成工程，不读写真实PAL/migrate。 |

## 独占白名单

仅可新增：
- `packages/reforge/src/project-loader.reference-boundaries.test.ts`。
- `packages/reforge/src/project-loader.io-boundaries.test.ts`。
- `packages/reforge/src/__tests__/project-loading-boundaries/`。
- `docs/ops/evidence/TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1/`：README、逐合同ledger、fresh JSON/raw、反控runner/原件/receipt；以共同协议命名。
- 本卡“GLM贡献者回执”小节（只写自己的记录，不改顶部Status和Codex准入）。

全部产品、所有旧测试、共享fixture、配置/依赖/官方基准、真实数据、共享导航/看板/协议/targets及其它卡只读。白名单目标已有或其它Owner占用，停止该文件并通知Codex，不覆盖。可写新测不是保证每文件必须产生新用例；真实无缺口不建空文件。

## 冻结源

| 产品/调用源 | SHA256 |
|---|---|
| packages/reforge/src/project-loader.ts | ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f |
| packages/reforge/src/file-source.ts | b2881b264bd636164ad20a9daa7944b5d48979b90537efdec22f3595fda388a2 |
| packages/reforge/src/project-save-state.ts | 6f41421ff160a02ff971e72f547aa2e88a7691121c27c78f6e673e41358c1655 |
| packages/reforge/src/assets.ts | 8835c24554de4f37ce95532293771a759b578635fa2ac8f9db88db998c5ed025 |
| packages/reforge/src/runnable-project-loader.ts | f57d800219c5de06c196b77d7a76c5f1b242dbfcbd54794f21d1b346aeb5a865 |
| packages/reforge/src/author-io.ts | 8a6581ed536484bba48c3ccb1ab5bd5c316c940ceed8df742c545925948d3643 |

冻结变化只停受影响轴举证；不改产品、不rebase漂移、不用新接口或fallback解锁死分支。

## 验证与停止条件

定向（仅给已创建文件；零新增文件不强行跑不存在的名字）：

```bash
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/project-loader.reference-boundaries.test.ts src/project-loader.io-boundaries.test.ts src/project-loader.test.ts src/project-loader.current-boundaries.test.ts src/project-loader.image-cache-binding.test.ts src/runnable-project-loader.glm-q.test.ts src/file-source.test.ts src/project-save-state.test.ts
```

新增UI定向需零act/console.error/未处理异常；相邻旧日志如有原始诊断分列。每批定向+typecheck，最终一次本包test/typecheck、根lint完整0/0/0、docs/diff；不每针重复全仓门。贡献者不跑官方ratchet，覆盖只由Codex最终main并集结算。

反控/隔离/排重、执行身份多重集合与证据原件按共同协议；不用标题Set冒充运行次数。若白名单共享导航缺登记导致docs问题，只交精确诊断由Codex维护，不越界。

## 当前模式推进记录

- 2026-10-08 Codex：当前源、公开caller、代表旧断言及残余条件已直接读取；上述最强替代解释与停止线成立。build allowed仅新测试白名单。
- Coding Owner：GLM新对话C；三卡新测试/fixture/证据互斥，避开活动Game turn、E2E及质量治理产品Owner。
- 贡献者交付：pending；Codex独立验收：pending；done准入：blocked。
- 有限清单闭合后交付review即停，Codex自行接受/返工、必要串行check→官方ratchet→受保护fast、合并推送与退休树清理。

## GLM贡献者回执

2026-10-08 GLM新对话C交付（r1，待 Codex 独立验收；不以自验替代验收）：

- C1–C10 全轴裁定并落锚（[证据目录](../evidence/TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1/README.md)）：C1 existing-proof（分层旧测双向证明，版本门/读取锁/indexed path/initialMagic 登记不复刻）；C2/C3/C4/C6/C7/C8/C9/C10 new-contract 共 9 新测 + 专属合成 fixture；C5 unreachable（typed 作者面无合法条件命令宿主，三联合类型 + AuthorCondition/AiCond 无毒变体逐个举证；enemies root 校验只对 schema 逃逸输入生效，探针实证未入库）。
- product-counter ×2：project-loader.ts:280 ambiences 裸 cast（malformed 逐字穿过 loadCurrentProjectFrom/assembleCurrentProject，探针实证）；validate.ts:1448 enemy 顶层多余键逃过 validateEnemies。均不固化成绿测。
- 反控 10 针全 VALID（四相同判据：自证 20 合成反例 + 3 真实探针、执行集 9 行逐字锁定、恰一 marker AssertionError、还原绿一致、末次重放、每针独立 mkdtemp 树冻结源核验与清理证明）。
- 门：定向 65/65 双 reporter、本包全包 354 文件 8807/8807、typecheck 0 错、根 lint 3715 文件 0/0/0、check:docs 全过；基点 CI 失败为派发文档既列白名单外项。
- 全部输入为隔离合成工程；产品/旧测/配置/共享文档/真实数据零改动；未合 main、未改 Status、未 done。

## 下一位Agent提示词

```text
你是 TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 的唯一Coding Owner，GLM新对话C。只在 /private/tmp/type-pal-reforge-project-loading.4BGFoB/type-pal、分支 codex/glm-reforge-project-loading-r1 工作，禁止写main。先读AGENTS.md、docs/phase2/READ-FIRST.md、docs/ops/tasks/TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1.md及docs/ops/evidence/TEST-CONTRACT-BATCH-20261008/README.md和targets.json；冻结 797a46a097640206a12b8f61dc014c8db277e457 不rebase，按卡面C1–C10有限清单核当前源码/caller/合法typed输入/旧fullName与实际断言/oracle，已有合同只登记，优先loader独立cross-reference接线、错误上下文和map公开入口；coverage中零命中只作定位线索，不是新合同证明。 仅原卡精确新测试/专属fixture/证据可写，产品/所有旧测/配置/官方baseline/共享文档/真实数据只读。禁止强转、私有state、核心mock、skip/ignore/扩timeout；只控外部IO，DOM/React act及全局清理真实闭环。每条新增合同原子且有最小有效反控，保留同进程native JSON/raw、执行身份多重集合、exit/signal/spawn、恰一业务AssertionError、真正恢复绿、最终源/测试/mutant/restored hash及mkdtemp清理。逐轴existing-proof/new-contract/unreachable/blocked/product-counter裁决，全部有锚即停，不追例数/针数/覆盖率。跑定向相邻与本包全包/typecheck、lint完整0/0/0、docs/diff；基点红如实对照，不越界修。共享导航缺口由Codex集成登记，不为docs过门改白名单外。完整真实testCandidate/receiptHead和docs-only区间提交推送，只维护自己的贡献者回执，不改Status、不合main、不done，待Codex独立验收。
```
