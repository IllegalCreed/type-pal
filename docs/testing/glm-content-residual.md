# GLM内容合同残项工作包（TB-01）

任务：[TEST-CONTENT-RESIDUAL-1](../ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md)，r1/draft（规划中，未获实施授权）。
生产核对点 `e58834f6389a40ffe9f187e6a8051f552e964d79`（队列基线）。GLM只写新测试；Codex独立接收、Kimi终审。
本包**只补**[已接收内容合同包回执](glm-content-contracts.md)明确登记的残项与新核的 validate-refs 数据引用轴；
已接收 118 项/43 族不重做，TextEncoder 降级不存在不补，D-06/D-07 留修复归属。

## 冻结快照与跨包去重表（本人 2026-09-19 复核）

模块计数来自[机器台账](glm-coverage-work-queue.json)（census --check 通过）。跨包去重是本批定案依据：

| 候选族 | 跨包既有证据 | 裁决 |
|---|---|---|
| actor-reference 表情重命名 :293-340 | editor `core/actor-dialogue-commands.ts:76` **直接调用** content `renameDialoguePortraitExpression`；`actor-dialogue-commands.boundaries.test.ts:149+` 已钉全部目标 cue（scene/chunk/enemy 三域）、非目标不动、目标表新 key 承接原 asset、深快照、invert 完整恢复 | **已有（跨包间接）**——不为覆盖率把同一业务搬包计新增；仅当发现 content 侧独立参数域（如 T 泛型返回新树的别名语义未被 editor 用例钉住）才留薄轴，定案时逐行核 |
| frame-sequence 多字节 encode 臂 :103-112 | 上包回执已分类：合法编码元数据经 prepare/finish 后为 ASCII 字段，多字节只在非 ASCII 元数据输入域出现 | **防御/不可达**——不造当前合法域外输入 |
| 上一包已交付且已接收的 118 项 | content-contracts 各 `.contracts.test.ts`（已合入 main） | **已有**——逐项对账不重做 |

## 目标模块与剩余族（A1–A12；行/分支为台账冻结数）

| 模块 | L | B | 剩余族（锚点为本人在 e58834f6 直读） |
|---|---:|---:|---|
| asset.ts | 275/296 | 241/289 | **A1** collectDialoguePortraitReferences 的 unbound 直连肖像臂 :409-421（上包登记可达未测）；**A2** :282-287 相邻收集臂（直读核caller后定增删） |
| actor-reference.ts | 75/93 | 73/113 | **A3** rename 跨包去重（见上表）；仅留薄轴或整族登记已有 |
| frame-sequence.ts | 232/270 | 162/236 | **A4** 外部 UTF-8 解码错误路径 :116-152 中未钉的轴（合法多字节**解码**输入 vs 不可达 encode 臂分开）；**A5** index JSON 解析失败轴（可达性先核） |
| author-dialogue.ts | 75/80 | 76/97 | **A6** rows 长度/元素 :60/:132；**A7** speed 非法 :141；**A8** autoAdvance :149；**A9** slot :157；**A10** cursorFrame :164（各守卫轴单轴反例+合法正控） |
| map-index.ts | 52/53 | 42/49 | **A11** :41-55 剩余拒绝边界逐轴（与既有 map-index 契约测试去重后仅补缺） |
| validate-refs.ts | 580/628 | 448/522 | **A12** 数据引用轴族：world appearance.battleSprite :418-423、onLose/onFlee 叶 :470-475、商店货单→item、scriptChunks 显式扫描臂、levelUp 属主悬空 :1655、optional 缺席对照——合法整工程先过校验，每例只坏一轴并钉精确 issue 路径/目标 |

## 唯一新增白名单（均当前不存在）

```text
packages/content/src/asset.residual.test.ts
packages/content/src/actor-reference.residual.test.ts
packages/content/src/frame-sequence.residual.test.ts
packages/content/src/author-dialogue.field-guards.test.ts
packages/content/src/map-index.residual.test.ts
packages/content/src/validate-refs.data-refs.test.ts
packages/content/src/__tests__/glm-content-residual-fixtures.ts
docs/testing/glm-content-residual-mutants.mjs
docs/testing/glm-content-residual.config.mts
docs/testing/glm-content-residual-evidence.json
```

fixture 复用上包 `glm-content-contract-fixtures.ts` 的薄数据风格（保真深快照/spriteAssetRecord），
但**独立新文件**（不同批不得共用可修改 fixture）；validate-refs 合法整工程 fixture 过
loadCurrentProjectFrom 级守卫再进断言。

## 负控与验收方案（草案，针数卡面定案）

- 每独立保护族≥1 针、整包≥6 针：唯一替换、同输入正常绿、钉新增测试精确标题 failed 且
  AssertionError 业务红；判据含毒日志自测（沿上包 mutants 模板：AST 抽取判据块+JSON 执行见证）。
  候选针点（定案时验唯一性）：asset unbound 臂门、author-dialogue 各守卫 throw、map-index 拒绝门、
  validate-refs appearance/levelUp 悬空门、frame-sequence 解码错误包装。
- fixture 合法性：A12 整工程经现行 loader；其余过对应 validator；反例只坏一轴且配同基线正控。
- 覆盖对照：官方 testSelection（content fast）before 只排本批 6 文件/after 加入，/tmp 专属输出，
  六模块局部与全 content 包并集分栏；与上包已接收 118 项的重叠单列不累计。
- 定向+相邻（上包 13 契约文件+旧 asset/frame-sequence 测试）+content tc+全包+新增文件 Biome。
- 完成条件：A1–A12 逐族新增/已有/防御/待证落账；新缺陷隔离登记不改产品；无固定条数承诺。

## 已知边界

不补 TextEncoder 降级（不存在）；不复制 editor rename 业务（跨包已有）；D-06/D-07、
B4 authoring 放置轴留各自归属；enemy-team-reference/script-library 无 caller 不保活。
