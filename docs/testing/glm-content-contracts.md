# GLM六组内容合同补测工作包与回执

任务：[TEST-CONTENT-CONTRACTS-1](../ops/archive/tasks/done/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md)，r1/done（源428a7852→集成adbabb84；三席accept、用户确认签字，Codex于2026-09-18核零漂移并归档）。
生产冻结`7ab20689447150eec7ecb0678cbb6980a685eb49`。GLM写新测试，Codex独立接收集成，Kimi独立审查；无视觉任务。
本文件保留派发范围与返工后的最终对账回执；原候选 dbe579c5 的回执/机器账保留在该树。三签设计门禁、白名单与纪律以任务卡为准。

## 派发时已核快照（Codex，2026-09-18；历史，非接收后覆盖率）

官方fast全仓6814项/617生产文件；content557项/50文件，行4358/5183、分支3666/5016。
下表来自coverage/fast/content/coverage-summary.json，与现行baseline同一时点；只读统计，没有运行新覆盖率或修改基线。

| 组 | 模块（content/src/） | 行命中/总数 | 分支命中/总数 |
|---|---|---:|---:|
| A | asset.ts | 267/296 | 229/289 |
| B | project-map.ts | 144/157 | 119/159 |
| B | map-index.ts | 51/53 | 40/49 |
| B | tileset.ts | 22/28 | 30/39 |
| B | stamp.ts | 29/32 | 24/33 |
| C | frame-sequence.ts | 229/270 | 156/236 |
| D | sprite.ts | 0/11 | 0/12 |
| D | battle-sprite.ts | 75/77 | 57/70 |
| D | enemy-team.ts | 0/28 | 0/30 |
| E | author-dialogue.ts | 70/80 | 68/97 |
| E | actor-reference.ts | 40/93 | 24/113 |
| E | command-target-reference.ts | 88/89 | 83/94 |
| F | validate-refs.ts | 578/628 | 445/522 |

13模块总1842行/1743臂，未命中468臂。这不是468个缺陷/用例，也不把其他包已经间接执行的函数说成全仓未测。
最终报告必须重测自己的冻结树，不能复制该表当作新增后的结果。全content包与13目标局部指标分别输出。

## 六组检查族（先去重，再补真正缺口）

### A · 资源目录和物理闭包

- A1 相对路径合法保值与NUL/绝对路径/盘符/scheme/反斜杠/query/fragment/空段/点段边界；只补既有asset.test.ts没有钉住的合同。
- A2 catalog的kind/mediaType/bytes/hash/origin路径/可选label/ref；单字段反例配同域合法对照，不能发明所有字符串都须trim的规则。
- A3 manifest角色名、所指AssetId与期望kind；有音频与无音频的角色要求分别核，不把缺可选配置一律拒绝。
- A4 tagged资源引用与按site归组：精确asset/kind/where/site、出现次数及非目标字段；存在相似普通字符串不自动成为引用。
- A5 missing-asset/kind-mismatch/unused-asset按error/warn及完整路径区分；正常多记录正控不以空catalog遮掉问题。
- A6 validateAssetFileClosure对引用与未引用记录都核文件、大小和摘要；大小错但摘要对/大小对但摘要错、读失败与sha回调失败分别读合同。
  使用真实小字节及独立摘要校验，记录传入readBytes/sha的字节与调用；不把任意常量hash当作真实文件闭包验证。

### B · 地图、瓦片集、组合模板

- B1 map-index稳定ID、规范化后路径冲突、自身索引保护、next identity冲突选择；明确与asset路径“拒绝不规范化”不同。
- B2 地图当前v4入口、宽/高与height×2矩阵、至少一层/稳定layer id、来源表与逐格source边界；不测试人物碰撞/走位语义。
- B3 单来源sources省略的唯一物化、双来源必须显式、tile0与null、heights省略/全0与非0保持、空格不带非0高度。
- B4 地图authoring放置身份与可复原内容的当前约束；有实际调用再补，并核完整结果而非只JSON能够parse。
- B5 format/parse确定性、规范化输出、不污染输入、mapInstanceHeight/mapInstanceTilesetId的现行访问合同。
- B6 tileset注册表重复/缺失/错kind、稳定id→asset解析，退役path/tiles必须拒绝；不新增旧格式兼容。
- B7 stamp anchor上下边界、多层多来源、有视觉实例、origin/category可选合同；nullable碰撞与地图dense碰撞分开。
- B8 模板format/parse完整往返与未触字段保持；已被stamp.test.ts或editor包明确钉住的同合同用例登记已有，不复制充数。

### C · TPFS帧容器与纯数据时序

- C1 magic/version/reserved/index length/UTF-8/JSON边界；错字节拒绝要确实进入对应分支，不能始终在文件头提前失败。
- C2 index字段类型、有限数/合法小数时长、安全乘积、payload范围、块计数/连续性/长度的独立轴。
- C3 31/32/33等跨块边界先核旧测试35帧覆盖；只补新增鉴别力，逐帧所有RGBA（包括alpha）比独立输入，不只比较第一帧。
- C4 sync/async/provider入口合同、getFrame索引调用与失败传播；压缩/解压回调给可追踪非空输入，正常/失败用同一fixture基线。
- C5 Uint8Array非零byteOffset视图与输出别名/输入不变边界，按实际API合同断言；不能只encode→decode互相自证。
- C6 playback start/end/frameRate、逐帧时长与默认时长优先级及端点；只测纯计算，不操作浏览器或评价动画流畅度。
- C7 使用极小确定性数据、显式预期header/索引/像素；不依赖PAL原盘、不生成巨量帧、禁止镜像整套生产编码算法当oracle。
- C8 宿主TextEncoder等降级分支先核当前支持域；仅靠删全局API才可达的臂单列，不为了100%固化不支持宿主。

### D · 精灵及敌队定义

- D1 spriteDefinitionFrameDemand/Indices：static/directional/loop及actions叠加，完整集合与最大索引+1、一组资源多种定义；需求量不等于实际帧数。
- D2 缺poses/多个动作/重复帧/高索引与不改原输入；合法SpriteDef先验证，不传非法布局让纯计算helper背负新校验责任。
- D3 battle profile player/enemy/summon与真实帧数参数：optional steal、合法0帧段/0 tick、集合去重与范围、expected profile单值/集合/缺省。
- D4 缺asset/错kind/重复id/退役number-path在声明守卫处拒绝，不测试战斗公式、原版帧演出或图像效果。
- D5 enemyTeams结构与引用分层：空/非空/null槽、上限5、重复ID、坏槽、缺敌人及精确team/slot路径；原数组/槽位不污染。
- D6 可选enemyIds缺省与传入时语义不同；重排目标表不应改变稳定ID含义。0%是content-fast现状，不抹掉loader/publication间接测试。

### E · 对话身份与typed引用

- E1 narration/actor/unbound合法联合与非法半状态；portrait.side/rows/可选slot、autoAdvance/speed合法0等按当前守卫逐轴去重。
- E2 resolver actor缺失/主立绘缺失/命名表情缺失不fallback，speakerOverride与不带portrait的合法对照；全部resolved字段及输入/输出引用隔离。
- E3 actorTaggedReferencesAtNode各当前tag输出完整kind/actorId/where，setParty各成员与非目标同名字段，不能只验非空。
- E4 整树递归和canonical单命令分别覆盖：嵌套command arms由谁负责、cond/choreography由谁递归，不把双遍历得到重复边当正确结果。
- E5 collectDialoguePortraitReferences：actor默认/表情与unbound全局asset区分，精确where与其它角色不误收。
- E6 command target各现行tag、显式EntityAddress、self/current目标区别，空值/错型按公开unknown入口合同不产生假边。
- E7 rewriteExplicitSceneReferences只改typed的自身scene，不改普通文字/外部scene；完整树预期与输入深快照。旧readonly字段只登记，不新增旧磁盘模型绿色合同。

### F · 跨表引用闭包

- F1 先建立带非空目录/真实稳定ID的干净ContentBundle；正常载荷过对应当前结构守卫，再从该基线只坏一个引用。
- F2 entry/scene/map、人物/世界精灵、sprite动作复合(sprite, action)与battle profile引用；精确issue数组/路径/级别/目标和不相关项保持。
- F3 装备/技能/毒/敌队/商店的**数据引用**与已存在允许降级warning；不做物品或战斗执行、不重裁玩法。
- F4 当前作者scene/共享正文/item-private/enemy正文经实际支持的投影入bundle，递归根域不漏；不得把同名随机字段、旧分片磁盘形态当现行作者合同。
- F5 可见world/伴随levelUp等可选切片的真实引用与缺席对照，external/companion/runtime-readonly策略只按现行接口读。
- F6 正控→一轴悬空→补回目标恢复的往返，按Issue合同比较完整输出，不以.some找到一条错就忽略多报/误报。
  未声明输出顺序时比较保留重复次数的完整多重集合，不用Set吞掉重复边，也不凭当前循环顺序发明排序合同。
- F7 已知D-02编辑器漏边、D-06/07作者状态问题继续归Codex；本包content引用验证通过不等于editor删除/保存链已修。
- F8 无caller/重叠守卫/不可达防御/未明合同逐项分类，附源码与反证条件，不把所有未覆盖臂解释成已发现bug。

## 交付形式

六组各一提交或清晰提交序列，最后统一交候选。由GLM在下节填写：每个检查族唯一ID、现行caller、已有测试、新增测试全标题、
合法正控/一轴反例、反控唯一点与真实红因、分类/后续归属；没有完成的族不能留空或强记N/A。
同一用例可覆盖多个族，但新增用例总数按Vitest现场输出去重，不能按表行数相加。

每组至少两条有效反控；最终同源码before/after的目标13模块与全content包两个口径分列。
before只剔本包新文件，after只增加本包；诊断config直接消费官方testSelection，不正则抄配置，不写官方输出目录。
每组定向/明确相邻、content typecheck、新文件Biome；最终重新对账计数、源码hash、白名单、命令exit及失败记录。
GLM不做全仓check/ratchet/strict-fast；Codex接收适配最新主线后统一串行跑，最终Kimi独立终审。

## GLM设计与实施回执（由GLM填写）

r1 返工完成（2026-09-18，GLM；对应[counter R1～R4](content-contracts-review.md)，原候选 dbe579c5 回执/自验保留在该树）。
分支 `codex/glm-content-contracts-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-content-contracts`），
在 counter 31aa0e3b 之上追加返工提交；产品对冻结 7ab20689 零漂移不变。
最终树：13 新测试文件 **118 项**（27+5+5+15+4+19+4+5+11+7+6+4+6，Vitest 现场去重）；
定向 13 文件 118/118；全 content 包 55 文件/675 项；`tsc --noEmit` rc=0；新文件 Biome rc=0。

**返工要点**：R1——F bundle 去退役 onEnter、sprites 补 label，F1/A4 主载荷在测试内先过
validateAuthorScenes/validateSprites/validateActors/validateBattleSprites；A4 普通字符串移入合法
hooks.onEnter.variants.main.flow 的 setFlag.flag（见证工具 7 项 fixture 检查全 accepted）。
R2——actor 表快照改为比较**真正传入**的同一对象；来源越界只坏一轴并核错误路径+修正正控；
C5 对非零 offset 视图完整解码逐像素比较；F 全部改为确定 severity、完整 where、完整 Issue
多重集合（levelUp 悬空技能=warn）。六针见 witness 复跑全部 detected 且执行检查 passed。
R3——mutants 脚本改 JSON 报告运行态执行见证（钉本组新增测试精确标题必须 failed），判据块
拒绝 TypeError/ReferenceError/timeout/Unhandled Errors 混入，并带 AST 抽取自身判据的正反控自测
（good 日志通过、混合坏日志拒绝；接收工具 `mixedFailureAccepted` 已翻 false）。
R4——下方 43 族逐项对账（新增/已有/待证/防御/N-A/缺陷归属附锚点）；命令改为可复制绝对路径；
evidence.json 过 Biome formatter；提交计数按真实历史（原 8 + counter 后返工提交，见任务卡）。

| 组 | 当前状态 | 新增/已有/待证（详见 43 族账） | 命令与证据 |
|---|---|---|---|
| A | 完成 | 新增 32；负控 2 | 定向 2 文件 32/32；`asset-path-segment-gate-removed`/`asset-role-kind-gate-removed` AssertionError 红 |
| B | 完成 | 新增 24（B4 已有不重复）；负控 2 | 定向 3 文件 24/24；`map-row-count-gate-removed`/`stamp-anchor-bound-gate-removed` 红 |
| C | 完成 | 新增 19（C4 provider 补齐；C1/C2 部分 UTF-8/JSON 轴待证；C8 N/A）；负控 2 | 定向 19/19；`tpfs-decode-drops-xor-delta`/`tpfs-duration-framerate-layer-removed` 红 |
| D | 完成 | 新增 20；负控 2 | 定向 3 文件 20/20；`sprite-demand-drops-pose-max`/`enemy-team-slot-cap-removed` 红 |
| E | 完成 | 新增 17；负控 2 | 定向 3 文件 17/17；`actor-walker-drops-tree-recursion`/`dialogue-resolver-default-portrait-gate-removed` 红 |
| F | 完成 | 新增 6（F3/F4/F5 多轴已有，见账）；负控 2 | 定向 6/6；`refs-entity-actor-gate-removed`/`refs-entry-scene-gate-removed` 红 |

### 43 族逐项对账（新增=本包用例；已有=锚点；待证=剩余归属）

Codex集成裁定（2026-09-18）：下表C1/F3/F5/F8分类已按真实入口收窄，理由与独立复跑见
[返工接收](content-contracts-review.md#43族账的integration-owner裁定)。这是Owner对当前剩余账的订正，
不是代改GLM历史签字，也未更改GLM测试语义；428a7852保留返工原文。

**A（asset.ts）**
- A1 新增：`合法值原样返回（不 trim/不消除段）`、`与 map-index 规范化合同不同…`、十轴 test.each（空段/点段/上跳段…）。已有：asset.test.ts 基础正控。caller：editor 资产导入链 asset.ts:111。
- A2 新增：`合法 sprite 记录通过并保真返回…`+单字段反例各行（asset.ts:126）。
- A3 新增：`无音频角色的最小配置通过…`（validateManifestAssetConfig 角色名/所指 id/kind 门；audio/video 真实角色）。
- A4 新增：`scene music/battleMusic 各成一 site…`（fixture 先过 validateAuthorScenes；普通字符串在合法 setFlag.flag）。caller asset.ts:498/827。
- A5 新增：`正常引用零 issue…`、`missing-asset error 且 where 精确…`（asset.ts:856）。
- A6 新增：A6 describe 4 条（字节/摘要双轴、读/sha 失败传播、unused 物理验证；真实字节+独立摘要）。caller asset.ts:898。

**B（project-map/map-index/tileset/stamp）**
- B1 新增：map-index.contracts 3 组（normalize trim/点段、validateMapIndex 拒绝轴、nextMapAssetId）。已有 map-index.test.ts。
- B2 新增：`合法地图通过且语义等价返回…`、`矩阵行数必须是 height×2…`、`tile 0 非空格…`。已有 project-map.test.ts。caller project-map.ts:126/357。
- B3 新增：tile0 同空同非空门两轴（在 B2 测试内）。已有：heights 省略/全0 project-map.test.ts:88（allZero→undefined）。
- B4 已有不新增：`project-map.test.ts:91`『作者放置身份与普通内容共同按当前单版本往返』正控 + `packages/editor/src/core/map-reference-facts.ts:73` stampSources 真实消费；剩余显式锚点/游走轴归后续编辑器任务。
- B5 新增：`format→parse 完整往返保真；两次 format 字节相同…`。
- B6 新增：`合法定义通过且输入不变；resolveTilesetAsset 精确解析`、`带 catalog 时 asset 不存在/kind 不符拒绝`。已有 tileset.test.ts。
- B7 新增：`碰撞矩阵为 nullable…`、`anchor 越界拒绝…`（stamp.ts:31/52）。
- B8 新增：`format→parse 保真；两次 format 确定性…`。已有 stamp.test.ts 部分往返（登记不复制）。

**C（frame-sequence.ts）**
- C1 新增：`截断 <12 字节拒绝`、`magic 逐字节拒绝…`、`version 错拒绝；reserved 非零拒绝`、`index 长度超界拒绝…`。防御：UTF-8 多字节编码臂 frame-sequence.ts:103-112 在当前合法公开编码域不可达（:307/:408清洗输入，:360固定构造ASCII元数据）。decodeUtf8消费外部字节，其非法UTF-8轴另列可达待测，不用decoder输入替encoder背书。
- C2 新增：`空帧数组拒绝；单帧/双帧正常`、`rgba 字节数不符拒绝…`。待证：index JSON 解析失败轴（可达未测）。
- C3 新增：`35 帧跨两块（32+3）…全部像素逐帧 oracle`（独立输入逐帧逐 RGBA，不镜像生产编码）。
- C4 新增：`C4 帧提供器入口：encodeFrameSequenceFromProvider 逐帧取帧并完整解码一致`（含提供器错字节数拒绝；frame-sequence.ts:484）。
- C5 新增：`C5 非零 byteOffset 视图完整解码…`、`encode 不修改输入帧…；输出与输入无别名`。
- C6 新增：playback describe 全部（默认/显式范围、5 条拒绝轴、`帧时长优先级…`）。
- C7 方法论约束（极小确定性数据/显式预期/不镜像生产算法）：贯穿上述各用例，不单列用例。
- C8 N/A：TextEncoder 宿主切换在当前源码不存在——frame-sequence.ts:98 为固定手写 `encodeUtf8`；encode 输入域=合法编码元数据（ASCII 字段），decode 输入域=已编码字节。不造不存在的降级测试。

**D（sprite/battle-sprite/enemy-team）**
- D1 新增：`static=1；directional=framesPerDir×4；loop=frameCount`、`poses 高帧号叠加取最大…`、`Indices 完整集合…`（sprite.ts:83/98）。
- D2 新增：`不改原输入（深快照不变）`；缺 poses/重复帧轴含于上述用例。
- D3 新增：`player：全部必填帧索引…`、`enemy：连续段展开…`、`summon：必须传 actualFrameCount…`（battle-sprite.ts:156/181/205）。
- D4 新增：`合法定义通过且输入不变；resolve 精确查找`、`缺目标拒绝；kind 不匹配（单值/集合）拒绝`（battle-sprite.ts:212）。已有 battle-sprite.test.ts。
- D5 新增：enemy-team.contracts D5 describe（含 null 槽、上限 5、重复 ID 等七轴；enemy-team.ts:15/26）。
- D6 新增：`缺省 enemyIds：不校验引用…`、`传入 enemyIds：悬空槽引用精确拒绝…`、`全部命中时通过；原数组/槽位不污染`（enemy-team.ts:35/49）。

**E（author-dialogue/actor-reference/command-target-reference）**
- E1 新增：`actor/unbound cue 合法；narration 合法；非法 kind 拒绝`+半状态 test.each 4 轴（author-dialogue.ts:93/124）。
- E2 新增：`合法 actor+expression 解析全部字段；cue 与实际传入的 actor 表都不被修改`（实参快照）、`缺 Actor/缺主立绘/缺命名表情 fail-loud…`（author-dialogue.ts:168/202）。
- E3 新增：`inParty/setActorSprite/dialog 各输出精确三元组`、`setParty 逐成员…`、`非对象/数组/空 kind 返回空数组…`（actor-reference.ts:144）。注：actor-reference **无**旧测试文件（原回执误写 actor-reference.test.ts，现更正为 command-target-reference.test.ts/author-dialogue.test.ts 存在）。
- E4 新增：`collectActorTaggedReferences 整树递归命中两处…`、`collectCanonicalActorTaggedReferences 只取单命令叶+cond…`（actor-reference.ts:198/220）。
- E5 新增：`actor 默认/表情引用与 unbound 全局 asset 各自产出…`（actor-reference.ts:243）。
- E6 新增：`显式 EntityAddress 产出 entity 目标；loadScene 产出 scene+scene-entry 双边`、`currentScene 条件边；空值/错型不产生假边`（command-target-reference.ts:111/260）。
- E7 新增：`typed scene 全部改写；普通文字/外部 scene 不改…`（command-target-reference.ts:278/313）。已有 command-target-reference.test.ts 部分正控。

**F（validate-refs.ts）**
- F1 新增：`非空目录/真实稳定 ID 的合法 bundle：主载荷先过现行结构守卫且零 issue；输入不变`（bundle 无退役 onEnter、sprites 有 label；四守卫+零 issue）。
- F2 新增：实体 actor/entryPoint scene/mapId 三条**精确 Issue 多重集合**断言（确定 severity/完整 where/目标 id/无额外 issue）。已有：validate-refs.test.ts:547 actor 实体悬空（.some 弱断言）——本包为合同钉精确版非重复充数（witness `entity-locator-wrong`/`reference-extra-issue` 证明鉴别力）。
- F3 新增：`levelUp 引用悬空技能 → 确定 warn…`（精确多重集合；validate-refs.ts:1661 warn）。已有：:533 levelUp warn、:916 initialEquipment warn、:1040 seedConditions 毒引用、:1579/:1598 openShop→ShopDef正反控。待补：validate-refs.ts:1588-1597的ShopDef.items→items边；不是笼统“商店引用没有测试”。
- F4 已有为主：validate-refs.test.ts:306 canonical shared/item-private 世界叶、:258/:399 敌 hook/脚本递归、bundle scriptChunks 消费 validate-refs.ts:73/:1670+、编辑工作副本 packages/editor/src/core/edit-session.ts:44-67。本包无新增投影用例；共享正文 scriptChunks 显式悬空轴待证。
- F5 已有为主：:1022 startWorld party 悬空 error、:889 可见存档 appearance/followers。本包基线：startWorld存在、levelUp为空对象、worlds缺席且零issue；不是startWorld/levelUp缺席对照。待证：optional逐轴缺席、levelUp属主悬空（validate-refs.ts:1655 danglingSeverity轴）。
- F6 新增：`悬空 actor 补回后零 issue（完整往返非部分修复）`（两侧均精确多重集合）。
- F7 缺陷归属不变：D-02 编辑器漏边、D-06/07 作者状态问题归 Codex；本包通过不关闭。
- F8 分类：见下『缺口分类』；逐族/代表分支给出类别与锚点，不冒称逐branchId/arm穷举，不解释为已发现bug。

### 负控与覆盖（最终树复跑）

- 负控：`node docs/testing/glm-content-contracts-mutants.mjs` rc=0——判据自测（good 通过/混合坏日志拒绝）+ 6 正控 exit0 + 12 变异针 exit1；每针 MUTATION_HIT + AssertionError + **钉名新增测试实际 failed**（JSON 执行见证）；9 个被触产品文件批前后 sha256 不变。
- 六针接收见证：`node docs/testing/content-contracts-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-content-contracts` rc=0——4 对照 control、6 针全 detected、执行检查全 passed、7 项 fixture 检查全 accepted、`mixedFailureAccepted:false`。
- 覆盖对照（可复制；config 在候选 worktree，绝对路径）：
  ```bash
  CC1_MODE=before CC1_OUT=/tmp/cc1-rw-coverage-before pnpm --filter @type-pal/content exec vitest run --coverage --maxWorkers 1 --passWithNoTests --config /Users/zhangxu/illegal/type-pal-glm-content-contracts/docs/testing/glm-content-contracts.config.mts
  CC1_MODE=after  CC1_OUT=/tmp/cc1-rw-coverage-after  pnpm --filter @type-pal/content exec vitest run --coverage --maxWorkers 1 --passWithNoTests --config /Users/zhangxu/illegal/type-pal-glm-content-contracts/docs/testing/glm-content-contracts.config.mts
  ```
  before 42 文件/557 项、after 55 文件/675 项（两跑 50 个生产文件分母相同，/tmp 专属输出，不写官方目录）。
  局部 13 模块净增语句 +117（1743→1860/2089）、分支 +128（1275→1403/1743）；
  全包语句 4762/5854(81.34%)→4882/5854(83.39%)、分支 3666/5016(73.08%)→3798/5016(75.71%)。
  分模块（语句 before→after）：asset 287→296/321；project-map 163/193 持平（分支持平，行覆盖由既有测试承担）；
  map-index 60→64/70；tileset 30→35/39；stamp 32/38；frame-sequence 247→252/306（分支 156→162）；
  sprite 0→15/15；battle-sprite 84/94（分支 57→60）；enemy-team 0→33/35；author-dialogue 75→81/87；
  actor-reference 42→80/104；command-target-reference 97/101；validate-refs 626→628/686。

### 缺口分类（after 树；全部非缺陷，附锚点）

- 可达未测（后续测试任务候选）：asset.ts:409-421（unbound portrait 直连臂）、actor-reference.ts:299-340（renameDialoguePortraitExpression）、validate-refs.ts:418-475（world appearance/onLose/onFlee 臂）、frame-sequence.ts:116-152（decodeUtf8外部字节非法轴；非encode多字节臂）、author-dialogue.ts:60/141/149/157/164（rows/speed/autoAdvance/slot/cursorFrame 守卫轴）、map-index.ts:41-55（个别拒绝轴）、F3商店货单→物品轴、F4 scriptChunks显式轴、F5 levelUp属主/optional缺席轴。
- 已有重叠：battle-sprite.ts/project-map.ts 主体语句由既有测试承担，本包补分支鉴别力。
- 防御或窄 caller：asset.ts palBattleSpriteAssetId/collectCanonicalCommandAssetTaggedReferences（跨包消费）、project-map.ts isProjectMap 类型守卫、stamp.ts recordAt 等前置守卫臂；frame-sequence.ts:103-112多字节encode臂为当前合法编码域不可达。
- N/A：C8 TextEncoder 降级（源码不存在该分支，frame-sequence.ts:98 手写 encodeUtf8）。
- 缺陷归属不变：D-02/D-06/D-07 归 Codex（F7）。

### 其他命令（exit 全 0）

```bash
pnpm --filter @type-pal/content exec vitest run            # 55 文件/675 项
pnpm --filter @type-pal/content exec tsc --noEmit          # tc rc=0
pnpm exec biome check packages/content/src/*.contracts.test.ts packages/content/src/__tests__/glm-content-contract-fixtures.ts docs/testing/glm-content-contracts-mutants.mjs docs/testing/glm-content-contracts.config.mts  # rc=0
```

机器账（命令/exit/日志 hash/每针钉名红因/覆盖数字）见 `docs/testing/glm-content-contracts-evidence.json`（已过 Biome formatter）。
全仓 check/官方 ratchet/strict-fast 未由 GLM 执行，留 Codex 接收后统一串行。

## Codex接收复核（GLM不得填写）

Codex（2026-09-18，dbe579c5）：**counter**。116定向/673全包/tc、原6+12负控及覆盖增量已复算；
实际fixture、输入/精确输出断言、负控判据、逐族账与交付卫生仍有R1～R4。六条坏实现见证均MISSED，见[完整复核](content-contracts-review.md)。
未合入测试、未更新官方基线、未跑接收后的全仓门禁，不转Kimi终审、不标done，设计r1不重签。
