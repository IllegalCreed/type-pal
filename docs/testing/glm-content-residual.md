# GLM内容合同残项工作包（TB-01）

任务：[TEST-CONTENT-RESIDUAL-1](../ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md)，r2/build（三席齐，Codex已核定开工；GLM负责实施，未交付）。
生产核对点 `e58834f6389a40ffe9f187e6a8051f552e964d79`（队列基线）。GLM只写新测试；Codex独立接收、Kimi终审。
本包**只补**[已接收内容合同包回执](glm-content-contracts.md)明确登记的残项与新核的 validate-refs 数据引用轴；
已接收 118 项/43 族不重做，TextEncoder 降级不存在不补，D-06/D-07 留修复归属。

## r2收口依据（Codex，2026-09-19）

完整复核、证据与两席统一交接见[前三批设计收口](glm-coverage-queue-design-review.md)。生产目标不变，测试范围按真实caller收窄。
content的tsconfig是`lib:ES2022/rootDir:src`，**不得在新测试中反向import reforge的loadCurrentProjectFrom**或修改依赖/tsconfig。
合法载荷直接过content现行`validateAuthorScenes/Items/Enemies/SharedScripts`及对应目录守卫；world用正式构造器建立。
引用测试先证结构合法且`validateReferences`零issue，再只坏目标引用并核完整issue多重集合。
上层loader不在本包直接被测，不把通过结构守卫称为已完成loader/保存/重开验证。

## 冻结快照与跨包去重表（r1盘点，r2按当前合同收窄）

模块计数来自[机器台账](glm-coverage-work-queue.json)（census --check 通过）。跨包去重是本批定案依据：

| 候选族 | 跨包既有证据 | 裁决 |
|---|---|---|
| actor-reference 表情重命名 :293-340 | editor `core/actor-dialogue-commands.ts:76` **直接调用** content `renameDialoguePortraitExpression`；`actor-dialogue-commands.boundaries.test.ts:149+` 已钉全部目标 cue（scene/chunk/enemy 三域）、非目标不动、目标表新 key 承接原 asset、深快照、invert 完整恢复 | **已有（跨包间接）**——A3默认不新增文件；只有可证明不同于上述既有合同、且有current caller的独立参数轴才补，不能用任意泛型对象/循环引用填数 |
| frame-sequence 多字节 encode 臂 :103-112 | 上包回执已分类：合法编码元数据经 prepare/finish 后为 ASCII 字段，多字节只在非 ASCII 元数据输入域出现 | **防御/不可达**——不造当前合法域外输入 |
| 上一包已交付且已接收的 118 项 | content-contracts 各 `.contracts.test.ts`（已合入 main） | **已有**——逐项对账不重做 |

## 目标模块与剩余族（A1–A12；行/分支为台账冻结数）

| 模块 | L | B | 剩余族（锚点为本人在 e58834f6 直读） |
|---|---:|---:|---|
| asset.ts | 275/296 | 241/289 | **A1** `commandAssetTaggedReferencesAtNode` 的unbound直连肖像臂:409–421，先checkAuthorDialogueCue；`collectDialoguePortraitReferences`属于actor-reference且刻意不扫unbound，原稿函数名有误。**A2** :281–292实际是`palBattleSpriteAssetId`，不是收集器：只核现行migrate caller与既有覆盖后补player0/enemy正整数等合法参数轴，不测类型域外channel |
| actor-reference.ts | 75/93 | 73/113 | **A3** rename 跨包去重（见上表）；仅留薄轴或整族登记已有 |
| frame-sequence.ts | 232/270 | 162/236 | **A4** 外部 UTF-8 解码错误路径 :116-152 中未钉的轴（合法多字节**解码**输入 vs 不可达 encode 臂分开）；**A5** index JSON 解析失败轴（可达性先核） |
| author-dialogue.ts | 75/80 | 76/97 | **A6** rows 长度/元素 :60/:132；**A7** speed 非法 :141；**A8** autoAdvance :149；**A9** slot :157；**A10** cursorFrame :164（各守卫轴单轴反例+合法正控） |
| map-index.ts | 52/53 | 42/49 | **A11** :41-55 剩余拒绝边界逐轴（与既有 map-index 契约测试去重后仅补缺） |
| validate-refs.ts | 580/628 | 448/522 | **A12** 优先world appearance.battleSprite:418–423、商店货单→item、levelUp属主:1655与optional缺席；当前结构守卫+零issue正控后只坏引用。onLose/onFlee须走当前合法startBattle/当前投影载荷。scriptChunks/scriptIndex仅有API字段或旧测试不证明当前非空消费，先作caller分类，**没有当前消费者证据不得新增旧分片正例** |

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

fixture复用上包薄数据风格，但独立新文件，不改共享fixture。每种实际载荷按本包对应表面守卫，
不得像TB-00那样造onTeleport非initial入场、外部runScript混用私有脚本，或用`as unknown`跳过合法性。
白名单为允许上限而非必须创建六文件；A3或其它已完整覆盖族只登记已有。

## 负控与验收方案（草案，针数卡面定案）

- 每独立保护族≥1 针、整包≥6 针：唯一替换、同输入正常绿、钉新增测试精确标题 failed 且
  AssertionError 业务红；判据含毒日志自测（沿上包 mutants 模板：AST 抽取判据块+JSON 执行见证）。
  候选针点（定案时验唯一性）：asset unbound 臂门、author-dialogue 各守卫 throw、map-index 拒绝门、
  validate-refs appearance/levelUp 悬空门、frame-sequence 解码错误包装。
- fixture合法性按上述content边界：不引运行时loader；反例只坏一轴且配同基线正控，所有字段为真实当前模型。
- A4/A5从真实TPFS正控重建index字节长度/保留payload，分别到达UTF-8与JSON错误，不能都被header错误提前挡住；多字节decode正控可用当前validator容许的外部JSON扩展字段，不因此新增编码器功能或更改宽严政策。
- A6–A10明确缺席/0/合法枚举正控，speed/autoAdvance为非负有限数、非仅整数；旧rows空/字符串例已测，不重复改名计新增。A11先扣掉旧重复ID/路径/覆盖自身索引，再补容器/name/path错型等真实余项。
- 覆盖对照：官方 testSelection（content fast）before 只排本批 6 文件/after 加入，/tmp 专属输出，
  六模块局部与全 content 包并集分栏；与上包已接收 118 项的重叠单列不累计。
- 定向+相邻（上包 13 契约文件+旧 asset/frame-sequence 测试）+content tc+全包+新增文件 Biome。
- 完成条件：A1–A12 逐族新增/已有/防御/待证落账；新缺陷隔离登记不改产品；无固定条数承诺。

## 已知边界

不补 TextEncoder 降级（不存在）；不复制 editor rename 业务（跨包已有）；D-06/D-07、
B4 authoring 放置轴留各自归属；enemy-team-reference/script-library 无 caller 不保活。
