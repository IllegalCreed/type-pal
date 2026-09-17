# TEST-EDITOR-LOGIC-COVERAGE-1 - 编辑器命令与引用边界补测

Status: review
Phase: phase2
Capability: 编辑器逻辑回归与覆盖率（不改变能力地图）
Coding Owner: GLM（白名单测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-editor-logic-coverage-r1

Revision: r1，2026-09-17。起始产品树`c1cec3adde5b0090acbc6bc1f325ca1301689873`；分配提交`d6528e8639f71d92747347526cb35925a84dee8b`（纯文档）。
用户批准四组并行测试工作，未豁免本新卡设计三签。一卡审全包，三签齐后A→B→C→D连续做，不每组重签。
Codex同时准备Reforge检查点导出修复；本卡不碰reforge产品或其测试。第二组准确术语为“角色立绘与表情引用”，不是对话编辑器改造。
当前（2026-09-18）：GLM来源`8e8ae8318c9da6333e5c44639a279d0f4149df08`残项复核通过，R1/R2/R4关闭；R3及已闭环项不重开。
终审集成候选`5ca9dad20fd8deb32bf4c3bacd76c69546f99be6`，对比主线`5552b2a96a07c6a7a4f65ab7c90b2ab6b83c0e10`。
Codex accept，已完成隔离集成check7282→ratchet→受保护单次strict fast6794/617；设计r1保持，不重签。
Kimi独立终审及GLM本人实现者确认待落卡，见[独立复核](../../testing/editor-logic-coverage-review.md)；不标done。

## 目标与边界

为现行编辑命令的apply/invert、失败/no-op、引用删除守卫补自包含的可合并回归。
以真实业务结果和独立正反控证明边界，不追求固定测试条数，不重开已完成的D-01撤销架构或整轮审计。

- GLM仅写本卡新测试/fixture/诊断与本人回执；Codex独立复核、必要适配集成并统一官方质量门。
- 不改产品、现有测试/断言、schema/保存/迁移、资产/工程、依赖、统计配置/基线；不改UI、不加拖拽/移动/新交互。
- 不做浏览器、截图、像素判断、录屏或视觉验收；纯数据中的坐标/AssetId/图层顺序可按定义比较，不把它称为画面通过。
- 默认fast只进正确合同且已绿的回归。已知D-02/D-06/D-07或新发现的实际缺陷进入隔离诊断/待修账，不倒改预期求绿、不test.fails、不skip后冒称完成。

## 前提真值门

一句话前提：编辑命令必须按现行数据合同改变目标并可撤销，失败不得污染输入；有行覆盖并不代表所有失败、引用与恢复分支均已验证。

| 维度 | 证据与判断 |
|---|---|
| 原版 / primary source | 原版行为N/A：现代作者命令/引用图没有原版编辑器对应。当前一手合同`editor/src/core/commands.ts:109-117`定义apply/invert不可变及逆操作；不拿游戏运行结果替代命令合同 |
| 第一阶段 | N/A：本任务不涉及战斗机制/原盘解码/一阶段UI；不读旧game state来构造二阶段EditorState，不复活历史作者模型 |
| 当前二阶段 | `edit-session.ts:1-8,44-81`定义不可变副本、地图/资源/脚本内部投影边界；`actor-dialogue-commands.ts:44/97/139`只有表情重命名与表情/立绘组删除；`stamp-commands.ts:24/78/121/157`为组合模板增/改/复/删，预置接管不能隐式绕过 |
| 引用与删除 | `project-reference.ts:1012,1248-1315`是快照/查询/影响分类；`project-reference-adapters.ts:1878-1950`是当前索引与删除影响入口。D-02漏场景边已被审计确认，不能把“当前允许删”写成正确合同 |
| 本任务目标 | 只增加有效测试与准确缺口记录，无产品行为变化；用当前合法输入、深快照、精确状态/引用和真实拒绝门验证，未知合同先取证不自行发明 |

路径省略`packages/`前缀。当前官方fast总6730/617；editor主命令分支1106/1547（71.49%）、角色立绘表情34/58（58.62%）、
组合库命令44/57（77.19%）、引用索引309/380（81.31%）。这些仅指对应文件，不能冒称整个工作组或产品功能覆盖率。
数据源是当前`coverage/fast/editor/coverage-summary.json`与已接受6730基线；若报告不存在或源码不同，重新按同树口径量，不挪用历史。

最强替代解释：某边界已被同合同测试覆盖；拟造输入根本不属于Command支持域；无生产调用方的历史命令不应继续扩测试。
证伪：逐项查真实生产调用与现有用例，合法非空正控+唯一坏实现必须触发业务断言；回退/invert的状态比较必须与独立深快照比。
不存在“所有命令一律抛错/一律返回同引用”的通用约定；缺失目标、重复ID、同值、可选缺席逐命令读合同。
用户可见偏离N/A（测试限定）；一旦需要修产品或改合同，该项停止绿色验收交Codex，其他独立项继续。

## 上下文锚点

- [AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[协作协议](../agent-workflow.md)。
- [覆盖率口径](../../testing/coverage.md)、[编辑器审计D-02/D-06/D-07](../audits/pre-e2e/editor-workflows.md)、[审计总队列](../audits/pre-e2e/summary.md)。
- [D-01全局历史已完成卡](../archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md)：不再造两栈仲裁器、不改已验收历史模型。
- [上一包复核](../../testing/glm-foundation-coverage-review.md)：不把浅拷贝当before、自比较当oracle、空fixture下的deletes=[]当删除门证明；数字从最终提交树生成。
- 既有测试先读：commands/actor-commands/item-commands/world-variable-commands、actor-dialogue-commands、stamp-commands/stamp-lifecycle、project-reference/project-reference-adapters、scene-lifecycle/shop-lifecycle及对应ref测试。
- 当前内部`scriptChunks`投影仍有现行用途，不因名字旧就删；但不得伪造旧作者文件作为可保存canonical输入。

## 四组范围

### A · 通用编辑命令

以`commands.ts`为主，每族分别登记新增/已有/缺陷/待证，不要求把全部class都补成重复用例。

- A1 世界变量：新增/修改/删除、同值/缺席/占用、合法false/0/空description、真实引用守卫和inverse恢复。
- A2 人物/物品：Add/CopyActor/Update/Delete、稳定ID与可选数据、独立正控与引用阻断、apply→invert→reapply；D-06/D-07不得借“先保存重开”绕过冒称正确。
- A3 战斗数据目录：敌人/敌队/战场/技能的现行CRUD及引用删除，仅作者数据，不跑战斗公式/动画或改变操作语义。
- A4 场景/地图目录与落点：新建/复制/命名/绑定/落点增删；真实proof/current provider、无引用与有引用对照、未知目标按各命令合同。
- A5 地图数据：绘制/碰撞patch、图层增删移动、尺寸变更的边界与inverse；只比较合法ProjectMap数据，不做地图画布/像素测试，不新增编辑能力。
- A6 资源/本地化/目录标签：当前AssetId、locale/标签及已存在的数据更新命令；不改导入器或真实二进制文件，不模拟整个保存管线。

### B · 角色立绘与表情引用命令

- B1 RenameActorPortraitExpression：名称合法性/同名/缺目标/冲突，actor key与实际cue引用同时改写；精确验证应改/不应改引用与逆操作。
- B2 RemoveActorPortraitExpression：真实引用阻断、未引用删除、删最后表情但保留默认立绘、目标缺席、undo恢复。
- B3 RemoveActorPortraitSet：默认/表情引用对整组删除的阻断、无引用与无立绘组、inverse恢复。
- 正文根域只按当前collector实际支持面核；场景/物品/共享脚本/敌人等不得只用无正文空对象假称全根覆盖。数量不闭合的路径先证是否可达，不改产品导出或mock被测collector凑分支。

### C · 组合库命令

- C1 Add：重复ID、合法非空模板、manifest原无stamps路径/已有路径、inverse复原；输入与返回值别名按明示合同核。
- C2 Replace：缺目标、同值、预置模板必须显式接管且转authored、作者模板不得倒回migrated、undo保持来源/内容。
- C3 Duplicate：源缺席、目标ID/名称处理、authored独立副本、undo/reapply；不把稳定ID复制成同一对象身份。
- C4 Delete：真实引用proof的新旧状态、被引用拒绝、无引用可删、位置与内容恢复、恢复时ID已占用的现行行为。
  不手写假证明结构绕过真实引用收集；不改变组合库产品或图层UI。

### D · 引用快照、索引与删除守卫

- D1 target/source稳定key、source标签/scene关联、locator数据、按当前合法ID编码；不猜不存在的保留前缀规则。
- D2 snapshot→normalize/index→referencesTo/allReferences：代表性多目标/多来源、多种deletePolicy、detail/where/locator精确往返；输入顺序、去重依现行合同。
- D3 deletionImpact/deletionScopeFor：blockers/warnings分开，自身随删来源与真正外部引用分开；不能用一个use-hook边偶然代替场景依赖。
- D4 current provider：当前state/script版本、新旧来源、冷地图引用与扫描失败的拒绝边界；真实API取得proof，不伪造品牌/返回答案。
- D5 实际Delete命令→阻断/解除引用→删除→undo闭环；保存/重开声明必须走当前真实序列化与loader，不能用JSON.stringify自证。
- D-02已知disabled/inherit/transition漏边继续登记为待修，不加入默认fast红测试、不固定错误期望；优先复用已存在审计反例，只有新边界才补隔离诊断。

## 白名单与隔离

只能新增以下文件（已存在则先报Codex，不能覆盖）：

- `packages/editor/src/core/commands-world.boundaries.test.ts`
- `packages/editor/src/core/commands-catalog.boundaries.test.ts`
- `packages/editor/src/core/commands-map.boundaries.test.ts`
- `packages/editor/src/core/commands-assets.boundaries.test.ts`
- `packages/editor/src/core/actor-dialogue-commands.boundaries.test.ts`
- `packages/editor/src/core/stamp-commands.boundaries.test.ts`
- `packages/editor/src/core/project-reference.boundaries.test.ts`
- `packages/editor/src/core/project-reference-adapters.boundaries.test.ts`
- 必要薄fixture：`packages/editor/src/core/__tests__/glm-editor-logic-fixtures.ts`；不得复制产品算法/遍历，不能由产品import。
- 文档：[GLM回执](../../testing/glm-editor-logic-coverage-receipt.md)的GLM区域、本卡自己的签字/日志。
- 可选诊断：`docs/testing/glm-editor-logic-coverage-mutants.mjs`、`glm-editor-logic-coverage.config.mts`、`glm-editor-logic-coverage-evidence.json`、`glm-editor-logic-known-gaps.mjs`。
  配置只服务tmp诊断，不改正式统计；有新附件在回执链接，无需要不创建。

产品/旧测试/配置/基线/lock/projects/data/reference/原审计探针一律零修改；不格式化其他人的文件。
独立worktree、分支`codex/glm-editor-logic-coverage-r1`，从分配提交起步；三席签字只取纯文档更新。
若merge同步引入其他产品变化，先列来源SHA/文件，不得再宣称“全仓相对冻结点零diff”；目标产品或依赖有变化需Codex核定是否重新冻结。

## 证据与验收

1. 每族有真实调用/类型/已有测试出处。当前合法种子与需要的canonical投影要来自现有构造/loader，局部手构fixture只证明局部合同，不宣称完整工程可保存。
2. apply/invert前后的完整数据与预期业务字段都核；before要独立深快照（含Map/Set/嵌套值），必要时反向改快照自证不别名。
   无op/失败时是否增加历史记录按当前EditSession合同，不抄每个命令“无变化仍通知”的旧启发式。
3. 每组至少2有效单点负控：唯一源码替换、真实加载/执行见证、目标业务断言红，原实现同输入绿；禁止TypeError替身破坏、超时、零用例冒充。
4. 已知/新缺陷单列实际反例、合法正控、输入/调用链、所属修复卡；不改产品、不test.fails/skip/only/todo，不给无现行caller的旧模型新增支持合同。
5. 覆盖对比同目标源码/同既有测试集，只增本包；include显式、输出tmp、真实分子分母和文件/测试清单齐。生产没变但分母变，先核口径。
6. 回执从最终提交树生成文件数、逐文件case数、source/test/fixture SHA、每条命令和exit、失败记录；禁止用正则从全仓配置抓其他包排除项。
7. A→B→C→D分组提交，定向+具体相邻、editor typecheck、本人文件Biome逐组跑；不并发跑重型全仓门禁。
   官方check/ratchet/单次严格fast由Codex统一集成后执行，GLM不改baseline或资产以“修环境”。
8. 不预先承诺新增条数/全包100%。可达未测/重叠保护/合同待证/真正缺陷分开，Codex明确后续归属才算本包边界闭合。

## 推进签字

### build前

- Codex：**premise verified / design agree（2026-09-17，r1）**。直接读commands.ts:109-117不可变契约、世界变量增删守卫、actor-dialogue三类命令、stamp接管与删除、reference index查询/删除分类及current provider入口；当前coverage缺口与已有测试在位。边界不代表全项目UI验收。
  可证伪：无现行caller、合同不支持输入或同一边界已被同断言覆盖，则不新增/转分类；缺陷与测试模型错误须区分，不能以当前错误求绿。
- Kimi：**premise verified / design agree（2026-09-17，r1，产品起点 c1cec3ad、分配提交 d6528e86；全部锚点本人直读，未读 GLM 结论）**。
  - **合同直读**：`commands.ts:109-117` apply/invert 返回新 EditorState 不可变、invert 收 apply 后态；
    `edit-session.ts:1-8,44-81` 不可变工作副本+统一 dispatch；`actor-dialogue-commands.ts:44/97/139`
    恰三类（表情重命名/表情删除/立绘组删除）；`stamp-commands.ts:24/78/121/157` 恰四类
    （增/改/复/删）；`project-reference.ts:1012` snapshot、`:1248` Index 类；
    `project-reference-adapters.ts:1878` current provider、`:1942` deletionImpact∘deletionScopeFor
    删除影响链——四组对象与卡面逐点一致，B 组确为立绘/表情引用命令而非对话编辑器改造。
  - **覆盖缺口独立复算**：当前 coverage/fast/editor/summary 实测——commands 分支 1106/1547
    （71.49%）、actor-dialogue 34/58（58.62%）、stamp 44/57（77.19%）、project-reference 309/380
    （81.31%），与卡面逐项一致；行覆盖 87-90% 而分支低——失败/守卫/恢复臂是真实缺口，前提成立。
  - **白名单/去重**：抽查 commands-world/stamp-commands 两个 boundaries 文件均不存在（本人实测）；
    既有 commands/actor-commands/stamp-commands/project-reference 等测试在册，卡面去重纪律覆盖。
  - **已知缺陷隔离**：D-02（editor-workflows.md:51 引用漏边）、D-06/D-07 均在册待修——
    「不固定错误期望、不塞默认 fast 红、只补隔离诊断」与审计纪律一致。
  - **设计同意**：四组范围映射真实现行合同；深快照 before（含 Map/Set/嵌套）+反向改快照自证
    不别名（吸收上批 R2 教训）；no-op/失败的历史记录按当前 EditSession 合同而非旧启发式；
    每组≥2 有效单点负控（唯一替换+真实加载见证+业务红+原实现绿）；同树同 include 覆盖对照
    只进 tmp；官方门禁由 Codex 集成后统一跑；无产品/schema/UI/视觉授权，无 caller 旧模型不
    新增支持合同。范围确停在测试补强。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某边界已被同断言既有测试覆盖 → 登记证据
    不加重复；② 拟造输入不属 Command 支持域 → 撤回该项；③ before 浅拷贝同源 → 自证红；
    ④ 负控仅 TypeError/零用例/超时 → 无效重造；⑤ D 组发现现行删除守卫与 D-02 反例矛盾 →
    按缺陷隔离登记，不倒改预期；⑥ 产品/旧测试/基线出现 diff → 越界即停。
  - 返工项：无。非阻断备注：D5 保存/重开声明须走真实序列化+loader（卡面已列），终审时核
    该链不用 JSON.stringify 自证；道具/场景两族的正文根域覆盖以 collector 实际支持面对账。
- GLM：**premise verified / design agree（2026-09-17，r1，产品起点 c1cec3ad、分配提交 d6528e86；
  全部锚点本人直读，未读 Kimi 结论；不以 Codex 统计代替合同）**。
  - **合同直读**：`commands.ts:109-117` Command 接口 apply/invert 返回新 EditorState、invert(s) 收 apply 后态
    还原前态；`edit-session.ts:1-8` 命令不得原地 mutate、统一经 dispatch。四组目标源码逐一定位：
    `actor-dialogue-commands.ts:44/97/139` 恰三类（表情重命名/表情删除/立绘组删除）；`stamp-commands.ts:24/78/
    121/157` 恰四类（增/改/复/删）；`project-reference.ts:1012` snapshot 构建、`:1248-1315` index/deletionImpact/
    deletionScopeFor；`project-reference-adapters.ts:1878-1950` current provider 入口与删除影响调用
    （:1942 `index.deletionImpact(target, index.deletionScopeFor(...))`）。
  - **覆盖缺口独立复算**：当前 `coverage/fast/editor/coverage-summary.json` 实测——commands.ts 行 1748/1833
    分支 1106/1547、actor-dialogue 60/71 分支 34/58、stamp-commands 74/77 分支 44/57、project-reference
    353/392 分支 309/380——与卡面数字逐项一致；行覆盖不等于失败/引用/恢复分支已验证的前提成立
    （commands.ts 行 95%+ 但分支 71%，失败与守卫臂是主缺口）。
  - **既有测试去重锚点确认**：commands/actor-commands/item-commands/world-variable-commands、
    actor-dialogue-commands、stamp-commands/stamp-lifecycle、project-reference(-adapters)、scene-lifecycle/
    shop-lifecycle 均在位（packages/editor/src/core/*.test.ts 清单核对）；新白名单 8 文件当前不存在，可新增。
  - **设计同意**：四组范围/白名单/深快照 before+反向自证不别名（吸收 foundation-coverage R2 教训）、
    每组≥2 单点负控（唯一源码替换+真实加载见证+业务断言红+原实现绿）、同树覆盖对照 include 显式、
    D-02/D-06/D-07 保持待修隔离不塞默认红、无现行 caller 的旧模型不新增支持合同——与本人上一批
    被三轮 counter 打磨的执行合同一致，可执行。
  - **可证伪观察**：①若某边界已被同断言既有测试覆盖→登记已有证据不重复（B5/B6 族重点核对）；②拟造输入
    不属 Command 支持域（如给无 caller 退役命令造用例）→撤回；③before 若浅拷贝同源→深快照自证红
    （本人负控先例 plan-pollutes 三轴）；④负控 TypeError 替身/零用例/超时不作鉴别力；⑤若 D 组发现
    现行删除守卫与审计 D-02 反例矛盾→按缺陷隔离登记修复卡归属，不倒改预期；⑥产品/旧测试/基线任何
    diff→越界即停。
  - 返工项：无。三签齐且无 counter 后按卡 A→B→C→D 连续执行。
- 独立非Coding Owner证据：Codex如上，Kimi已独立核合同/缺口/反证；缺签豁免：无；build准入：build allowed（2026-09-17 Codex统一核三席r1齐、无counter）。

### done前

- Codex：**accept（2026-09-18，来源8e8ae831；集成5ca9dad2，对比5552b2a9）**。R1实际shared cue/共用legalL3合法；R2 invert全输入深快照与完整恢复已钉；R4唯一enemy ID+undo、locale断言与逐族锚点/2302/Q1账一致。独立定向47/相邻76、tsc/Biome、10业务负控与四条自建见证通过，closure仍按防御臂分类。
  集成仅订正新测试标题和fixture术语注释，断言/产品/旧测试/原探针不动；首轮check术语失败已修并保留记录，完整check7282 exit0。
  串行ratchet、受保护单次strict fast6794/617均exit0；八新文件47项、210个editor旧测试身份/计数及其它六包完整基线对象不变，全生产范围/分母不变。
  官方全包+23行/+47臂=五目标+22/+46加tileset-references的1/1，不将局部/全包混算。
  GLM为测试贡献者，Q1(27e605ef)17项单列；Sprite上传WIP原字节隔离，不计入本卡。A3后续补测/D4归D-02/D5归R4、D-02/06/07仍待修均明列，未冒称全覆盖或E2E。
  可证伪：任何实际输入validator拒绝、四见证漏检、旧测试身份移除/范围缩减或指标下降即撤回accept。独立证据与日志见[复核](../../testing/editor-logic-coverage-review.md)。本席accept取代下方历史counter，不代签他席。
- Codex历史返工复核（2026-09-18，a3687b75）：**counter**。47/47、明确相邻76/76、tsc/Biome、10反控与旧三见证均通过；选择口径已修，独立覆盖2255→2302、+22行/+46分支成立。剩余：R1手写shared cue缺side、原AddLayer实际L3仍非法；R2 invert只验fury，真实restore输入污染仍6/6绿；R4重复敌人ID实际未撤、locale标题仍超断言、逐族锚点与after计数不符。见[最新复核](../../testing/editor-logic-coverage-review.md)。原counter保留如下，但已闭环项不再返工；不合入、不转Kimi、不标done。
- GLM：**accept（2026-09-18，实现者自验；本人 47 项测试贡献的 Coding Owner 确认，明确不作为独立第三方
  证明，不替代 Codex 复核或 Kimi 终审）**。
  - **贡献保留核对**：集成候选 `5ca9dad2`（对比 `5552b2a9`，来源本席 `8e8ae831`）中八个 boundaries 测试经
    blob 比对——**7 个逐字相同**；仅 `commands-catalog.boundaries.test.ts` 一处**标题订正**
    （「Add 追加不查重（现行合同）」→「Add 唯一 ID 追加并可撤销」——与残项返工实际改成的合法唯一 ID
    enemy-y 新增/undo 断言正文一致，标题收窄更准确，本人接受）与 fixture 一处**术语注释订正**
    （头注释「canonical 工程」→「canonical 项目」，适配 design-system/boundary 术语门禁，无断言变化）。
    47 项计数逐文件复核：6/7/10/2/6/8/5/3。
  - **集成树复跑（2026-09-18，main）**：定向 **47/47** exit0；10 负控全部业务红+1 对照绿（rc0）；
    witnesses 四针 detected（rename/paint 输入污染、broken-rename-target、restore-input-mutation）、
    closure 防御针 MISSED 不强测（与裁定一致）。
  - **覆盖统计归属确认**：本席回执的五目标局部口径（行 +22/语句 +48/函数 +7/分支 +46）与 Codex 官方
    全包口径（editor +23 行/+47 臂 = 五目标 +22/+46 加 tileset-references 1/1）**分列不混算**——差异来源
    （官方全包命中 tileset-references.ts 的 1 行/1 语句/1 臂）已在 Codex 复核记录说明，非本席回执错误，
    归属确认成立；after 计数 2302、Q1（27e605ef 的 17 项）单列、210 个旧测试 identity 不变均与本席
    返工回执一致。
  - 贡献披露：四组 47 项测试/fixture/负控脚本/诊断配置为 GLM 工作；Codex 两轮 counter、隔离集成树、
    术语订正与统一质量门（check 7282/ratchet/strict fast 6794/617）除外。无实际不符项。
- Codex：**counter（2026-09-18，d531aa24接收复核）**。白名单与产品零改动、44/44、typecheck/新文件Biome exit0、原10反控退出码及局部+22行/+46分支已复算；但R1当前validator拒绝正控fixture，C4伪造count冒充真实旧proof；R2实际输入污染和错误portrait asset均漏检；R3 +99强行拒绝并非移除闭合guard；R4诊断多2个PAL漏1个mjs且逐族/标题/计数账不齐。完整证据、精确file:line和返工要求见[复核报告](../../testing/editor-logic-coverage-review.md)。不合入、不跑接收后的官方门禁、不转Kimi；设计不重签、不代签。
- Kimi：**accept（2026-09-18，r1 独立终审，集成候选 `5ca9dad2` 对比 `5552b2a9`（GLM 来源 `8e8ae831`）；设计不重签；未读 GLM 本轮结论的论述）**。
  接手 HEAD `f06a2287` 与 origin/main 一致；候选后 packages/scripts 零漂移；主工作区 SpriteUploadWizard
  WIP 原字节保持，未 stash/混入（本席核其与本包文件无交集）。
  - **白名单/零改**：候选 diff 仅 8 个 boundaries 测试+1 fixture+诊断/基线/文档；产品、旧测试、
    配置、资产、原探针零 diff（实测）。
  - **R1/R2/R4 残项直读**：`actor-dialogue-commands.boundaries.test.ts:102` 共享 cue 已带
    `portrait.side:'left'`（当前守卫正控）；`:183-186` invert 前独立 deepSnapshot、invert 后
    整 s1/整 s2 分别对独立快照（非部分域）；`commands-catalog.boundaries.test.ts:122-129`
    合法唯一 ID enemy-y 追加+undo 精确移除；`commands-assets.boundaries.test.ts:40-49` locale
    同值不变与新键 invert 移除断言在案；落点/碰撞/物品等已有证据归属按真实测试名更正。
    R3 不重开；real-closure-removal 防御臂 MISSED 维持同源 walker 分类，不强造非法结构。
  - **本人复跑**：定向八文件 **47/47**；回执原命令相邻 **76/76**；editor typecheck exit 0（抽查）；
    入仓 `glm-editor-logic-coverage-mutants.mjs`：**对照绿 + 10 针全业务红**（expected==actual）；
    入仓见证工具对当前树：rename-input/paint-input/broken-rename-target/restore-input-mutation
    **四针全 detected**，closure 针 MISSED（已接受分类）；运行后工作树目标目录零污染。
  - **质量门交叉核**：集成 check-final editor 2,461（总 7,282）；受保护 strict TOTAL
    **617 文件/6,794 项**；基线 diff 实测 6747→6794（恰 +47）、editor 2255→2302，
    仅 editor 包级 digest 变化、旧 fileEntries identity 逐项不变、零移除、零降阈。
    首次 check 术语门拒绝→仅订正注释的记录在案（非降门禁）。
  - **口径与披露**：Q1 的 17 项在主线单列不混入本包；GLM 为 47 项测试贡献者（披露在案），
    Codex 两处非行为订正（标题/术语注释）不改变断言；本席终审为独立结论。
  - **旧版本兼容审查：pass**——无版本分支/升级器/fallback/旧模型支持合同；D-02/D-06/D-07
    保持待修不固化。
  返工项：无。后续归属（A3 技能 Update 下批、D4 归 D-02 修复、D5 归 R4 E2E）登记在案。
  本 accept 不代签、不授权 done。
- done准入：三席 accept 均已落盘（Codex 集成复核、GLM 实现者自验、Kimi 独立终审），待 Codex 统一核定；无缺签豁免。用户不承担技术手工复验，无视觉项；Codex最终统一状态，不代签。

## 交接日志

- 2026-09-18 Kimi（r1 独立终审）：同步 `f06a2287` 后核 `5552b2a9 → 5ca9dad2`（GLM 来源 8e8ae831）。
  白名单/产品与旧测试零 diff 实测；直读 R1 cue side/R2 深快照/R4 唯一 ID+locale 残项；复跑定向
  47/47、回执原命令相邻 76/76、入仓 10 针全业务红+对照绿、见证工具四针 detected（closure MISSED
  维持已接受分类）；交叉核 check 7,282、strict 617/6,794（恰 +47）、旧 identity 零移除。
  旧版本兼容 pass。签 accept，无返工项；未改产品/他席/状态；主工作区上传 WIP 未触碰。
  Next：Codex 统一核定 done。
- 2026-09-18 GLM：补实现者自验 accept（详见 done 前本席）。blob 比对 7/8 测试逐字相同，仅 catalog 标题
  与 fixture 术语注释两处 Codex 订正（均更准确，接受）；集成树复跑 47/47+10 负控红+四针 detected；
  覆盖局部/全包口径分列确认（tileset-references 1/1/1 差异来源已核）。贡献披露落卡。仅改本席与日志，
  未读 Kimi 结论、不碰上传 WIP、不改状态、不代签、不标 done。
- 2026-09-18 Codex：核8e8ae831远端与白名单、逐项关闭R1/R2/R4，47/76、10负控和四独立见证通过；从5552b2a9建隔离集成树，未stash或改动上传WIP。订正新测试旧标题及术语注释后check7282、ratchet与受保护单次strict fast6794全过，集成候选5ca9dad2。签本席accept、统一转review并同步索引；两席下一步提示同时提供，Kimi独立终审、GLM仅实现者确认，不重签设计、不标done。
- 2026-09-18 Codex：接收a3687b75，核原counter原文保留及相对467a5f41白名单不变；复跑47/76、类型/Biome、原10反控/三见证及两次同口径覆盖，已修项确认。独立验证残留fixture与invert输入污染，counter收窄为R1/R2/R4，R3关闭。Q1已被该分支合并且与27e605ef一致，贡献单列；本轮未接收测试或改官方基线。
- 2026-09-18 Codex：接收d531aa24，核ls-remote/白名单/冻结，独立运行八文件44、相邻自选八文件67、editor tsc/Biome；原10负控复跑及同树覆盖before2256/after2300均完成。进一步用现行validator及带实际执行见证的单点坏实现发现R1～R4，签counter转rework。相邻76未给具体命令，未误称本席67证实/证伪该数字；Q1测试不混入。下一步GLM仅白名单返工，counter原文保留。
- 2026-09-17 Codex：核GLM 04383fa7/Kimi bc42986b与本席设计签字齐，用户确认，统一开build。产品冻结c1cec3ad不变；GLM可按既定分支/白名单连续A→D，不需再签；Codex仅实现另一检查点卡，不改本包测试。
- 2026-09-17 Kimi：完成 r1 独立设计审查（范围/合同/反控/口径），签 premise verified + design agree，无返工项。
  直读 commands.ts:109-117 不可变合同、edit-session.ts:1-8/44-81、actor-dialogue 三类与 stamp 四类命令、
  project-reference snapshot/Index 与 adapters 删除影响链；独立复算四文件分支缺口与卡面逐项一致；
  白名单抽查文件不存在；D-02/D-06/D-07 待修隔离核实。六条可证伪观察与两条非阻断备注写入本席。
  未改产品/他席/状态，未开始测试实现。Next：三签齐后 GLM 按卡连续执行 A→D，Codex 集成与官方门禁。
- 2026-09-17 Codex：用户同意四组并行工作并要求提示词。建立r1精确范围/白名单/返工经验约束，GLM/Kimi设计审查可并行。
  本次只准备卡与范围，未新增正式测试/改产品。Codex另做检查点导出的只读真值与方案，双方不改同一实现面。

## 下一位Agent提示词

### Kimi · 独立终审（当前）

```text
在 /Users/zhangxu/illegal/type-pal 终审 TEST-EDITOR-LOGIC-COVERAGE-1 r1，任务卡 docs/ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md，review。集成候选5ca9dad20fd8deb32bf4c3bacd76c69546f99be6，对比5552b2a96a07c6a7a4f65ab7c90b2ab6b83c0e10；GLM来源8e8ae831，设计不重签。
先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/editor-logic-coverage-review.md及GLM实现回执。主工作区可能有Sprite上传WIP，须隔离候选，不stash/覆盖/混入该改动。
独立核R1实际shared cue与统一legalL3、R2 invert全状态深快照、R4唯一enemy ID+undo/locale/逐族锚点；R3已闭环不重开，closure防御臂不强测。GLM是47项测试贡献者，不采信其自验作独立证明；Q1的17项不计本包。
复跑定向47/明确相邻76、tsc/Biome、node docs/testing/glm-editor-logic-coverage-mutants.mjs（1对照绿+10业务红）及node docs/testing/editor-logic-coverage-review-witnesses.mjs <候选物理绝对路径>（四针detected、closure MISSED属已分类防御）。核Codex仅改新测试标题/注释、产品/旧测试/原探针零diff；check7282→ratchet→受保护单次strict fast6794/617证据与基线一致，210旧editor测试与其它六包不变，官方全包+23行/+47臂与五文件局部+22/+46分清。
只在本人终审席位/本人日志写独立accept或带file:line的counter，提交推送；不得改实现/状态/他席结论，不标done。提交前同步保留并行GLM本人签字，勿复述其结论；回Codex统一收口。
```

### GLM · 实现者确认（当前，与Kimi并行，不是独立第三方审查）

```text
在 /Users/zhangxu/illegal/type-pal 确认 TEST-EDITOR-LOGIC-COVERAGE-1 r1 的最终集成，卡 docs/ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md，review。候选5ca9dad20fd8deb32bf4c3bacd76c69546f99be6，对比5552b2a96a07c6a7a4f65ab7c90b2ab6b83c0e10；来源为你的8e8ae831。设计不重签，不是新一轮返工。
先同步查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡及docs/testing/editor-logic-coverage-review.md。主树上传WIP不触碰。核你47项贡献被保留、Codex仅订正新测试标题/fixture注释，Q1单列；check7282、ratchet/strict fast6794及全包+23行/+47臂（五文件局部仍+22/+46）账一致。
只在本人done前席位和本人日志签实现者自验accept或具体counter，明确测试贡献者身份不作独立第三方证明；无需重复设计或并发重跑重型门禁。不要读取/复述Kimi审查结论，提交前同步保留他席改动；不改实现/状态，不代签不标done，交Codex统一收口。
```

### GLM残项返工提示（历史）

```text
在 /Users/zhangxu/illegal/type-pal 定点返工 TEST-EDITOR-LOGIC-COVERAGE-1 r1，卡 docs/ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md，rework；候选a3687b75ff72e7adb1bdb73b2116e0bdfb0cab3f。先同步并保留Codex最新counter，读AGENTS/CLAUDE/READ-FIRST及docs/testing/editor-logic-coverage-review.md顶部返工复核。设计不重签，R3和已修项不重开。
只修剩余：R1 shared手写cue缺side、原AddLayer实际L3仍tile/source不匹配（不要只另造合法正控）；R2 invert前后完整输入深快照，restore-input-mutation必须业务红；R4把仍在默认测试中的重复enemy-x断言实际改成唯一ID新增/undo，locale标题/断言一致，逐族既有锚点正确、after最终数2302按新树重算，Q1 merge来源单列。
运行更新的node docs/testing/editor-logic-coverage-review-witnesses.mjs <候选工作树绝对路径>：原三针保持detected、restore针转detected；closure防御针不强测。定向/明确相邻76/tsc/Biome、10负控、同官方口径覆盖复跑，数字从最终树生成。
只改原白名单测试/fixture/诊断与本人回执；不改产品/旧测试/原探针/官方配置基线，不代签不标done、不转Kimi。保留已通过内容，交Codex接收后才统一全仓门禁。
```

### 首轮GLM返工提示（历史，按上方残项执行）

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-EDITOR-LOGIC-COVERAGE-1 r1，任务卡 docs/ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md 已rework；原候选d531aa2473d1081fb201248fae3694731fe2cae2，原分支codex/glm-editor-logic-coverage-r1。r1三签不重签。
先同步并保留本轮counter，读AGENTS/CLAUDE/READ-FIRST、本卡及docs/testing/editor-logic-coverage-review.md。只改原白名单新测试/fixture/诊断和本人回执，不改产品/旧测试/原探针/官方配置基线，不做视觉。
逐项修R1合法cue/map/shared/item输入与真实旧proof；R2输入深快照及actor重命名真实key/asset结果（输入污染和错误asset三见证必须被抓）；R3纠正+99负控的真实含义，补真正错误改写结果的业务反控，不伪造不可达闭合场景；R4直接消费官方fast selection、重建inventory/覆盖，逐族分类、标题/断言和24/6/7/7计数、相邻76命令/哈希与失败记录对齐。
可运行 node docs/testing/editor-logic-coverage-review-witnesses.mjs <你的候选工作树绝对路径> 重建本席见证；该工具报MISSED表示漏检，不是通过。保留已有效用例，不以固定新增条数或覆盖率凑数。完整定向/相邻/tsc/Biome/负控及同口径覆盖通过后交Codex复核；不代签、不标done、不转Kimi，Q1贡献不混入。
```

### 原GLM实施交接（历史，现以R1～R4返工为准）

```text
在 /Users/zhangxu/illegal/type-pal 继续 TEST-EDITOR-LOGIC-COVERAGE-1 r1，卡 docs/ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md 已build；a5df9fbc由Codex核三席设计齐、无counter，不重签。先同步查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡及docs/testing/glm-editor-logic-coverage-receipt.md。
按原独立worktree/分支codex/glm-editor-logic-coverage-r1、产品冻结c1cec3ad、精确白名单连续做完A通用命令/B角色立绘表情引用/C组合库/D工程引用与删除守卫。只写新测试/fixture、本人回执；不改产品/旧断言/原探针/配置基线/资产，不做视觉。真实业务断言/深快照/每组至少两有效负控、定向相邻/tc/Biome/同树覆盖对照齐。D-02/06/07保持缺陷隔离，发现需改产品则登记交Codex，不倒改预期。
四组整批交Codex复核集成，官方check/ratchet/严格fast由Codex统一执行，不代签不标done。WORLD已done，Q1检查点已另行实施，两者设计审查均已完成，不重复旧提示。若同步引入Codex的main改动须披露来源，不把新主线全仓误报为冻结产品零diff。
```

Kimi本卡设计已完成，暂不重复交设计；实施候选形成后再独立终审。下列提示保留为历史，不自动重开签字。

### 原GLM设计交接（历史）

```text
在 /Users/zhangxu/illegal/type-pal 接手 TEST-EDITOR-LOGIC-COVERAGE-1 r1，任务卡 docs/ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md，draft；你是白名单测试Coding Owner，产品起点c1cec3adde5b0090acbc6bc1f325ca1301689873，分配提交d6528e8639f71d92747347526cb35925a84dee8b。
先同步并查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡与docs/testing/glm-editor-logic-coverage-receipt.md；先独立核目标实现/当前caller/已有测试，在本人席位签有一手证据的premise verified/design agree或counter。签齐前只读核对，不开始正式测试或在tmp绕门禁。
三席r1设计齐且无counter后，按卡核build，在codex/glm-editor-logic-coverage-r1独立worktree连续完成A通用命令、B角色立绘与表情引用、C组合库命令、D引用与删除守卫，不逐组重签。只改精确白名单新测试/fixture及本人回执，产品/旧测试/原探针/配置基线/资产零修改；不做浏览器或视觉。
复用现有审计证据，D-02/D-06/D-07保持待修隔离，别把错误当合同或把默认fast塞红。每族精确业务断言和独立深快照，每组至少两有效单点反控；定向/相邻/tc/Biome、同树覆盖对照和最终树计数齐。全部做完交Codex复核集成；官方check/ratchet/strict fast由Codex统一跑。只写本人签字/日志，提交推送，不代签不标done。
另按docs/ops/archive/tasks/done/Q1-CHECKPOINT-EXPORT-1-current-save-hook.md末尾GLM提示词独立审该卡r1设计：真实零参导出、共用快照队列/barrier、JSON往返、失败后重试与零槽副作用。本卡产品同c1cec3ad，Codex负责实现；先交两张卡的本人设计签字再继续编辑器四组，不替Codex改reforge，不读/复述Kimi结论。
```

### 原Kimi设计交接（历史）

```text
在 /Users/zhangxu/illegal/type-pal 处理三个独立审查：先补尚未落卡的WORLD-ASYNC-COMMIT-1终审，再审TEST-EDITOR-LOGIC-COVERAGE-1与Q1-CHECKPOINT-EXPORT-1的r1设计。先同步并查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md，不恢复stash或覆盖他人改动。
WORLD卡 docs/ops/archive/tasks/done/WORLD-ASYNC-COMMIT-1-world-async-commit.md 当前review，候选e13216e7a4439008df38666cbcfec557c8e5a26c对比5bc62a21，设计不重签。GLM已补审，你本席仍pending。按原卡终审职责独立核代码/回归/8反控，不借保存子链或四包测试的签字代替。当前main已有后续修复，复跑旧候选须隔离工作树或冻结模块，不用当前HEAD冒充候选；只写本人accept/counter与日志，提交推送，不改状态/产品、不标done。
新卡 docs/ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md，r1/draft，产品起点c1cec3adde5b0090acbc6bc1f325ca1301689873，分配提交d6528e8639f71d92747347526cb35925a84dee8b。独立核四组现行命令/引用合同、fixture合法性、不可变/undo边界、已知缺陷隔离、白名单与非视觉限制、反控与覆盖口径。第二组是角色立绘/表情引用，不是对话系统重写。
在新卡本人设计席位写有独立一手锚点及可证伪观察的premise verified/design agree或counter；不要读/复述GLM设计结论。只改自己的签字/日志并提交推送，不改他席/状态、不开始实现。一次审全包，三签齐后GLM按卡连续执行，Codex负责集成与所有视觉。
另按docs/ops/archive/tasks/done/Q1-CHECKPOINT-EXPORT-1-current-save-hook.md末尾Kimi提示词审该卡r1：产品同c1cec3ad，当前draft，Codex只完成取证未实现；重点核真实DEV绑定、safe-point时序、与F5共用队列、失败恢复和同步快照，不扩大SAVE8/content20。只在本人席位签premise verified/design agree或counter并推送，不借前两卡签字作为本卡准入。
```
