# 一阶段知识测绘（Phase 1 Knowledge Harvest）

> **缘起**（2026-07-05）：作者批评——reforge 重写各子系统时不读一阶段实现与踩坑史，"谈何优化"。一阶段 792 commit / 432 fix 是几十轮打磨的血泪，散落在代码注释、git message、`engineering-notes` 里；reforge 重写时跳过 = 必然重新踩坑（战斗已实证：召唤神双重减锚、音效全缺、屏幕特效整类缺失，全是一阶段修过的）。
>
> **本文 = 一次性全局测绘**：按 reforge 8 领域，把一阶段每个子系统踩过的坑 + 可移植知识 + 架构红线系统性摘出，每条带锚点（commit hash / 文件:行号），作为**动该领域任何格之前的前置必读**。
>
> **★★★ 一等参考（2026-07-06 补）**：[`docs/phase1/game-mechanics.md`](../../phase1/game-mechanics.md)（1218 行）= **作者亲自逐行核对原版+sdlpal 后总结的底层机制真值**，带源出处行号 + 原版早期 bug vs 后期修复考证 + ts 实现状态。覆盖 20+ 专题：隐藏经验/伤害公式/暴击/防御援护护体/队友阵亡台词/群体递减/战后恢复/五灵毒抗性/战斗场景抗性/合击/身法出手/吉运逃跑/特殊技能成功率/紫金葫芦炼丹/抗性体系/异常状态/毒系统(七大毒+相生相克+三致死对)/怪物刷新/大世界状态带入战斗。**凡本文涉及战斗/数值/机制真值，以 game-mechanics.md 为准（它是亲手考证的一手真值，本文是从 commit 二手摘取）**。冲突时 game-mechanics 赢。
>
> **纪律**（写在前头，防本文退化成空话）：
> 1. **三源交叉**：每条来自 ① `engineering-notes` 章节 ② 代码注释（`⚠`/`坑`/`修`/`fix`）③ git log fix message；孤立来源标"未交叉验证"。
> 2. **每条必须有锚点**：commit hash 或 `文件:行号`。"音效挂帧要对"不算；"`fe07eef5` AnimFrame.sound 挂帧"才算。
> 3. **三分类**（战斗审计已立，沿用）：**A 原版真值**（玩家可见序列/时序/坐标 → reforge 须遵守）｜**B 通用工程教训**（任何架构都会遇 → 新形态防范）｜**C 旧架构特有**（根因在移植方式 → 论证新架构谁承接语义）。
> 4. **按 reforge 领域归类**：消费者是 reforge 的格；一阶段子系统只是挖掘路径，不是输出结构。
> 5. **标记移植状态**：每条标 ✅ 已移植 / ⚠️ 部分移植 / ❌ 未移植 / — 不适用（新架构免疫）。

---

## 索引（按 reforge 领域）

| 领域 | 一阶段对应子系统 | 沉淀密度 | 测绘状态 |
|---|---|---|---|
| [世界/场景 (W)](#w--世界场景) | present(draw-tilemap/draw-sprite)、core/scene-system、shell(camera/scene-loading) | 高(瓦片接缝/相机/切场景全黑/SW) | ✅ 测绘完成 |
| [实体 (E)](#e--实体) | core/event-system(entity 模型/autoScript)、present(draw-sprite 朝向/遮挡) | 中(朝向冻结/立绘残留) | ✅ 测绘完成 |
| [角色 (C)](#c--角色) | core/menu(状态/装备/仙术)、present/menu、core/game-state(per-role HP) | 高(per-role 耦合是 P0 债) | ✅ 测绘完成 |
| [叙事 (N)](#n--叙事) | core/event-system(opcode/script)、present(dialog-box/立绘/font) | 高(双解释器/对话解析/字体) | ✅ 测绘完成 |
| [战斗 (B)](#b--战斗) | core/battle、present/battle | 极高(257 commit/143 fix) | ✅ 见 [battle-audit](../archive/audits/battle-presentation-audit-2026-07-05.md) |
| [元层 (X)](#x--元层) | shell(bootstrap/main-loop/audio/cutscene)、core/save、dev | 极高(shell 237/112、SW 5 坑) | ✅ 测绘完成 |
| [迁移器 (MG)](#mg--迁移器) | pal-extract | 低(extractor roundtrip 不变式) | ✅ 测绘完成 |
| [资产/分发 (A)](#a--资产分发) | assets、shell(SW 预缓存)、生产 CDN | 中(预缓存 5 坑/调色板) | ✅ 测绘完成 |

> 战斗领域已有专项审计（2026-07-05），本文 B 段引用其结论，不重复测绘。

---

## 优先行动清单（全领域测绘后提炼）

按"撞到的确定性 + 缺口影响"排序，这是 reforge 接下来最容易重新踩的坑：

1. **D1 场景资产 LRU 三件套**（W-场景）—— reforge baked RGBA canvas 内存比一阶段 index tile 大 4 倍，无 protect/onEvict，接多场景必爆内存。照搬 `SceneAssetsCache` 的 protect(当前场景) + onEvict(联动并行缓存) + 命中刷新 recency。
2. **setPalette 同帧同步预载**（X/N/F1）—— reforge `getPalette` 是 async，接 RNG/演出调色板时确定性偏色。必须 bootstrap 预载 PAT 全块成同步 Map。
3. **跟随者渲染整组**（E3）—— reforge 现阶段只渲染队长（`main.ts:549`），一阶段踩了 5 个 fix 才收敛，`follower-pos.ts` 是可直接移植的纯函数。
4. **瓦片接缝漏黑**（W-A1）—— Canvas2D drawImage 无 coverage 概念，接 dense 场景会漏黑，方案不能照搬 dilation，需离屏整图 alpha 合成。
5. **migrate 原版数据 bug 补丁台账**（MG-2/3）—— reforge 没有运行时加载层可 patch，giveItem-zero 等必须在 migrate 翻译期烘焙补丁。
6. **palette-fade/screen-wave 色效移植**（A-3）—— D15 全 RGBA 后无法靠换色表实现，演出淡入淡出/红屏/水波需改全屏像素/shader，一阶段数学可复用。
7. **SW 预缓存 5 坑**（A-4）—— reforge/editor 工程化到离线时必带，5 条逐条适用（206/startPrecache 竞态/waitUntil/跨 cache/按版本清）。
8. **卸装备清除授出状态**（C-8）—— `equipItem` 当前只换槽位不清状态，迁移仙女剑/寿葫芦必撞。

---

## W · 世界/场景

### W1. 瓦片接缝漏黑（PAL_MakeScene 不清屏 vs fb.clear）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `55aecff0`(fix);`packages/game/src/present/draw-tilemap.ts:154-168` 注释 + `:169-208` `repairTilemapSeams`;`present.ts:281-290`
- **一阶段怎么了**: 原版 `PAL_MakeScene`(scene.c:471-481) **不清屏**，崖边斜接缝靠上一帧残留邻接地形成肉眼看不出。type-pal 每帧 `fb.clear()` → 缝露纯黑（血池 map76 "黑色三角"）。sdlpal `--dump-map` 静态基准逐像素一致 → 误判忠实；**一次性静态 dump ≠ runtime**。
- **可移植知识**: 漏黑判据用 **coverage mask**（哪些像素被画过），绝不用 `indices===0`（瓦片可合法画 opaque index-0）。修法 = 两层 tilemap 画完后，coverage[i]===0 的像素用最近邻地形逐圈 dilation 填。必须在 `applyScreenWave` **之前**。
- **reforge 现状**: ❌ **未免疫，方案不能照搬**。`render.ts:143-195` Canvas2D `drawImage` 无 coverage；baked tile PNG 透明接缝像素同样露底色。需新方案（离屏整图 alpha 合成 / 接缝预填充到 baked tile）。**先复现血池 map76 看是否漏黑**。

### W2. opaque mask vs idx===0 判透明
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `draw-tilemap.ts:25-29`(opaque 字段) + `:71-78`(blitTile 用 opaque)
- **一阶段怎么了**: 早期 `idx===0 continue` 把 RLE-skip（真透明）与 opaque-palette-0（实色）合并 → dense tile palette-0 像素被当透明 → "梯子状"杂乱。
- **可移植知识**: tile 解码必须分离「RLE-skip」与「画出的 palette index 0」两个概念。
- **reforge 现状**: ⚠️ bake 阶段固化。`render.ts:116` bakeFrame 烘 RGBA；PNG alpha 天然区分（免疫），但 migrate bake 时须确保 palette-0 实色像素 alpha=255。

### W3. 相机：相对移动 vs 绝对回正（0x7F 偏移）
- **分类**: A 原版真值（最关键可移植真理）
- **锚点**: `engineering-notes.md:82-87`;`69fa1c3c`(彩依飞走)、`001c1118`(林家堡走出场);`game-state.ts:14-26`(PARTYOFFSET);`scene-system.ts:427-434`
- **一阶段怎么了**: sdlpal 双量 (viewport, partyoffset) 塌缩成 (camera, 常量 PARTYOFFSET)。居中时无害，但 0x7F 故意推队伍离屏中心后，任何"绝对回正"`camera = party - 常量`都抹掉偏移 → 林家堡走出场李逍遥永远居中、彩依飞走镜头跟不上。
- **可移植知识**: 凡"逐步移动队伍"的 op 都该相对移相机（`camera += step`）：0x6E、partyWalkTo、ride。区分（绝对定位别误改）：0x46 setPartyPos、0x7F 回正。
- **reforge 现状**: ✅ **已正确承接**。`main.ts:285-302` `cameraOffset` 模型，注释明引一阶段案，走位 `cameraPan` 累积进 offset 不回正。**少有的已免疫坑**。

### W4. 切场景全黑两层（sceneLoading / needToFadeIn）
- **分类**: A 原版真值 + B 通用教训（最易复发）
- **锚点**: `engineering-notes.md:89-94`;`c6482fff`(走位清 sceneLoading)、`5b7bebb2`(camera-pan 白名单)、`2ab8ad80`;`event-system.ts:583/645-669`;`mode.ts:42`
- **一阶段怎么了**: 层A `sceneLoading=true` 冻屏（异步加载期间 present 显旧帧），走位/骑乘三组 op 漏清 → 切场景走入演出全黑 + 跟随者重叠。层B `needToFadeIn` 调色板卡 FadeOut 黑，`tickSceneAutoFadeIn` 白名单与 `mode.ts:42` autoScript 白名单必须同步。
- **可移植知识**: 层A=完全冻屏显旧帧镜头不动；层B=镜头在动但全黑。新增"逐帧演出推进态"opcode 须同时登记两白名单。
- **reforge 现状**: ✅ **架构免疫**。`switchScene`（`main.ts:321-349`）await 全套资产后原子提交，无中间态。但**接 cutscene 渲染过渡时高危**——若补过渡，两白名单陷阱会原样复现。

### W5. 场景懒加载 LRU（protect/onEvict/recency 三件套）
- **分类**: B 通用教训 + C 旧架构特有
- **锚点**: `58bf979e`(perf);`loader.ts:430-499`(SceneAssetsCache);`bootstrap.ts:615-628`(集成)
- **一阶段怎么了**: 全 223 scene tile 位图常驻 ~100MB。三关键点：① protect 返回当前 sceneId（宁超 cap 也不淘汰当前场景）；② onEvict 联动清理并行缓存（`tileImagesBySceneId`）；③ 命中刷新 recency。
- **reforge 现状**: ❌ **未免疫，内存压力更大**。baked RGBA canvas 比 index tile 大 4 倍，无 protect/onEvict。**接多场景切换前必照搬三件套**。

### W6. SW 预缓存 5 坑
> 详见 [X · 元层 SW 段](#sw-预缓存5-坑)与 [A-4](#a4-sw-预缓存与生产-cdn5-盲区--no-cache-三件套)。reforge 引擎层无 SW，属壳层/部署关注点。

### W7. setPalette 同帧生效（异步化丢同帧）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `engineering-notes.md:96-100`;`2aa43b29`(酒剑仙坐葫芦偏色);`event-system.ts:547-558`(同步源优先)
- **一阶段怎么了**: `0x8B setPalette` 旧 `fetchPalette.then` fire-and-forget，而 `PAL_GetPalette` 同步读。scene-140 `FadeOut→setPalette→SetRNG→PlayRNG` 同 tick 内，Promise `.then` 隔 microtask → RNG 读旧 palette → 确定性偏色。
- **可移植知识**: 移植 C 阻塞控制流，数据异步化也丢同帧保证。bootstrap 开机预载 PAT 全块成同步 Map，消费方同帧命中。
- **reforge 现状**: ❌ **未实现，高危**。`getPalette` 是 async（`main.ts:226-231`），接 RNG/演出调色板时确定性偏色。**必须开机预载**。

---

## E · 实体

### E1. 实体身份 = 全局下标 wEventObjectID（非稳定 id）
- **分类**: A 原版真值
- **锚点**: `event-system.ts:1077-1100`/`:3294`(applyToAll 0xFFFF)/`:3327-3329`(items 上下文 = role id)
- **一阶段怎么了**: sdlpal 实体身份是数组下标，且 items/spell 上下文里塞的是 role id。把下标当稳定标识 → 谁受伤/转向/隐藏全错位。
- **reforge 现状**: ✅ 已免疫。string `entity.id`（`main.ts:432`），`script-runner.ts:160` selfId。但 item 上下文 self=role id 二义性待 host 落地时显式判别。

### E2. nSpriteFramesAuto 是装载回填字段（非死代码）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `engineering-notes.md` §1.4;`09ba1e04`(血池根因);`res.c:295-298`(回填)、`scene.c:897-901`(取模)
- **一阶段怎么了**: dump 静态值恒 0 被误判死代码 → 冒泡/血柱/赤鬼王 idle 动画全冻 frame 0。
- **可移植知识**: 判字段死代码**必须查装载回填（res.c），不能只看 dump 静态值**。
- **reforge 现状**: ⚠️ 需核 migrate 是否烘帧数进 EntityDef；idle 取模是否用真实帧数。

### E3. 跟随者朝向/位置冻结（0x15 operand[2] 点名 + 三态渲染）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `engineering-notes.md` §3.7b;`0dfc71b7`(0x15 点名)、`8bbbdecc`(初版误同步全队)、`e1b568cb`(朝向源 trail[2].dir)、`a47334a1`(0xA1 重叠 {0,-1});`follower-pos.ts:1-84`;`event-system.ts:3620-3648`
- **一阶段怎么了**: 0x15 旧码把所有跟随者同步转向 → 修了船却误转隐龙窟站立的李逍遥。正解 = operand[2] 点名单员。跟随者三态：① walking（扇形布局）；② not-walking + 冻结快照（位置=队长+冻结偏移）；③ not-walking + 无快照（trail[m] 摆位）。朝向源 = trail[2].dir（非冻结快照）。
- **reforge 现状**: ❌ **未实现**（`main.ts:549` "现阶段队伍渲染只有队长"）。**E 域最大待补**，一阶段 5 个 fix + `follower-pos.ts` 直接可参考。
- **follower-pos oracle（11 case，一阶段 `present/follower-pos.test.ts`，做 E3 时直接抄断言）**：
  1. **walking**: trail[1]+方向偏移（m=1 down → +16,-8）+ 朝向 trail[2].dir，并捕获 frozenOffset（含 dir）。期望 `{x:1000,y:492,dir:'down'}`，frozenOffset[1]=`{dx:0,dy:-8,dir:'down'}`
  2. **walking + 落水回退**: 偏移落水 → 回退 trail[1]（scene.c:712 障碍回退）。期望 `{x:984,y:500}`
  3. **not-walking + 冻结**: 位置冻结（队长+offset）、朝向用**当前 trail[2].dir**（非冻结朝向）。期望 `{x:2016,y:292,dir:'down'}`（dir='down' 非 frozen dir='up'）
  4. **船上重叠回归**: trail[1]==leader + 落水 + not walking → 不贴队长。期望 `not {x:500,y:500}`
  5. **not-walking + 无冻结（0x46 摆位）**: 跟随者落 trail[m]=队长+m×offset，**非 trail[1] 再叠偏移**（旧码多退一格）。m=1 期望 `{x:1016,y:492}`
  6. **刘晋元叫醒回归**: 0x46 黑屏摆位 dir=up，跟随者紧贴队长=trail[1]=队长+(-16,+8)，非 2×偏移。期望 `{x:848,y:584}`
  7. **not-walking 不捕获 frozenOffset**（只在 walking 捕获，防漂移）
  8. **trail 不足(length≤1)** → null（不画跟随者）
  9. **船划行集成**: ride 每步刷 trail 成船行方向 → 朝向跟 trail（=队长），位置仍冻结。期望 dir='down'
  10. **隐龙窟站立回归**: 队长 0x15 回头不动 trail → 跟随者保持走来方向（不跟队长转）。期望 dir='left'

### E4. 立绘残留（clearDialogBoxes 整个 box）
- **分类**: A 原版真值 + B 通用教训 + C 旧架构特有
- **锚点**: `engineering-notes.md` §3.7;`5ba288f6`(清整 box)、`eac84532`(只清持久态无效)、`850411d3`(立绘与布局解耦)
- **一阶段怎么了**: 渲染读 box.portraitIcon（非持久态 currentDialogPortraitIcon）。只清持久态无效——后续 append 进残留 box 复用立绘。复现须真实多行翻页序列。
- **reforge 现状**: ✅ **免疫**。`DialogueLine.portrait` 显式字段，line 走完即失效。但警惕未来 append 复用路径。

### E5. 精灵 blit 规则（脚底中心/每帧自锚/blit y+7）
- **分类**: A 原版真值（资产级约定）
- **锚点**: `draw-sprite.ts:15-37`;`0045cbae`(逐帧 anchor);`present.ts:540-566`;sdlpal scene.c:301-316
- **一阶段怎么了**: anchor 用 frame[0] 宽高 → 爬行精灵 chunk193 各帧高 31~73 差异大，爬帧用 frame0 高度 → 脚底溢出 42px。blit y 必须 +7（sLayer×8 只进排序不进 blit）。
- **reforge 现状**: ✅ **已正确实现**（`render.ts:177-187`，注释明引一阶段 present.ts:540-546）。需核所有 SpriteDraw 构造点传对 baseYBias。

### E6. autoScript 真实语义（别手写模拟）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `engineering-notes.md` §1.2;`event-system.ts:1230-1285`(tickAutoScripts);`5d256f8f`(0x06 fall back)、`bb388ecf`(0x04/0x06 auto 专用语义)
- **一阶段怎么了**: 手写模拟 0x06 语义两轮算"漂 40px 不出界"，调真实 tickAutoScripts 才炸出 3228px。autoScript 与 triggerScript 是**两套解释器**（0x04/0x06 专用语义不同）。
- **reforge 现状**: ✅ 架构对路（ScriptRunner + paceMs）。需核 migrate 译出的 0x06 Command 是否带完整概率/重掷/同帧续跑语义。

### E7. touchFar 死锁（suppressAutoTriggerOnce）
- **分类**: A 原版真值 + B 通用教训 + C 旧架构特有
- **锚点**: `engineering-notes.md` §3.4;`9367efc6`(李大娘死锁);`event-system.ts:3358-3374`
- **一阶段怎么了**: C 阻塞返回后同帧 PAL_UpdateParty 给玩家一次移动；异步化后脚本结束切 explore 首帧扫描必再命中 → 死锁。
- **reforge 现状**: ✅ **架构性免疫**（边沿触发）。`main.ts:1996` 注释明写，仅落步后查 touch。**保留边沿语义，勿退回每帧扫描**。

---

## C · 角色

### C1. per-role HP 全局耦合（P0 架构债）
- **分类**: B 通用教训 + C 旧架构特有
- **锚点**: `CLAUDE.md`(rgwHP@0x268);`game-state.ts:543`;`battle-system.ts:340-345`
- **一阶段怎么了**: HP/MP/装备全存 `rgwHP[MAX_PLAYER_ROLES]` 下标=roleId，两槽同 role 共用一格血。
- **reforge 现状**: ✅ **已免疫**。`CharacterInstance.hp` 在实例上，`party` 是引用列表。P0 债从根上消失。

### C2. roleId 3=巫后 4=阿奴（rgwName 指针对调）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `CLAUDE.md`(rgwName@0x220);`engineering-notes.md:51`;`player-roles.ts:237-243`;`ddb28d07`
- **一阶段怎么了**: rgwName = [36,37,38,**40,39**,41] 故意对调 3/4 名字。旧版 sequential 取名 → 反复把阿奴叫巫后。
- **reforge 现状**: ✅ 从根杜绝（稳定 string id + TextId）。但**迁移器本身**仍须正确处理 rgwName（迁移逻辑验证点）。

### C3. PlayerRolesRuntime vs staticRoles 双轨（战斗不生效）
- **分类**: B 通用教训 + C 旧架构特有
- **锚点**: `game-state.ts:1528-1639`(projectRuntimeToBattleRoles);`equip-effect.ts:83-109`(resync);`e70f9724`(镇狱明王战内无效)
- **一阶段怎么了**: 静态基线 + 运行时可变两套，战斗直接用静态 → 升级/装备战斗里全不生效。三套副本同步地狱。
- **reforge 现状**: ✅ **单一真相源**。`CharacterInstance` 即运行态，战斗直接读实例，无投影/回写。

### C4. 装备 effect 累加 vs override 两种 getter
- **分类**: A 原版真值
- **锚点**: `equip-effect.ts:26-81`(6 累加 getter);`game-state.ts:1573-1589`(override);`8b541469`(补三 override)
- **一阶段怎么了**: 累加型（攻/防/魔/速/逃/抗）vs override 型（attackAll/sprite/coopMagic 末非 0 覆盖）。漏接 sprite/attackAll/coopMagic → override 不生效。
- **reforge 现状**: 🟡 **部分**。`effectiveStat`（`item.ts:77`）只算 statBonus 累加；attackAll/grantSkill/maxPool 在联合里定义但运行时未消费（注释明示 phase3）。

### C5. 卸装备清除授出状态/毒
- **分类**: A 原版真值
- **锚点**: `equip-effect.ts:266-339`(removeEquipmentEffect);`ddba7bfa`(0x2D 授状态)、`9b6feb86`(0x29 授毒)
- **一阶段怎么了**: scriptOnEquip 授持久状态（仙女剑 DualAttack）或毒（寿葫芦 level99 +HP/+MP 毒），唯一清除点 = 卸装备。
- **reforge 现状**: ❌ `equipItem` 当前只换槽位不清状态。**迁移仙女剑/寿葫芦必撞**。

### C6. 隐藏经验 CHECK_HIDDEN_EXP
- **分类**: A 原版真值
- **锚点**: `game-state.ts:506-510`;`battle-system.ts:3311`;`content/rewards.ts:85-127`(reforge port)
- **reforge 现状**: ✅ **已完整 port**。`CharacterInstance.hiddenExp` 持久 + `hiddenCounts` 临时 + `rewards.ts` 占比分配忠实 port battle.c:1226-1293。

### C7. PlayerStatus/EquipMenu 全屏布局（UX 真值）
- **分类**: A 原版 UX 真值（铁律 8）
- **锚点**: `draw-player-status.ts:52-82`(坐标);`draw-equip.ts:58-72`;`READ-FIRST.md:8`(铁律 8)
- **一阶段怎么了**: 完整 port sdlpal ScreenLayout。v1 曾用 attribute/equipment/magic 3 页签是**错的**——原版一屏整布局无页切换。
- **reforge 现状**: 🟡 reforge 菜单基建在 `menu/`，但 PlayerStatus 全屏 UI 尚未落地。**落地须照抄坐标/色值/一屏布局**，别自作主张换页签。

### C8. 合击法术 coop-magic oracle 清单（reforge 全缺，菜单死桩恒灰）

> **背景**：reforge **完全没有合击实现**——菜单第 4 项（合击）`mainActionValid` 恒 `false`（`battle-session.ts:247-251` 注释"2合击未实现"；`:440` "2 合击:valid 恒 false,到不了"）。一阶段有 38 case 的 `coop-magic.test.ts`（`packages/game/src/core/battle/__tests__/coop-magic.test.ts`）+ 实现 `packages/game/src/core/battle/actions/coop-magic.ts`。**测不存在的代码没意义**，以下是一阶段 38 case 沉淀的真值 oracle，每条带 fight.c 行号 + 一阶段 test 行号，作为 **reforge 实现合击时的 oracle 参考**。演出细节另见 [battle-audit §4 P3](../archive/audits/battle-presentation-audit-2026-07-05.md#4-p3-合体法术整体缺失菜单死桩恒灰)。
>
> **reforge 落地时应实现的真值**（分类 A=玩家可见真值 / B=通用工程教训）：

#### C8-1. HP 代价（非 MP！），钳 1
- **分类**: A 原版真值（**最反直觉**，user 强调）
- **fight.c**: `3961-3967`——`rgwHP[role] -= wCostMP`（读的是 costMP 字段，但扣的是 **HP**）；`(SHORT)rgwHP <= 0 → rgwHP = 1`
- **一阶段 test**: `coop-magic.test.ts:75-82`（hp 500→470，mp 不动 30）、`:151-158`（hp 25→1，maxHP/5=20 healthy 但 25-30 钳 1）、`:170-179`（maxHP 9999/hp 150 → 120）
- **oracle 值**: contributor `hp -= magic.costMP`，`<=0 钳 1`；MP 完全不动。healthy 但低血 contributor 不死（钳 1）。
- **reforge 现状**: ❌ 未实现。实现时务必扣 HP 不是 MP（字段名 costMP 有迷惑性）。

#### C8-2. 贡献者 = 所有 healthy 队员
- **分类**: A 原版真值
- **fight.c**: `3370` `coopContributors[i] = PAL_IsPlayerHealthy(w)`；`PAL_IsPlayerHealthy` = `fight.c:69-76`（非濒死 + 无 sleep/confused/silence/paralyzed/puppet）；`PAL_IsPlayerDying` = `fight.c:45-49`（`hp < min(100, maxHP/5)`）
- **一阶段 test**: `:160-168`（role0 hp20<100 → 濒死排除，只剩 1 healthy → no-op 兼容 direct caller）、`:208-222`（sleeping 队员 role2 atk999 不计 str、不付 HP）
- **oracle 值**: healthy = `hp>0 && !isDying(hp<min(100,maxHP/5)) && status.{sleep,confused,silence,paralyzed,puppet}==0`。高 maxHP 队员按 `min(100,maxHP/5)` 判濒死（hp≥100 仍可参与）。

#### C8-3. healthy ≤ 1 → 退化普通攻击（非静默 no-op）
- **分类**: A 原版真值
- **fight.c**: `3374-3378`——`if(iTotalHealthy<=1){ action.ActionType=kBattleActionAttack; action.wActionID=0; }`（改 ActionType 后从头跑完整 attack case，含 `rgAttackExp.wCount++` + `rgHealthExp += RandomLong(2,3)`，`fight.c:3756-3757`）
- **一阶段 test**: `:224-244`（role1 hp0 → 只 1 healthy → 退化普攻：enemy.health 减少、建普攻动画、role0.hp 仍 500 不付协力代价）
- **oracle 值**: healthy≤1 不是 no-op，是**完整普攻**（含隐藏 exp 写入）。一阶段 direct helper 未传 actor 时兼容 no-op（`:160-168`），但战斗执行端必须退化普攻。

#### C8-4. str = Σ(atk+mag) over contributors / 4
- **分类**: A 原版真值
- **fight.c**: `3982-3995`——`str=0; for each contributor: str += PAL_GetPlayerAttackStrength(role) + PAL_GetPlayerMagicStrength(role); str /= 4`
- **一阶段 test**: `:181-192`（atk40+mag60 + atk20+mag40 = 160 → str=40，伤害 = applyMagicDamage(str=40)）、`:208-222`（role2 atk999 排除后 str 仍 40）
- **oracle 值**: atk/mag 取 effective 值（含装备，D14 投影后），SUM 后 `/4`（整数除法）。伤害 = `PAL_CalcMagicDamage(str, def, elemRes, poisonRes, mult=1, magic)`，`sDamage<=0 → 1`（`fight.c:4018/4037`，minDamage=1）。

#### C8-5. 伤害目标：applyToAll（magic.type 或 flag）→ 全体，否则单体
- **分类**: A 原版真值
- **fight.c**: `3863` `sTarget = FIGHT_DetectMagicTargetChange(...)`；`4000-4025`（sTarget==-1 全体循环，逐敌 `def = wDefense + (wLevel+6)*4`、各掷 `PAL_CalcMagicDamage`）；`4026-4043`（单体）
- **一阶段 test**: `:278-331`（巫后 355 天女散花 attackField → 全体）、`:333-420`（武神 351 summon）
- **oracle 值**: `applyToAll(magic.type ∈ {attackAll,attackWhole,attackField,applyToParty,summon} 或 object flag)` → 全体；否则单体 action.target。**判定按 magic.type，不是 flags.applyToAll**（`magic-damage.ts:41-43` 注释：血魔神功 attackWhole 但 applyToAll=False，按 type 才对）。群攻逐敌掷独立 rngFactor（`fight.c:4015` 循环内，每个敌人各掷一次 `RandomFloat(10,11)`）。

#### C8-6. 超杀显示完整伤害（WORD 下溢不钳）
- **分类**: A 原版真值（DL8 裁决）
- **fight.c**: `4023/4042` `wHealth -= sDamage`（WORD 下溢不钳，超杀显示完整 sDamage 非剩余血）
- **一阶段 test**: `:195-206`（enemy.health=5 < refDmg → 超杀，showDamageNum.value = refDmg 完整值，非 5）
- **oracle 值**: 协法术击杀敌显示**完整算出伤害**，不是剩余血 delta。伤害数字颜色：蓝=掉血（`fight.c:648-708`，DL8 裁决）。

#### C8-7. 整队一回合一次（fThisTurnCoop 门控）
- **分类**: A 原版真值（user 报的 bug，`05b57306`）
- **fight.c**: `3858` `fThisTurnCoop=TRUE`；`1707` 每回合重置 `fThisTurnCoop=FALSE`；`1410-1424` 选择期合击立即结束选择（`i=wMaxPartyMemberIndex+1`）；`3973` contributor 设 `kFighterWait`（行动队列只跑 `kFighterAct`，`1727` → contributor 被跳过）；`1050` 合击菜单门控
- **一阶段 test**: 见 `battle-system.test.ts`（commit 后其余 healthy 队员 pass，非各自 coop；confused 队员保留 autoFill）
- **oracle 值**: 合击是**整队的单一动作**。caster commit coop 后，其余 healthy 活队员（= contributor）设 pass 被消耗，不单独行动 → 回合只跑这一次 coop。失能（sleep/confused/paralyzed）队员非 contributor，保留 autoFill（confused→attackmate）。**reforge 回合模型实现合击时必须复刻这个门控，否则一回合放 N 次**（user 实测 3 人选 = 放 3×）。

#### C8-8. 装备 override cooperativeMagic（末非 0 槽覆盖）
- **分类**: A 原版真值（C4 同根）
- **fight.c**: `3860` `PAL_GetPlayerCooperativeMagic(role)`（取装备 rgwCooperativeMagic 末非 0 槽 override，否则默认 player-roles.cooperativeMagic）
- **一阶段 test**: `:333-420`（武神 351 装备 override）、`:278-331`（巫后 355）；实现见 `game-state.ts:1573-1589` override getter、`8b541469` 补字段
- **oracle 值**: 装备可 override 默认合击（武神召唤靠装备 override）。reforge C4 标注 attackAll/grantSkill/coopMagic "联合里定义但运行时未消费 phase3"——**合击实现依赖此 override 先落地**。

#### C8-9. 数据真值（6 角色合击 + special 唯一性）
- **分类**: A 原版数据真值
- **锚点**: player-roles.json `cooperativeMagic`；battle-audit §4 P3
- **数据**: 李逍遥 obj386 / 灵儿+盖罗娇 obj381 / 月如 obj339（**special=0** 唯一非 99）/ 巫后 obj374（dmg 392 最高）/ 阿奴 obj355 天女散花（attackField 全体）。⚠ roleId 3=巫后、4=阿奴（3/4 名字对调陷阱，C2）。

#### C8-10. 聚拢站位 + 演出层序（special 必传）
- **分类**: A 原版演出真值（red-line #8）
- **fight.c**: `3877-3951`（聚拢 6 帧 lerp，发起者 → `rgwCoopPos[0]={208,157}`，其余 contributor 倒序排 `{234,170}{260,183}`；t++ 在贡献者判定**前**，归位 Phase7 的 t++ 在**后**——不对称是忠实 quirk 勿"修"）
- **一阶段 test**: `:258-276`（建动画链、第 6 帧发起者 {208,157}、伤害数字挂 PostMagic 第一帧）、`:86-107`（召唤二次法术 special=99 layerOffset）、`:112-126`（非召唤首次施法 special=99 layerOffset，`fe6d75a3`）、`:333-420`（武神召唤神 spriteKey player-10、bgColorShift、声音挂帧）
- **oracle 值**: 聚拢站 `{208,157}{234,170}{260,183}` 6 帧 lerp。OffMagic 法术精灵层偏移 = `magic.special` 必传作 z 排序 layerOffset（`4cf2258b`/`fe6d75a3` 两 fix：漏传致 layerOffset 落 0 → 法术精灵排进敌人堆被遮挡）。伤害数字延迟到 OffMagic 落完（PostMagic 第一帧，`fight.c:4045` `PAL_BattleDisplayStatChange`）。详见 battle-audit §4 P3 演出段。

#### C8-11. 合击音（起手 29 非召唤 / caster magicSound 召唤）
- **分类**: A 原版真值（M6/M9）
- **fight.c**: `3875` 非 summon `AUDIO_PlaySound(29)` fixed；summon 经 `PAL_BattleShowPlayerPreMagicAnim(TRUE)` → CLASSIC 播 `rgwMagicSound[caster]`（`fight.c:2377`）；效果音 `magic.wSound` 随 OffMagic 帧同步（`53bdb923`、`c051d492`）
- **一阶段 test**: `:131-149`（非 summon → [29, 77]；summon 无动画资源 → [caster magicSound 9, 77]）、`:246-256`（M9 有动画时即时只起手 29，效果音 77 挂帧不即播）
- **oracle 值**: 非 summon 起手音 29 fixed；summon 起手音 = caster 的 magicSound。效果音 `magic.sound` **不**即时播，随 OffMagic 起手帧同步（`i===0` 帧，WIN95 时序，作者拍板）；无动画资源回落即时播。

---

## N · 叙事

### N1. opcode 双解释器（0x8A 漏事件侧）
- **分类**: C 旧架构特有
- **锚点**: `0f71695e`(0x8A 补事件侧);`event-system.ts:153-157`
- **一阶段怎么了**: 0x8A 只在战斗侧实现，事件侧 default no-op → 石长老自动战变手动。
- **reforge 现状**: ✅ **免疫**。`startBattle.auto` 字段 + 单一 async 解释器，无分裂。

### N2. sceneLoading 冻屏隐式耦合（演出冻结 NPC）
- **分类**: C 旧架构特有
- **锚点**: `c6482fff`;`event-system.ts:2374/2408/2469`
- **reforge 现状**: ✅ **结构性免疫**。并行 runner + authority 接管，不复刻"对话冻结 NPC"怪癖（铁律 #6）。

### N3. setPalette 异步丢同帧（确定性偏色）
> 同 W7。reforge getPalette async，接 RNG 高危。

### N4. in-band 控制符解析（~NN/$NN/"/末尾冒号）
- **分类**: A 原版真值 + C 旧架构特有
- **锚点**: `dialog-box.ts:84-145`(parseDialogText);`5d383b61`(DL18 ~ 尾停顿)
- **一阶段怎么了**: 原版对话用 in-band 控制符（颜色 toggle/打字速度/尾停顿/姓名牌），跨行持续态。手写 strip 会漏。
- **reforge 现状**: ✅ **完全抛弃**。`rich-text.ts` XML 标记 + `DialogueLine` 显式字段（speaker/speed/autoAdvance/portrait）。

### N5. ~NN 尾停顿不可加速（Bug3）
- **分类**: A 原版真值
- **锚点**: `098b4057`(Bug2/Bug3);`dialog-box.ts:514-542`
- **reforge 现状**: ✅ **已承接**。`dialog-box.ts:136-138` autoAdvance 尾停顿 noop。

### N6. M.MSG 繁体 BIG5/PUA 残留
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `gbk.ts:1-96`(fixup);`engineering-notes.md` §4
- **reforge 现状**: ✅ 提取层已修。reforge 读干净 glyphs.json，不碰转码。

### N7. 字体阴影三层 color 0
- **分类**: A 原版真值
- **锚点**: `font.ts:118-128`;`reforge/text/text-render.ts:5,37-43`
- **reforge 现状**: ✅ **已承接**。`text-render.ts` SHADOW_RGBA 三层，与一阶段同源。

### N8. callScript/callStack（0x04）
- **分类**: C 旧架构特有
- **reforge 现状**: ✅ **免疫**。AST 嵌套 `branch`，无 IP/label/callStack。

---

## B · 战斗

> 已有专项审计：[battle-presentation-audit-2026-07-05.md](../archive/audits/battle-presentation-audit-2026-07-05.md)。
> 核心：11 条架构红线（§5）+ P0 bug（§1）+ P1 缺失演出（§2）+ P2 状态系统（§3）+ P3 合体法术（§4）+ 6 条基准裁决（§6）+ 4 条待裁决（§7）。
> **方法论沉淀（§末）**：重实现一阶段打磨密集子系统前，先 harvest 代码注释 + git 修复史成审计清单。

### B-Poison. 毒系统（独立专项，2026-07-06 记账）

> **⚠ reforge 整个系统不存在。** 一阶段 **102 commit** 反复调整过的子系统。不是"漏一两个函数"——从根上没实现。等毒格（B 域新格）立项时,这里是真值清单。
> 互链：**原版行为的逐节行号锚**（4小7大数值表/相生相克脚本机制/毒龙胆 0x61+寿葫芦99豁免/金刚符携带边界,全在 game-mechanics.md 对应节）见 [battle-presentation-audit §3.1](../archive/audits/battle-presentation-audit-2026-07-05.md)（同日）；本节管 reforge 缺口清单,那边管真值锚,两边合用。

**原版架构（≠ status，是独立系统）**：
- 毒 ≠ BattleStatus 字段，是独立的 `{poisonId, script}` 列表，挂在角色/敌人身上。
- **每回合该单位行动后**跑毒脚本、执行完**推进指针**（同种毒逐回合伤害递增）。
- 巫抗（resistanceToSorcery）管**上毒命中**（0x2E `rng(0,9) >= 抗`，原版后期修复语义 `a17482f8`，非 sdlpal buggy `>`）。
- 毒抗（poisonResistance）管**玩家中毒率** + **毒系法术伤害缩放**（`calcMagicDamage` 的 `mult = 10 - poisonRes/resistMult`）。

**一阶段沉淀的真值（reforge 实现时的 oracle）**：
> **以下要点 [`docs/phase1/game-mechanics.md`](../../phase1/game-mechanics.md) §毒系统 已写全（作者亲手考证，带源出处行号）。做毒格时直接读那份，不要从 commit 重摘。** 这里只列要点索引：

- **毒 ≠ status**：独立 `{poisonId, script}` 列表，每回合行动后跑毒脚本 + 推进指针（同种毒逐回合递增）。
- **4 小毒（level 0-2）+ 7 大毒**：七大毒 = 三尸蛊/鹤顶红/孔雀胆/血海棠/断肠草/金蚕蛊（555-560，level 3）+ **无影毒（137，level 173，爆发毒非 DoT，一次性 HP/2+1 上限 1000，谁都解不了）**。
- **相生相克（单向 6 元环）**：鹤顶红→血海棠→断肠草→三尸蛊→孔雀胆→金蚕蛊→（回）鹤顶红。use 毒药 A 解身上被 A 所克的毒 B（以毒攻毒 = 换不是叠）。方向固定、只在主动 use 时触发。
- **三对致死组合（双向对称，同时在身即暴毙）**：① 孔雀胆↔鹤顶红 ② 血海棠↔三尸蛊 ③ 金蚕蛊↔断肠草。对敌投掷凑致死对可秒杀（但 boss 巫抗满不中毒）。
- **下毒途径**：三尸蛊靠巫术（唯一仙术种毒），其余靠投掷道具。两条都受巫抗 gate（`rng(0,9) >= 巫抗`）。
- **解毒（按等级）**：灵血咒/九节菖蒲 解 ≤2 级（只解小毒）；复活类（0x22）解 ≤3 级（连七大毒，但不解无影毒 173）；相克链/毒末尾自解（0x2A/0x2B 按 id）。
- **毒龙胆/九阴散**：先 0x61 查"没中毒 → 0x5F 秒杀自己"；有毒则解 ≤3 级 + 回血。**没中毒吃 = 暴毙**。
- **寿葫芦 level99 伪毒**：HP 回补 563/MP 回补 564，`>=99 continue` 不算中毒。早期 bug（装寿葫芦吃毒龙胆白嫖）已修——level≥99 豁免。
- **巫抗 ≠ 毒抗**：下毒命中看巫抗（0x2E），毒抗管中毒率 + 毒系伤害缩放。
- **金刚符等战斗外用 → 战斗内生效**：见 game-mechanics §"大世界施加的状态如何带入战斗"——护体/中毒/毒抗共用全局数组，开战只读不重置，战后三件套统一清除（只保一场）。reforge 世界态毒/状态**未建模**。
- **盐巴 50% 解毒门**：`gate { chance: 0.5 }`，失败截断后续（reforge `item.ts:42` schema 有 `gate` kind，运行时未核）。

**reforge 现状**：
- schema 有 `applyPoison`/`curePoison`/`gate` kind（`item.ts:39-42` + `skill.ts:35-36`）—— **定义有，运行时零消费**。
- `calcMagicDamage` 的毒系伤害缩放已对齐（`battle-formulas.ts:91` `mult = 10 - poisonRes/resistMult`）—— 公式在，但**毒 DoT / 相生相克 / 解毒 / 跨战斗持久 全无**。
- 战斗审计 b-subsystem §状态系统行标了"中毒：整个系统不存在"，但**没当独立高危项追踪**（2026-07-06 记账纠正）。

**行动**：立项毒格（B 域新格）时，**先读 [`docs/phase1/game-mechanics.md`](../../phase1/game-mechanics.md) §毒系统（已写全真值+源行号）**，再实现。game-mechanics 是作者亲手考证的一手真值，比从 commit 重摘准。

### B-Field. 战场场景抗性（接线缺口，2026-07-06 记账）

> **⚠ reforge 断线**：schema 有 + 公式有，开战时**写死 ZERO 没传**。几行代码的接线，但没人接。

**归属层（原版真值）**：
- 战场数据 `lprgBattleField`（global.h:377）来自 DATA.MKF，每条含 `wScreenWave`（屏波等级）+ `wMagicEffect`（**5 元素加成向量**，这就是"场景自带抗性"的真身）。
- **战场 id 由脚本设定**：opcode `0x4A setBattlefield` 写 `gs.wNumBattleField`，**写在场景的 onEnter 脚本里**（进场景时设，逐场设），后续 `0x07 startBattle` 读这个全局值。
- 归属链：**地图 → 场景 onEnter 脚本 → 0x4A 设战场 id → 0x07 开战读**。不是地图属性、不是怪身上的。

**一阶段实现**：
- `event-system.ts:4029-4032`：0x4A 设 `gs.wNumBattleField = operands[0]`，注释"持久全局，scene enter 脚本逐场设"。
- `battle-system.ts:332`：开战 `battleFields.find(f => f.id === battleFieldId)` 取 field。
- `magic-damage.ts:82`：`state.field.magicEffect` 进 calcMagicDamage 作 fieldEffect 加成。
- `battle.c:1563/1855`：开战设 `wScreenWave = lprgBattleField[...].wScreenWave`，战后恢复战前值。

**reforge 现状**：
- `BattleFieldDef` schema（`enemy.ts:114`）有 `magicEffect: ElementVec` + `screenWave`。
- `calcMagicDamage` 支持 fieldEffect（`battle-formulas.ts:99`）。
- `battle-core.ts:429` **写死 `fieldEffect: { wind:0, ... }`** —— 断线，所有战斗无场景抗性加成。
- `setBattleField` 命令（`script.ts:76`）有，**未核实持久 + 开战读取**。
- `battle-session.ts:207` 注释提了 screenWave，但 fieldEffect 接线未核。

**行动**：开战时把 `BattleFieldDef.magicEffect` 传进 calcMagicDamage 的 fieldEffect（替换 `battle-core.ts:429` 的写死 ZERO）；确认 `setBattleField` 持久到 world + 开战读取。**几行代码，但须先确认战场 id 持久层接对**（一阶段是 gs 全局，reforge 该进 WorldState 还是 BattleSession 入参）。

---

## X · 元层

### X1. bootstrap 接线（异步化丢同帧保证）
> 同 W7/N3。bootstrap 预载同步 Map 是通用模式。

### X2. soundfont await 顺序（可玩门/视频前）
- **分类**: C 旧架构特有 + B 通用教训
- **锚点**: `e341684a`;`bootstrap.ts:195-210/1130-1149`
- **一阶段怎么了**: 慢网 soundfont 占满带宽 → AVI 卡顿/loadScene 黑屏/BGM 中途才响。须可玩门前 await + 进度条标注。
- **reforge 现状**: ⚠️ 懒初始化（首曲才 ensureInit），无 boot 预载门。工程化到真仙剑体量会踩。

### X3. 主循环（rAF 永不补帧 + 结转余量）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `main-loop.ts:60-137`;`c8c640bf`(DM30/31);`9449e935`(DM31 死亡淡出变长)
- **一阶段怎么了**: while 连追 → 卡顿后瞬移/跳帧。accumulator=0 清溢出 → 非 interval 整数倍时每 tick 多等（战斗慢 25%）。
- **可移植知识**: 至多 1 tick/rAF + 丢弃积压 + 结转余量；accumulator `-= interval` 非 `= 0`。
- **reforge 现状**: ⚠️ 单 rAF + dt 可变步长，无 accumulator。当前够用，但战斗 40ms 节拍忠实性会抖。

### X4. 音频四守卫（secure context/RIFF/CC91/skipToFirstNoteOn）
- **分类**: B 通用教训
- **锚点**: `audio-midi.ts:85-132`;`69359ff2`/`b4f9f692`/`0f059a31`/`840a61e9`
- **reforge 现状**: ✅ **全四条已移植**（`bgm.ts` line 132-160）。TimGM6mb 6MB（作者拍板别换大库）。

### X5. SFX 同号去重（sound.c lastSFX）
- **分类**: A 原版真值
- **锚点**: `audio.ts:51-69/237-270`;`47347a59`
- **reforge 现状**: ⚠️ `SfxPlayer` 未核实是否实现同号去重。

### X6. 战斗 BGM 切换序（揭场期静默）
- **分类**: A 原版真值
- **锚点**: `audio.ts:81-94`;`1db72d08`(DM29)
- **reforge 现状**: ⚠️ 揭场期静默未核实是否复刻。

### X7. time-based 状态孤儿（paletteFadeState 死锁）
- **分类**: B 通用教训（最关键）
- **锚点**: `engineering-notes.md:102-104`;`main-loop.ts:78-87`;`f8d473ed`
- **一阶段怎么了**: `paletteFadeState != null` 作全局门吞键，孤儿态死锁（香兰报信）。
- **reforge 现状**: ✅ `fadeFx` 自终止 Promise，自带收尾人，不作全局门。但新增 shake/wave/hold 须延续 Promise 模式。

### X8. RNG 并发取帧缓存击穿（in-flight Promise）
- **分类**: B 通用教训
- **锚点**: `rng-player.ts:90-129`;`01dc92d1`
- **一阶段怎么了**: Promise.all 并发取同一 chunk，缓存 set 在 await 后 → 全 cache-miss O(N²)。
- **可移植知识**: 并发取分片缓存 in-flight Promise（await 前 set），非结果。

### X9. 存档版本化迁移 + 读档归一化
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `save/api.ts:1-96`;`4c9d8bb2`(归一化)
- **reforge 现状**: ✅ 版本化设计（`SAVE_VERSION` + contentVersion + projectId 校验），比一阶段更前置。但运行时字段归一化逻辑未核实。

### SW 预缓存（5 坑）
> 详见 [A-4](#a4-sw-预缓存与生产-cdn5-盲区--no-cache-三件套)。reforge 引擎层无 SW，属壳层。

---

## MG · 迁移器

### MG1. roundtrip 不变式（disasm↔recompile 字节级）
- **分类**: B 通用教训
- **锚点**: `recompile.ts:1-11`;`roundtrip.ts:18-59`;`e205c26d`(43503 指令逐字节一致)
- **reforge 现状**: ✅ migrate 单向翻译，不需 roundtrip。但应保留 fidelity oracle 全量回归门。

### MG2. 原版数据 bug 修在 migrate 翻译期（非运行时层）
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `engineering-notes.md:61-65`(§2.3);`event-system.ts:734-772`(patchGiveItemZeroBugs)
- **一阶段怎么了**: giveItem itemId=0（扬州宝物屋），一阶段修运行时加载层 setGlobalEvents。
- **reforge 现状**: ❌ **缺口**。reforge 无运行时加载层，须在 migrate 翻译期烘焙补丁（messageIndex 锚点补回真 id）。**会重新引入"开箱给空"bug**。

### MG3. 原版 bug 补丁台账（6 条已拍板决策）
- **分类**: B 通用教训
- **锚点**: `engineering-notes.md:53-65`(§2.2)
- **一阶段怎么了**: 6 类已拍板忠实-vs-修复（逃跑抵抗/巫术 0x2E/寿葫芦/玉佛珠/incapacitated 守卫等），先查 sdlpal PR + 稳定锚点定位。
- **reforge 现状**: ❌ 未见系统化台账。建议建补丁表模块。

### MG4. 切片跳转目标表（JUMP_TARGET_OPERAND）
- **分类**: A 原版真值 + C 旧架构特有
- **锚点**: `opcodes.ts:229-283`;`b3b9c8b7`(L29 补 13 个)
- **reforge 现状**: ✅ 已正确承接（全量翻译 + unmigrated 截断，不猜控制流）。

### MG5. MKF/RLE 解码（shared 纯函数 + broken-sprite guard）
- **分类**: B 通用教训
- **锚点**: `shared/mkf.ts:1-43`;`rle.ts:85-126`(parseSpriteChunk 键一致性 + guard)
- **reforge 现状**: ✅ 直接复用 @type-pal/shared。broken-sprite guard（400 上限）+ skipFilePrefix 双模式必须保留。

---

## A · 资产/分发

### A1. IndexedImage = palette index + opaque mask
- **分类**: A 原版真值 + B 通用教训
- **锚点**: `png.ts:1-49`;`sprite.ts:12-42`;`0cbf7fe4`
- **reforge 现状**: ✅ migrate `bake-indexed-rgba.ts` 已实现，opaque 语义正确。D15 运行时全 RGBA。

### A2. palette-as-state UI 色（跨场景不一致）
- **分类**: C 旧架构特有
- **锚点**: `palette-color.ts:1-27`(D15 注释)
- **reforge 现状**: ✅ UI 色 = 固定 RGBA 快照（DIALOG_RGBA/TITLE_RGBA/CURSOR_RGBA），不绑场景 palette。但须逐处核实 menu 组件未误绑 runtime palette。

### A3. 调色板轮转/淡变/水波（D15 后需全屏像素/shader）
- **分类**: C 旧架构特有 + B 通用教训
- **锚点**: `palette-fade.ts:1-326`;`screen-wave.ts:1-71`;`0cbf7fe4`
- **一阶段怎么了**: 原版靠 mutate palette.colors 实现；三类：palette cycle/screen wave/fade（FadeOut 冻屏/SceneFade 量化封顶/FadeToRed approach±8）。
- **reforge 现状**: ❌ **缺口严重**。无 palette-fade/screen-wave。D15 全 RGBA 后须改全屏像素/shader。一阶段数学可复用，作用域从 LUT 改全屏。

### A4. SW 预缓存与生产 CDN（5 盲区 + no-cache 三件套）
- **分类**: B 通用教训 + C 旧架构特有
- **锚点**: `engineering-notes.md:129-175`;`asset-manifest.ts:1-54`;`sw.js`
- **5 盲区**: ① cache.put fire-forget + 排 206（video Range，须生产 nginx 测）；② startPrecache 缓冲 SW 未就绪；③ precacheAll event.waitUntil 保活；④ fetch handler caches.match 跨 cache（SW 重启）；⑤ activate 按版本清（别清所有）。
- **reforge 现状**: ❌ 未见 SW/部署脚本。**工程化到离线时必带**，5 条逐条适用。

### A5. GBK/BIG5 文本解码残留
- **分类**: A 原版真值 + C 旧架构特有
- **锚点**: `gbk.ts:1-96`(decodeGbk + 两 fixup 表)
- **reforge 现状**: ✅ 经 shared 依赖。须确认 migrate 读 MSG 走 decodeGbk 而非裸 GBK。

---

## 跨领域通用教训（B 类，与架构无关）

这五条是**任何架构都会遇**的工程教训，reforge 不能因"新架构"而想当然免疫：

1. **缓存 in-flight Promise 不是结果**（X8 RNG O(N²)）—— 并发取同一资源分片，缓存必须在 await 前 set。
2. **time-based 状态作全局门要列全点火路径 + 兜底收尾**（X7 paletteFadeState 死锁）—— 新增 fade/shake/wave/hold 都适用。
3. **固定步长永不补帧 + 结转余量**（X3 DM31）—— accumulator `-= interval` 非 `= 0`。
4. **修渲染/演出 bug 先 grep 一阶段同坑**（铁律 #6 边界）—— 渲染坐标/+7 错缝/组锚瞬移一阶段全解决过且有注释。
5. **回归测试驱动真实 opcode 序列**（E6 autoScript/E7 touchFar）—— 手设字段跳过 opcode 会绕过 bug 路径，假阳性通过。
