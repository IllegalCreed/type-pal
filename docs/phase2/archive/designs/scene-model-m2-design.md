# M2 场景模型设计(全场景静态迁移 + 引擎多场景)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：M2 场景静态迁移：scene id/map/entries/music/hidden/zBias；per-scene 目录与索引；reforge 多场景/LRU；迁移器分层、阶段 gate 和原版普查锚点。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`11070e661a85f6a29f235acc6a3308d5a94eba8fb070cd5b2f21ac884c3d7042`；原文 68 行、6268 bytes。
- 一手来源/正文锚点：docs/phase2/archive/designs/scene-model-m2-design.md:1-1；标题锚点：1:M2 场景模型设计(全场景静态迁移 + 引擎多场景), 6:0. 投查钉死的事实(设计前提), 15:1. Schema 演进(content;全部加法/放宽), 29:2. 工程文件布局:per-scene 目录(content-schema §7 兑现), 41:3. 引擎多场景(reforge), 50:4. 迁移器(migrate)分层, 56:5. 分期与 gate, 66:6. 投查锚点(核对用)。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- 旧 mapNum/map.room/reuseOriginalMap/spriteNum 等历史载荷与 current SceneIndex/ProjectMap v4/AssetId 不同。
- 阶段 gate 与 295 场景统计只证明设计输入，不证明当前迁移/运行时覆盖。

## 方案

- 原始方案语义：M2 场景静态迁移：scene id/map/entries/music/hidden/zBias；per-scene 目录与索引；reforge 多场景/LRU；迁移器分层、阶段 gate 和原版普查锚点。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/specs/content-schema.md
- 当前 scene/project map code
- 当前 migration/extraction contracts
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- 旧 mapNum/map.room/reuseOriginalMap/spriteNum 等历史载荷与 current SceneIndex/ProjectMap v4/AssetId 不同。
- 阶段 gate 与 295 场景统计只证明设计输入，不证明当前迁移/运行时覆盖。
- 停止线：不得以 M2 方案重跑全场景迁移或恢复旧地图字段；先核 current content/map specs、source extractor 与 scene loader。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `11070e661a85f6a29f235acc6a3308d5a94eba8fb070cd5b2f21ac884c3d7042`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- M2 场景模型设计(全场景静态迁移 + 引擎多场景)：这是 design-spec，当前文档状态为 historical。全文 69 行、8 个标题；摘要/首段为「> 2026-07-02,Fable5。依据:M2 源数据投查(295 场景/5077 事件对象/223 图,实测锚点见文末)+ [content-schema §4/§5/§7](content-schema.md) + [roadmap §8](../../roadmap.md)。」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `11070e661a85f6a29f235acc6a3308d5a94eba8fb070cd5b2f21ac884c3d7042`；全文 68 行 / 6268 bytes。
- 原文标题/章节锚点：1:M2 场景模型设计(全场景静态迁移 + 引擎多场景), 6:0. 投查钉死的事实(设计前提), 15:1. Schema 演进(content;全部加法/放宽), 29:2. 工程文件布局:per-scene 目录(content-schema §7 兑现), 41:3. 引擎多场景(reforge), 50:4. 迁移器(migrate)分层, 56:5. 分期与 gate, 66:6. 投查锚点(核对用)。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得以 M2 方案重跑全场景迁移或恢复旧地图字段；先核 current content/map specs、source extractor 与 scene loader。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/specs/content-schema.md, 当前 scene/project map code, 当前 migration/extraction contracts。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `11070e661a85f6a29f235acc6a3308d5a94eba8fb070cd5b2f21ac884c3d7042`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # M2 场景模型设计(全场景静态迁移 + 引擎多场景)
>
> > 2026-07-02,Fable5。依据:M2 源数据投查(295 场景/5077 事件对象/223 图,实测锚点见文末)+ [content-schema §4/§5/§7](content-schema.md) + [roadmap §8](../../roadmap.md)。
> > 状态:设计定稿 → 分期实施。铁律照 [READ-FIRST](../../READ-FIRST.md)。
>
> ## 0. 投查钉死的事实(设计前提)
>
> 1. **场景表仅 4 字段**(mapNum/scriptOnEnter/scriptOnTeleport/eventObjectIndex)——**入口坐标与音乐都不是表数据**:入口 = 源场景脚本里 `setPartyPos→loadScene` 对;音乐 = onEnter 链头部的 `playMusic`(135/295 无 onEnter,音乐延续)。
> 2. **坐标零换算**:事件对象 x/y 是等距投影后的世界像素,与 `pixelToGrid` **精确往返**(实测 512,800↔col66,row34)。`GridPos = {...pixelToGrid(x,y), height:0}`。
> 3. **原版无"房间/视窗"概念**:一场景用整张 64×128 图,相机夹全图;`room` 是我们 demo 的发明。
> 4. **立交 = 普通场景对**(map42+131 各自平图 + 传送对),零特殊 schema/引擎工作。
> 5. `sState`:0 隐藏/1 可见可走/2+ 挡路;`spriteNum=0` = 纯触发区(不可见);`sLayer` = 人工画序偏置(非空间轴)。
> 6. 一阶段运行时先例:相机 `clamp(party−PARTYOFFSET, 0, (w−1)*32 /(h−1)*16)`;场景资产 LRU=16 + protect 当前场景;已知坑 = tileset 按 sceneId 取导致共图双取(**reforge 按 mapNum 去重**)。
>
> ## 1. Schema 演进(content;全部加法/放宽)
>
> | 变更 | 定义 | 迁移填法 |
> |---|---|---|
> | `map.room` → **可选** | 缺省 = 整图(引擎视窗/相机走全图包围盒) | 迁移场景一律不填;demo 保留 |
> | `SceneDef.musicId?: number` | BGM 槽(引擎音频期消费) | 窄扫描 onEnter 链头 `playMusic`;无则缺省(延续上曲,忠实原版) |
> | `SceneDef.entries?: Record<string, { pos: GridPos; facing?: Facing }>` | 命名入口(M3 传送引用目标) | 窄扫描全库 `setPartyPos→loadScene(N)` 对 → 目标场景收 `from-scene-<src>[-k]`;自身 onEnter 头部 `setPartyPos` → `start` |
> | `SceneDef.entry` 语义 | **保留 = 缺省落点**(dev 跳场景/读档兜底) | 取 `start` > 首个扫描入口 > 图中心(标 `entryDerived:'fallback'` 进报告) |
> | `EntityBase.hidden?: boolean` | 初始隐藏(脚本届时显形 = M3/B2 页) | `sState===0 → hidden:true` |
> | `EntityBase.zBias?: number` | 画序偏置(叠加进 Y-sort 基线) | `sLayer≠0` 原样搬(防遮挡漂移;引擎 SpriteDraw 支持) |
> | collide 填法 | 既有字段 | `sState>=2 → collide:true` |
>
> **M2 静态不迁**:`spriteNum=0` 纯触发区(脚本锚,M3 随脚本迁)、triggerLabel/autoLabel(M3)、interact(M3)。计数进报告,不静默丢。
>
> ## 2. 工程文件布局:per-scene 目录(content-schema §7 兑现)
>
> ```
> projects/<id>/content/scenes/
>   index.json        // ["s000", "s001", ...] 场景 id 清单(构建期产;引擎/编辑器发现用)
>   s001.json         // 单场景 SceneDef
> ```
> - `manifest.content.scenes` 指向 **目录**(以 `/` 结尾判别;旧单文件形态兼容期保留判断,demo 迁完删)。
> - **loader 双路径**:引擎 `loadProject` 只取 index + 表域;新增 `loadScene(project, sceneId)`(fetch 单场景 + validate);编辑器一次拉全量(300 × 小 JSON,内存无压力)。
> - 场景 id:`s<原版三位 id>`(`s001`;原版 sceneId 是稳定原版 id,同技能 oid 约定,当不透明串)。demo 场景保语义 id 不动。
> - editor round-trip(project-io)随之:serialize 产 per-scene 文件 + index;脏跟踪天然升级为 per-scene 粒度。
>
> ## 3. 引擎多场景(reforge)
>
> 1. **currentScene 状态化 + `switchScene(sceneId, entryId?)`**:fetch(经 LRU)→ 换 map/tileset/palette(**重建 renderer**,烤图缓存按 palette)→ 实体精灵按需补载(**按 spriteNum 去重**)→ party 落 entry → camera 重夹。
> 2. **相机全图化**:视窗 `view = scene.map.room ?? {0,0,map.width,map.height}`;夹取公式同现 demo,bbox 换 view。
> 3. **实体渲染泛化**(已含在 prep):去 `requireFirst` 单鬼硬编码 → N 实体循环;`hidden` 跳过渲染+碰撞;`zBias` 进画序。
> 4. **场景资产 LRU**(cap≈16 + protect 当前):键 = mapNum(修一阶段双取坑);renderer 因 palette 变化整重建,烤图缓存随 renderer 生命周期自然作废。
> 5. **dev 跳场景**:`?scene=s042` + 简易列表(编辑器/调试两用);读档 `position.sceneId` 走真 switchScene。
> 6. 存档:payload 已含 sceneId ✓;跨场景读档即真恢复。
>
> ## 4. 迁移器(migrate)分层
>
> - **M2-静态层**(纯机械):295 场景 × `SceneDef` + 可见实体 `EntityDef[]`(坐标/朝向/hidden/collide/zBias/prop-sprite 引用);精灵注册表批量补条目(实体 spriteNum 去重 → `sprites.json`,label=`原名或 npc-<num>`,布局按 nSpriteFrames:0→static?**注意**:nSpriteFrames=0 且多帧=loop 候选,静态层一律 `directional×(n||3)`/`static(单帧)` 保守;帧数须读 rle?——不读,布局先按 nSpriteFrames>0→directional×n、=0→static,报告可疑项,C1 标注工具人工修)。
> - **M2-窄扫层**(walkDesc 同款,带 blockedAt 护栏):①入口扫描:全脚本 `setPartyPos` 紧邻 `loadScene(N)` → entries;②音乐扫描:onEnter 链头首个 `playMusic`。命中护栏 → 报告待手修,不猜控制流。
> - 产出进 `projects/pal`;demo 工程不动。
>
> ## 5. 分期与 gate
>
> | 期 | 内容 | gate |
> |---|---|---|
> | **M2a** schema+布局 | §1 全部字段 + §2 per-scene 布局(loader 双路径 + editor round-trip + demo 迁 per-scene) | 全绿;demo 双端浏览器逐一致 |
> | **M2b** 迁移器 | §4 两层 + pal 生成 295 场景 | golden:demo 场景断言 + 抽样场景(1/4/40/41)字段对原始;计数账本 |
> | **M2c** 引擎 | §3 多场景/相机/LRU/dev 跳 | 浏览器:pal 工程跳 3+ 个原版场景走动/遮挡/碰撞正常;读档跨场景 |
>
> 编辑器场景列表/切换 UI = M2 后续小片(B 系),不阻塞主轴。
>
> ## 6. 投查锚点(核对用)
>
> 场景样本 scene/{0,1,4,40,41}.json;入口对样本 events/scene-001.json:38-51(`setPartyPos(49,94)→loadScene(4)`);音乐样本 scene-004.json(onEnter=playMusic(49));坐标往返实测 512,800↔(66,34);共图样本 map12←scenes{1,2}、map74←4 scenes;立交 42/131 共 `L_9139`;相机/LRU 先例 game/scene-system.ts:427-434 + assets/loader.ts:451-499。
<!-- original-source-quote:end -->
