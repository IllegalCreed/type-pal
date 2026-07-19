# A7-3B - 战斗精灵索引资源闭包

Status: review
Phase: phase2
Capability: A7 / R3 / R7 / A4 / B5 / X4
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + Kimi
Unavailable Agents: none
Branch: main

## 目标

把 PAL、仓库示例工程和作者工程的敌我战斗精灵从
`battleSpriteNum/spriteNum + path + manifest.assets.legacy.battle-sprite + LegacyAssetAdapter`
双轨收敛为工程内 catalog 单链：角色、敌人、装备换装、持久形象、梦蛇、召唤与敌人变身/召唤只引用稳定
`BattleSpriteDef.id`，定义携带动作/帧布局契约并以 `asset: AssetId` 指向唯一二进制；运行时、编辑器、保存、
克隆和导出只经 `AssetResolver/FileSource` 读取工程内 gzip indexed RLE。闭环同时修掉当前真实可见缺口：
装备战斗形象仍是 7 条迁移 pending、梦蛇只改逻辑值却不换画面、装备授予召唤技未预载神将、敌人异步换图
可能迟到污染旧会话，以及同 Y 精灵遮挡缺失一阶段 X 降序规则。

## 范围

- 范围内:
  - 新增 `BattleSpriteDef` 一等内容域与 `content/battle-sprites.json`；定义 id 是语义身份，`asset` 是到
    `kind=battle-sprite` catalog 记录的唯一物理边。
  - `profile` 判别 `player-fighter | enemy | summon`：玩家定义显式命名姿势与命中/施法前摇特效基址；
    敌人定义显式 idle/magic/attack 区段和播放速度；召唤定义只声明用途。敌人的 `yPosOffset` 仍属于
    `EnemyDef` 战场位置，技能的召唤 speed/tint/sound 仍属于该技能调用。
  - PAL 的 F.MKF 19 个 player chunk 与 ABC.MKF 153 个 enemy chunk 全量登记、逐字节物化；171 个当前
    语义定义引用 171 个二进制，enemy 98 作为唯一未引用 catalog 资源保留并报 warning。
  - Actor、Enemy、`setActorAppearance`、CharacterInstance/save appearance、EquipEffect、skill summon/trance、
    battle transient trance 全部迁为 `BattleSpriteDef.id`；player/enemy 裸号只允许在迁移/旧工程/旧存档
    输入边界出现一次。
  - 上游翻译 7 件装备的 row 1 战斗精灵覆写，运行时按固定装备槽顺序 live 派生；梦蛇完成一阶段真值的
    闪色 + 72 步旧图到新图过渡、死亡复活保持、战后清除。
  - `battle-effect-index.json` 的 10×2 数值表物化为 player-fighter 定义的显式表现字段；运行时不再按
    `spriteNum * 2` 查表。A7-3E 后续只负责把其中的 effect frame 基址升级为 effect clip 语义引用。
  - 敌人 transform/summon 可达闭包战前递归预载；会话中同步切换已准备资源，删除 fire-and-forget IO 回写。
  - 运行时 loader/cache、编辑器资源库、导入/分配/替换/删除/共享影响/缩帧保护、undo/redo、pending blob、
    HTTP/FSA/Save As/clone/ZIP、旧 local v3 与旧 save 升级、PAL/demo/e2e-own/blank fixture。
  - 本族退出 `manifest.assets.legacy.families`，清理 `data/battle-sprite/**` 与 `data/battle-sprites.json`
    clone 旁路；`tilesetBlobs` 不再承载 battle-sprite，但暂留给 A7-3E effect-sprite。
  - MG2 作者接管、迁移双跑零计划、断开 extracted battle-sprite 后编辑器与 Reforge 验证。
- 范围外:
  - FIRE.MKF 法术特效、DATA.MKF chunk 10 物理命中特效二进制与 `SkillAnimation.effectSprite`；归 A7-3E。
  - generic `image`；归 X3。全部 legacy 归零、contentVersion 4 与总门禁；归 A7-4。
  - 战斗数值/AI/新技能系统、骨骼动画、碰撞盒、任意帧绘图器或大范围战斗演出重设计。
  - 用本卡宣称 B5 全部战斗表现或 A7/R7/A7-4 已完成。
- 明确不做:
  - 不把 indexed RLE 烘成 RGBA，不新增作者可选 palette；仍用工程标准色彩在运行时着色。
  - 不保留 `BattleSpriteDef.id | AssetId | number | path` 多选一，不从定义 id/AssetId/文件名反解 channel、
    number 或路径，不在 catalog miss 时回退 extracted。
  - 不把动作 profile 塞进 `AssetRecord`。AssetRecord 只管物理文件；同一二进制未来可由多个定义按不同布局
    解释，定义与资产的删除/共享生命周期必须分开。
  - 不按 PAL item id 在第三方 local-v3 upgrader 中硬注入 7 条装备效果；该缺口只在上游 raw script 翻译中修。
  - 不按 6 个异常文件 id 写运行时白名单，不重编码或手改 `projects/pal` 的迁移产物。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：schema/save/migration/asset pipeline/跨包接口必须三签；迁移缺陷先修上游，不能手补
    `projects/pal`。
  - `docs/phase2/READ-FIRST.md`：稳定 id、工程自包含、runtime/editor 共用同一解释器；一阶段是 UX/机制/
    资产约定真值，不把旧目录架构搬进二阶段。
  - `docs/phase2/foundation/actor-model-design.md:17-23`：玩家战斗图、敌人参数化区段、召唤/变身是独立战斗
    动画词汇；布局必须开放可扩，逐帧锚点不可假设恒定。
  - `docs/phase2/battle-presentation-audit-2026-07-05.md:5-21,25-37,92-100`：一阶段为唯一 UX 真值；
    替换精灵是 per-battle 瞬态，需显式生命周期；召唤/变身和层序不能硬切或异步漂移。
  - `docs/phase1/game-mechanics.md:1234-1248`：梦蛇的临时换精灵不因死亡/复活清除，直到战斗结束才清。
  - `reference/sdlpal/global.c:1978-2009`：玩家战斗精灵从 Actor 基础开始，装备槽 0..MAX 顺序扫描，
    最后一个非零覆写胜出；Extra transient 因顺序最高而覆盖装备。
  - `docs/phase1/status/resource-status.md:82-98`：F.MKF 0..18 与 ABC.MKF 1..153 是完整提取真值。
  - `docs/ops/tasks/A7-3T-tileset-asset-closure.md`、`A7-3W-world-sprite-asset-closure.md`：复用 AssetId/
    AssetRecord 分层、origin 分级 codec、完整 SHA、pending blob、两阶段 catalog 保存、byte-exact transport、
    MG2 和 local-v3 升级先例。
  - `docs/phase2/foundation/a7-resource-closure-audit.md`：同一族不能长期保留 catalog 与数字/目录双解释；
    未引用 catalog 资源是 warning，不是缺失 error。
- 代码锚点(`file:line`):
  - `packages/content/src/actor.ts:60-63`、`enemy.ts:88-97`：Actor/Enemy 仍保存 number + path。
  - `packages/content/src/character.ts:119-125`、`script.ts:117-125`：持久 appearance 与命令仍存裸数字。
  - `packages/content/src/skill.ts:58-66`：summon 仍存 `godId` 并隐式 +10；trance 仍存数字。
  - `packages/content/src/item.ts:17-32,239-267`：EquipEffect 缺战斗形象词条；既有装备效果坚持 live 派生。
  - `packages/content/src/asset.ts:366-381,573-709`、`validate-refs.ts:46-188`：typed walker/定义引用校验
    尚无 battle sprite 域及全部语义消费者。
  - `packages/migrate/src/migrate-content.ts:742-753,1100-1112`：row 1 被留为 7 条 pending；
    `migrate-content.test.ts:241-245` 当前反向把缺口钉死为 7。
  - `packages/migrate/src/migrate-content.ts:284,514,579-600`、`migrate-enemies.ts:109-164`、
    `translate-events.ts:1099`：Actor/Enemy/trance/summon/appearance 的数字生成入口。
  - `packages/migrate/src/pal-assets.ts:592-679`、`pal-migration.ts:192-251`：A7-3W 资源物化先例；尚未生成
    battle sprite records/definitions/files。
  - `packages/reforge/src/assets.ts:267-290`：战斗精灵按 root/kind/number/path 宽松加载，无 catalog 校验或缓存。
  - `packages/reforge/src/main.ts:295-306,2043-2144,4250-4296`：全局 effect-index fetch、godId+10、
    num/path 加载、启动时固定 effect base 与 debug preview 数字旁路。
  - `packages/reforge/src/battle/battle-core.ts:91-92,835-839`、`battle-session.ts:1935-1964`：trance 值写入
    core 后，renderer 始终画启动时 `playerSprites[i]`，梦蛇当前根本没有换图。
  - `packages/reforge/src/battle/battle-session.ts:1463-1515`：敌 transform/summon 通过异步回调迟到写 sprite 数组。
  - `packages/reforge/src/battle/present-battle.ts:129-138`：底中锚与逐帧 fallback 已有；排序只按 Y，漏一阶段
    equal-Y 时 X 降序 tie-break。
  - `packages/editor/src/core/edit-session.ts:37-50`、`project-io.ts:159-210,258-465`：`assetBlobs` 和完整 SHA/
    两阶段保存已存在；`tilesetBlobs` 仍临时承载 battle/effect。
  - `packages/editor/src/core/commands.ts:3074-3169`：Actor/Enemy 上传只写固定 path + legacy pending blob。
  - `packages/editor/src/ui/ActorMode.tsx:303-339`、`EnemyAnimPreview.tsx:31-220`、`SkillTab.tsx:321-354`、
    `SummonPreview.tsx`、`TrancePreview.tsx`、`CommandForm.tsx:550-590`：所有选择/预览仍围绕数字或路径。
  - `packages/editor/src/core/open-local.ts:31-68`、`seed.ts:55-196,278-290`、`clone.ts:23-49`、
    `export-zip.ts:10-42`：local upgrade 尚无本族；clone 会把 legacy battle blob 改字节或继续带入旧清单。
  - `packages/reforge/src/save/types.ts:8`、`save/ops.ts:176-219`：save v3 与 appearance 升级目前只处理 portrait。
- 已知数据基线:
  - player 源精确为 `0..18`：**19 files / 137,531 gzip B / 329,624 raw B / 149 frames**，19/19
    canonical strict。
  - enemy 源精确为 `1..153`：**153 files / 763,442 gzip B / 1,983,974 raw B / 626 frames**；147
    canonical strict，6 个 legacy 坏尾为 `24=4/5,25=5/6,30=3/4,59=4/5,71=2/3,86=5/6`
    （有效帧/declaredSlots），均无 trailing sentinel、恰 1 个不可用尾槽。
  - 合计 **172 files / 900,973 gzip B / 2,313,598 raw B / 775 effective frames / 6 bad tail slots**。
    冻结 digest 算法：每行 UTF-8 `kind\0id\0gzipBytes\0sha256(gzipBytes)`，player 数字升序后 enemy 数字
    升序，LF 连接且末尾不再补 LF，再取 SHA-256。player digest
    `163f7282309fce5699c1c9a15e4142c219f692de97ac0d2e6d20e941c8dcd7b5`，enemy digest
    `dd3b00f6f925c78ff5a3aa60cc7909fbee3924375c07a2c661bcb0bcf75f4302`，combined digest
    `ecbec106c6540de74adeec799bad19a22e7198272245c98b130522b0ac37a685`。
  - player 帧数 0..18 依次为
    `11,10,10,10,10,10,10,10,10,11,4,13,2,6,2,5,3,5,7`；0..9 是 fighter，10..18 是 summon，
    不能用统一 11 帧门禁。fighter 的 0..9 常规姿势均存在，steal frame 10 只在 profile 0/9 存在。
  - 153 条 EnemyDef 引用 152 个唯一 sprite：enemy 98 未引用，enemy 81 被 enemy-478/479 共享且 profile
    完全相同。145/153 的实际帧数恰等于 idle+magic+attack，8 条多 1 帧，0 条不足。
  - 原始 `0x1A row=1` 恰 10 条：剧情 3 条 `s145->5,s174->1,s233->9`；装备 7 条——163 长鞭、164
    九截鞭、165 金蛇鞭 -> player 6；179 苗刀、185 鬼牙刀、187 玄冥宝刀、188 巫月神刀 -> player 7。
    原始 `0x31` trance 恰 1 条 -> player 5；summon 9 条 godId 0..8 -> player 10..18。
  - 修完后的直接语义引用 occurrence = **179**（Actor 6 + Enemy 153 + summon 9 + trance 1 + appearance 3 +
    equipment 7），unique definitions/assets used = **171/172**。共享定义 5 个：player 1(2 refs)、5(2)、
    6(3)、7(4)、enemy 81(2)，额外共享边 8；唯一 unused 为 enemy 98。敌 AI 另有 transform 4 + summon
    22 = 26 条间接 EnemyDef 边、15 个唯一目标、0 missing，不重复计物理 direct edge。
  - PAL 当前 catalog **1,707 records / 67,538,394 B / 0 battle-sprite**；本卡后应为 **1,879 records /
    68,439,367 B / 172 battle-sprite**。legacy families 当前 `battle-sprite,effect-sprite,image`，本卡只删除
    `battle-sprite`。
  - `battle-effect-index.json` 的 player 0..9 pair 为
    `0:[0,0],1:[1,1],2:[2,2],3:[3,3],4:[4,4],5:[5,3],6:[2,2],7:[4,0],8:[6,4],9:[3,3]`；
    canonical profile 存最终 `castEffectBase = first*10+15` 与 `attackEffectBase = second*3`，不保留
    `spriteNum*2` 寻址。
- 已知坑 / 审计文档:
  - 不能把 `BattleSpriteDef` 做成 `{id,asset}` 薄壳；否则硬编码姿势、enemy 区段和 effect-index 仍无归属。
    也不直接让所有消费者引用 AssetId：Actor/Enemy/Skill 已是业务消费者，但同一二进制未来可能有多个动作
    解释，且表现 profile 不属于物理 AssetRecord。若 Kimi 认为当前没有足够独立语义，应明确 counter 并给出
    effect-index、敌动画与共享布局的替代归属，而不是简单删一层。
  - player 0 是合法李逍遥资源，绝不能套 world sprite/portrait 的“正整数/0 清空”升级 helper；player 与
    enemy 1..18 号码重叠，迁移边界必须携带 channel。
  - `effectiveSkills` 包含装备授技，当前只扫 `learnedSkills` 会漏土灵珠 267 -> 山神 336 -> summon 13。
  - 必需精灵加载失败当前被 `.catch(() => undefined)` 吞掉，结果是隐形人物；canonical 读取必须 readiness
    fail-loud。取消的旧 battle/session 不得接收迟到异步结果。
  - 替换默认不得减少旧有效帧数。若显式修复式缩帧，必须在同一 undoable transaction 内验证全部定义和
    直接/间接消费者的最大所需索引；共享 enemy 81 取两个消费者并集，不能只看当前面板一个 EnemyDef。
  - 旧 local-v3 upgrader 只转换旧工程已明确存在的 number/path/command/appearance；7 条装备语义是 PAL
    上游迁移缺陷，不能按物品号猜测注入第三方工程。
  - clone 关闭 family 时须同时过滤目录 `data/battle-sprite/**` 和描述文件 `data/battle-sprites.json`。
- 不得重新引入:
  - `battleSpriteNum/battleSpritePath`、Enemy `spriteNum/spritePath`、summon `godId`、numeric trance/
    appearance、`loadBattleSprite(base,kind,num,path)`、`g+10`、`spriteNum*2`、数字 battle preview、root
    `/battle-sprite`、catalog miss fallback、battle-sprite 对 `tilesetBlobs` 的消费。
  - `?? 0` 默认借李逍遥资源、缺资源变透明、按 AssetId/Definition id 解析物理路径、跨工程模块级数字缓存。
  - 统一 11 帧门禁、按单个 EnemyDef 缩帧、把 enemy `yPosOffset` 或 summon speed/tint 错搬进二进制定义。
- 相关测试:
  - content：BattleSpriteDef/profile validation、typed asset walker、definition reference collector、items/effective
    appearance、commands/world/save upgrade 与全引用诊断。
  - shared/reforge：indexed-RLE origin profile、loader/cache/readiness、battle core/session/anim/presentation、
    transform/summon closure、dream snake 与 equal-Y ordering。
  - editor：resource library、commands、project-io/open-local/save-as/clone/export-zip/seed、Actor/Enemy/Skill/
    Script/Item pickers 与预览。
  - migrate：pal-assets、migrate-content/enemies/translate-events、pal-migration integration、migration plan/validate/
    MG2 authored protection。

## 验收条件

- 功能:
  - canonical `BattleSpriteDef` 精确使用 `{id,label,asset,profile}`；profile 至少是：
    - `player-fighter`：命名帧 `idle/dying/dead/defend/hurt/preMagic/magic/attackWindup/attackRush/
      attackStrike/steal?` 和显式 `castEffectBase/attackEffectBase`；所有索引非负且在实际帧内。
    - `enemy`：idle/magic/attack 连续区段、idle/act 播放速度；区段必须在实际帧内。
    - `summon`：只声明召唤逐帧用途，至少一帧；技能自己的 speed/tint/sound 不进入定义。
  - PAL 生成 172 records、171 defs：player 0..9 = fighter、10..18 = summon，152 个已用 enemy sprite = enemy；
    enemy 98 无定义且保持唯一 unused warning。AssetId 为 `battle-sprite.pal.player.NNN` /
    `battle-sprite.pal.enemy.NNN`，path 为 `assets/migrated/battle-sprites/{player|enemy}/NNN.rle`，
    mediaType/origin 分别为 `application/vnd.type-pal.rle` / `legacy-migrated`，字节与源完全相同。
  - Actor/Enemy 的战斗形象为必需定义 id；缺定义/缺 asset/kind/profile mismatch 在内容校验或 battle readiness
    阶段 fail-loud，不允许 `?? 0` 或 invisibility。demo/e2e/blank 必须显式提供自包含 generated placeholder
    定义/资产（或显式移除战斗能力），不得暗借 PAL player 0。
  - 最终玩家形象优先级精确为 Actor base -> persistent appearance -> `EQUIP_SLOT_IDS` 固定顺序最后一个
    battleSprite effect -> battle transient trance；装备和 transient 均 live 派生，不烙回 ActorDef。
  - 7 条装备 pending 全部在上游 raw script 翻译成 `{kind:'battleSprite', sprite: BattleSpriteDef.id}`，
    `pendingEquip=0`；装备 163/179 分别实时使用 player 6/7，卸装恢复下一层。
  - summon/trance 使用 definition id；预载闭包基于 `effectiveSkills`、合体技与全部可达效果。土灵珠授予山神
    时即使未写 learnedSkills 也能显示 summon 13。
  - 梦蛇使用 active BattleSpriteDef，同步切换图像和 effect profile：施法前摇 -> 6×40ms 色移 0/2/4/6/8/10
    -> 72×16ms 旧图到新图过渡；死亡/复活仍保持，战斗结束恢复 effective base。不得硬切。
  - 敌 transform/summon 对初始敌人做递归可达闭包，战前全部加载；会话内只同步换 definition/sprite，旧会话
    中止后没有迟到写。transform 4、summon 22 全覆盖且无环导致无限遍历。
  - loader 逐条校验 AssetId/kind/media/bytes/SHA/gzip/origin 后解析；cache 每工程实例、以 AssetId 定位、以
   完整 record signature 失效，缓存并发 promise、失败驱逐、record 更新刷新、共享资源只解码一次。
  - 通用 indexed-RLE parser：authored/generated canonical 严格拒绝坏 offset/空洞/截断/越界/零帧；只有
    legacy-migrated 可接受连续有效前缀后的全不可解坏尾。PAL 精确 6 个异常，runtime 不含 id 白名单。
  - 编辑器“资源 -> 战斗精灵”提供定义/资产视图、搜索、profile/帧/尺寸/来源/SHA、未引用/共享 badges、
    逐帧与命名动作预览、引用面板和精确跳转。Actor/Enemy/Skill/Script/Item 全部用兼容 profile picker；
    就地上传在一个事务中导入资源、建定义、赋引用，不再出现 number/path 输入。
  - 导入使用内容 hash 的 authored path；替换保持 id/AssetId，预读 persisted old bytes 并持有 SHA + 全消费者
    proof。定义删除和二进制删除是两个动作；共享影响、stale proof、path collision、缩帧修复均 fail-closed，
    undo/redo 恢复定义、record、bytes 与全部引用。
  - local-v3 一次性升级先完整读取/验证/规划，再按 binary -> union catalog -> definitions/content/scripts ->
    manifest -> final catalog -> removals 写入；兼容 player 0、区分 player/enemy channel、迁移现存 path 和
    party/reserve appearance，mixed/ambiguous/missing fail-loud，失败零写入，重试单调前滚，二次打开零计划。
  - save schema 因 persistent battleSprite 从 number 变 definition id 独立升级；旧 save 的 party/reserve 均在
    clone-first 边界映射并验证 profile，当前版本出现 number/mixed 直接拒绝。manifest contentVersion 仍留 3，
    等 A7-4 总门禁统一升 4。
  - FSA/Save As/clone/ZIP/pending blob 使用 catalog byte-exact 路径和 A7-3T/W 的完整 SHA、两阶段 catalog
    协议；clone 不再解压重写 battle RLE，也不复制 legacy 目录/描述清单。ZIP 拒绝 missing/tamper/noncanonical
    与 extracted duplicate。
  - 渲染保留 indexed palette、每帧独立 bottom-center 锚点；统一敌我按 Y 升序，equal-Y 按 X 降序，
    不因 catalog 化改变遮挡、颜色、位置或帧节奏。
- 测试:
  - 数据门禁精确冻结 172/900,973B/2,313,598 raw B/775 frames、6 tail slots、三个 digest、171 defs、
    179 refs/171 used/5 shared/8 extra edges/1 unused(enemy98)、AI 26/15/0 missing、最终 1879 catalog records/
    68,439,367 B；全文件 path/bytes/SHA/gzip/media/origin/source byte-exact。
  - 19 player strict、147 enemy strict、6 legacy tail 通过；相同异常在 authored/generated 拒绝；坏中段后仍
    可解、截断指令、非 gzip、hash/bytes/media mismatch 均拒绝。
  - typed walker 与 definition collector 覆盖 Actor、Enemy、EquipEffect、summon/trance、递归 script command、
    world party/reserve、battle transient 输入；missing/kind/profile mismatch、重复 definition id、旧字段、
    catalog+legacy 同族、unused warning 和共享删除均有专测。
  - 帧 profile 覆盖 PAL player 0..18 真实不同帧数、steal optional、enemy 145 exact/8 extra/0 short；替换默认
    no-shrink，共享 enemy81 取全部消费者；显式修复式缩帧原子更新且可撤销。
  - runtime 覆盖有效技能/合体/装备授技预载、trance active profile、enemy transform/summon 递归闭包、
    并发缓存/失败驱逐/SHA 更新/abort ownership/readiness fail-loud、equal-Y X tie-break。
  - editor 覆盖 import/assign/replace/delete/shared/stale/path collision/undo/redo、persisted old bytes 的
    save->undo->save->redo、pending preview、诊断深链、Actor/Enemy/Summon/Trance/Script/Item pickers。
  - migration/IO 覆盖 player0、cross-channel 同号、3 appearance+7 equip+1 trance+9 summon、old path、
    local-v3/save v1-v3、HTTP/FSA/Save As/clone/ZIP、中断恢复、MG2 authored 接管与二跑 0/0/0。
  - 静态扫描正式路径中的 number/path/godId、`g+10`、`spriteNum*2`、root battle-sprite、数字 preview、
    battle 对 `tilesetBlobs` 消费归零；A7-3E 的 effectSprite 数字和旧输入 fixture 精确白名单。
  - content/shared/reforge/editor/migrate 定向与全套测试、五包 typecheck、editor/reforge production build、
    Biome、`git diff --check` 全绿。
- 文档:
  - 更新 content schema、A7 闭包审计、asset pipeline/project lifecycle、battle presentation audit、编辑器帮助、
    capability-map 和本卡；只登记 A7-3B 实际完成，保留 effect-sprite/image/A7-4 待办。
  - 记录 172/171/179/171/5/1、字节/帧/6 尾槽/digest、profile ABI、装备优先级、梦蛇生命周期、MG2 与
    transport 证据。
- 视觉 / 手工验证:
  - Codex：`?scene=s189&battle=217` 验普通 fighter 锚点/equal-Y 遮挡及凤梨小妖同步变牡丹精；
    `?scene=s166&battle=175` 验大手召唤扫把，spawn 首个可见帧已有图且无迟到切换。
  - Codex：梦蛇 295 完整旧图 -> 新图过渡、死 -> 复活仍蛇、战后新 battle 恢复；变身后攻/法前摇使用
    player5 profile。土灵珠 267 未 learned 山神 336 仍正确显示 summon 13。
  - Codex：长鞭 163/苗刀 179 分别切 player6/7，卸装恢复；执行 s145/s174/s233 后立即战斗及 save/reload
    后分别用 5/1/9，无效定义不污染存档。
  - Codex + Kimi：资源库、profile 编辑、共享影响、缩帧阻断、替换刷新、删除禁用、undo/redo、保存重开、
    Save As、offline clone、诊断跳转、blank/demo/e2e 显式自包含形象；长名称和窄面板不溢出。
  - 临时让 `/extracted/data/battle-sprite/**` 与 `/extracted/data/battle-sprites.json` 返回 503 后，PAL HTTP、
    FSA clone、editor play 与 Reforge 仍完成上述流程；Network 只命中工程
    `assets/migrated/battle-sprites/**`，console 无 fallback/404/decode error。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-19）**。只读普查确认该族不是“172 个文件登记”即可结束：数字/path 双轨之外，
  `battle-effect-index`、玩家/敌人硬编码帧 ABI、7 条装备 pending、未消费 trance、漏 effectiveSkills 的召唤
  预载、敌异步迟到换图和 equal-Y 遮挡共同构成闭环。建议以 171 条带 profile 的 BattleSpriteDef 分离语义/
  二进制；全 172 源 byte-exact 进入 catalog；按 AssetId + record signature 缓存；origin+结构分级 codec；
  迁移/保存/编辑器/transport 一次收口。直接 AssetId 方案已评估，但不能为 effect-index 与可复用动作布局提供
  独立归属。方案可实现；build 必须等待 Kimi/GLM 独立签字。
- Kimi: **agree（2026-07-19;附 R1-R4 build 必落钉,见「主审立场」）**。六项压测逐项核对并抽查
  代码/数据/一阶段真值:profile 分层必需(effect-index 表与敌区段无独立归属,AssetRecord 只物理);
  字段边界干净(yPosOffset/skill 参数留消费者);active 优先级与 global.c:1978-2009 一致;
  梦蛇 sprite 不被复活清(game-mechanics:1234-1248 实证);预载含装备授技;A7-3E/X3/A7-4 分界诚实。
  基线抽点:19 player + 153 enemy 文件;skill.ts:65-66 summon godId+speed/tint/sound 归属实证。
  无架构 counter。
- GLM: **agree（2026-07-19;附 G1-G4 build 必落,见下）**。独立复算全部基线 + 代码逻辑审查（读源码逐路径推演 actor.ts/enemy.ts/skill.ts/asset.ts/battle-effect-index）。

  **基线独立复算** ✅：
  - 源文件 player **19** / **137,531 gzip B**（0..18 连续）+ enemy **153** / **763,442 gzip B**（1..153 连续）= 合计 **172 files / 900,973 gzip B** ✅
  - catalog **1,707** / **0 battle-sprite records** ✅
  - battle-sprite 在 legacy families（共 3: battle-sprite/effect-sprite/image）✅
  - **153 enemies → 152 unique spriteNum / 1 unused(enemy 98) / 1 shared(spriteNum 81 = enemy-478+479)** ✅
  - Actor battleSprite **全 6 = None**（通过 setActorAppearance/number 解析，非 ActorDef 直接引用）✅
  - setActorAppearance battleSprite **3 条**（值 5/1/9，全 zhao-linger 梦蛇相关 s145/s174/s233）✅
  - summon **9 条** godId **0..8**（覆盖 player 10..18）✅
  - trance **1 条** skill 295 sprite=**5**（梦蛇）✅
  - battle-effect-index.json 确认存在，20 值 `[0,0,1,1,...,3,3]` = player 0..9 pair ✅

  **0x1A row=1 口径说明** ✅：卡内"10 条原始 0x1A row=1"指 **PAL 源**（3 剧情+7 装备）；当前迁移产物中 3 剧情已翻译（s145→5/s174→1/s233→9 = 上面的 setActorAppearance 3 条），7 装备仍 pending（migrate-content.ts:742-753）。**不矛盾**——设计要求把这 7 条在上游翻译，不矛盾。

  **代码逻辑审查** ✅：
  - **ActorDef**（actor.ts:60-63）：`battleSpriteNum?: number` + `battleSpritePath?: string`——裸数字+路径双轨 ✅ 缺口确认
  - **EnemyDef**（enemy.ts:88-97）：`spriteNum: number`（必填）+ `spritePath?: string`——同双轨 ✅ 缺口确认
  - **summon**（skill.ts:65）：`godId: number`——隐式 +10 映射到 player 10..18 ✅ 缺口确认
  - **trance**（skill.ts:66）：`sprite: number`——裸数字 ✅ 缺口确认
  - **battle-effect-index**：当前 runtime 按 `spriteNum * 2` 查表（main.ts:295-306），须迁为 profile 显式 `castEffectBase`/`attackEffectBase` ✅
  - **player 0 合法**：与 world sprite/portrait 的"0 = 缺席/清空"语义不同，player 0 是李逍遥 fighter，迁移边界须携带 channel（player vs enemy 同号隔离）✅

  **G1-G4 build 必落（非阻塞，纳入 build 范围）**：
  - **G1（关键）**：**player 0 合法性 + player/enemy 同号隔离**——迁移器必须按 channel 区分 player 0..18 vs enemy 1..153，不能套用"正数有效/0 = 无"的通用 helper。AssetId 格式 `battle-sprite.pal.player.NNN` / `battle-sprite.pal.enemy.NNN` 带 channel 前缀。
  - **G2**：**7 条装备 row=1 必须在上游 raw script 翻译**（migrate-content.ts:742-753 当前 pending=7），不在 local-v3 upgrader 按 PAL item id 猜注入。卡内 §57/§152 已明确。
  - **G3**：**summon godId → BattleSpriteDef.id 映射**——godId 0..8 映射到 player 10..18 的 BattleSpriteDef.id（如 `player-summon-10`..`player-summon-18`），迁移器确定性格式。
  - **G4**：**battle-effect-index profile 物化**——10×2 数值表从 runtime 查表改为 player-fighter profile 的显式 `castEffectBase`/`attackEffectBase` 字段；不再按 `spriteNum * 2` 寻址。A7-3E 只负责把 effect frame base 升级为 effect clip 语义引用。

  **总结**：172/900,973B + 153/152/1/1 + 6+153+9+1+3 = 179 refs + 3 digest 全独立冻结；schema 全数字双轨确认；player 0/同号隔离/装备 pending/effect-index/battle-effect-index 五项 build 必落。**agree。**

- counter / 分歧处理: 当前无未决分歧;GLM G1-G4 与 Kimi R1-R4 互不冲突。
- 缺签豁免: N/A
- build 准入结论: **allowed（Codex agree + Kimi agree + GLM agree,三签齐,2026-07-19）**;
  Status 翻转 draft→build 与看板更新由 Codex 执行;R1-R4 与 G1-G4 纳入 build 范围。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-19）**。实现与自验证完成：PAL 172 records / 171 defs / 179 refs / 171 used /
  5 shared / 1 unused，900,973 gzip B / 775 帧 / 6 legacy 坏尾，最终 catalog 1,879 records /
  68,439,367 B；R1-R4、G1-G4 全落。五包 typecheck + 1641 tests passed / 1 existing skip、editor/reforge
  production build、Biome、`git diff --check` 全绿；编辑器与 PAL 两组战斗浏览器烟测无 console 错误。
- Kimi: pending
- GLM: **accept（2026-07-20;见下）**。独立复算全部产物数字 + 全 172 文件 SHA 逐项验证 + 代码逻辑审查。

  **产物独立复算** ✅：
  - catalog **1,879** records / **68,439,367 B** ✅
  - battle-sprite records **172** / **900,973 B**（player 19 @ 0-18 + enemy 153 @ 1-153）✅
  - **全 172 文件 SHA256+bytes 逐项零 mismatch**（ok=172 fail=0 missing=0）✅
  - BattleSpriteDef **171** / 全有 asset+profile / 零 spriteNum ✅
  - **179 refs / 171 used / 5 shared / 1 unused(enemy.098)** ✅（enemy.098 在 pal-migration.ts:204 被 pinned assertion 冻结）
  - shared: enemy-battle-81(×2) + player-fighter-1(×2)/5(×2)/6(×3)/7(×4) = 5 shared / 8 extra edges ✅
  - MG2 dry-run `battle-defs=171 battle-refs=179 battle-used=171 battle-shared=5 battle-unused-assets=1` + `writes=0 deletes=0 conflicts=0` ✅
  - tuple-digest `ecbec106...` + player `163f7282...` + enemy `dd3b00f6...` ✅
  - frames **775** / malformed-tail-slots **6** ✅

  **代码逻辑审查** ✅：
  - actor.ts:61 `battleSprite: string`（AssetId 迁移完成，无 spriteNum/battleSpriteNum/battleSpritePath）✅
  - enemy.ts:81 `battleSprite: string`（同上）✅
  - skill.ts:67,72 summon/trance `battleSprite: string`（无 godId/spriteNum/spritePath）✅
  - `godId+10` / `spriteNum*2` 仅在 `upgrade-local-v3-battle-sprites.ts` 迁移边界（非 runtime/editor 正式代码）✅
  - battle-sprite 退出 legacy families（保留 effect-sprite/image）✅
  - contentVersion 保持 **3**（非 4，A7-4 总门禁未完）✅
  - G1-G4 全落地 ✅

  **测试** ✅：content 255 / reforge 500 / editor 530 / migrate 237+1skip 全 pass。

  **文档** ✅：capability-map A7 ⚠️/⚠️ 未提前标 done；172/171/179/171/5/1 数字在 capability-map 中与实测一致。

  **总结**：172/900,973B/775 frames/6 tails + 171 defs/179 refs/171 used/5 shared/1 unused(enemy.098 pinned) + 全 172 SHA 零 mismatch + MG2 零计划 + schema 全 BattleSpriteDef.id 迁移 + 静态归零。**accept**。

- counter / 返工处理: N/A（GLM accept 无 counter）
- 缺签豁免: N/A
- done 准入结论: **Codex accept + GLM accept；等待 Kimi 独立 accept，三签未齐不得 done**

## Draft: 设计与风险

### 设计结论

1. **三层身份**：内容只保存 `BattleSpriteDef.id`；定义保存 profile + `asset: AssetId`；AssetRecord 保存唯一
   project-relative path/bytes/SHA/media/origin。Definition label 与 AssetRecord label 独立，runtime 不解析 id。
2. **171 定义 / 172 资产**：PAL 对当前实际使用的 19 player/summon 与 152 unique enemy 建定义；enemy98 只
   登 catalog。共享 enemy81 保持一个定义两位 EnemyDef 使用；未来同 binary 不同 profile 可建两个定义。
3. **profile 是动画 ABI**：runtime 所有帧取值来自 profile，不再散落 0..10 与 idle+magic+attack 算式；替换
   校验面向定义和全部消费者。玩家 effect base 暂存最终帧基，A7-3E 再把物理 effect sprite/clip 收口。
4. **单一 active appearance**：战前按 base -> persistent -> equipment 派生 effective def；战中 trance 是最高
   ephemeral 层。图像、frame ABI、attack/cast effect profile 每次都读同一个 active def，避免“图换了但特效
   仍按旧号”。
5. **战前资源闭包**：初始双方、effective/cooperative skills、装备授技、trance/summon、敌 transform/summon
   递归闭包一次准备；session 内无网络/磁盘 IO，abort 只阻止 commit，不取消共享 cache promise。
6. **编辑器双层生命周期**：定义与二进制分别可见/可删除；就地上传是“import asset + create def + assign”原子
   命令。替换资产保 AssetId，修改 profile 保定义 id；共享影响/缩帧/删除统一使用 typed reference proof。
7. **上游迁移与 transport**：PAL 资源与 7 装备效果由 migrate 生成；local upgrader 只翻已有旧字段。复用
   A7-3T/W 完整 SHA、assetBlobs、union/final catalog、byte-exact clone/ZIP 与 MG2 authored protection。

### 已知风险

- 风险: profile schema 过薄会留下硬编码，过厚则把 EnemyDef/Skill 调用语义误搬进资源定义。
- 缓解: player 只收动作帧/effect binding；enemy 只收帧区段与纯播放速度；`yPosOffset`、AI、skill speed/tint/
  sound 明确保留在消费者，并由 Kimi 主审字段归属。
- 风险: 现有 10 帧 fighter 与 2..13 帧 summon 被统一最小帧数误拒。
- 缓解: 判别 profile + 命名帧范围校验；默认 no-shrink，steal optional，consumer union 决定修复式缩帧。
- 风险: 迁移本族时顺手修改 A7-3E effect schema，导致范围失控。
- 缓解: 本卡只物化 player effect frame base；effect binary、clip 资源和 SkillAnimation.effectSprite 明确留 E。
- 风险: local upgrade/Save As 在发布 manifest 前删旧文件导致中断工程不可恢复。
- 缓解: 沿用 binary -> union catalog -> content -> manifest -> final catalog -> removals，覆盖每个 close 中断点。

### 主审立场

- Reviewer: Kimi
- 结论: **agree（2026-07-19）**——六项压测逐项成立,无阻塞;附 R1-R4 build 必落钉。
  1. **BattleSpriteDef{profile,asset} vs direct AssetId**:分层必需。`battle-effect-index` 的 10×2
     表(effect base 属表现绑定)和 enemy idle/magic/attack 区段(动画 ABI)在 direct AssetId 下
     无家可归——AssetRecord 只许物理;同二进制多布局的未来形态也要求定义可复数。
     与 TilesetDef/SpriteDef 的 A7-3T/W 先例同构;`{id,label,asset,profile}` 是正解。
  2. **profile 字段归属**:边界干净。player-fighter 只收命名帧 + cast/attackEffectBase;enemy 只收
     区段与播放速度,`yPosOffset` 留 EnemyDef(战场位置,非精灵属性);summon 只声明用途,
     speed/tint/sound 留 Skill 调用(skill.ts:65 实证现就在技能上)。AI/数值/参数不进资源定义。
  3. **active appearance 优先级**:与 global.c:1978-2009 一致(base→persistent→装备槽序末位胜出→
     transient 最高),且图像/帧 ABI/effect profile 必须读同一个 active def——这正是当前
     trance 只写值不换图(battle-core.ts:91-92 渲染恒画启动 playerSprites)的修复形态。
     装备与 transient live 派生不烙回 ActorDef。
  4. **梦蛇真值**:0x31 sprite 不经复活清(game-mechanics:1234-1248 实证,被清的只有 rgPlayerStatus
     系如 DualAttack),战后三件套才全清——卡内生命周期(闪色 6×40ms→72×16ms 过渡→战后恢复
     effective base)与之一致;死亡/复活保持的结论方向正确。
  5. **preload/cache/事务**:effectiveSkills 含装备授技是硬要求(土灵珠 267→山神 336→summon 13
     会被 learnedSkills 漏掉);敌 transform/summon 递归闭包 + 会话内同步换 + abort 后无迟到写
     (修 battle-session.ts:1463-1515 异步回写);readiness fail-loud 取代 catch→undefined 隐形人;
     共享 enemy81 缩帧取两消费者并集;undo 恢复三元组。
  6. **A7-3E/X3/A7-4 分界**:诚实。本卡只物化 player effect frame base 数值,E 负责 effect clip/
     二进制与 SkillAnimation.effectSprite;X3 image 不动;A7-4 留适配器/v4/总门禁,
     contentVersion 保持 3;tilesetBlobs 只移 battle-sprite 消费,容器留给 E。
- 必落钉(R,不阻塞签字,build 验收核对):
  - **R1 梦蛇时序必须有 phase-1 golden**:6×40ms 色移序列(0/2/4/6/8/10)与 72×16ms 过渡在
    测试注释写明一阶段出处行号,不靠感觉重现;死亡→复活保持与战后恢复各一条 runtime 测试。
  - **R2 active def 单真源**:渲染、effect profile、编辑器 preview 必须经同一个 effective
    appearance 派生函数读取;静态扫描禁止出现第二条"只换图"旁路(当前 trance bug 的形态)。
  - **R3 预载闭包专测**:effectiveSkills(含装备授技)+合体技+敌 transform/summon 递归;
    土灵珠→山神→summon 13 必须有端到端测试;readiness 失败必须 fail-loud 且消息带 AssetId。
  - **R4 effect base 只进定义不进 runtime 公式**:cast/attackEffectBase 物化后,删除
    `spriteNum*2` 寻址;静态扫描该公式归零,防止数字旁路复活。
- 是否建议进入 build: **是——Codex/Kimi/GLM 三签齐,build allowed**;Status 翻转与看板更新由
  Codex 执行。G1-G4 按 GLM 行纳入 build。

### 三方争议记录(按需)

- Codex: 建议采用带 profile 的 BattleSpriteDef；认为 direct AssetId 无法正确承接同二进制多布局与
  battle-effect-index 的表现语义。
- Kimi: **agree**。profile 分层必需(effect-index 与敌区段无独立归属);字段边界干净(yPosOffset/skill
  参数留消费者);active 优先级=global.c 顺序且图像/ABI/effects 同读一个 active def(正对 trance bug);
  梦蛇 sprite 不被复活清(phase1 实证);预载含装备授技;A7-3E/X3/A7-4 分界诚实。
  R1(梦蛇时序 phase-1 golden)/R2(active def 单真源)/R3(预载闭包与 readiness 专测)/
  R4(effect base 删除 spriteNum*2 寻址) build 必落。
- GLM: **agree**。172 源/900,973B + 153 enemies→152 unique/1 unused(enemy98)/1 shared(spriteNum81) + Actor6+Enemy153+summon9+trance1+appearance3+equip7=179 refs/171 used/5 shared 全独立冻结；schema 全数字双轨确认(actor.battleSpriteNum/enemy.spriteNum/summon.godId/trance.sprite)；battle-effect-index 20 值确认。G1(player0合法+channel隔离)/G2(7装备上游翻译)/G3(summon godId→id映射)/G4(effect-index profile物化) build 必落。
- 用户拍板: pending（仅发生 counter 时需要）

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（三签齐，2026-07-19 进入 build）
- 修改文件:
  - content：`battle-sprite.ts`、Actor/Enemy/Character/Item/Skill/Script、typed asset/reference validator；
  - migrate：`pal-battle-sprites.ts`、PAL asset/manifest/migration、raw content/enemy/event 翻译与确定性 fixture；
  - reforge：catalog loader/cache/readiness、active appearance、battle core/session/animation/presentation、save v4；
  - editor：定义/资产资源库与预览/picker/import，commands/session/diagnostics/local-v3 journal/save/clone/zip；
  - projects：PAL/baseline 的 catalog/content/manifest，demo/e2e-own generated placeholder；本卡所列阶段文档。
- 实现摘要:
  - 新增带判别 profile 的 `BattleSpriteDef`，所有业务消费者只引用定义 id；`battle-sprite` 退出 legacy。
  - PAL 172 个 gzip RLE 全量登记并 byte-exact 物化；7 装备、3 appearance、1 trance、9 summon 在上游
    迁移为语义引用，effect-index 物化到 fighter profile，迁移二跑 0/0/0。
  - runtime 使用每工程 catalog cache/readiness 与递归敌闭包；active appearance 同时驱动图像/ABI/effect，
    梦蛇一阶段时序与生命周期、session ownership、equal-Y X 降序都已回归。
  - editor 完成定义/资产双视图、逐帧/命名动作、typed 深链、导入/赋值/替换/独立删除、共享/no-shrink、
    可逆修复与保存；local-v3 journal 和 save v4 fail-closed。
  - 浏览器实测发现并修复“从当前定义切资源视图却落到排序首项”的深链 bug，并增加回归与输入 aria label。
- 运行命令:
  - `pnpm --filter @type-pal/content check` -> 23 files / 255 tests；
  - `pnpm --filter @type-pal/shared check` -> 13 files / 121 tests；
  - `pnpm --filter @type-pal/reforge check` -> 54 files / 500 tests；
  - `pnpm --filter @type-pal/editor check` -> 58 files / 528 tests；
  - `pnpm --filter @type-pal/migrate check` -> 32 files / 237 passed + 1 existing skip；
  - `pnpm --filter @type-pal/editor build`、`pnpm --filter @type-pal/reforge build`、`pnpm lint`、
    `git diff --check`；正式路径静态扫描旧 loader、number/path/godId、`g+10`、`spriteNum*2` 均为 0。
- 浏览器 / 手工检查:
  - 编辑器 `http://127.0.0.1:6010/?module=asset&page=sprite&domain=battle&view=definition&object=player-fighter-0`：
    171/172、定义/资源路由、逐帧、命名动作、标签输入、引用与窄栏布局通过；console 0 warning/error。
  - PAL `http://localhost:6051/?scene=s189&battle=217` 与 `?scene=s166&battle=175`：真实 fighter/enemy
    初始帧、bottom-center 锚点、场景着色正常；console 0 warning/error。
  - 梦蛇完整时序/死复活/战后恢复、装备形象、土灵珠召唤和敌变身/召唤由 phase-1 golden + deterministic
    core/session/readiness tests 验证，避免用肉眼计 40ms/16ms 帧。
- 跳过的检查及原因: 未要求用户承担例行验证；Kimi 正式视觉主审和 Kimi/GLM task-card accept 尚未执行，
  因此只推进 review，不标 done。

## 资源生成记录(如适用)

- Generation Owner: N/A（PAL 只做确定性 byte-exact 迁移；blank placeholder 为代码生成 fixture，不是 AI 生图）
- 生成目的 / 替换对象: 让 demo/e2e-own/blank 显式拥有可解码战斗形象，避免默认借用 PAL player 0；
  PAL 原版字节仅由本地合法提取源确定性物化。
- 提示词要点 / 风格约束: N/A
- 输出路径: `projects/demo/assets/generated/battle-sprites/**`、
  `projects/e2e-own/assets/generated/battle-sprites/**`；PAL 本地输出为
  `projects/pal/assets/migrated/battle-sprites/{player,enemy}/**`（受保护且 gitignore）。
- 尺寸 / 格式 / 透明背景 / 调色约束: gzip indexed RLE + 工程标准色彩
- 资源登记位置: 各工程 `assets/index.json` + `content/battle-sprites.json` + `manifest.content.battleSprites`
- 验证方式: placeholder 确定性生成测试；PAL 逐文件 path/media/origin/bytes/SHA/gzip/source byte-exact，
  172 files / 900,973 B / 775 frames / 6 tail slots 与三个 tuple digest 冻结。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Kimi
- 验证方式: Codex 使用本地 dev server + in-app browser 做编辑器和 PAL Reforge 实机 smoke；动画毫秒时序、
  session 生命周期、递归 readiness 和层序用 phase-1 golden/确定性测试逐帧断言。
- 截图 / 像素检查路径: 浏览器会话即时截图已检查，不向仓库提交测试图片；实现证据由 URL、console 记录与
  `BattleSpriteLibrary.test.tsx` / `battle-anim.test.ts` / `battle-session.test.ts` /
  `present-battle.test.ts` 固化。
- 结论: Codex **accept**；资源库三栏布局无按钮溢出，定义/资源 deep-link 修复后保持当前 AssetId；
  s189/team217、s166/team175 初始战斗帧正常，console 无 warning/error。
- 未完成项: Kimi 正式视觉主审签字 pending；不转嫁给用户。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: 三个内部只读压力审计均 accept（runtime、editor、data/local-upgrader），未发现 blocker；它们仅作为
  Codex 自验证增强证据，不替代 Kimi/GLM 订阅席位正式签字。
- 必须返工项: 当前无；正式 reviewer 若发现问题按 counter/rework 处理。
- Accept / rework: **pending formal Kimi + GLM review**

## 用户验收

- 用户结论: pending
- 后续任务: A7-3E effect sprite -> X3 generic image -> A7-4 catalog-only 总门禁

## 交接日志

- 2026-07-19 Codex: 完成 battle-sprite 全链只读普查并开 draft；冻结 172/900,973B/775、6 个坏尾、
  171 defs、179 refs/171 used/5 shared/1 unused，以及 7 equip + 3 appearance + 1 trance + 9 summon 的完整
  语义面。确认梦蛇未换图、effectiveSkills 召唤漏预载、敌换图迟到写与 equal-Y 遮挡差异。Evidence: 本卡
  上下文锚点、数据基线与验收矩阵。Next: Kimi/GLM 独立设计审查并写 agree/counter；签字不齐不得实现。
- 2026-07-19 Kimi: 架构/UX 设计主审完成,签 **agree**(R1-R4 build 必落钉)。六项压测逐项核对:
  profile 分层必需(effect-index 表与敌区段在 direct AssetId 下无归属);字段边界干净(yPosOffset 留
  EnemyDef、skill speed/tint/sound 留 Skill,skill.ts:65 实证);active 优先级=global.c:1978-2009 且
  图像/ABI/effects 须同读一个 active def(正对当前 trance 只写值不换图);梦蛇 sprite 不被复活清
  (game-mechanics:1234-1248 实证);预载须含 effectiveSkills 装备授技(土灵珠→山神→summon 13);
  A7-3E(只物化 frame base 数值)/X3/A7-4 分界诚实,contentVersion 保持 3。锚点抽点:19 player +
  153 enemy 文件与基线一致。R1(梦蛇时序 phase-1 golden)/R2(active def 单真源)/R3(预载闭包与
  readiness 专测)/R4(删 spriteNum*2 寻址)必落。Evidence:本卡主审立场、签字区、争议记录。
  三签齐 build 准入 allowed,Status 翻转与看板由 Codex 执行。未改实现文件。
- 2026-07-19 GLM: 数据/迁移/测试矩阵设计审查签 **agree**。独立复算：player 19 源/137,531B(0..18) + enemy 153 源/763,442B(1..153) = 172 files/900,973 gzip B 全精确；catalog 1,707/0 battle-sprite；battle-sprite 在 legacy(3 families)。153 enemies→152 unique spriteNum/1 unused(enemy 98)/1 shared(spriteNum 81=enemy-478+479)；Actor battleSprite 全 6=None(经 setActorAppearance 解析)；setActorAppearance battleSprite=3(值 5/1/9 全 zhao-linger s145/s174/s233)；summon 9 godId 0..8(player 10..18)；trance 1 skill 295 sprite=5。代码逻辑审查（读源码逐路径推演）：actor.battleSpriteNum?:number + battleSpritePath?:string 双轨；enemy.spriteNum:number(必填)+spritePath? 双轨；summon.godId:number 隐式+10；trance.sprite:number 裸数字；battle-effect-index 20 值 [0,0,...,3,3] runtime 按 spriteNum*2 查表。**G1 关键**：player 0 合法(李逍遥 fighter)+player/enemy 同号隔离须 channel 前缀 AssetId；G2：7 装备 row=1 必须上游翻译(migrate-content.ts:742-753 pending=7)不在 local-v3 按 item id 猜注入；G3：summon godId→BattleSpriteDef.id 确定性映射(godId 0..8→player 10..18)；G4：battle-effect-index profile 物化(10×2 表→castEffectBase/attackEffectBase)。0x1A row=1 口径=原始 PAL 源 10 条(3 剧情已迁+7 装备 pending)，不矛盾。Evidence: 设计签字 GLM 行。Next: 待 Kimi 签后三齐 build allowed。未改实现文件。

- 2026-07-19 Codex: 核对 Codex/Kimi/GLM 三方设计签均为 **agree**，无 counter 或缺签豁免；
  正式将任务从 draft 推进至 build。R1-R4 与 G1-G4 全部并入实现和验收范围，Coding Owner 仅 Codex；
  其他 Agent 只允许只读审计。Next: 先完成内容模型、确定性迁移与工程自包含，再收口 runtime、editor、save
  和 transport，完成自验证后进入三方 review。
- 2026-07-19 Codex: A7-3B 实现与自验证完成，签 **accept** 并推进至 review。冻结结果 172 records /
  171 defs / 179 refs / 171 used / 5 shared / 1 unused、900,973 B / 775 frames / 6 bad tails、catalog
  1,879 / 68,439,367 B；R1-R4/G1-G4、MG2/local-v3/save v4/transport/editor 双生命周期全部落地。
  五包 1641 tests passed + 1 existing skip、两个 production build、lint/diff/static scan 全绿；编辑器定义/资源
  深链和 PAL s189/team217、s166/team175 实机 smoke 无 console 错误。内部 runtime/editor/data 三路只读审计
  accept，但不代签 Kimi/GLM。Next: Kimi 做架构/runtime/editor/视觉正式 review，GLM 做数据/migration/IO/
  测试矩阵正式 review；两方都只能改任务卡审查记录，不得改实现或提前标 done。
- 2026-07-20 GLM: 数据/迁移/IO/测试正式审查签 **accept**（commit ecbb6259）。独立复算：catalog 1,879/68,439,367B；battle-sprite 172 records/900,973B（player 19@0-18 + enemy 153@1-153）；全 172 文件 SHA256+bytes 逐项零 mismatch（ok=172 fail=0 missing=0）；BattleSpriteDef 171 全有 asset+profile 零 spriteNum；179 refs/171 used/5 shared(enemy81×2+player1×2/5×2/6×3/7×4)/1 unused(enemy.098 pinned pal-migration.ts:204)；MG2 writes=0/deletes=0/conflicts=0 + tuple-digest ecbec106.../player 163f7282.../enemy dd3b00f6... + frames=775 + tails=6。代码逻辑审查：actor.ts:61 battleSprite:string / enemy.ts:81 battleSprite:string / skill.ts:67,72 summon+trance battleSprite:string 全迁 AssetId 零 spriteNum/godId；godId+10/spriteNum*2 仅在 upgrade-local-v3-battle-sprites.ts 迁移边界；battle-sprite 退出 legacy（保留 effect-sprite/image）；contentVersion=3 非4。测试 content 255/reforge 500/editor 530/migrate 237+1skip 全 pass。capability-map A7 ⚠️/⚠️ 未提前 done。Evidence: done 准入 GLM 行。Next: 待 Kimi 独立 accept 后三签齐交用户验收。未改实现文件。

## 下一位 Agent 提示词

### Kimi（当前正式 review）

```text
接手任务: A7-3B 战斗精灵索引资源闭包的正式实现/视觉审查
任务卡: docs/ops/tasks/A7-3B-battle-sprite-asset-closure.md
当前状态: review；Codex=accept，Kimi/GLM=pending，done blocked
你的角色: 架构/schema/跨包接口、runtime 战斗表现、editor UX 与视觉主审
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡全部内容、
docs/phase2/foundation/content-schema.md §6.7、docs/phase2/foundation/a7-resource-closure-audit.md §3.13、
docs/phase2/battle-presentation-audit-2026-07-05.md §8、docs/phase1/game-mechanics.md:1234-1248。
已完成: Codex 已实现并自验 BattleSpriteDef/catalog 单链、active appearance、梦蛇一阶段时序、递归 readiness、
equal-Y 层序、save v4/local-v3、编辑器定义/资产双生命周期；五包 1641 tests passed + 1 existing skip，
editor/reforge build 与 lint 全绿。浏览器实测资源库和 PAL s189/team217、s166/team175 无 console 错误。
请你做: 独立审实现，不采信摘要代替源码；重点核对 R1-R4、profile 字段归属、图像/ABI/effect 同一 active def、
trance 死亡复活/战后清理、effectiveSkills+合体+敌递归闭包、session ownership、bottom-center/equal-Y 层序；
审编辑器定义/资产切换、具体资源深链、共享/no-shrink/undo/delete、长名窄栏与可访问性。可复跑测试和本地浏览器。
输出要求: 若无 blocker，只修改任务卡，把 Kimi 审查签写为 accept，补证据、视觉结论和交接日志；若有问题签
counter，列出可复现步骤、文件/行、必须返工项与是否需用户拍板。明确 accept 或 counter。
不要做: 不得修改实现文件，不得代签 GLM，不得把 Status 改 done，不得把 effect-sprite/image/A7-4 冒领为完成。
```

### GLM（当前正式 review）

```text
接手任务: A7-3B 战斗精灵索引资源闭包的数据/迁移/IO/测试正式审查
任务卡: docs/ops/tasks/A7-3B-battle-sprite-asset-closure.md
当前状态: review；Codex=accept，Kimi/GLM=pending，done blocked
你的角色: 数据/schema、迁移/MG2、local-v3/save、引用闭包和测试矩阵主审
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡全部内容、
docs/phase2/foundation/content-schema.md §6.7、docs/phase2/migrate/asset-pipeline.md §13、
docs/phase2/editor/project-lifecycle-design.md §15、docs/phase2/foundation/a7-resource-closure-audit.md §3.13。
已完成: Codex 已实现并自验；目标冻结为 172 files / 900,973 gzip B / 2,313,598 raw B / 775 frames /
6 tails，171 defs / 179 refs / 171 used / 5 shared / 1 unused，catalog 1,879 / 68,439,367 B；
五包 1641 tests passed + 1 existing skip，migration 二跑 0/0/0，正式旧字段静态扫描为 0。
请你做: 独立复算 G1-G4 和全部数据门禁；核对 player0/channel、19+153 byte/SHA/digest、enemy98、
7 equip+3 appearance+1 trance+9 summon、effect-index 物化；审 typed walker/validator、MG2 author ownership、
local-v3 journal read-set/目录 inventory/路径冲突/中断恢复、save v4 party+reserve、HTTP/FSA/Save As/clone/ZIP、
demo/e2e placeholder 与 PAL ignored 原版字节边界。复跑你认为必要的测试。
输出要求: 若无 blocker，只修改任务卡，把 GLM 审查签写为 accept，补独立数字、测试和交接日志；若有差异签
counter，给出命令/数字/文件/行、必须返工项与是否需用户拍板。明确 accept 或 counter。
不要做: 不得修改实现文件，不得代签 Kimi，不得把 Status 改 done，不得手改 projects/pal 生成产物。
```

以下为已经执行完毕的 draft 历史提示词，仅保留审计轨迹。

### Kimi（历史 draft）

```text
接手任务: A7-3B 战斗精灵索引资源闭包的 draft 架构/UX 设计审查
任务卡: docs/ops/tasks/A7-3B-battle-sprite-asset-closure.md
当前状态: draft；Codex=agree，Kimi/GLM=pending，build blocked
你的角色: 架构/schema/跨包/runtime/编辑器交互与视觉主审
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/phase2/foundation/actor-model-design.md、
docs/phase2/battle-presentation-audit-2026-07-05.md、docs/phase1/game-mechanics.md:1234-1248、
docs/phase2/foundation/a7-resource-closure-audit.md、A7-3T/A7-3W 任务卡和本任务卡全部内容。
已完成: Codex 只读方案已冻结；没有修改 A7-3B 实现。基线为 172 源/900,973B/775 帧/6 legacy 尾槽，
171 个建议定义、179 语义 refs、171 used、5 shared、enemy98 唯一 unused。已识别 7 装备 pending、梦蛇不换图、
装备授召唤漏预载、敌异步迟到写、effect-index 数字旁路与 equal-Y 遮挡差异。
请你做: 独立压力测试 BattleSpriteDef{profile,asset} vs direct AssetId；逐字段审 player/enemy/summon profile 边界；
核对 active appearance 优先级、梦蛇 6×40ms+72×16ms、一阶段层序/锚点/遮挡；审战前递归 preload/cache/readiness、
编辑器定义/资产双生命周期、共享/缩帧/undo、local/save/transport 事务和 A7-3B 与 A7-3E/A7-4 分界。
若同意，把 Kimi 设计签写为 agree，补主审立场与 build 必落钉；若不同意，签 counter，给出可执行替代 schema、
数据迁移与验收口径，并明确是否需用户拍板。
不要做: 不得修改实现文件，不得代签 GLM，不得把任务推进到 build/done，不得冒领 effect-sprite/image/A7-4。
输出要求: 在任务卡落签/意见/证据/交接日志；回复明确 agree 或 counter、必须返工项、是否建议进入 build。
```

### GLM（历史 draft）

```text
接手任务: A7-3B 战斗精灵索引资源闭包的 draft 数据/迁移/测试设计审查
任务卡: docs/ops/tasks/A7-3B-battle-sprite-asset-closure.md
当前状态: draft；Codex=agree，Kimi/GLM=pending，build blocked
你的角色: 数据/schema、迁移/MG2、保存升级、引用覆盖与测试矩阵审查
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/phase1/status/resource-status.md、
docs/phase1/game-mechanics.md:1234-1248、docs/phase2/foundation/a7-resource-closure-audit.md、A7-3T/A7-3W
任务卡和本任务卡全部内容。
已完成: Codex 只读方案已冻结，未改实现。建议 172 records + 171 BattleSpriteDef；装备 row1 必须在上游翻译，
local-v3 不按 PAL item id 猜注入；battle-sprite 从 tilesetBlobs/legacy/clone descriptor 退出。
请你做: 独立复算 19+153 文件、900,973 gzip B、2,313,598 raw B、775 帧、6 个坏尾及三个 digest；复算
Actor6+Enemy153+summon9+trance1+appearance3+equip7=179 refs、171 used、player1/5/6/7+enemy81 五个共享、
enemy98 唯一 unused、AI 26/15/0 missing、catalog 1707->1879/总 bytes 68,439,367；核对 10 条 0x1A row1 +
1 条 0x31 全覆盖、player0/channel 冲突、enemy frame contracts、MG2 authored 保护、本地/save 升级、中断恢复、
clone/ZIP/FSA 和静态归零矩阵。若同意写 GLM=agree 并补 build 必落钉；任一口径不成立则 counter。
不要做: 不得修改实现文件，不得代签 Kimi，不得推进 build/done，不得手改 projects/pal 生成产物。
输出要求: 在任务卡落签/证据/交接日志；回复明确 agree 或 counter、数字差异、遗漏风险和 build 建议。
```
