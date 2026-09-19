# GLM脚本与内容编辑辅助补测工作包（TB-07）

任务：[TEST-EDITOR-SCRIPT-HELPERS-1](../ops/tasks/TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries.md)，r1/draft。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`；策划树 `4473c367`。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试，**未获build授权**。
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

## GLM回执区

待实施。当前只有Codex规划与前提复核，不存在GLM交付或accept。
