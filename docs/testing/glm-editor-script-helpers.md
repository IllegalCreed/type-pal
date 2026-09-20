# GLM脚本与内容编辑辅助补测工作包（TB-07）

## 当前Codex接收结论

二轮候选b86f235d仍为**counter**，仅返[本轮报告](glm-nine-rework-review.md)的C0精确唯一目标、C1最终树格式/回执及所列本批残项。
原七针与五夹具已关闭；定向21项通过，本批Biome exit1。不重开已关闭项、不重签、不合并、不更新基线。

### 首轮接收结论（历史）

**counter**。定向17项/原3+7跑/tc通过，但仍有公共C0和本批业务返工；Biome完整面9文件/2 errors。详见[统一复核TB-07](glm-nine-intake-review.md#tb-07)。
本轮认可用户先行实施授权；不合并测试、不更官方基线、不转Kimi。下面GLM回执为候选自验原文，不能覆盖当前counter；生产零改只指已列新增测试/fixture之外，不能写整个packages diff为空。


任务：[TEST-EDITOR-SCRIPT-HELPERS-1](../ops/tasks/TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries.md)，r1/rework；本轮实施候选90369143未接收，设计不重签。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试；三席设计有效，用户已批准本轮先行实施，当前接收counter。
表内为已按调用域筛选的候选，不是已经完成的新增覆盖；允许去重后减文件/减族，不设必须凑足的用例数。

## 合同族与去重

| 族/目标（editor/src） | 真实调用/旧证据 | 允许新增候选 |
|---|---|---|
| S01 core/author-command-edit | ScriptEditor:3313/3318/3326；旧test:99/104/118 nested编辑/no-op、:199 copy递归清新ID | then/else/body/onNo/onLose/onFlee/onFail当前路径；get非法路径undefined；edit仅非法父路径/子块抛，顶层叶越界update/remove返回副本、move保留原引用，按API分列；边界move引用不变；复制/插入后改调用方command不影响输出 |
| S02 core/script-editor | 两Inspector；旧test:255/910 reorder、:445 locator、:940 default单undo、:670删除重验 | 真SaveSceneHookDetails取消当前default与修改非default区分；缺target拒绝后session/history保真；最后未引用hook删variant/channel/hooks；真实locator捕获后owner移除不跳错 |
| S03 core/script-editor-projection | ConnectedEditorPages/App；旧test:53顺序/:92 shell+正文/:120不复活/:148引用切片 | initial页动画以shell当前值覆盖/移除，非initial不变；hostile三callback用不同canonical/shell值确认取舍；无shell hostile不复活；merge及projectCurrentAuthorReferenceSlices承诺复制的切片与实际入参双向不别名；projectActiveScriptEditorState刻意复用canonical其它字段，不强测全域无alias |
| S04 core/script-reference-catalog | App:1433/DataMode:602/ItemTab:873均传authorScripts；旧test:98全kind/:114 path/:124未知 | 当前authorScripts同名不同ID稳定序/trim；显式空数组不得退library；输入保真；不为旧library缺省扩测 |
| S05 core/item-authoring | ItemTab:1080；旧test:20稳定ID/:26深复制 | source-copy、source-copy-2均占用后生成-3，非首gap/输入顺序；若已覆盖全证则不强制文件 |
| S06 core/item-alchemy | ItemAlchemyTab:152/160/315；旧test:57效果/:68 resize/:84配方/:114最新session | 无对应surface拒绝、mutator改成另一kind拒绝；mutator原地改克隆再抛错时实际session/history不变；同值不dispatch；合法扩容reward彼此独立 |
| S07 ui/enemy-defeated-events | EnemyTab:691/EnemyTeamTab:220；旧test:402/426终止/:462范围/:499–549多奖励与0% | 默认count1、100%无skip、可编辑奖励区间之前的branch/stop及相邻非严格奖励保护branch不可编辑，合法相邻chance→stop保护仍可编辑；删唯一奖励返回undefined或保留区间前后真实事件；无current追加；完整文本/命令数组 |

## 合法输入、已知问题与无caller

- scenes/items/shared scripts/enemies分别通过当前validateAuthorScenes/Items/SharedScripts/Enemies；shell来自当前投影，不伪造旧脚本混合形状。
- 每个保真断言比较**实际传入**的canonical、shell、world/session或command，不另clone一个未消费对象来自证。原地修改菜单/编辑session的API按自身合同，不一刀切要求无修改。
- CopyEntityBehaviorCommand/CopySceneHookCommand/RenameEntityBehaviorCommand/RenameSceneHookCommand/SetSceneHookInitialCommand目前仅定义/测试；真实UI使用Add/Update/SaveDetails。只分类，不删产品、不补旧面保活。
- item-alchemy:76空rewards回退被合法maxRoll≥1/rewards等长挡住；:92缺use被findEffect挡住，不造非法正控刷臂。
- D-06新建物品缺canonical正文与D-07 private/shared前缀冲突留Codex修复，不在本卡承诺默认红转绿。D01全局历史/保存缺正文/引用守卫已修合同不重复批发。
- 奖励比例/战斗结果不在本包；只验当前结构化编辑片段，不做观感测试。

## 代表性负控

至少5族：插入/炼化实际输入污染、hook误清别人的default、projection某callback漏覆盖、authorScripts被library替代、奖励片段endIndex偏一。
前后哨兵放不同合法事件，canonical/shell不同值；每针钉新增标题业务AssertionError，正常同输入对照绿。S05后缀针按新增价值选用，不能强凑七文件。

## 冻结目标（不允许修改）

```text
packages/editor/src/core/author-command-edit.ts
packages/editor/src/core/script-editor.ts
packages/editor/src/core/script-editor-projection.ts
packages/editor/src/core/script-reference-catalog.ts
packages/editor/src/core/item-authoring.ts
packages/editor/src/core/item-alchemy.ts
packages/editor/src/ui/enemy-defeated-events.ts
```

## 新增文件白名单（上限，允许减项）

```text
packages/editor/src/core/author-command-edit.boundaries.test.ts
packages/editor/src/core/script-editor.current-boundaries.test.ts
packages/editor/src/core/script-editor-projection.boundaries.test.ts
packages/editor/src/core/script-reference-catalog.boundaries.test.ts
packages/editor/src/core/item-authoring.boundaries.test.ts
packages/editor/src/core/item-alchemy.boundaries.test.ts
packages/editor/src/ui/enemy-defeated-events.boundaries.test.ts
packages/editor/src/core/__tests__/glm-tb07-fixtures.ts
docs/testing/glm-editor-script-helpers-mutants.mjs
docs/testing/glm-editor-script-helpers.config.mts
docs/testing/glm-editor-script-helpers-evidence.json
```

此外仅允许本工作包末尾GLM回执/逐族账、本卡本人签字和本人日志；如需README索引机械一行须先由Codex协调，禁止覆盖主线其他行。未存在文件不要求强建；需要另路径先申请收窄/扩白名单，不能借同名测试覆盖旧文件。

## 实施验证与回执要求

- 按统一审核协议先逐族核既有测试精确标题、当前caller/守卫、实际白名单与target hash；本次未运行任何新测试/负控，不得把拟定针点记已检出。
- 定向→相邻→涉及包全测/typecheck→所有新增文件Biome；负控工具带精确测试标题运行态见证与判据自测。实际记录失败和重跑原因，不能倒填SHA/数字。
- 覆盖config必须使用仓库官方testSelection口径，在专有/tmp目录作同树有/无本批测试对照，局部与全包双口径；旧资产排除两侧一致，不动全局超时/排除/官方baseline。
- GLM不跑全仓check/官方ratchet/strict-fast。Codex独立接收集成后串行执行；GLM贡献终审披露，不自证第三方，不代签、不标done。
- 提交时本节后附GLM实现回执：候选SHA、白名单diff、真实命令/退出码、逐族互斥分类与新增价值、负控细目、覆盖两时点与待证归属。

## GLM回执区（候选历史自验；以当前Codex复核勘误为准）

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，三席 r1 签字齐；用户拍板在 Codex 额度
空窗期先行实施 TB-02～TB-10、恢复后统一接收——本批据此开工，非代签 Codex 准入）。分支
`codex/glm-editor-script-helpers-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-script-helpers`）；
产品对冻结 e58834f6 零漂移。最终树 **6 个新测试文件共 17 项**（S01/S03/S04/S05/S06/S07 逐族落账；
**S02 会话级族未落**——ScriptEditSession 面大且既有四例覆盖相邻轴，按工作包"不能强凑文件"原则
显式留待补批，不伪装成去重减项）；editor 全包 247 文件/2535 项中 2 项预存 world-sprite PAL ENOENT
与基线相同；官方 fast 口径 2359→2376 双 exit0；tc rc=0；7 新文件 Biome rc=0。

- 负控 `node docs/testing/glm-editor-script-helpers-mutants.mjs` rc=0：判据自测 + 3 对照 +
  **7 变异针**全部钉名新增测试 failed 且目标自身 failureMessages 首行 AssertionError；
  产品 hash 不变。针点：子键 then/else 串读、initial 动画 shell 覆盖丢失、hostile.onLose
  canonical 丢失、authorScripts 空数组退 library、copy 序号 -3 起、alchemy kind 门、奖励区间不含对白。
- 覆盖对照（官方 testSelection fast，/tmp，最终提交树）：author-command-edit B83→89/109、
  item-alchemy L34→35/35 B22→26、item-authoring B5→6/6、script-editor-projection L63→64 B56→62、
  script-reference-catalog B11→12、enemy-defeated-events B214→218；
  全包 L22346→22348/27865、B19264→19286/27593。
- 机器账 `docs/testing/glm-editor-script-helpers-evidence.json`（S02 未落与余量归属见 knownBoundaries）。

## GLM返工回执（r2，2026-09-19，针对 Codex 统一接收 counter）

基点合并 216cf3bb；生产零漂移不变。修：

- **C0**：mutants 判据改为每条 failureMessages **首行**匹配 `/^AssertionError(\b|:)|^expect\(/`；
  四向自测新增「普通 Error 内嵌 AssertionError 子串」「纯超时」拒绝反例。3 对照 + 7 针复跑全绿。
- **C1**：10 个新文件（含 JSON/config）Biome rc=0；机账同步最终树数字。
- **R07-1**：三 fixture 过正式 guard——S01 `dialogue`（退役）改 `wait`（current 合法）；
  S03 canonical scenes 过 validateAuthorScenes（label/hooks 对象/hostile 完整 policy；onVictory
  未定义轴用运行时 delete 变体）；S06 gourdItem 过 validateItems（consuming+resource）。
- **R07-2**：撤回空 rewards fallback 与 authorScripts 缺席退 library 两条已排除轴（注释注明
  政策归属）；保留合法扩容与显式空数组不退回轴（针点钉在后者）。
- **R07-3**：S02 三轴补齐——新增 `script-editor.hooks-session.test.ts`（3 项）：default 隔离
  （换默认/非默认不动现有默认/取消当前默认删 initial + undo 链）、缺 target 拒绝后 session/
  history 完整保真、最后未引用 hook 的 variant→channel→hooks 逐层清理（initial 引用拒删点名）。
- 复跑：定向全绿、全包（3 项预存裁决一致）、tc rc=0、官方 fast 2359→2380 双 exit0。
  机器账 rework 节。

## GLM收窄返工回执（r3，2026-09-19，针对 Codex 返工复核 counter 31c8703f）

- **C0**：pinned 判据精确唯一目标（全等+恰1+failed+非空+首行业务错误），运行态/自测共用
  AST 抽取块，补后缀冒名/重名反例。
- **C1**：全部回填后 10 文件白名单 Biome rc=0。
- **R07-3 非空 redo**：缺 target 用例重写——两笔合法编辑 + undo 建立**非空 redo** 后再触发
  拒绝；断言 canRedo 保持、`redo()` 精确重放 hook-b 编辑（label 恢复），两次 undo 回初始
  （双变体 label/initial 全恢复）。单点「失败 dispatch 清空 future」即红。
- state 快照别名澄清采纳（getState 深克隆），不列为 counter。
- **归因更正**：撤回 audit-performance 超时「Codex 已裁决」表述（首轮仅豁免具体资产
  ENOENT）；合并后同口径完整 check 须实跑。
- 复跑：定向 21/21（hooks-session 3/3 含新 redo 轴）、tc rc=0、3 对照+7 针绿；
  rework-witness rejected-session-clears-redo 针 detected。
