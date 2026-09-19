# GLM地图选区与组合模板数据补测工作包（TB-06）

## 当前Codex接收结论

二轮候选d8b02958仍为**counter**，仅返[本轮报告](glm-nine-rework-review.md)的C0精确唯一目标、C1最终树格式/回执及所列本批残项。
原七针与五夹具已关闭；定向18项通过，本批Biome exit1。不重开已关闭项、不重签、不合并、不更新基线。

### 首轮接收结论（历史）

**counter**。定向18项/原3+8跑/tc通过，但仍有公共C0和本批业务返工；Biome完整面10文件/1 errors。详见[统一复核TB-06](glm-nine-intake-review.md#tb-06)。
本轮认可用户先行实施授权；不合并测试、不更官方基线、不转Kimi。下面GLM回执为候选自验原文，不能覆盖当前counter；生产零改只指已列新增测试/fixture之外，不能写整个packages diff为空。


任务：[TEST-EDITOR-MAP-DATA-1](../ops/tasks/TEST-EDITOR-MAP-DATA-1-selection-stamps.md)，r1/rework；本轮实施候选0563eda7未接收，设计不重签。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试；三席设计有效，用户已批准本轮先行实施，当前接收counter。
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

## GLM回执区（候选历史自验；以当前Codex复核勘误为准）

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，三席 r1 签字齐；用户拍板在 Codex 额度
空窗期先行实施 TB-02～TB-10、恢复后统一接收——本批据此开工，非代签 Codex 准入）。分支
`codex/glm-editor-map-data-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-editor-map-data`）；
产品对冻结 e58834f6 零漂移。最终树 **7 个新测试文件共 18 项**（M01-M08 逐族落账；M06 按工作包
"优先防御分类，非必增文件"整族记已有/内部防御，减 1 文件与 fixture 白名单项）；
定向 18/18 绿；editor 全包 248 文件/2536 项中 2 项预存 world-sprite PAL ENOENT 与基线相同；
官方 fast 口径 2359→2377 双 exit0；tc rc=0；8 新文件 Biome rc=0。

- 负控 `node docs/testing/glm-editor-map-data-mutants.mjs` rc=0：判据自测 + 3 对照 +
  **8 变异针**全部钉名新增测试 failed 且目标自身 failureMessages 首行 AssertionError；
  产品 hash 不变。针点：全选隐藏层门、paste collision 冲突判定、patch collision 重复门、
  draft 层空值门、模板 id 归一、placement 锁层门、group capture 去重、模板 category。
- 覆盖对照（官方 testSelection fast，/tmp，最终提交树）：map-selection B201→211/228、
  map-transform L168→171/181 B108→110、map-patch L138→140 B145→147、
  stamp-draft L153→155 B123→129、stamp-placement L112→118 B74→79、
  stamp-template B36→39、stamp-group-transform B116→118；
  全包 L22346→22359/27865、B19264→19294/27593。
- 正控先过真实 validateProjectMap/validateStampTemplates/buildBlankProjectMap+真实 paint/capture
  （placement 占位组用真实 withProjectMapStampPlacements 写入链）；失败计划钉完整 issues/空写
  计划；地图/权限/clipboard 均比较实参快照。
- 机器账 `docs/testing/glm-editor-map-data-evidence.json`。
