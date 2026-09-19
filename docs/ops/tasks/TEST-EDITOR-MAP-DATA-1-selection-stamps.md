# TEST-EDITOR-MAP-DATA-1 - 地图选区与组合模板数据补测（TB-06）

Status: rework
Phase: phase2
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-editor-map-data-r1

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-editor-map-data.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。


## 当前接收裁决（2026-09-19，候选0563eda7）

用户本轮明确批准九批先行实施、Codex恢复后统一接收；认可本批排期例外，不因旧两槽限制追溯判违规。设计签字保持，不重签。
**本席独立结论counter，任务rework，未合入正式测试/产品、不更新官方基线、不转Kimi终审。**
定向18项、原3对照+8针、包typecheck均通过；
Biome实测10文件/1 errors。
见[统一复核 TB-06](../../testing/glm-nine-intake-review.md#tb-06)与[机器接收账](../../testing/glm-nine-intake-evidence.json)。
公共C0判据误收适用，C1全部新增文件格式/回执不符也须修复；具体最小返工如下。

- **R06-1，权限保真空转**：`map-patch.boundaries.test.ts:116–117/132`快照、传参、最后比较三次创建permission。单点改真实permission.hiddenLayerIds，候选2/2仍绿，oracle红（`patch-mutates-actual-permission`）。必须持有同一权限对象；map/patch也取完整实际输入快照。
- **R06-2，混合目标失败未建立**：`map-transform.boundaries.test.ts`“目标层被删但另一目标仍有效”只有一条映到ghost的visual mapping；没有一有效一无效两目标，无法证部分计划清空。补真实capture/删除层的混合场景、双patch全空与完整issues。map保真只核tiles/collision，补sources/heights/owners等当前字段。
- C0/C1适用。M06已有/内部防御可保留，但需旧测试精确标题；不强增无caller接口或非法collision-only placement。


## 目标、上下文与边界

before→after：既有产品行为不变，补有增量的合法合同回归与证据；不把已知缺陷/未定政策写成正确绿测。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、agent-workflow；一期相关另读engineering-notes及相关game-mechanics，不改变原版真值或二阶段canonical。
工作包逐行caller、旧测试、隔离项构成本卡锚点。共同长期覆盖目标不是本卡硬阈值，也不新增薄E2E前置门。

## 前提真值门

| 维度 | 直接证据/边界 |
|---|---|
| 原版/primary source | 工程自定编辑数据合同，原版行为N/A；docs/phase2/decisions.md:464–485 D29已拍板多来源、相对高度、nullable collision与非链接快照。 |
| 第一阶段 | N/A——一期没有组合编辑器；不借本卡改变一期或二期碰撞/移动/画面。 |
| 当前二阶段 | MapMode.tsx:663–690/727/1363/1602调用数据计划；StampContentEditor/StampTemplateDialog调用draft与模板；content正式ProjectMap/Stamp守卫定义合法持久化输入。 |
| 本任务目标 | 只验证已确定且当前有消费的合同；新增文件按工作包白名单。无生产/旧测试/公共fixture/官方基线变更 |

最强替代解释：覆盖空臂已由相邻包测试、输入被上游守卫排除、历史导出无caller、宿主替身替换了真正逻辑、原版/当前行为存在未裁决差异。
可证伪：任一候选找不到实际调用/合法输入，或旧测试已有同一强断言、负控仅超时/TypeError/未执行即“成功”，应分类剔除或counter，不以统计推动实现。
运行时分类、参考行为、原始解码、测试模型四类替代解释均由工作包收窄项显式排查；此卡不授权修迁移/重写生成内容。

## 实施、验证、风险与回滚

1. 三席同r1签齐后由Codex核定准入；GLM每批从最新已接收main开独立分支/worktree，不在主树切分支、不恢复stash、不串未接收成果。
2. 逐族去重，正式合法正控→仅坏目标轴→完整业务断言/实际输入保真；只新增白名单测试/薄fixture/诊断/账，不改产品导出以便测。
3. 宿主窄替身只替边界，实际产品链仍执行；entered/deferred/事件见证替代sleep。负控具体族与最小代表数见工作包，不机械一模块一针。
4. GLM跑定向/相邻/全包/tc/Biome、隔离负控、私有同口径覆盖；Codex独立接收后串行check→ratchet→受保护strict-fast；Kimi独立终审。
5. 真缺陷/未定合同单独归属，不skip/test.fails、不固化错绿；本批可缩减，重大前提变化重签受影响卡，其他卡不陪绑。
风险：虚高覆盖、假合法fixture、输入别名漏测、历史接口保活、跨worktree污染。对策详见工作包；回滚只revert本批测试/文档提交，不恢复旧产品或资产。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-19，r1，冻结e58834f6）**。本人直读D29、stamp-placement-mutation.ts:55–100与真实UI调用、已有测试；复跑editor15文件156项。确认placement至少一视觉槽，collision-only仅普通cells，合法placement可视觉成员非空且gridPoints为空；无caller moveStampDraftSelection不扩测，内部防御不强制填。 可证伪条件见本卡与工作包；内部协作取证不冒充Kimi/GLM签字。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读，未读 GLM 结论）**。
  - **D29/组合合同核实**：decisions.md:464-485 多来源/相对高度/nullable collision/非链接快照
    已拍板；`stamp-placement-mutation.ts:81-82` placement 至少一视觉槽（本人直读）；普通 cells
    的 collision-only 与合法视觉组空 grid 才可测——组合边界属实。MapMode.tsx:663-690/727/
    1363/1602 与 StampContentEditor/StampTemplateDialog 为真实调用域。
  - **无 caller 排除**：stamp 旧移动 helper（moveStampDraftSelection）无当前调用——不扩测、
    不授权删除；内部防御臂不强制填。
  - **设计同意**：选区/组合模板数据为工程自定合同；逐族去重+合法正控+单轴坏例；宿主窄替身
    只替边界；真缺陷/未定合同单独归属不固化错绿。
  - **可证伪观察**：① 候选族无实际调用或已有同强断言 → 剔除/登记；② placement 视觉槽合同
    变化 → 族重评；③ 负控仅 TypeError/超时 → 无效；④ 产品/旧测试/基线 diff → 停。
  - 返工项：无。
- GLM：**premise verified / design agree**（2026-09-19，r1，冻结 e58834f6；以下锚点本人直读，未读 Kimi 结论）**。
  - **八模块与厚既有测试**：15 文件/156 项基线（本人抽验 map-selection/map-transform 等
    路径存在）；工作包逐族列旧测试锚——这些模块既有覆盖很厚，"全部剩防御臂时停止本族"条款
    必要且已写入。
  - **视觉槽合同**：stamp-placement-mutation.ts:81–82 视觉槽为空即 throw 直读——"至少一
    视觉槽"是现行守卫；collision-only 组合走 D29/合法视觉组空 grid 轴正确。
  - **数据断言边界**：选区/变换/模板均为纯数据合同（issues/canApply/patch），不碰碰撞/拖拽
    语义——与卡面"这是数据断言，不是新碰撞语义"一致。
  - **可证伪观察**：①某族已被 156 项中同合同覆盖→登记已有不重复；②fixture 过不了
    validateProjectMap→非法输入不给主例背书；③负控只改 issues 计数不改内容→鉴别力不足。
  - 返工项：无。
- build准入：三席r1设计签字保持；用户本轮明确批准额度空窗期九批先行实施（排期例外），本卡据此进入实施后接收。当前counter/rework不要求重签设计，未开放done；不将本次例外泛化给未来新批。

### done前

- Codex：**counter（2026-09-19，候选0563eda7）**。本人独立复跑定向/原负控/tc与全部新增文件Biome，抽核合法输入/实际对象/范围；C0与本卡TB-06返工证据已落[统一复核](../../testing/glm-nine-intake-review.md#tb-06)。不合并、不代签、不标done；设计有效不重签。

- GLM：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志
- 2026-09-19 Codex：按用户九批统一接收授权独立审本候选；测试通过不等于证据有效，签counter并转rework，返工限公共C0/C1及本卡章节。GLM原回执/他席签字保留，Mimosa完整深审未执行且无合并，不以hook partial称安全；TB00/TB01另排。
- 2026-09-19 GLM：按用户拍板（Codex 额度空窗期先行实施 TB-02～TB-10）领取 TB-06 并完成实施
  （r1）。worktree `type-pal-glm-editor-map-data`、分支 `codex/glm-editor-map-data-r1`、基点
  41cc7cd9；产品零漂移已核。交付：7 新测试文件 18 项（M06 整族记已有/内部防御，减 2 白名单项）；
  tc/Biome/官方口径 2359→2377 双 exit0；负控 8 针+3 对照全 detected；覆盖与机器账见工作包回执。
  状态同步 build；不代签 done，等 Codex 恢复额度后统一接收。

- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（TB-06），签 premise verified + design agree，
  无返工项。直读 decisions.md:464-485 D29 拍板、stamp-placement-mutation.ts:81-82 至少一视觉槽、
  MapMode/Stamp 编辑器真实调用域；moveStampDraftSelection 无 caller 排除核实。四条可证伪观察
  写入本席。未改产品/他席/状态，未读 GLM 结论。Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 历史交接提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-EDITOR-MAP-DATA-1-selection-stamps.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-editor-map-data.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```

## 当前下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-EDITOR-MAP-DATA-1（TB-06），卡 docs/ops/tasks/TEST-EDITOR-MAP-DATA-1-selection-stamps.md 已rework，候选0563eda7，生产冻结e58834f6；设计r1不重签。
先同步当前Codex counter到独立 codex/glm-editor-map-data-r1，读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、本卡当前裁决和 docs/testing/glm-nine-intake-review.md 的公共C0/C1与TB-06章节、原工作包docs/testing/glm-editor-map-data.md。
只修列明残项，保留有效测试与他席结论；正式guard合法、实际同一入参深快照、禁止把已排除未知/旧接口写正确绿测。公共工具判据必须按目标错误首行，真实运行与自测同函数。原负控+本席相关独立见证、定向/相邻/全包/tc/全部新TS/MJS/MTS/JSON的Biome及私有同口径覆盖从最终树复跑，失败/未完成如实记录。
只动原白名单/本人回执，分支不互合、不改产品/旧测试/官方基线/原审计探针/他席见证语义，不代签、不标done、不直接转Kimi。修完本批即可单独交Codex接收；全仓check/ratchet/strict-fast留接收后，Mimosa完整审计仍是合并前门，不能用scanner_enobufs放行代替clear。
```
