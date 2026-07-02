# M2 场景模型设计(全场景静态迁移 + 引擎多场景)

> 2026-07-02,Fable5。依据:M2 源数据投查(295 场景/5077 事件对象/223 图,实测锚点见文末)+ [content-schema §4/§5/§7](content-schema.md) + [roadmap §8](../roadmap.md)。
> 状态:设计定稿 → 分期实施。铁律照 [READ-FIRST](../READ-FIRST.md)。

## 0. 投查钉死的事实(设计前提)

1. **场景表仅 4 字段**(mapNum/scriptOnEnter/scriptOnTeleport/eventObjectIndex)——**入口坐标与音乐都不是表数据**:入口 = 源场景脚本里 `setPartyPos→loadScene` 对;音乐 = onEnter 链头部的 `playMusic`(135/295 无 onEnter,音乐延续)。
2. **坐标零换算**:事件对象 x/y 是等距投影后的世界像素,与 `pixelToGrid` **精确往返**(实测 512,800↔col66,row34)。`GridPos = {...pixelToGrid(x,y), height:0}`。
3. **原版无"房间/视窗"概念**:一场景用整张 64×128 图,相机夹全图;`room` 是我们 demo 的发明。
4. **立交 = 普通场景对**(map42+131 各自平图 + 传送对),零特殊 schema/引擎工作。
5. `sState`:0 隐藏/1 可见可走/2+ 挡路;`spriteNum=0` = 纯触发区(不可见);`sLayer` = 人工画序偏置(非空间轴)。
6. 一阶段运行时先例:相机 `clamp(party−PARTYOFFSET, 0, (w−1)*32 /(h−1)*16)`;场景资产 LRU=16 + protect 当前场景;已知坑 = tileset 按 sceneId 取导致共图双取(**reforge 按 mapNum 去重**)。

## 1. Schema 演进(content;全部加法/放宽)

| 变更 | 定义 | 迁移填法 |
|---|---|---|
| `map.room` → **可选** | 缺省 = 整图(引擎视窗/相机走全图包围盒) | 迁移场景一律不填;demo 保留 |
| `SceneDef.musicId?: number` | BGM 槽(引擎音频期消费) | 窄扫描 onEnter 链头 `playMusic`;无则缺省(延续上曲,忠实原版) |
| `SceneDef.entries?: Record<string, { pos: GridPos; facing?: Facing }>` | 命名入口(M3 传送引用目标) | 窄扫描全库 `setPartyPos→loadScene(N)` 对 → 目标场景收 `from-scene-<src>[-k]`;自身 onEnter 头部 `setPartyPos` → `start` |
| `SceneDef.entry` 语义 | **保留 = 缺省落点**(dev 跳场景/读档兜底) | 取 `start` > 首个扫描入口 > 图中心(标 `entryDerived:'fallback'` 进报告) |
| `EntityBase.hidden?: boolean` | 初始隐藏(脚本届时显形 = M3/B2 页) | `sState===0 → hidden:true` |
| `EntityBase.zBias?: number` | 画序偏置(叠加进 Y-sort 基线) | `sLayer≠0` 原样搬(防遮挡漂移;引擎 SpriteDraw 支持) |
| collide 填法 | 既有字段 | `sState>=2 → collide:true` |

**M2 静态不迁**:`spriteNum=0` 纯触发区(脚本锚,M3 随脚本迁)、triggerLabel/autoLabel(M3)、interact(M3)。计数进报告,不静默丢。

## 2. 工程文件布局:per-scene 目录(content-schema §7 兑现)

```
projects/<id>/content/scenes/
  index.json        // ["s000", "s001", ...] 场景 id 清单(构建期产;引擎/编辑器发现用)
  s001.json         // 单场景 SceneDef
```
- `manifest.content.scenes` 指向 **目录**(以 `/` 结尾判别;旧单文件形态兼容期保留判断,demo 迁完删)。
- **loader 双路径**:引擎 `loadProject` 只取 index + 表域;新增 `loadScene(project, sceneId)`(fetch 单场景 + validate);编辑器一次拉全量(300 × 小 JSON,内存无压力)。
- 场景 id:`s<原版三位 id>`(`s001`;原版 sceneId 是稳定原版 id,同技能 oid 约定,当不透明串)。demo 场景保语义 id 不动。
- editor round-trip(project-io)随之:serialize 产 per-scene 文件 + index;脏跟踪天然升级为 per-scene 粒度。

## 3. 引擎多场景(reforge)

1. **currentScene 状态化 + `switchScene(sceneId, entryId?)`**:fetch(经 LRU)→ 换 map/tileset/palette(**重建 renderer**,烤图缓存按 palette)→ 实体精灵按需补载(**按 spriteNum 去重**)→ party 落 entry → camera 重夹。
2. **相机全图化**:视窗 `view = scene.map.room ?? {0,0,map.width,map.height}`;夹取公式同现 demo,bbox 换 view。
3. **实体渲染泛化**(已含在 prep):去 `requireFirst` 单鬼硬编码 → N 实体循环;`hidden` 跳过渲染+碰撞;`zBias` 进画序。
4. **场景资产 LRU**(cap≈16 + protect 当前):键 = mapNum(修一阶段双取坑);renderer 因 palette 变化整重建,烤图缓存随 renderer 生命周期自然作废。
5. **dev 跳场景**:`?scene=s042` + 简易列表(编辑器/调试两用);读档 `position.sceneId` 走真 switchScene。
6. 存档:payload 已含 sceneId ✓;跨场景读档即真恢复。

## 4. 迁移器(migrate)分层

- **M2-静态层**(纯机械):295 场景 × `SceneDef` + 可见实体 `EntityDef[]`(坐标/朝向/hidden/collide/zBias/prop-sprite 引用);精灵注册表批量补条目(实体 spriteNum 去重 → `sprites.json`,label=`原名或 npc-<num>`,布局按 nSpriteFrames:0→static?**注意**:nSpriteFrames=0 且多帧=loop 候选,静态层一律 `directional×(n||3)`/`static(单帧)` 保守;帧数须读 rle?——不读,布局先按 nSpriteFrames>0→directional×n、=0→static,报告可疑项,C1 标注工具人工修)。
- **M2-窄扫层**(walkDesc 同款,带 blockedAt 护栏):①入口扫描:全脚本 `setPartyPos` 紧邻 `loadScene(N)` → entries;②音乐扫描:onEnter 链头首个 `playMusic`。命中护栏 → 报告待手修,不猜控制流。
- 产出进 `projects/pal`;demo 工程不动。

## 5. 分期与 gate

| 期 | 内容 | gate |
|---|---|---|
| **M2a** schema+布局 | §1 全部字段 + §2 per-scene 布局(loader 双路径 + editor round-trip + demo 迁 per-scene) | 全绿;demo 双端浏览器逐一致 |
| **M2b** 迁移器 | §4 两层 + pal 生成 295 场景 | golden:demo 场景断言 + 抽样场景(1/4/40/41)字段对原始;计数账本 |
| **M2c** 引擎 | §3 多场景/相机/LRU/dev 跳 | 浏览器:pal 工程跳 3+ 个原版场景走动/遮挡/碰撞正常;读档跨场景 |

编辑器场景列表/切换 UI = M2 后续小片(B 系),不阻塞主轴。

## 6. 投查锚点(核对用)

场景样本 scene/{0,1,4,40,41}.json;入口对样本 events/scene-001.json:38-51(`setPartyPos(49,94)→loadScene(4)`);音乐样本 scene-004.json(onEnter=playMusic(49));坐标往返实测 512,800↔(66,34);共图样本 map12←scenes{1,2}、map74←4 scenes;立交 42/131 共 `L_9139`;相机/LRU 先例 game/scene-system.ts:427-434 + assets/loader.ts:451-499。
