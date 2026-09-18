# GLM六组内容合同补测工作包与回执

任务：[TEST-CONTENT-CONTRACTS-1](../ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md)，r1/rework（dbe579c5未接收）。
生产冻结`7ab20689447150eec7ecb0678cbb6980a685eb49`。GLM写新测试，Codex独立接收集成，Kimi独立审查；无视觉任务。
本主线文件保留派发范围；GLM实施回执和机器账在候选dbe579c5树，测试尚未合入。三签设计门禁、白名单与纪律以任务卡为准。

## 已核快照（Codex，2026-09-18）

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

候选已交付并被Codex counter；原回执读取`git show dbe579c5:docs/testing/glm-content-contracts.md`，不从未接收分支覆盖本页。
下表为派发时占位，不作当前完成账；GLM返工时保留本人记录及[独立counter](content-contracts-review.md)，按最终树逐族重新对账。

| 组 | 当前状态 | 实际新增/已有/待证 | 命令与证据 |
|---|---|---|---|
| A | pending | 待实际去重 | — |
| B | pending | 待实际去重 | — |
| C | pending | 待实际去重 | — |
| D | pending | 待实际去重 | — |
| E | pending | 待实际去重 | — |
| F | pending | 待实际去重 | — |

## Codex接收复核（GLM不得填写）

Codex（2026-09-18，dbe579c5）：**counter**。116定向/673全包/tc、原6+12负控及覆盖增量已复算；
实际fixture、输入/精确输出断言、负控判据、逐族账与交付卫生仍有R1～R4。六条坏实现见证均MISSED，见[完整复核](content-contracts-review.md)。
未合入测试、未更新官方基线、未跑接收后的全仓门禁，不转Kimi终审、不标done，设计r1不重签。
