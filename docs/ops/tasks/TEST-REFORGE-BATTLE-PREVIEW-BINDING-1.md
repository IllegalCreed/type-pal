# TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 — 试打场景演出与canonical脚本接线

Status: rework
Owner: GLM（独立对话C，唯一写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: battle-preview / canonical-script-binding
Visual Verification Timing: N/A（调用链/真实业务结果取证；不验剧情或战斗观感）

## 目标与有限清单

重新核已披露D-1：`?battle=<team>&battle-scene=<scene>`读取的是投影场景而非canonical命令树，可能丢失遭遇演出。用合法完整作者工程走公开bootGame和加载器证明链路，补真正缺失的非重复合同；不改接线或发明多匹配策略，不定用例/反控/覆盖率指标。

| 轴 | 有限核验问题 | Oracle与停止线 |
|---|---|---|
| B1 | 无`battle-scene`时试打是否不带场景onEnter演出，保留正常战果回执？ | 对照旧`main.host-boundaries-1.test.ts`的试打终局/错误断言，已证不新增 |
| B2 | 同一合法工程的场景canonical stage正文确有目标team的startBattle.choreography，但公开试打是否消费到？ | 作者加载→RuntimeSceneDef→runtimeSceneView→findChoreo→实际战斗演出事件/状态；故障给隔离正向红反例，不能只grep或断言body=[] |
| B3 | 唯一匹配位于合法entity behavior的stage正文或合法嵌套控制结构时，实际读取域是否仍遗漏？ | 先证明schema与正常脚本caller能执行该命令；与B2同根因的变体合入诊断账，不重复造净新test/针 |
| B4 | 引用的是另一个已登记场景，而不是启动entryScene时，路径/场景ID是否按canonical索引读取？ | 合成scene index/FileSource真实读取记录与对应场景内容；禁止直接塞旧SceneDef绕过current校验 |
| B5 | 场景无目标team、合法startBattle未带choreography或scene读取IO拒绝时，试打回执与资源所有权如何？ | 按三种独立前提排重；仅已有产品/文档承诺且真实满足的合同可入绿测；不得代用户决定静默fallback是合理UX |
| B6 | `sharedScripts`、多stage、多个team、多个匹配命令是否扩大搜索域/形成歧义？ | 给canonical schema、调用域、现有文档/实现证据；搜索全部命令vs当前激活命令、首个vs末个等策略未定即blocked，不实现自创机制 |
| B7 | `?battle-preview`静态摆位与`?battle`实际试打是否被混为一类？ | 前者不进主循环，敌列表/field/default已有Q01旧证据；只排重和标域，不重复普通摆位测试 |

逐轴existing-proof/new-contract/product-counter/unreachable/blocked。B2/B3同根因只需一条最小决定性反例，其余合法域可用输入+caller证据排除；不“七轴七针”机械堆积。所有轴裁决即停，不滚动扩到战斗核心/剧情/E2E。

## 路由与独占白名单

- 工作树`/private/tmp/type-pal-reforge-battle-preview-binding`；分支`codex/glm-reforge-battle-preview-binding-r1`。
- 产品冻结`2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d`，派发从含本卡提交开始。全40位base/testCandidate/receiptHead核Git对象；产品不能随main漂移，docs-only尾巴独立列。
- 可写本卡你的交付块；新`packages/reforge/src/main.battle-preview-binding.test.ts`、专属`packages/reforge/src/__tests__/battle-preview-binding/`；专属`docs/ops/evidence/TEST-REFORGE-BATTLE-PREVIEW-BINDING-1/`。
- 产品`main/runtime-project-view/project-loader/scene-resources/script-world`、content schema、旧测/共享runtime-shell fixture、配置/锁文件、官方baseline、共享索引/看板、真实工程/PAL数据均只读。不读写其它活动Owner工作树。
- 不补scriptStore旧接口、不把projection改为脚本存储、不加mutable observation或世界后门，不修D-1、不选搜索/多匹配策略。与对话B虽读同main，写文件完全不同；变异各自在mkdtemp树，只清本次树。

## 前提真值与直接锚点

- 先读[READ-FIRST](../../phase2/READ-FIRST.md)、[测试质量验收](../agent-workflow.md)、[原D-1披露](../evidence/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1/dedup-ledger.md)。作者回执不替代当前一手核验。
- `main.ts:263-280`接受唯一current工程；`:364-366`getSceneDef经runtimeSceneView；`:5855-5889`递归findChoreo与startBattle接线。
- `project-loader.ts:464-495`真实loadAuthorScene/校验/对话解析；`runtime-project-view.ts:39-46,164-177,197-204`投影空stage正文及渲染场景，不是存储权威。
- `content/src/author-script-core.ts`合法命令、stage/hook/sharedScript域。当前不存在可写旧scriptStore，不能以旧schema冒充canonical fixture。
- 旧测完整排重：`main.host-boundaries-1.test.ts`、`main.battle-host-flows.test.ts`、`main.battle-preview.glm-q.test.ts`、`runtime-project-view.test.ts`及runtime-session相关测试；可读复用`__tests__/runtime-shell/{project,dom-host,driver,scenarios}.ts`，不改共享fixture。
- 最强替代解释：非法作者输入、演出命令不属于真实搜索caller、旧测试未触实际战斗、最新实现已改canonical读取。分别以验证器、公开加载/脚本调用、真实战斗结果与当前源锚点证伪。primary是一手current源码/合法工程；一阶段数值公式N/A（不改行为/机制）。

| 冻结源 | SHA256 |
|---|---|
| `packages/reforge/src/main.ts` | `b7c50edd82faa26bb710dfdb814ea07cff4183bb1729b9738f840707ea303c28` |
| `packages/reforge/src/runtime-project-view.ts` | `1c7ed7ca473734f1bc12f6c4b6b2f14cf5bff8dad96a9674398e9eb24022b1e2` |
| `packages/reforge/src/project-loader.ts` | `ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f` |
| `packages/content/src/author-script-core.ts` | `7ae6f77a42739a2b7343c4a58177f349b024db39b0e1a52a783cb7e7ba510058` |

## 交付与验收

- 专属README、contract-ledger.tsv逐轴源条件/caller/合法输入/旧file-fullName断言/oracle/处置，新test对应file-fullName，不占位、不换名换数字。无真实缺口可零新增，以准确诊断闭环而非测试数验收。
- 正常合同走bootGame/真实加载器、实际battle业务，不mock战斗/脚本核心。合成typed工程通过当前校验；控制FileSource/媒体/网络等IO，readonly现有观测/实际文字渲染可旁证，不能只assert mock被调用或改私有态。
- 产品不满足的正向合同仅入专属按需repro工具，mkdtemp生成临时测试、真实运行产品，保留指定红JSON/raw/退出码/signal/spawn/完整身份和清理证明。默认suite不能有红/skip/xfail，也不把“演出永远丢失”当正常绿合同。
- 新正常合同用最少独立业务变异核判别力。三态source/test/mutant/restored哈希、完整非空file×fullName多重执行集相等、指定恰一AssertionError、恢复全绿，拒收skip/pending/todo/collection/runtime/unhandled或signal/spawn失败；判据有真实拒收自测。无新正常合同不造反控数量。
- 先跑基点；定向新文件+相邻完整文件保存JSON/stderr，不fullName过滤造成skip。最终一次`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test`/`typecheck`、根`pnpm lint`完整0/0/0、`pnpm check:docs`、`git diff --check`；故意红repro与正式绿门分列。
- 任何新用户取舍/公共接口/产品修复只给最小before→after建议与反证，交Codex另开产品卡，不夹修。交付逐一核冻结/白名单；覆盖仅定位、不改官方baseline。每阶段提交推送后只继续剩余列明轴，不无限续跑。

## 当前模式推进记录

- 2026-10-06 Codex：B1–B7、canonical与投影链及旧D-1直接锚点已核；**build allowed仅限白名单测试/隔离诊断**。D-1产品修复/策略未准入。
- 贡献者交付/自验：pending；Codex独立验收：pending；done准入：blocked。
- 用户产品裁决：本卡N/A；多匹配/错误提示/搜索域改变须另行裁决。

## 初始派发提示词（历史，当前以文末返工为准）

```text
你是TEST-REFORGE-BATTLE-PREVIEW-BINDING-1唯一执行方。仅在/private/tmp/type-pal-reforge-battle-preview-binding、codex/glm-reforge-battle-preview-binding-r1工作。先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md和docs/ops/tasks/TEST-REFORGE-BATTLE-PREVIEW-BINDING-1.md，再核D-1原证据、当前canonical加载/投影/试打链及旧测试实际断言。只裁决B1-B7，真实typed工程与公开bootGame；少而精补正常未重复合同，D-1交最小隔离正向红反例，不把缺陷写成绿测，不修产品/加旧scriptStore/私有后门/擅定多匹配策略。同根因变体记域证据不堆测试。严格冻结/白名单/三态身份/零诊断/清理，完整SHA提交推送。轴全部裁决即停，只写本卡你的交付块，不合main、不done、不扩围。返回逐轴账、候选SHA、绿门与红反例分列及未决产品点，待Codex验收。
```

## Codex 独立一审与有限返工（2026-10-07）

**counter，仅返工诊断工具/证据；零新增正常测试可以接受，不要求补数量。** 固定候选 `156462453b1c59ebb89530a4955fc160832e0ad3`、含回执 HEAD `f00115e819532c68549875c9e965688e1bc3f36f`；分支/远端一致、树干净。白名单成立、4/4 冻结源独立复算一致，未改产品/旧测。以下源码行属该候选。

独立在 Codex 本次复制树复跑真实 repro：一文件两例，**CONTROL passed、REPRO 唯一 failed，Vitest exit 1/signal null/spawnError null**。目标 AssertionError 为实际 battleLog `hero 攻击 foe 造成 169、胜利` 不含 `♪ 音效 sfx-encounter`；因此 **D-1 真实缺陷方向确认**，不撤回诊断，也不授权修产品。临时生成测试已删除。第一次包装器末尾 Biome 因 Codex 复制树缺 `.gitignore` 非零，属本次审查准备问题，不归罪候选；补齐后，下述畸形输入试验真实完成。

| 编号 | 候选问题及独立证据 | 有限返工 |
|---|---|---|
| B-R1-01 | `run-d1-repro.mjs:197-236` JSON parse catch 没 checks，最后 `Object.values(checks ?? {}).every(Boolean)` 空集真。在本次独占复制树，仅将子进程 pnpm IO 替身设为输出非 JSON、exit 1，**原工具实际 exit 0、allChecksPass=true**；不是只推演源码。另 no-pending 只查 suite 状态，未查 assertion 状态/身份。 | 提取唯一严格判据供工具/自测共用。parse/spawn/harness/信号失败一律非零；完整且恰为 CONTROL+REPRO 的非空 file/fullName 多重集合，CONTROL passed、唯一目标 AssertionError failed、计数与逐行状态一致，拒收 skip/pending/todo/额外 collection/runtime/unhandled；冻结漂移拒收。上述及身份/额外错误反例须同判据自测。 |
| B-R1-02 | `:125` mkdtemp 在活动 `packages/reforge` 内，生成默认 runner 可发现的故意红测试；`:128-143` 建树/写文件/执行在 cleanup 保护外，`:206` rm 非 finally。 | 改为仓库外独占 mkdtemp 完整产品复制树，真实运行冻结产品；准备开始即有失败清理保护，不向贡献者活动 packages 写临时红测试。finally 只清本次树，核成功及提前失败清理，保存实际 argv/cwd/env/身份/raw/hash。 |
| B-R1-03 | REPRO `:98-110` 先主动 `loadScene(project,'b')`，再断言 `fixture.reads` 含 b；读记录已被这次验证调用污染，不能归因于试打 caller。README/账 B4 却写“试打实际读取闭环”。 | 分离运行期读记录与独立 canonical 验证。若用 runtime 证据，须在主动 loadScene 前取证并排除正常预加载，给同输入对照/可归因差分；否则准确降为源码/域证据，不冒称运行闭环。D-1 已有业务红保留，不为 B4 另堆测试。 |

B1/B7 排重与 B6 未定策略停止线保留；B2/B3 同根因不展开更多反例。纠正文档和最终生成测试 hash，对变化的这条诊断真实重采即可。全包/typecheck/lint/docs 作者证据不是本审重跑；counter 闭合后再跑原卡最终门禁，不因零新增测试免除证据质量。原冻结/白名单/B1–B7 不增加，策略及产品接线修复另行准入。

本次**审核记录**门已独立通过：`pnpm check:docs`（全部子门）、`pnpm lint`（3474 文件、0 error/warning/info）及 `git diff --check`；不是候选产品测试包 accept。

### 下一位 Agent 提示词（r2，人工选 GLM-5.3）

```text
你是 TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 原 Owner，继续 /private/tmp/type-pal-reforge-battle-preview-binding、codex/glm-reforge-battle-preview-binding-r1。git fetch origin 后只读 git show origin/main:docs/ops/tasks/TEST-REFORGE-BATTLE-PREVIEW-BINDING-1.md 的 2026-10-07 Codex 一审，不rebase漂移产品。r1 HEAD f00115e819532c68549875c9e965688e1bc3f36f，原冻结/白名单/B1-B7不变。Codex已真实复现 CONTROL绿+试打遭遇音效目标单红，D-1方向保留；不需要新增正常测试。只闭合 B-R1-01～03：唯一严格判据+拒收自测，JSON parse失败必须非零，精确两例身份/状态/计数与指定AssertionError，拒收spawn/signal/skip/pending/todo/额外collection/runtime/unhandled/冻结漂移；仓库外mkdtemp完整隔离产品树，准备及执行失败都有 finally 精确清理，不向活动packages写临时红测试；B4读记录在主动loadScene验证前取证并排除预加载归因，或诚实降为源码域证据，别把自己读取冒称试打读取。保存完整JSON/raw/argv/cwd/env/hash/成功与失败清理证明，重采变化的这条诊断，修README/账。保留其余排重与策略blocked，不修产品、不加后门或搜索策略。原卡最终定向相邻/全包/typecheck/零诊断/docs/diff；只写自己交付块，完整SHA提交推送，不合main、不done、不扩围，等待二审。
```
