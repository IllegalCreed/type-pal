# A7-3W - 大世界精灵索引资源闭包

Status: done
Phase: phase2
Capability: A7 / R3 / R7 / A4 / C2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + Kimi
Unavailable Agents: none
Branch: main

## 目标

把 PAL、仓库示例工程和作者工程的大世界精灵从 `SpriteDef.spriteNum/path +
manifest.assets.legacy.sprites + LegacyAssetAdapter` 双轨收敛为工程内 catalog 资源：角色、实体、脚本和存档
继续引用稳定 `SpriteDef.id`，`SpriteDef.asset` 是定义到二进制 AssetId 的唯一边；运行时、编辑器预览、导入、
逐帧编辑、替换、保存重开和克隆只经 `AssetResolver/FileSource` 读取当前工程里的 gzip 索引 RLE。保持一阶段的
脚底中心锚点、逐帧自锚和场景颜色表着色，不烘 RGBA，不向作者暴露颜色表。

## 范围

- 范围内:
  - `SpriteDef` 收敛为 `{ id, asset, label, layout, poses? }`；`id` 是角色/实体/脚本引用的语义身份，
    `asset: AssetId` 是唯一二进制引用，删除 `spriteNum/path`。
  - `SpriteDef.id -> SpriteDef.asset -> assets/index.json[asset](kind=sprite) -> project-relative path ->
    AssetResolver -> FileSource -> gzip indexed RLE` 单链；同一 AssetId 允许被多个布局定义共享。
  - PAL 提取源 `sprite/1..636.rle` 全量登记和工程内物化；580 个 SpriteDef 映射到 559 个唯一二进制，
    其余 77 个未被内容定义引用的 PAL chunk 仍作为 catalog 资源保留并由闭包诊断报 warning。
  - Actor/Entity/appearance 等既有 `SpriteDef.id` 引用保持稳定；`setFollowers` 和存档中的编外跟随者从
    裸精灵号改为 `SpriteDef.id`，迁移器在边界完成确定性映射。
  - runtime、编辑器场景/剧情预览、精灵库、上传、帧替换/追加、共享资产替换、删除保护、undo/redo、
    pending blob、保存重开、HTTP/FSA/另存/克隆/ZIP 全生命周期。
  - PAL、demo、e2e-own、空白工程种子和旧本地 contentVersion 3 工程的一次性升级与回归。
  - 本族退出 `manifest.assets.legacy.families`，删除 sprite 专用 root/path fallback；旧数字/路径形态只允许
    在迁移器和本地升级输入边界出现一次。
  - MG2 作者接管、迁移双跑零计划、断开 `/extracted/data/sprite` 后编辑器与 Reforge 验证。
- 范围外:
  - 敌人/角色 `battle-sprite`、`effect-sprite` 和 generic `image`；分别由后续 A7-3B/A7-3E/X3 处理。
  - C2 的既有布局/命名姿势内容清洗；本卡只保证资源闭包和不新增/扩大帧越界债务。
  - A7-4 的 contentVersion 4、全部 LegacyAssetAdapter 删除和 catalog-only 总门禁。
  - 新的像素绘图器、骨骼/碰撞盒/动作状态机或大范围精灵库视觉改版。
- 明确不做:
  - 不把精灵烘成 RGBA，不新增 `paletteId`、颜色表编号或颜色表选择器；作者上传全彩图片仍在导入边界按
    工程标准色彩量化为索引 RLE，运行时再按当前场景色彩着色。
  - 不保留 `asset | spriteNum | path` 多选一 schema、catalog miss 后回退数字目录、按 AssetId/定义 id/文件名
    推导物理路径，或运行时按裸数字缓存。
  - 不清洗或重编码 PAL 的 gzip 源字节；已知坏尾槽只在 `legacy-migrated` 解码策略内受控兼容。
  - 不直接手改 `projects/pal` 充当修复；PAL 定义、catalog 和二进制均由迁移器确定性生成。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：schema、save、migration、asset pipeline、跨包公共接口必须三签；迁移缺陷先修上游，
    `projects/pal` 只接受确定性生成产物。
  - `docs/phase2/READ-FIRST.md`：稳定 id、工程自包含、运行时与编辑器共享同一资源解释器；一阶段只作
    UX/机制/资产约定真值，不能把旧目录约定带进新架构。
  - `docs/phase2/decisions.md:332-351`（D25）：大世界精灵保持 gzip 索引数据，运行时按场景色彩着色；
    创作者不接触颜色表，不能烘死 RGBA。
  - `docs/phase2/foundation/phase1-knowledge-harvest.md` E2/E5/MG5：`nSpriteFramesAuto` 的加载语义、
    per-frame 自锚/脚底中心/落笔 `+7px` 和坏尾帧 guard 是一阶段真值。
  - `docs/phase2/foundation/a7-resource-closure-audit.md:124-170,359-468`：同一族不能长期保留 catalog 与
    数字/目录两套解析；物理路径只属于 AssetRecord，未引用 catalog 项是 warning 而非缺失 error。
  - `docs/ops/tasks/A7-3T-tileset-asset-closure.md`：上一族已冻结 AssetId/AssetRecord 分层、完整 SHA、
    pending blob、二阶段 catalog 保存、byte-exact clone/ZIP、MG2 和一次性 v3 升级先例；本卡复用公共原语。
- 代码锚点(`file:line`):
  - `packages/content/src/sprite.ts:35-52`：当前 `SpriteDef` 仍以 `spriteNum` 为二进制身份并可选 `path`。
  - `packages/content/src/validate.ts:291-315`：只校验 spriteNum/layout，未与 catalog kind 交叉验证。
  - `packages/content/src/asset.ts:346-360,655-662`：typed walker 已有 tileset 槽，尚无 `sprites` 资源边。
  - `packages/content/src/script.ts:95-120,346-368`：`setFollowers.sprites` 与存档 `followers` 仍是 `number[]`。
  - `packages/migrate/src/migrate-content.ts:1290-1665`：按原版号合并/拆分 SpriteDef，并为角色精灵建立
    语义 id；需要在这里把数字只留作迁移输入。
  - `packages/migrate/src/translate-events.ts:973`：0x98 仍直接写两个裸精灵号。
  - `packages/migrate/src/pal-assets.ts:524-649`：PAL 一等资源唯一生成入口已物化 tileset，尚未登记 sprite。
  - `packages/pal-extract/src/cli.ts:734-771`：MGO 非空 chunk 已逐个保存为 gzip RLE；本卡不重造提取器。
  - `packages/reforge/src/assets.ts:119-150`：`loadSprite(base, spriteNum, path?)` 是当前双轨集中点，且使用
    宽松 `parseSpriteChunk`。
  - `packages/reforge/src/loader.ts:221-264`：仍把 legacy sprite root 放入 `AssetBase`。
  - `packages/reforge/src/main.ts:341,506-507,747-756,1188-1211,1387-1391,2708-2825,3797-3814`：
    `spriteByNum` 缓存、换形象、编外跟随者和 debug gallery 都仍以数字加载。
  - `packages/editor/src/ui/SpriteUploadWizard.tsx:151-178`：上传仍分配新数字并写 `assets/sprites/<id>.rle`。
  - `packages/editor/src/ui/SpriteFrames.tsx:220-285`、`SceneCanvas.tsx:160-185`、
    `PreviewCanvas.tsx:125-160`：预览仍按数字/path 与旧 pending blob 组装。
  - `packages/editor/src/core/commands.ts:2675-2793`：精灵定义与二进制旧专用命令尚未进入 catalog 原子事务。
  - `packages/editor/src/core/edit-session.ts:37-50`、`project-io.ts:159-210`：A7-3T 已提供 `assetBlobs`，
    `tilesetBlobs` 仍临时承载未迁的精灵族。
  - `packages/editor/src/core/seed.ts:109-185`：空白工程仍生成 sprite legacy 和隐式 `assets/sprites/0.rle`。
- 已知数据基线:
  - `data/extracted/data/sprite` 有 **636** 个 gzip `.rle`，编号精确为 `1..636`；压缩源字节合计
    **1,332,725 B**，宽松真值解得 **4,133** 个有效帧，单文件 1..64 帧；全量
    `num\0bytes\0sha256` tuple digest 为
    `c92c14b5dac5abc39006d94fdefaa699eb0bffddb925447ceb4070c32bb45d03`。
  - `projects/pal/content/sprites.json` 有 **580** 个 SpriteDef、**559** 个唯一 spriteNum；有 **21** 条重复定义
    共享同一二进制但使用不同语义 id/layout。迁移后应是 580 条定义引用 559 个已用 AssetId，catalog 仍登记
    全部 636 个物理资源，因而有 77 个未引用 warning。
  - 当前 strict parser 可直接通过 606 个源；另 **30** 个源含原版已知式坏尾槽：
    `23,35,79,110,112,114,116,133,139,141,143,241,360,384,414,418,419,422,442,450,483,509,510,
    538,552,571,575,579,609,631`。其中 29 个是末尾 sentinel 被坏非零 offset 替代，571 是坏倒数第二项后
    仍有零 sentinel；25 个异常源正被当前内容引用。所有有效帧均形成连续前缀，坏槽之后没有可用帧；迁移
    必须逐字节保留源。
  - 既有内容有 **13** 个 directional 定义的声明帧覆盖高于当前有效帧数：
    `627,361,242,273,394,385,379,550,541,630,631,632,236`。这是 C2 历史布局债，不得让本卡迁移失败，
    也不得借资源闭包静默改布局或扩大债务。
  - PAL 当前 catalog 为 1,071 records / 0 sprite；完成本卡后应增加 636 个 sprite record。PAL manifest 当前
    legacy families 为 `sprite,battle-sprite,effect-sprite,image`；本卡只删除 `sprite`。
  - 当前语义引用闭包为 actors 6、entities 3,695、`setActorSprite` 116、`setActorAppearance` 3，均能解析到
    580 条定义；PAL 0x98 有一条清空和一条 `[82]`，后者可唯一映射为 `sprite-82`。
- 已知坑 / 审计文档:
  - 通用 `parseSpriteChunkStrict` 是为 canonical tileset 冻结的；直接套用会拒绝 30 个可被原版安全忽略的
    尾槽，直接用宽松 parser 又会把 authored 损坏静默吞掉。必须建立 world-sprite 专用的来源分级严格规则。
  - 同一 AssetId 可被多个 SpriteDef 共享；替换/删除一个定义不能误伤其它布局定义，缓存也不能以定义 id
    或稳定 AssetId 本身掩盖 record SHA 变化。
  - 现有 13 条布局债使“新帧数必须满足所有 layout”不能直接作为迁移总门禁；替换至少不得减少旧二进制的
    有效帧数，若要缩帧必须在同一可撤销事务里显式修完全部消费者。
  - `setFollowers` 不是可保留的 runtime 特例：其数字会进入脚本和存档，若不迁移，本族仍有物理数字旁路。
    第三方旧工程若同一数字对应多个 SpriteDef 且无法唯一判定，升级必须 fail-loud，不能任取 primary layout。
  - `tilesetBlobs` 名称虽旧，仍承载 battle/effect/world sprite pending bytes；本卡只能移走 world sprite，
    不能误删后续两族仍需的兼容载体。
  - 逐帧替换可能生成与旧文件同长度的新 gzip；必须复用完整 SHA 保存签名和 record SHA 缓存失效。
- 不得重新引入:
  - `SpriteDef.spriteNum/path`、`legacy.sprites`、`AssetBase.sprites`、`loadSprite(base,num,path)`、
    `spriteByNum`、`assets/sprites/<id>` 物理约定、数字 gallery 正式读取链或 catalog miss fallback。
  - `setFollowers`/`WorldScriptState.followers` 的裸精灵号、从语义 id/AssetId 猜文件名、把空白工程写回 legacy。
  - 全局 palette 选择器、按盘烘 RGBA、用 A7-3W 冒领 battle/effect/image/A7-4 或 C2 内容清洗完成。
- 相关测试:
  - content：`sprite.test.ts`、`validate.test.ts`、`asset.test.ts`、`validate-refs.test.ts`、脚本/存档升级测试。
  - shared/reforge：`rle.test.ts`、`assets.test.ts`、`loader.test.ts`、`render-scene.test.ts`、
    `script-runner.test.ts` 和代表场景回归。
  - editor：`commands.test.ts`、`project-io.test.ts`、`open-local.test.ts`、`clone.test.ts`、`seed.test.ts`、
    精灵库/上传/帧编辑/SceneCanvas/PreviewCanvas 测试。
  - migrate：`migrate-content.test.ts`、`pal-assets.test.ts`、`pal-migration-integration.test.ts`、
    `migration-plan.test.ts`、`migration-validate.test.ts`。

## 验收条件

- 功能:
  - canonical `SpriteDef` 精确使用 `{ id, asset, label, layout, poses? }`，不含 `spriteNum/path`；定义 id 唯一，
    asset 非空并存在于 catalog、kind 精确为 `sprite`。旧字段只允许出现在一次性升级输入类型/fixture。
  - PAL 迁移确定性生成 636 个 `sprite.pal.NNN` record，path 位于
    `assets/migrated/sprites/NNN.rle`，mediaType 为 `application/vnd.type-pal.rle`，origin 为
    `legacy-migrated`；每条 bytes/hash 与工程文件和提取源逐字节一致。
  - PAL 的 580 个 SpriteDef 保持既有语义 id/layout/poses，映射到 559 个已用 AssetId；21 个共享关系不被
    去重成一个定义，77 个未引用二进制只报 warning。角色、实体、appearance 和脚本语义引用不改成 AssetId。
  - world-sprite loader 先验证 AssetId/kind/media/bytes/hash/gzip，再解析帧；author/generated 输入严格拒绝
    空帧、坏 offset、中间空洞、有效帧后的损坏、RLE 截断/越界。只有 `legacy-migrated` 可接受“全部有效帧构成
    连续前缀、剩余槽均不可解且无有效帧”的历史尾槽，并报告忽略数量；PAL 精确冻结 30 个异常源。
  - 运行时和编辑器缓存以 AssetId 定位、以 `AssetRecord.sha256` 失效；一份共享二进制只加载一次，替换后
    场景、剧情预览、精灵帧面板同步刷新，不出现按数字的第二缓存。
  - `setFollowers.sprites` 与 `WorldScriptState.followers` 使用 SpriteDef id；PAL 0x98、旧 content 和旧存档
    在边界确定性升级，运行时内部没有裸数字兼容分支。缺定义必须 fail-loud 并定位脚本/存档来源。
  - 上传新精灵在一次 undoable command 中创建 SpriteDef、稳定 AssetId、`origin=authored` record 和
    `assetBlobs`；物理路径使用 `assets/authored/sprites/<content-hash>.rle`，不由定义 id 推导。
  - 替换保留 SpriteDef id 与 AssetId，更新 record path/hash/origin；共享资产操作前列出全部消费者。
    默认不得把有效帧数降到旧资产以下；缩帧只允许在同一事务中显式修复所有 SpriteDef 的 layout/poses，
    undo/redo 恢复定义、record 和 bytes。既有 13 条 C2 布局债保持可载入但不扩大。
  - 删除 SpriteDef 前扫描角色、实体、appearance、脚本和存档可见引用；只有无其它 SpriteDef 引用 AssetId
    时才允许连带删 record/文件。删除定义与删除共享二进制是两个清晰动作，不能静默级联。
  - PAL/demo/e2e-own/blank canonical 工作态不含 sprite legacy family、`legacy.sprites`、
    `SpriteDef.spriteNum/path`；battle/effect/image 旧族保持原样。
  - 旧本地 v3 工程从 implicit number、legacy-root path、工程自有 path 三类输入一次性升级：先读取并校验
    全部字节、建立共享映射/冲突计划，再写 binary/catalog/sprites/scripts/world/manifest；写前失败零写入，
    close 中断可单调前滚重试，二次打开零计划。
  - clone/Save As/普通保存/ZIP 对 catalog `.rle` 逐字节保持，沿用 A7-3T 的完整 SHA 签名和
    binary -> union catalog -> content -> manifest -> final catalog -> removals 顺序；不得复制已退役的
    extracted sprite 或把 gzip 解压落盘。MG2 authored 同 AssetId 接管后重迁不覆盖，二跑 0/0/0。
  - 渲染保持一阶段每帧自锚、脚底中心和 `+7px` 落笔真值；场景换色仍由索引 + 当前场景色彩产生。
- 测试:
  - 数据门禁：636 source/records/files、580 defs、559 used AssetIds、21 shared defs、77 unused warnings、
    1,332,725 source gzip bytes、4,133 effective frames、30 legacy tail anomalies；逐文件 id/path/bytes/SHA/gzip/
    media/origin/source byte-exact，编号集合精确 `1..636`，tuple digest 精确为
    `c92c14b5dac5abc39006d94fdefaa699eb0bffddb925447ceb4070c32bb45d03`。
  - 30 个坏尾源可在 legacy profile 解码且有效帧与宽松真值一致；相同构造在 authored/generated profile
    fail-loud；坏中段、坏后又有有效 offset、截断指令、零帧、非 gzip、hash mismatch 全拒绝。
  - typed walker 从 580 条 `SpriteDef.asset` 收集 expected kind；缺 record、kind mismatch、重复 id、旧字段、
    catalog+legacy 同族、语义引用悬空、共享删除和 77 个 unused warning 均有专测。
  - `setFollowers` 迁移、脚本 round-trip、旧存档升级、清空/设置/重开与 s102 代表流程有专测；runtime 不读数字。
  - editor 导入/替换/逐帧编辑/追加/共享影响/删除/undo/redo/pending blob/保存重开、同长度替换与三处 SHA
    缓存失效有专测；缩帧和 13 条既有布局债分别覆盖。
  - HTTP clone、FSA、Save As、ZIP、本地 v3 升级、失败重试、MG2 authored 保护、迁移二跑零计划有专测。
  - 静态扫描目标包中正式路径的 `SpriteDef.spriteNum/path`、`loadSprite(base,num,path)`、`spriteByNum`、
    sprite legacy/root fallback、world sprite 对 `tilesetBlobs` 的消费、`assets/sprites/` 新写入和 followers
    裸数字归零；仅升级 fixture/旧输入类型可白名单。
  - content/shared/reforge/editor/migrate 定向与全套测试、五包 typecheck、editor/reforge production build、
    Biome、`git diff --check` 全绿。
- 文档:
  - 更新 content schema、A7 闭包审计、asset pipeline、project lifecycle 和本卡；只记录 A7-3W 实际完成，
    A7/R7/A7-4 与后续 battle/effect/image 不提前标 done。
  - 记录 636 资源映射、580/559/21/77 关系、字节/帧/30 尾槽契约、13 条布局债、MG2 与 transport 结论。
- 视觉 / 手工验证:
  - 编辑器 PAL/demo/e2e/blank 精灵库、上传、帧面板、场景与剧情预览正常；共享替换提示、同长度换像素刷新、
    缩帧阻断、错误跳转和长名称无退化。
  - Reforge 验证普通角色/静物/循环动画、换角色精灵、编外跟随者与代表场景 `s001/s066/s102`；人物不漂移、
    不半身、不因 catalog 化改变遮挡或颜色。
  - 临时把 `/extracted/data/sprite` 路由改为 503 后，PAL HTTP、克隆 FSA 工程和 Reforge 仍完成上述流程；
    Network 只命中工程 `assets/migrated/sprites/**`，console 无资源 fallback/error。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-19）**。只读普查确认 A7-3W 必须是完整垂直切片，而非只登记 559 个当前引用文件：
  PAL 提取源有 636 个独立资源，580 个语义定义共享 559 个二进制；`SpriteDef.spriteNum/path`、runtime
  `spriteByNum`、editor 旧 pending blob 和 `setFollowers number[]` 共同构成数字/路径双轨。建议采用
  `SpriteDef.id -> asset -> catalog` 分层、AssetId 缓存 + record SHA 失效、全 636 源逐字节迁移、来源分级
  world-sprite strict parser，以及共享替换/保守缩帧/一次性 v3 升级。保留 D25 索引着色和一阶段锚点真值，
  不把 13 条 C2 布局债或 battle/effect/image 冒领进本卡。方案可实现；build 必须等待 Kimi/GLM 独立签字。
- Kimi: **agree（2026-07-19;附 R1-R3 build 必落钉,见「主审立场」）**。逐项核对并抽查代码/数据:
  分层被 21 共享定义实证为必需(580 defs/559 unique spriteNum,`TilesetDef.asset` 同构先例);
  来源分级 strict 结构性 fail-closed 成立;`setFollowers.sprites`(script.ts:109)与
  `WorldScriptState.followers`(script.ts:362)双 number[] 物理旁路实证;共享事务/缩帧保守/13 条
  布局债边界成立;A7-3T 原语复用成立;D25 与 E2/E5/MG5 锚点成立;B/E/X3/A7-4 分界诚实。
  基线抽点:636 源、580 defs、559 unique、77 未引用,与 GLM 冻结一致。无架构 counter。
- GLM: **agree（2026-07-19;附 G1-G4 build 必落,见下）**。独立复算全部基线 + 代码逻辑审查（读源码逐路径推演 sprite.ts/asset.ts/script.ts/migrate-content.ts）。

  **基线独立复算** ✅：
  - sprite RLE 源文件 **636** / **1,332,725 B**（编号 1..636 连续无缺）✅
  - SpriteDef **580** / unique spriteNum **559** / 共享定义 **21**（4 actor-id 对 + 17 directional-static 对）/ 未引用源 **77**（636−559）✅
  - catalog **1,071** / sprite records **0** ✅
  - sprite 在 legacy families（共 4: sprite/battle-sprite/effect-sprite/image）✅
  - **30 坏尾源** 全 30 文件存在（23,35,79,...,631）✅
  - **13 layout 债** 全 13 spriteNum 在定义中存在（其中 242/379/541 有双定义扩展到 16 行）✅

  **语义消费者覆盖** ✅：
  - actors **6** sprite refs（全有效）；entities **549 unique** sprite refs / 3,695 entities 携带 sprite
  - setActorSprite **116** / setActorAppearance **9** / setFollowers **2** ✅
  - **0x98**：translate-events.ts:973 当前直接写两个裸精灵号；PAL 产物中 setFollowers 2 条（1 清空 + 1 `[82]`）✅

  **代码逻辑审查** ✅：
  - **SpriteDef**（sprite.ts:35-53）：当前 `{id, spriteNum, label, layout, poses?, path?}`——无 `asset` 字段；`spriteNum` 是必填二进制身份，`path?` 是 A4 自定义上传路径。A7-3T 先例已证 `path→asset` 迁移可行。✅ 缺口确认。
  - **walker**（asset.ts:346-360）：AssetReferenceSource **无 `sprites` 槽**；collectAssetReferences 无 sprite 分支。`ASSET_KINDS` 已含 `'sprite'`（:18）。✅ 缺口确认。
  - **setFollowers.sprites**（script.ts:109）：`number[]`——裸精灵号。**WorldScriptState.followers**（script.ts:362）：`number[]`——进存档。**这是隐藏物理旁路**，若不迁移，A7-3W 仍有裸数字绕过 AssetId 链。✅ 已识别。
  - **setActorAppearance.battleSprite**（script.ts:124）：`number`——也是裸数字，但属 battle-sprite 族（A7-3B 范围），本卡不动。✅ 边界正确。

  **G1-G4 build 必落（非阻塞，纳入 build 范围）**：
  - **G1（关键）**：**setFollowers.sprites / WorldScriptState.followers 从 number[] 迁移为 string[]（SpriteDef.id）**——这是 Codex 已识别的隐藏物理旁路。迁移器须在边界做 `spriteNum → SpriteDef.id` 确定性映射（PAL 82 → `sprite-82`）；第三方旧工程若同 spriteNum 对应多个 SpriteDef 且无显式引用语境 → fail-loud。卡内 §5/§116 已指出，须有专测。
  - **G2**：**来源分级 strict parser**——30 个坏尾源须在 `legacy-migrated` profile 下容忍（有效帧连续前缀 + 尾槽无可用帧），但 authored/generated profile 下 fail-loud。不能用通用 strict parser（会拒 30 个历史源）也不能用宽松 parser（会吞 authored 损坏）。卡内 §3/§109 已详述。
  - **G3**：walker 扩展 `AssetReferenceSource` 增加 `sprites?: readonly SpriteDef[]`——确认 collectAssetReferences 遍历每个 `SpriteDef.asset` 收集 `{asset, expectedKind:'sprite', where:'sprites[N].asset', site}`。语义引用（actor/entity/appearance）继续引用 SpriteDef.id 不改为 AssetId——walker 只收集定义层 asset 边，不穿透 actor/entity 引用。
  - **G4**：**全 636 源登记而非只 559 已引用**——catalog 须登记全部 636 个 `sprite.pal.NNN` record（77 未引用 = warning 非 error）；这与 A7-3T tileset 全 223 登记策略一致（A7-3T 中 0 unused 但此处 77 unused 因 sprite 源比定义多）。卡内 §4 已说明。

  **总结**：636/580/559/21/77/1,332,725B/30/13 全独立冻结；语义消费者（6+549+116+9+2）全覆盖；walker 无 sprites 槽缺口定位；setFollowers/followers number[] 隐藏旁路确认；SpriteDef 无 asset 字段确认；来源分级 parser + 全 636 登记 + followers 语义 id 迁移 三项 build 必落。**agree。**

- counter / 分歧处理: 当前无未决分歧;GLM G1-G4 与 Kimi R1-R3 互不冲突,G1-G2 与 Kimi 主审立场同项。
  Codex 在 build 准入复算时补两处**口径勘误（不改变总数或签字结论）**：21 个共享二进制组精确拆分为
  **5 个主角同布局语义定义对 + 15 个 directional/static kind 变体对 + 1 个 directional framesPerDir
  变体对**，不是审查记录中的 4+17；`setActorAppearance` 共 9 条命令，
  其中只有 **3 条 `spriteId`** 属本卡大世界精灵语义引用，另 3 条 portrait 已闭环、3 条 battleSprite
  属 A7-3B。build 的引用冻结与测试必须采用 3 条 spriteId 口径，历史审查原文保留以供追踪。
- 缺签豁免: N/A
- build 准入结论: **allowed（Codex agree + Kimi agree + GLM agree,三签齐,2026-07-19）**;
  Status 翻转 draft→build 与看板更新由 Codex 执行;R1-R3 与 G1-G4 纳入 build 范围。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-19）**。完成实现、自测、真实浏览器与 503 旧路径阻断验收；两轮内部只读
  终审先后发现并返工 editor revision/引用刷新/深链/布局问题，以及 scene-switch 的 fade/dither owner
  竞态。最终 runtime 终审 5 files / 83 tests、editor/data/migration 终审 179 + 99 + 70 tests 均无
  P0/P1/P2；Reforge 全套 52 files / 487 tests、五包 typecheck、两端 production build、Biome 与
  `git diff --check` 全绿。Codex 自验通过，建议进入外部三贤人 done 审查。
- Kimi: **accept（2026-07-19）**。架构/runtime 并发/视觉独立终审,无 P0/P1/P2 阻塞;静态全链 + 独立复跑 + 浏览器实测。证据:
  1. **catalog 唯一链**:`SpriteDef {id,asset,label,layout,poses?}`(sprite.ts:38-49);PAL 产物 580 defs 全 `asset`/0 `spriteNum`/0 `path`,636 records,559 used/77 unused 精确;抽点 def→record→文件 bytes/sha256 全对;manifest legacy 仅剩 battle-sprite/effect-sprite/image。
  2. **来源分级 RLE**:`parseWorldSpriteChunk`(shared/rle.ts)canonical 全严格;legacy-migrated 先尝 canonical,失败才走连续前缀兼容,且**坏尾后任一槽若能独立解出帧即拒绝**(中间空洞),skippedLegacyTailSlots 计数报告;运行时无源 id 特判(R2 落地)。
  3. **AssetId+SHA 缓存**:`SpriteAssetCache` 按 AssetId 定位、record.sha256 校验/失效(assets.ts:153/:164/:205);语义引用继续只认 SpriteDef.id(followers 存档 string id)。
  4. **并发所有权**:`prepareAndCommitSceneSwitch` 的依赖快照只含真实消费集(队伍/装备/followers/inventory/scene override/entryStage/mapOverride/actorOverrides),prepare/present 后双 assertCurrent,过期请求不得清后来画面(scene-switch-transaction.ts:91-104);`SupersedingFadeDriver.cancelOwned` 与 dither `cancelOwned` 在被新 owner 接管后 no-op(fade-driver.ts:96-105、dither-transition.ts),完成态保留 owner 到显式复位。
  5. **浏览器实测**:reforge s066 血池三人全身/锚点/遮挡/场景色正常;editor sprite-627 显示「历史声明 12 帧/实际 4 帧」,4..11 全部「缺失→0」禁用、警告「仅可缩小债务,不能替换不存在的帧」,定义删除与资源删除分离;console 0 error;`sprite.pal.627` 经工程 catalog 加载。
  6. **独立复跑**:根 `pnpm check` 全绿(首跑 migrate 一次抖动,隔离复跑与二次根跑均全过;content 248/shared 121/editor 479/migrate 233+1skip/reforge 487);A7-2 OFL 遗留已由 `5b7b49c8` 收口。
- GLM: **accept（2026-07-19;见下）**。独立复算全部产物数字 + 全 636 文件 SHA 逐项验证 + 代码逻辑审查。

  **产物独立复算** ✅：
  - catalog **1,707** entries / **636 sprite records** / **1,332,725B**（编号 1..636 连续零缺失）✅
  - **全 636 文件 SHA256+bytes 逐项零 mismatch**（全量非抽样 ok=636 fail=0 missing=0）✅
  - mediaType 统一 `application/vnd.type-pal.rle` / origin `legacy-migrated` ✅
  - **580 SpriteDef** 全有 `asset`、零 `spriteNum`、零 `path` ✅
  - **559 unique asset** / **21 共享** / **77 unused warning** ✅
  - MG2 dry-run `sprites=636 bytes=1332725 frames=4133 malformed-tail-slots=30 tuple-digest=c92c14b5...` + `writes=0 deletes=0 conflicts=0` ✅

  **代码逻辑审查** ✅：
  - SpriteDef（sprite.ts:38）= `{id,asset,label,layout,poses?}` 无 spriteNum/path ✅
  - **setFollowers.sprites = string[]**（script.ts:109）+ **WorldScriptState.followers = string[]**（script.ts:362）——G1 隐藏旁路已落地迁移 ✅
  - PAL setFollowers 2 条：1 清空 `sprites=[]` + 1 `sprites=['sprite-82']`（PAL 82→sprite-82 确定性映射）✅
  - spriteByNum 全仓零命中 / loadSprite(base,num) 旧签名退役 ✅
  - sprite 退出 legacy families（保留 battle-sprite/effect-sprite/image）✅
  - loadSpriteAsset(resolver, assetId) 统一加载器（assets.ts:185）✅

  **G1-G4 全落地** ✅：G1 followers number[]→string[] + 存档升级；G2 来源分级 parser（30 坏尾 legacy 容忍 / authored generated fail-loud）；G3 walker sprites 槽（sprite-refs=entities:3695/3695 actors:6/0 setActorSprite:116/69 setActorAppearance:3/2 setFollowers:1/1）；G4 全 636 登记（77 unused=warning）。

  **测试** ✅：content 248 / reforge 487 / editor 479 / migrate 233+1skip 全 pass。

  **文档** ✅：capability-map A7 ⚠️/⚠️ 未提前标 done（sprite 仍在 outstanding list — 正确，因 review 非_done_）。

  **总结**：636/580/559/21/77/1,332,725B/4,133 frames/30 tails/tuple-digest 全独立冻结；全 636 SHA 零 mismatch；G1-G4 全落地；MG2 零计划；静态归零；capability-map 未提前 done。**accept**。

- counter / 返工处理: Codex 内部只读审计提出的阻断均已返工并复审 accept；GLM accept 无 counter。
- 缺签豁免: N/A
- done 准入结论: **allowed / closed（2026-07-19）**。Codex、Kimi、GLM 三方均签 `accept`，用户确认签字已齐；无遗留阻塞项。

## Draft: 设计与风险

### 设计结论

1. **身份分层**：SpriteDef.id 只表达“这个角色/物件/布局是谁”，AssetId 只表达“这份可替换二进制是谁”；
   物理路径只在 AssetRecord。21 个重复数字证明两层不能合并，同一资产可以服务多个语义/布局定义。
2. **单一加载器**：提供 `loadSpriteAsset(reader, assetId)`/等价公共入口，统一做 catalog kind/media/hash、gzip
   和 world-sprite frame 校验。runtime/editor 只传 AssetId，不传数字/path，不各自实现 pending/disk 分支。
3. **来源分级 codec**：canonical authored/generated 容器全严格；legacy-migrated 只兼容“有效连续前缀 +
   无可用帧尾槽”，且迁移报告冻结 30 个异常源。兼容条件按结构与 origin 判断，不在 runtime 按 id 写 30 个特判。
4. **全源登记**：PAL catalog 登记 1..636，而非只登记当前 559 个引用；定义引用仍由现有语义迁移结果决定。
   77 个未引用资源作为可浏览资源与 warning 保留，不能靠运行时猜号访问。
5. **语义引用到底**：Actor/Entity/appearance 继续存 SpriteDef.id；0x98 在迁移时解析为 SpriteDef.id，存档也只
   保存 id。PAL 82 冻结为 `sprite-82`；第三方旧输入若同一数字有多个布局定义且无显式引用语境，升级必须
   fail-loud，不能按顺序猜 primary/variant。
6. **编辑器原子事务**：定义、record、bytes 分层但以一个 command 原子提交；共享替换列出所有消费者，删除
   分定义与资产两层，帧编辑更新 record SHA。默认禁止缩帧，除非同事务修复全部 layout/poses 消费者。
7. **保存与升级**：复用 A7-3T 的 `assetBlobs`、完整 SHA 和二阶段 catalog 保存；本地 v3 升级只作为旧
   `spriteNum/path` 的输入边界。PAL 修复落在迁移器，author 接管遵守 MG2，不覆盖 authored 内容哈希路径。
8. **渲染不变**：codec 与身份迁移不改变帧像素、帧序、per-frame anchor、脚底中心、`+7px` 或场景着色。
   视觉差异视为回归，不能解释为“新系统效果”。

### 已知风险

- 风险: 30 个坏尾源在通用 strict parser 下会中断迁移，宽松 parser 又会吞 authored 损坏。
  - 缓解: 建 world-sprite 来源分级 strict profile；冻结异常集合与帧数，legacy 仅容忍无有效帧的末尾后缀。
- 风险: 21 个共享定义使替换/删除/缓存失效可能误伤其它定义。
  - 缓解: 引用图按 SpriteDef 与 AssetId 两层展示；command 原子更新；缓存以 AssetId + record SHA。
- 风险: 13 条历史 layout 债会让“所有 layout 必须完全覆盖”成为错误的迁移阻断。
  - 缓解: 基线债务单列诊断，不在迁移时静默修；替换不得减少旧有效帧数，缩帧要求同事务显式协调。
- 风险: `setFollowers` 数字进入脚本与存档，容易被遗漏成最后一条 legacy 旁路。
  - 缓解: schema、迁移器、runtime、保存升级和 s102 端到端共同设门禁；正式包静态扫描 number[] 归零。
- 风险: editor 仍用 `tilesetBlobs` 名称承载多个未迁精灵族，粗暴删除会影响 battle/effect。
  - 缓解: 本卡只把 world sprite 消费迁到 `assetBlobs`；旧容器的最终删除留到 B/E 闭环后。
- 风险: 资源身份迁移可能意外改变锚点、帧序、场景颜色或遮挡。
  - 缓解: 源 gzip byte-exact、帧像素/数量冻结，代表场景视觉比对；不改渲染公式与排序规则。

### 主审立场

- Reviewer: Kimi（主审架构/schema/跨包边界）+ GLM（独立数据/迁移/测试覆盖）
- 结论: **agree（2026-07-19）**——逐项成立,无阻塞;附 R1-R3 build 必落钉。
  1. **SpriteDef/AssetId 分层**:成立且必需。580 定义 → 559 唯一二进制(21 组共享,GLM 细分为
     4 actor-id 对 + 17 directional-static 对)证明 id 不能兼任 AssetId;与 `TilesetDef.asset`
     (A7-3T) 同构,语义引用(actor/entity/appearance/脚本/存档)继续只认 SpriteDef.id。
  2. **30 尾槽兼容 fail-closed**:成立。兼容条件是**结构性**的——origin 必须 `legacy-migrated`、
     有效帧必须构成连续前缀、前缀之后不得再出现可解帧;authored/generated 全严格;30 个异常源由
     迁移报告冻结,运行时不得按 id 写特判。宽松 parser 吞 authored 损坏与通用 strict 误杀历史源
     两条死路都避开了(G2 同项)。
  3. **setFollowers/存档升级**:成立。`setFollowers.sprites`(script.ts:109)与
     `WorldScriptState.followers`(:362) 双 number[] 旁路实证;0x98 在迁移边界确定映射
     (PAL 82 → `sprite-82`),第三方同号多定义无显式语境 fail-loud 不猜 primary(G1 同项);
     存档只在 save-load 边界过一次映射,核心模型拒数字。
  4. **共享替换/删除/缩帧**:成立。定义←角色/实体/appearance/脚本/存档、资产←定义两层引用分别
     检查;替换先列全部消费者;删除定义与删除共享二进制是两个动作,零其他定义引用才连带
     record/文件;undo 恢复三元组。缩帧默认禁止(不得少于旧有效帧),只在同事务显式修齐全部
     layout/poses 消费者时允许;13 条 C2 布局债保持可载入、不静默修、不扩大。
  5. **A7-3T 原语复用**:成立。assetBlobs、`bin:<bytes>:<sha256>`、union→final 两阶段 catalog、
     byte-exact clone/ZIP、MG2 authored 保护全部沿用;`tilesetBlobs` 只移走 world sprite 消费,
     最终删除留给 B/E 闭环后,不提前误伤。
  6. **D25/一阶段锚点**:成立。索引 RLE + 场景色彩运行时着色,不烘 RGBA 无 palette UI;
     脚底中心/逐帧自锚/blit +7(E5,render.ts:177-187)不动;`nSpriteFramesAuto` 教训(E2)要求
     渲染与 idle 用**实际解码帧数**,不用 layout 声明覆盖数——本卡不动渲染,视觉差异即回归。
  7. **B/E/X3/A7-4 边界**:诚实。本卡只删 legacy `sprite` 族;battle-sprite/effect-sprite/image
     原样保留;`setActorAppearance.battleSprite`(script.ts:124)属 A7-3B 不碰;X3 generic image
     不冒领;A7-4 保留适配器删除/v4/总门禁。
- 必落钉(R,不阻塞签字,build 验收核对):
  - **R1 名称域规则**:`SpriteDef.label` 是唯一定义层标签,`AssetRecord.label` 只作资源页诊断,
    不反向覆盖定义标签(沿用 A7-3T 钉)。
  - **R2 30 源兼容实现必须按 origin+结构判定**:运行时代码不得出现 30 个源 id 的特判清单;
    迁移报告冻结集合,新增异常源 = 迁移失败。
  - **R3 渲染/idle 用实际解码帧数**:视觉验收须含 idle 动画实体与 13 条布局债相关定义,
    证明实际帧驱动、无越界帧。
- 是否建议进入 build: **是——Codex/Kimi/GLM 三签齐,build allowed**;Status 翻转与看板更新由
  Codex 执行。G1-G4 按 GLM 行纳入 build;A7-2 OFL P2 跟进项另行收口(与本卡无关)。

### 三方争议记录(按需)

- Codex: 推荐显式 `SpriteDef.asset` 分层、全 636 源登记、来源分级 strict parser、followers 语义 id、
  shared-aware 编辑器事务和 byte-exact 生命周期；13 条布局债保留为 C2 欠账而非本卡迁移阻断。
- Kimi: **agree**。分层被 21 组共享实证必需;30 尾槽兼容=origin+结构判定 fail-closed;
  followers 双 number[] 旁路(script.ts:109/:362)必须边界映射且歧义 fail-loud;共享两层引用与
  保守缩帧成立;A7-3T 原语复用成立;D25/E2/E5 锚点成立;B/E/X3/A7-4 分界诚实。
  R1(名称域)/R2(30 源无 id 特判)/R3(渲染用实际帧数) build 必落。
- GLM: **agree**。独立复算全部基线精确匹配(636 源/1,332,725B + 580 定义/559 unique/21 共享/77 未引用 + catalog 1,071/0 sprite + 30 坏尾 + 13 layout 债)；代码逻辑审查确认 SpriteDef 无 asset/walker 无 sprites 槽/setFollowers.sprites+followers = number[] 隐藏旁路。G1(followers number[]→id 迁移)/G2(来源分级 parser)/G3(walker sprites 槽)/G4(全 636 登记非仅 559) build 必落。
- 用户拍板: 用户于 2026-07-19 同意按建议先修 A7-2 P2，再正式推进 A7-3W；现三方设计 agree 已齐，
  由 Codex 作为唯一 Coding Owner 进入 build。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（三方设计 agree 已齐，允许开始实现）
- 修改文件:
  - content / codec：`packages/content/src/{actor,asset,enemy,script,sprite,validate,validate-refs}*`、
    `packages/shared/src/rle*`。
  - migrate / 生成真值：`packages/migrate/{src,scripts}/**`、PAL baseline、
    `projects/pal/{assets/index.json,content/sprites.json,content/scripts,manifest.json}`。
  - editor 生命周期与 UI：`packages/editor/src/core/{commands,edit-session,editor-asset-references,
    open-local,project-diagnostics,project-io,seed,sprite-assets,upgrade-local-v3-sprites}*`，以及精灵库、上传、
    帧编辑、场景/剧情预览、深链和样式相关 UI / 测试。
  - runtime / 存档：`packages/reforge/src/{assets,loader,main,script-runner,sprite-anim,
    frame-animation-player,fade-driver,dither-transition,scene-switch-transaction,save}*` 及测试。
  - fixture / 文档：demo、e2e-own canonical 工程，content schema、A7 审计、asset pipeline、project
    lifecycle、project design、本卡与看板。
- 实现摘要:
  - `SpriteDef` 收敛为 `{id,asset,label,layout,poses?}`；typed walker、catalog 交叉校验、角色/实体/脚本/
    visible world 反向引用和 followers 存档全部使用语义 id，旧数字只留迁移/升级输入边界。
  - world-sprite loader 统一验证 AssetId、kind/media、bytes/SHA、gzip 与来源分级 RLE；author/generated
    严格 fail-loud，`legacy-migrated` 只容忍结构上安全的连续有效前缀坏尾，渲染/idle 统一按实际帧数。
  - 迁移器确定性物化全部 636 个资源并保留原 gzip 字节，生成 580 definitions / 559 used / 21 shared /
    77 unused；PAL 退出 sprite legacy，只保留 battle-sprite/effect-sprite/image 后续族。
  - editor 提供 580 语义定义 / 636 二进制资源双视图；上传、共享替换、定义/资源分开删除、帧追加/
    缩帧 repair、undo/redo、pending blob、保存重开和 SHA revision 刷新形成原子闭环。13 条历史布局债
    显示实际帧与缺失槽，缺失槽回退第 0 帧但不可操作。
  - v3 本地工程升级、MG2 authored 接管、FSA/Save As/clone/ZIP 复用 A7-3T 的完整 SHA 与两阶段 catalog
    提交；demo/e2e-own/blank canonical fixture 不再写 sprite legacy。
  - runtime/editor 只经 `SpriteDef.asset -> AssetRecord -> AssetResolver/FileSource` 加载，并以
    AssetId + record SHA 缓存；删除 world sprite 的数字/path/root fallback 和 `spriteByNum` 第二缓存。
  - 实现期只读审计返工了加载/换场/队伍更新的异步提交边界：reloadMap 的 runtime+持久状态同步提交，
    auto 禁止 `loadScene`，fade/dither 以 owner 身份接管与清理，完成态黑幕也保留 owner 到明确复位；旧
    runner/事务不再越权继续副作用或取消新演出。
- 运行命令:
  - 全套测试：content **22 files / 248 tests**；shared **13 / 121**；editor **57 / 479**；migrate
    **32 / 233 passed / 1 skipped**；Reforge 最终 **52 / 487**，全部通过。migrate 唯一 skip 是仓库不含
    私有 bootstrap fixture 的条件式真实数据演练；已提交 baseline 的真实回归正常执行。
  - content/shared/editor/migrate/reforge 五包 `typecheck` 全绿；editor/reforge production build 全绿，
    仅 editor 保留既有 chunk-size warning。
  - `pnpm lint`：**775 files**，零问题；`git diff --check` 通过。
  - 独立数据复算：636 records / 580 defs / 559 used AssetIds / 21 shared / 77 unused，1,332,725 B /
    4,133 frames / 30 legacy tails / 13 layout debts；tuple digest
    `c92c14b5dac5abc39006d94fdefaa699eb0bffddb925447ceb4070c32bb45d03`。636/636 工程文件与提取源
    byte-exact，catalog bytes/SHA/media/origin 零 mismatch。
  - 正式路径静态扫描只剩 battle/effect 的 `spriteNum`、content 退役字段拒绝器、PAL AssetId helper 和
    v1/v2 存档升级边界；world sprite runtime/editor 无数字、path、legacy root 或 `assets/sprites/` 回退。
- 浏览器 / 手工检查:
  - 真实 Chromium 检查 PAL editor：语义定义 **580/580**、二进制资源 **636/636**、**77** 个未使用资源；
    `sprite.pal.017` 可作为独立未使用资源打开，定义删除与资源删除分离，长 AssetId/path 无溢出。
  - `sprite-627` 的 12 帧历史声明 / 4 实际帧按运行时真值展示；4..11 全部标为 `缺失→0` 且 disabled，
    SHA 对应的实际帧证明加载完成前不可编辑。
  - PAL Reforge `s001/s066/s102` 均正常渲染；s066 多人动画中三人全身、锚点、遮挡和颜色正常，未见半身、
    漂移或黑屏；三场景 console 0 warning/error。s102 的 followers 设置/清空/存档重开另由迁移与 runtime
    专测覆盖。
  - 在本地代理把 `/extracted/data/sprite/**` 固定为 **503** 后，PAL editor 与 Reforge 仍完整加载；Network
    实际只请求 `projects/pal/assets/migrated/sprites/**`，console 无 fallback/error。代表请求
    `assets/migrated/sprites/002.rle` 返回 200，旧 `extracted/data/sprite/2.rle` 返回 503。
- 跳过的检查及原因:
  - 原生 `showDirectoryPicker` 无法由当前浏览器自动化跨安全提示接管；真实 FSA/Save As/clone/ZIP 的
    byte-exact、失败重试与提交顺序由 editor core 全套测试覆盖，PAL HTTP 工程则已在真实浏览器检查。
  - demo/e2e-own/blank 的 schema、资源文件、保存/重开由完整测试矩阵覆盖；本轮人工像素验收聚焦 PAL
    代表场景和历史布局债。
  - 浏览器截图仅在会话内检查，未写入仓库；`git status` 无测试图片。PAL 本地版权资源目录继续按既有规则
    ignore，不 force-add；无关的 `projects/pal/content/ambiences.json` 未修改。

## 资源生成记录(如适用)

- Generation Owner: N/A（迁移既有 PAL 索引字节，不生成替代美术）
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: gzip indexed RLE；透明来自 RLE skip；按场景色彩运行时着色
- 资源登记位置: `assets/index.json`
- 验证方式: 逐文件 byte/hash/帧解码 + editor/reforge 视觉验证

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Kimi
- 验证方式: 真实 Chromium；PAL editor 双视图、unused resource、`sprite-627` 缺帧保护；Reforge
  `s001/s066/s102`；旧 extracted sprite 路由 503 + Network/console 核查。
- 截图 / 像素检查路径: 临时截图只在会话内检查，未写入仓库。
- 结论: Codex 与 Kimi 视觉验证均通过；工程内索引 RLE 的像素、颜色、脚底锚点与遮挡未见回归，
  `s066` 三人全身与遮挡正常，`sprite-627` 历史缺帧不会误开编辑。
- 未完成项: 无。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自验证 **accept**；GLM accept(数据/迁移/测试独立复算,无返工项);Kimi accept(架构/runtime
  并发/视觉,唯一链/来源分级/SHA 缓存/并发所有权/s066 遮挡/sprite-627 缺帧全过)。三签齐,无返工项。
- 必须返工项: 无;内部审计发现的全部 P1/P2 已完成返工并复审。
- Accept / rework: **done（三方 accept + 用户确认，2026-07-19）**。

## 用户验收

- 用户结论: **accept（2026-07-19）**。用户确认三方 done 签字已齐，按 Codex/Kimi/GLM 的独立验证证据收口，
  无需重复执行已覆盖的人工验证。
- 后续任务: A7-3B battle sprite -> A7-3E effect sprite -> X3 generic image -> A7-4 总门禁

## 交接日志

- 2026-07-19 Codex: 完成 A7-3W 只读普查与设计落卡，冻结 636/580/559/21/77、1,332,725 B、
  4,133 帧、30 个 legacy 坏尾源和 13 条 C2 布局债；发现 `setFollowers`/存档裸数字是隐藏物理旁路。
  Codex 设计签 agree。Evidence: 本卡上下文锚点、数据基线与验收矩阵。Next: Kimi/GLM 分别完成架构与
  数据设计审查并写回 agree/counter；三签未齐不得进入 build 或修改实现。
- 2026-07-19 Kimi: 架构/schema/跨包设计主审完成,签 **agree**(R1-R3 build 必落钉)。逐项核对:
  分层被 21 组共享定义(4 actor-id 对 + 17 directional-static 对)实证为必需;30 尾槽兼容须按
  origin=legacy-migrated + 结构(连续前缀+尾无有效帧)判定,运行时不许写源 id 特判;
  followers 双 number[] 旁路(script.ts:109/:362)边界确定映射(PAL 82→sprite-82),歧义 fail-loud;
  共享两层引用检查与缩帧默认禁止;A7-3T 原语(assetBlobs/完整 SHA/两阶段 catalog/byte-exact)复用;
  tilesetBlobs 只移 world sprite;D25/E2/E5 锚点成立(渲染用实际解码帧数);B/E/X3/A7-4 分界诚实。
  锚点抽点:636 源、580 defs、559 unique、77 未引用与 GLM 冻结一致。R1(名称域)/R2(30 源结构判定)/
  R3(渲染用实际帧数)必落。Evidence:本卡主审立场、签字区、争议记录。三签齐 build 准入 allowed,
  Status 翻转与看板由 Codex 执行。未改实现文件。
- 2026-07-19 GLM: 数据/迁移/测试矩阵设计审查签 **agree**。独立复算全部基线：sprite RLE 636 源/1,332,725B（编号 1..636 连续）；SpriteDef 580/unique spriteNum 559/共享 21(4 actor-id 对+17 directional-static 对)/未引用 77(636-559)；catalog 1,071/0 sprite records；sprite 在 legacy(4 families)；30 坏尾源全 30 文件存在；13 layout 债全 13 spriteNum 存在(其中 242/379/541 双定义扩展 16 行)。语义消费者：actors 6+entities 549 unique+setActorSprite 116+setActorAppearance 9+setFollowers 2 全覆盖。代码逻辑审查（读源码逐路径推演）：SpriteDef(sprite.ts:35-53) 当前 `{id,spriteNum,label,layout,poses?,path?}` 无 asset；walker(asset.ts:346-360) 无 sprites 槽(ASSET_KINDS 已含 sprite)；setFollowers.sprites(script.ts:109)=number[] + WorldScriptState.followers(script.ts:362)=number[] = 隐藏物理旁路（进存档）；setActorAppearance.battleSprite=number 属 A7-3B 范围。**G1 关键**：followers number[]→SpriteDef.id 迁移(PAL 82→sprite-82，第三方多义 fail-loud)；G2 来源分级 strict parser(legacy 容忍 30 坏尾，authored/generated fail-loud)；G3 walker sprites 槽扩展；G4 全 636 登记非仅 559(77 unused=warning)。Evidence: 设计签字 GLM 行。Next: 待 Kimi 签后三齐 build allowed。未改实现文件。
- 2026-07-19 Codex: 核对 Codex/Kimi/GLM 三方均签 agree 且无 counter；R1-R3、G1-G4 全部纳入 build。
  准入复算补正两处审查分项口径：共享组为 5+16，`setActorAppearance` 9 条命令中仅 3 条含 spriteId。
  将任务从 draft 推进到 build 并同步看板。Evidence: `projects/pal/content/sprites.json` 全量分组与 9 条命令
  字段检查。Next: Codex 单一 Coding Owner 实现；进入 review 前不得标 done。
- 2026-07-19 Codex: A7-3W build、自验证与内部终审返工完成，状态推进到 review。PAL 冻结为 636 records /
  580 definitions / 559 used / 21 shared / 77 unused，1,332,725 B / 4,133 frames / 30 legacy tails /
  13 layout debts；636/636 byte-exact。editor/resource lifecycle、v3/MG2、followers/save、runtime 单链和
  503 extracted-route 浏览器验证均通过。两轮只读终审发现的 revision/refs/deep-link/CSS 与
  reloadMap/fade/dither/auto ownership 阻断全部返工，最终两路均 accept；Reforge 全套 487 tests，Biome
  775 files。Evidence: 本卡 Build/视觉/Review 区。Next: Kimi + GLM 分别完成最终审查并把 accept/counter
  写回；两签未齐不得标 done。
- 2026-07-19 Kimi: 架构/runtime 并发/视觉 done 终审签 **accept**,三签齐。逐项核实:580 defs 全 asset/
  0 spriteNum/0 path + 636 records/559 used/77 unused 精确(catalog 唯一链);parseWorldSpriteChunk 来源
  分级(canonical 全严格、legacy 连续前缀兼容且坏尾后可解即拒、运行时无 id 特判);SpriteAssetCache 按
  AssetId+record.sha256;prepareAndCommitSceneSwitch 依赖快照+双 assertCurrent、fade/dither cancelOwned
  被接管后 no-op(并发所有权);reforge s066 三人全身/锚点/遮挡/场景色正常、editor sprite-627 历史声明
  12/实际 4 帧全槽缺失→0 禁用且定义/资源删除分离;console 0 error。独立复跑根 pnpm check 全绿(首跑
  migrate 抖动,隔离与复跑均过);A7-2 OFL 遗留已由 5b7b49c8 收口。Evidence:done 准入 Kimi 行+上述实测。
  Next:无下一位审查 Agent;待用户验收后由收口方标 done。未改实现文件。
- 2026-07-19 GLM: done 数据/迁移/测试终审签 **accept**（commit `ea34d0e3`）。独立复算：catalog 1,707/636 sprite records/1,332,725B（编号 1..636 连续零缺失）；全 636 文件 SHA256+bytes 逐项零 mismatch（全量非抽样 ok=636 fail=0 missing=0）；580 SpriteDef 全有 asset 零 spriteNum 零 path；559 unique/21 共享/77 unused；setFollowers.sprites=string[] + followers=string[]（G1 落地）；PAL setFollowers 2 条（清空 + sprite-82）；spriteByNum/loadSprite(base,num) 全仓零命中；sprite 退出 legacy（保留 3）；loadSpriteAsset(resolver,asset) 统一加载器；MG2 writes=0/deletes=0/conflicts=0 + tuple-digest c92c14b5... + frames=4133 + malformed-tail-slots=30；capability-map A7 ⚠️/⚠️ 未提前 done。测试 content 248/reforge 487/editor 479/migrate 233+1skip 全 pass。Evidence: done 准入 GLM 行 + Review 段。Next: 待 Kimi 独立 accept 后三签齐交用户验收。未改实现文件。
- 2026-07-19 Codex: 核对 Codex/Kimi/GLM 三方 done 签字均为 `accept` 且无 counter；用户确认签字已齐，
  将任务从 review 收口为 done、移出进行中看板，并清理两张会话视觉验证截图。Evidence: 本卡推进签字、
  Review 与用户验收区；GLM 签字 commit `ea34d0e3`。Next: A7-3B battle sprite；A7/R7/A7-4 仍未提前标 done。

## 下一位 Agent 提示词

无下一位 Agent 提示词；A7-3W 已三方审查 `accept` 并由用户确认收口。以下提示词均为已执行的历史记录。

### 历史：给 Kimi（架构、runtime 并发与视觉主审）

```text
接手任务: A7-3W 大世界精灵索引资源闭包的 done 前最终审查
任务卡: docs/ops/tasks/A7-3W-world-sprite-asset-closure.md
当前状态: review；Codex=accept，Kimi/GLM=pending，done 准入 blocked
你的角色: Kimi，负责架构/schema/跨包、runtime 并发所有权、资源唯一链与视觉主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/decisions.md 的 D25、
docs/phase2/foundation/phase1-knowledge-harvest.md 的 E2/E5/MG5、
docs/phase2/foundation/a7-resource-closure-audit.md、docs/ops/tasks/A7-3T-tileset-asset-closure.md，
以及本任务卡全部内容（重点 Build/视觉/Review 与内部返工记录）
已完成: SpriteDef.asset/catalog-only 单链、636 全量 byte-exact 迁移、followers/save 语义 id、
shared-aware editor transaction、实际帧驱动；旧 extracted sprite 路由 503 下 editor 与
Reforge s001/s066/s102 正常。内部终审发现的 scene reloadMap 原子性、auto loadScene、fade/dither
owner 接管/完成态复位均已修，最终 runtime 5 files/83 tests accept，Reforge 全套 487 tests。
请你做: 只读复核 origin+结构分级 parser、AssetId+SHA 缓存、scene/party/fade/dither 异步提交，
共享替换/删除/缩帧的架构边界，以及 s066 三人全身/遮挡/颜色和 sprite-627 缺帧保护；把
accept 或 counter 直接写回任务卡“进入 done 前:审查签字”的 Kimi 行、Review 与交接日志。
不要做: 不得修改实现文件，不得代签 GLM，不得提前把 Status 改为 done，不得冒领 A7-3B/E/X3/A7-4。
输出要求: 无 P0/P1/P2 签 accept；有阻断签 counter，给 file:line、复现、影响和最小返工项。
Kimi + GLM accept 未齐不得标 done。
```

### 历史：给 GLM（数据、迁移、保存与测试矩阵审查）

```text
接手任务: A7-3W 大世界精灵索引资源闭包的 done 前最终审查
任务卡: docs/ops/tasks/A7-3W-world-sprite-asset-closure.md
当前状态: review；Codex=accept，Kimi/GLM=pending，done 准入 blocked
你的角色: GLM，负责数据/schema、迁移/MG2、本地 v3/存档、保存 transport、测试与文档口径
先读: AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/decisions.md 的 D25、
docs/phase2/foundation/a7-resource-closure-audit.md、docs/phase2/migrate/asset-pipeline.md、
docs/ops/tasks/A7-3T-tileset-asset-closure.md 和本任务卡全部内容
已完成: PAL 636 records / 580 defs / 559 used / 21 shared / 77 unused，1,332,725 B / 4,133 frames /
30 legacy tails / 13 layout debts；tuple digest 已冻结，636/636 文件与提取源 byte-exact；followers、
typed walker、v3/MG2、save/FSA/clone/ZIP 与 demo/e2e/blank 均有测试。内部 editor/data/migration
终审 179+99+70 tests accept；五包 typecheck、全套测试、build、Biome 均通过。
请你做: 独立复算全部集合/digest/bytes/SHA/media/origin，审计 30 源兼容不按 id 特判、77 unused warning、
13 债务不扩大、followers/存档升级歧义 fail-loud、MG2 authored 保护、两阶段保存与 byte-exact transport；
核对文档未提前宣称 A7/R7/A7-4 完成；把 accept 或 counter 写回 done 签字 GLM 行、Review 与交接日志。
不要做: 不得修改实现文件，不得只抽样 559 个已用资源，不得代签 Kimi，不得提前标 done。
输出要求: 给出独立命令/数据；无 P0/P1/P2 签 accept，有阻断签 counter 并列差异和最小返工项。
Kimi + GLM accept 未齐不得标 done。
```

以下两段为 draft 阶段已经执行完毕的历史交接提示词，仅保留审计记录。

### 历史：给 Kimi（架构/schema/跨包主审）

```text
接手任务: A7-3W 大世界精灵索引资源闭包的 draft 设计审查
任务卡: docs/ops/tasks/A7-3W-world-sprite-asset-closure.md
当前状态: draft；Codex=agree，Kimi/GLM=pending，build 准入 blocked
你的角色: Kimi，负责架构/schema/跨包、world-sprite parser 边界、共享资产编辑事务和视觉风险压力测试
先读: AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/decisions.md 的 D25、
docs/phase2/foundation/phase1-knowledge-harvest.md 的 E2/E5/MG5、
docs/phase2/foundation/a7-resource-closure-audit.md、
docs/ops/tasks/A7-3T-tileset-asset-closure.md 和本任务卡全部内容
已完成: Codex 只读冻结 636 源/580 定义/559 已用资产/21 共享定义/77 未引用、1,332,725 B/4,133 帧、
30 个 legacy 坏尾源、13 条既有布局债；方案为 SpriteDef.asset 单链、全源登记、来源分级 strict parser、
followers 语义 id、AssetId+record SHA 缓存和 shared-aware editor transaction
请你做: 核对 SpriteDef/AssetId 分层、30 个尾槽兼容是否足够 fail-closed、setFollowers/存档升级、
共享替换/删除/缩帧事务、A7-3T 保存原语复用、D25/一阶段锚点和 A7-3W 与 B/E/X3/A7-4 边界；
把 agree 或 counter 直接写回任务卡 Kimi 设计签字、主审立场、争议记录和交接日志
不要做: 不得修改实现文件，不得提前把 Status 改为 build/done，不得把 PAL 源重编码或引入 palette UI
输出要求: 无阻断签 agree；有问题签 counter，并给 file:line、影响、最小修订和待用户拍板项。
三方 agree 未齐不得开始实现。
```

### 历史：给 GLM（数据/schema/迁移/测试矩阵审查）

```text
接手任务: A7-3W 大世界精灵索引资源闭包的 draft 数据与迁移设计审查
任务卡: docs/ops/tasks/A7-3W-world-sprite-asset-closure.md
当前状态: draft；Codex=agree，Kimi/GLM=pending，build 准入 blocked
你的角色: GLM，负责独立数据复算、typed reference 覆盖、迁移/MG2、本地 v3/存档升级和测试矩阵
先读: AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/decisions.md 的 D25、
docs/phase2/foundation/a7-resource-closure-audit.md、docs/ops/tasks/A7-3T-tileset-asset-closure.md 和本任务卡
已完成: Codex 只读方案已冻结；未改任何 A7-3W 实现。当前结论为 636 gzip 源、580 SpriteDef、
559 unique spriteNum、21 条共享定义、77 个未引用资源、1,332,725 B、4,133 有效帧、30 个坏尾源，
以及 13 条历史 layout 覆盖债；发现 setFollowers/WorldScriptState.followers 仍是 number[]
请你做: 独立复算上述集合/总数/异常清单；审计 SpriteDef.asset typed walker、所有语义消费者、0x98 与存档、
PAL/demo/e2e/blank、本地 v3 升级、636 全量物化、MG2 authored 保护、byte-exact save/clone/ZIP 和失败重试；
压力测试 13 条 layout 债与缩帧门禁；把 agree 或 counter 直接写回任务卡 GLM 设计签字、争议记录和交接日志
不要做: 不得修改实现文件，不得提前把 Status 改为 build/done，不得只抽样或只检查 559 个已引用文件
输出要求: 给出复算命令/证据；无阻断签 agree，有问题签 counter 并列差异、风险和最小返工项。
三方 agree 未齐不得开始实现。
```
