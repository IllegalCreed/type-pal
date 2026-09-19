# GLM地图选区与组合模板数据补测工作包（TB-06）

任务：[TEST-EDITOR-MAP-DATA-1](../ops/tasks/TEST-EDITOR-MAP-DATA-1-selection-stamps.md)，r1/draft。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`；策划树 `4473c367`。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试，**未获build授权**。
表内为已按调用域筛选的候选，不是已经完成的新增覆盖；允许去重后减文件/减族，不设必须凑足的用例数。

## 合同族、既有去重与剩余候选

路径在 editor/src/core；行号为冻结树。

| 族/模块 | 当前caller | 已有强断言（同名test） | 允许新增候选 |
|---|---|---|---|
| M01 map-selection | MapMode:334/2808、MapSelectionInspector:53 | :278接管裁去双身份、:314 clip顺序、:369 map隔离、:484全选范围 | :378/380空reset/删不存在引用不变；:433–461 context错配no-op；:591–607隐藏活动层/排除key精确非空集合；summary过期层只统计现存数据 |
| M02 map-transform | MapMode:672/690 | :131 ownership硬错、:265 collision-only、:311锁步、:351重叠往返、:415失败映射 | 捕获后目标层删除但另一目标仍有效；collision越界/同值与不同非0冲突；失败canApply=false且两patch数组全空，源/clipboard不变；placement误入普通delete |
| M03 map-patch | commands:1124、stamp-group-command:135 | :53 ownership先于no-op、:110窄入口、:198高度往返、:283坏patch、:356防御复制 | collision重复同格不同值；坐标/值单轴；合法旧非空改null同步清source；完整issues，map/patch/permission三个实际输入快照 |
| M04 stamp-draft | StampContentEditor:234/269/306/315/465/487/681 | :38来源保真、:57/72 resize、:85 CRUD、:102最后视觉；:109旧移动 | 空名/重复ID、缺layer、layerTo边界no-op；两层仅一有值时删最后视觉拒绝；UI实际Map式availableTiles缺tile拒绝 |
| M05 stamp-placement | MapMode:727/1363 | :94来源/相对高、:134错排、:161 ownership、:182分配ID；参数化映射/越界 | 已占placementId、未知/重复mapping、锁层、两合法源映到同槽歧义；完整issues与实际输入不变 |
| M06 stamp-placement-mutation | stamp-group-command:153/210/259、stamp-placement-command:39、stamp-lifecycle:149 | :35增改删末项过v4、:74/91所有者、:114不变量、:169缓存 | **优先防御分类，非必增文件**；删除缺ID/重复upsert/anchor与成员非法只在真实调用能送达guard时补；不手造内部prepared对象 |
| M07 stamp-group-transform | MapMode:663/679/1602 | :97/111/152/200捕获与copy/cut/move/delete、:259/305跨图/锁/越界、:340 no-op | 真实capture后selection变更；preserve/cut时原ID仍占用；空/缺失组；provenance缺省保持，合法视觉组gridPoints为空 |
| M08 stamp-template | StampTemplateDialog:64/190、StampLibraryTab:255/315 | :43多层/height/显式0、:80无视觉拒绝、:116名字/ID | 合法map+过期选区越界/删层、重复ref去重、layerSlotNames回退/category trim、按map层序而非selection序；输出不别名 |

## 输入与排除

- 持久化正控先过真实validateProjectMap/validateStampTemplates，使用buildBlankProjectMap/真实paint与capture，不自写一套“合法性”判定。
- draft编辑中间态由真实draft API产生，可以暂时不满足持久化守卫（stamp-draft:36–58）；不得把坏模板称合法。
- placement必须至少一视觉成员（mutation:80–82）；禁止collision-only整组正控。nullable collision数据与实际走路语义不是同一任务。
- 不续测无生产caller的stampDraftPoint/moveStampDraftLayer/moveStampDraftSelection/stampDraftBounds；Set式availableTiles先证调用，否则分类。
- 不强测合法dense矩阵中undefined/source缺失、构造已保证的重复目标、非法action默认分支。M06可全归已有/内部防御。
- base+relative数值限值只按实际控件输入与D29现行规则，不发明新高差/碰撞政策。旧commands47、全局历史D01、保存恢复不重开。

## 代表性负控

至少6族：取消选区排除/错配门、失败计划仍留部分patch、重复collision写门、最后视觉成员门、placement身份/mapping门、template层序或clipboard不变性。
使用不对称多层/多目标正控；失败必须钉完整issues和空写计划，不能只expect(false)或允许TypeError。地图/模板/权限/clipboard均比较**实际入参**；不做鼠标、浏览器、截图或视觉验证。

## 冻结目标（不允许修改）

```text
packages/editor/src/core/map-selection.ts
packages/editor/src/core/map-transform.ts
packages/editor/src/core/map-patch.ts
packages/editor/src/core/stamp-draft.ts
packages/editor/src/core/stamp-placement.ts
packages/editor/src/core/stamp-placement-mutation.ts
packages/editor/src/core/stamp-group-transform.ts
packages/editor/src/core/stamp-template.ts
```

## 新增文件白名单（上限，允许减项）

```text
packages/editor/src/core/map-selection.boundaries.test.ts
packages/editor/src/core/map-transform.boundaries.test.ts
packages/editor/src/core/map-patch.boundaries.test.ts
packages/editor/src/core/stamp-draft.boundaries.test.ts
packages/editor/src/core/stamp-placement.boundaries.test.ts
packages/editor/src/core/stamp-placement-mutation.boundaries.test.ts
packages/editor/src/core/stamp-group-transform.boundaries.test.ts
packages/editor/src/core/stamp-template.boundaries.test.ts
packages/editor/src/core/__tests__/glm-tb06-fixtures.ts
docs/testing/glm-editor-map-data-mutants.mjs
docs/testing/glm-editor-map-data.config.mts
docs/testing/glm-editor-map-data-evidence.json
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
