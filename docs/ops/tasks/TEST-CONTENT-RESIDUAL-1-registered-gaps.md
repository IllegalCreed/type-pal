# TEST-CONTENT-RESIDUAL-1 - 内容合同已登记残项补测（队列 TB-01）

Status: build
Phase: phase2
Capability: 已有内容合同覆盖（不改变能力地图）
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-content-residual-r1

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-01；r2三席已齐，实施时机以本卡当前准入为准。
唯一工作包/族账/白名单：[glm-content-residual.md](../../testing/glm-content-residual.md)。

## 目标与边界

只补[已接收内容合同包](../../testing/glm-content-contracts.md)回执登记的残项（asset unbound 肖像直连臂、
author-dialogue 字段守卫轴、map-index 剩余拒绝边界、validate-refs 数据引用轴、frame-sequence 可达错误路径）。
已接收 118 项逐项对账不重做；TextEncoder 降级不存在不补；D-06/D-07 留修复卡；无 caller 接口不保活。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | N/A——本包不涉及原版机制真值；当前公开 TS 合同为真源 |
| 第一阶段 | N/A——content 无一阶段对应 |
| 当前二阶段 | asset.ts:387为commandAssetTaggedReferencesAtNode，actor-reference的portrait引用器不扫unbound；frame-sequence:255解析外部字节；editor/project-diagnostics.ts:688调用validateReferences。表情rename已有editor:76消费与强回归；content的ES2022/rootDir:src禁止为测试反向引运行时loader |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；行为/schema/版本零变 |

最强替代解释：跨包已测（rename 全域证据见工作包去重表）、不可达（多字节 encode 臂）、
已有强断言（118 项）、合同未定。反证成立即登记已有/防御/待证，不凑数。

## 推进签字

### build前（r2，当前）

- Codex：**premise verified / design agree（2026-09-19，r2，冻结e58834f6）**。本人直读asset.ts:387–423、frame-sequence.ts:117–152/255–278、author-dialogue.ts:125–168、content/tsconfig.json及editor的rename既有强断言；相关10文件148项复跑绿，前提探针证明合法unbound边和外部Unicode TPFS及独立错误路径。r2不反向依赖运行时loader、不保活无当前非空消费证据的scriptChunks、不强制已覆盖A3新增。可证伪：合法基线被守卫拒绝、旧断言已经完全同合同、caller只能来自已退役链，则撤回该候选；不得改产品迁就。
- Kimi：**premise verified / design agree（2026-09-19，r2，冻结 e58834f6；全部锚点本人直读/复跑，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **残项入口直读**：`asset.ts:387` 确为 `commandAssetTaggedReferencesAtNode`（原 A1 混名已订正）；
    `actor-reference.ts:244` `collectDialoguePortraitReferences` 注释明「不扫描 unbound 的全局
    AssetId」——unbound 肖像直连臂缺口真实；`author-dialogue.ts:125-168` exactKeys+rows 非空、
    speed/autoAdvance 允许 0 及非负有限数；`frame-sequence.ts:255` 解析外部字节（UTF-8→JSON 分层）。
  - **依赖方向核实**：content 包 ES2022/rootDir 不允许反向引运行时 loader——r2 改本包结构
    guard+引用零 issue 基线正确；open-local 当前 scriptChunks={}，旧 migrate 分片构造不等于当前
    发布消费，A12 先证 consumer 再补的纪律正确。
  - **去重核实**：editor actor-dialogue-commands.boundaries.test.ts:149 确有经 content rename 的
    全域/invert/深快照强证据（跨包间接），登记已有不强制第六文件；map-index 重复 ID/路径/自身
    保护已有强测试先扣重。
  - **探针本人复跑**（exit 0）：合法 unbound cue 精确 AssetId 边、外部 Unicode TPFS 逐像素
    恢复（UTF-8/JSON 错误分开）、browserAdapter 实拷字节、worker.onmessage 真实 quantize/encode
    与真实 transfer、原 buffer 保持且 terminate 一次——非视觉宿主协议证据成立。
  - **设计同意**：只补已接收包回执登记的残项；118 项逐项对账不重做；TextEncoder 降级不存在
    不补；D-06/D-07 留修复卡；无 caller 接口不保活；合法 fixture 过当前结构守卫、负控钉名
    业务红；同口径覆盖对照只出 /tmp；整包串行门由 Codex 接收后统一。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某族已被同合同断言覆盖（含跨包）→ 登记
    已有；② 拟造输入不在当前支持域 → 撤回；③ scriptChunks 非空出现当前 consumer → 该族
    回纳入范围；④ 为结构正控反向引入运行时 loader → 依赖方向破坏；⑤ 产品/旧测试/基线
    任何 diff → 越界即停。
  - 返工项：无。
- GLM：**r2 premise verified / design agree（2026-09-19，r2，冻结 e58834f6；差异锚点本人直读/复跑，未读 Kimi 结论；r1 签字留历史）**。
  - **锚点订正本人复核**：asset.ts:387 确为 `commandAssetTaggedReferencesAtNode`（r1 稿误名
    `collectDialoguePortraitReferences`，后者属 actor-reference.ts:244 且刻意不扫 unbound——探针
    输出 valid current cue → exact asset reference 印证）；:278 `palBattleSpriteAssetId` 的真实
    caller 在 migrate/pal-battle-sprites.ts:53/63/116（本人直读），A2 收敛为合法参数轴正确。
  - **依赖方向**：content/tsconfig.json rootDir=src 本人直读——r1 稿"经 loadCurrentProjectFrom 守卫"
    确会反向引 reforge，r2 改为本包现行结构 guard + validateReferences 零 issue 正控正确。
  - **scriptChunks 归类**：open-local.ts:77 当前返回 `scriptChunks: {}`、main.ts 零 scriptChunks
    消费（本人 grep 证实）——A12 先证当前消费者否则不新增旧分片正例，同意。
  - **既有基线复跑**：TB-01 相关 11 个现存测试文件（asset/actor-reference.contracts/frame-sequence/
    author-dialogue×2/map-index×2/validate-refs×2/asset-catalog/asset-closure）162/162 绿
    （本人执行；比 r2 收口报告的 10 文件集多含 author-dialogue.contracts——不影响其结论）。
  - **探针复跑**：`node --import tsx docs/testing/glm-coverage-queue-premise.mjs` rc=0——合法 unbound
    cue 精确 AssetId 边、外部 Unicode TPFS 索引逐像素往返且 UTF-8/JSON 错误分离，与 A1/A4 前提一致。
  - **可证伪观察**：①合法 cue 被 checkAuthorDialogueCue 拒→A1 撤；②多字节 encode 臂出现合法
    构造→A4 重开；③scriptChunks 找到当前非空消费者→A12 升级；④产品/旧测试/基线 diff→停。
  - 返工项：无。Kimi 签齐且无 counter 后由 Codex 核定 build。
- build准入：**r2设计门已通过，Codex于2026-09-19统一核准**（本席f5cd23c0、GLM efe6b932、Kimi 61b79f1b；生产相对e58834f6零漂移）。本卡现进入build，GLM可从最新已接收main领取独立worktree；这是开工授权，不是实现已完成。 TB-00返工优先，未接收实施包最多两批；有空位且本卡目标产品/合同未变、无新counter时，GLM可按本授权同步本卡/看板/索引到build并开工，无需重复签字或再次询问用户。若目标漂移或出现新合同分歧，仅暂停对应批交Codex核定，不自行更换前提。

### build前r1签字（历史，已被r2替代）

- Codex：pending（独立核队列 TB-01 范围/去重表/白名单）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  模块/计数与机器台账逐格一致（census --check 通过）；跨包去重表本人逐条核验——editor
  actor-dialogue-commands.boundaries.test.ts:149+ 确经 :76 调用 content rename 并钉全域/invert/深快照，
  rename 族登记已有跨包间接；A1-A12 族锚点在工作包直读列明。可证伪：某族无合法输入或已被同合同
  断言覆盖→登记已有；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- GLM/Codex/Kimi：pending；done准入未开放，不代签、不标done。

## 交接日志
- 2026-09-19 Codex：用户告知“Kimi他们签了”后同步核三席同r2/冻结、直接证据及可证伪观察齐、无counter；生产目标零diff。核定本卡build并分配新增实施槽。 r1历史不回写，所有既有r2排除项保留；不代签、不标done。GLM当前返工仍优先，后续领取条件与交接已落卡，避免每批做完再等临时派活。
- 2026-09-19 Kimi：完成 r2 独立设计压力测试，签 premise verified + design agree，无返工项。
  直读 asset.ts:387 入口名、actor-reference.ts:244 unbound 刻意不扫、author-dialogue 字段守卫、
  content 依赖方向（不反向引 loader）与 open-local scriptChunks={}；跨包 rename 去重与 map-index
  既有强测试核实；复跑队列探针（unbound 边/Unicode TPFS/browserAdapter/worker transfer 全成立）。
  五条可证伪观察写入本席。未改产品/他席/状态，未读 GLM 结论。Next：三席齐后 Codex 核准入。
- 2026-09-19 GLM：完成 r2 差异确认，签 premise verified / design agree，无 counter。复核
  A1/A2 函数名订正、content 依赖方向、scriptChunks 当前消费归类；探针 rc0；TB-01 相关 11 现存
  文件 162/162 绿。未读 Kimi 结论；仅改本席与日志。

- 2026-09-19 Codex：按用户要求与TB-00返工并行推进本卡；修正A1/A2函数锚点、内容包依赖方向和当前fixture证明方式；A3与旧分片先分类，不承诺六文件全都新增。已把修订合入工作包正文，r2本人前提/设计签字完成，待GLM补充确认与Kimi独立审查。仅文档/只读探针，未写正式测试或改产品。统一证据见[前三批设计收口](../../testing/glm-coverage-queue-design-review.md)。

- 2026-09-19 GLM：按队列 TB-01 细化。核台账计数、跨包 rename 去重（编辑器测试确调用 content 函数）、
  上包回执残项锚点、白名单路径未占用；产出本卡+工作包（A1-A12 族账/负控/覆盖方案）。仅规划，未写测试。

## 下一位Agent提示词

### 当前 · GLM按已签队列实施

```text
在 /Users/zhangxu/illegal/type-pal 按 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md 的r2实施，生产冻结e58834f6，三席齐且Codex已核准，不重签。先同步、检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡当前准入、对应工作包及docs/testing/glm-coverage-queue-design-review.md的当前实施交接。
TB-00三项返工优先；未接收实施包最多两批。TB-01已开build，TB-02/03依序待空位；满足卡面条件后你可同步状态/看板/索引并开工，不再等用户逐批点头。领取前核目标产品未漂移；每批独立codex/glm-content-residual-r1分支/worktree，不在主树切分支、不恢复stash、不混用未接收成果作为基线。
只新增已签白名单测试/fixture/诊断和本人回执，逐族去重，合法输入先过守卫，负控须由候选自身AssertionError变红，不能把超时/STACK_TRACE_ERROR或仅独立oracle红算检出。PNG编码失败泄漏及活动页/在途回填待证保持原归属，不改产品或写错绿。
完成定向/相邻/全包/tc/Biome、私有同口径覆盖与真实逐族账后交Codex接收；全仓check/官方ratchet/strict-fast留Codex。不做视觉/听感，不改旧测试/官方基线，不代签、不标done、不直接转Kimi终审。
```

### 历史 · r2设计交接（已完成，不重复执行）

两席完整合并提示词见[前三批r2设计交接](../../testing/glm-coverage-queue-design-review.md#两席并行提示词)。本卡最小可复制交接如下：

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md（r2/draft，冻结e58834f6）。先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和对应工作包、docs/testing/glm-coverage-queue-design-review.md，直接读一手代码而非复述他席。
Codex已签r2。GLM负责对本卡r2差异补充确认，Kimi负责独立设计压力测试，两席可并行且不读另一席结论。分别只在本人r2席位/日志写带直接锚点和可证伪观察的premise verified/design agree或counter，并提交推送。
同时审其余TB-01～03同r2卡可用合并提示词，但各卡独立裁决。不得改产品/正式测试/另一席/状态，不标build/done；三席齐后Codex核准入。TB-00返工不因本轮设计等待而停止。
```
