# 切片 1（重定 · 小版）· 鬼界民居 demo

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页按 `archive-record-v1` 保留历史 indoor slice 语义；不授当前产品、runtime、E2E、视觉或 coverage 信用。

## 历史范围

- phase2 archive indoor slice；日期：unknown；source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `ad46f077b823c66c364c61e4fad31d905cc4f65616d640f097d26b69fe941932`；70 行槽 / 4647 bytes。
- 历史语义：Small real-content slice proposal for a one-room ghost-home demo in reforge Canvas 2D: Li Xiaoyao walks/collides and talks to one or two ghosts; scope excludes editor/migration/combat/menu/save/scene switching/complex animation; reuse original tiles/sprites and hand-write scene data; minimal Scene/Map/Entity/Dialogue model; three-layer state, instantiable engine, pure movement/collision, Renderer interface, action-handler registry; build order content→renderer/input→assets→movement→dialogue; browser walk/collision/dialogue acceptance and a few focused tests.

## 原始结论

- 切片 1（重定 · 小版）· 鬼界民居 demo：这是 archive-record，当前文档状态为 historical。全文 70 行、9 个标题；摘要/首段为「> 取代旧版 [spec.md](spec.md)（WebGL/MMO/通用房间，已暂缓存档）。这是第二阶段第一刀的**当前** spec。」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 标题锚点：1:切片 1（重定 · 小版）· 鬼界民居 demo; 7:0. 一句话; 11:1. 范围; 17:2. 内容来源（不画新图 / 不做新美术 / 不碰编辑器）; 26:3. demo 台词（我定，demo 级别）; 38:4. 最小数据模型（P0 schema 的切片子集，够用即可）; 49:5. 架构红线（这刀的真正目的：在真内容上证明干净架构）; 57:6. 构建顺序（按这尺寸，不是 21 任务）；原始链接、代码和状态词在 quote 保全。

## 当前有效性

historical。Do not cite this archive as current canonical truth or runtime proof; re-enable only through a current slice spec/code review with fixed source asset and scope decisions.
- 历史冲突/未决：
- The document says it replaces the old WebGL/MMO/general-room spec and calls itself current, while the live registry/review classify it as historical archive-record. Its claims require current decisions/code review before citation.
- Source asset/room selection is deferred to build time; the original many-room fixed image is to be cropped to one room, so exact asset identity is not fixed here.
- The “browser can really play” acceptance is a proposal, not evidence from this readonly read.

## 继任文档

- Current phase2 decisions and any newly reviewed canonical slice-1 content/reforge spec; the old spec.md is explicitly replaced in the text but remains archive-only.。
- 当前事实需从继任规范、代码和新 review 读取。

## 原文保全

固定源 SHA `ad46f077b823c66c364c61e4fad31d905cc4f65616d640f097d26b69fe941932`；下方 quote 可逆回原文。
<!-- original-source-quote:start -->
> # 切片 1（重定 · 小版）· 鬼界民居 demo
>
> > 取代旧版 [spec.md](spec.md)（WebGL/MMO/通用房间，已暂缓存档）。这是第二阶段第一刀的**当前** spec。
> > 定位：**最小可玩 demo**——别过度认真。目的 = 让新引擎 reforge 第一次跑起来，用真实内容当标尺。
> > 依据：[decisions D1/D2/D3/D10](../../../decisions.md)；内容背景：[DLC-01 鬼界支线](../../../../lore/dlc-ideas.md)。
>
> ## 0. 一句话
>
> 新引擎 reforge（Canvas 2D）里：李逍遥在一间**鬼界民居**里能走、撞墙、走到一只游魂面前按键、鬼吐几句道听途说的碎片（埋南盗侠 / 女飞贼伏笔）。一个房间、1–2 只鬼、几句话，浏览器里真能玩到。
>
> ## 1. 范围
>
> **做**：加载一个手写场景 → Canvas 2D 渲染瓦片 + 精灵 → 键盘走路 → 撞墙（碰撞）→ 朝向 NPC 按键触发分页对话。
>
> **不做**（D2 边界）：编辑器、迁移器、战斗、菜单、存档、复杂动画、场景切换、会动的引路 NPC（这些是第二刀起）。
>
> ## 2. 内容来源（不画新图 / 不做新美术 / 不碰编辑器）
>
> - **借一间原版破败民居**（黑水镇民居，或风格相近的）当鬼界民居。
> - ⚠ 原版把**很多间民居塞进一张固定尺寸大图**省资源。我们只**裁出完整一间**：把那一间的瓦片矩形（w×h）+ 碰撞复制进 reforge 的一张**小图**。
>   - 正好实地验证 [D3 地图尺寸可变](../../../decisions.md)：原版被定长 64×128 焊死才要塞房；新引擎一张图就是这一间的真实小尺寸，零浪费。
> - **复用原版 tile 图 + 一只现成鬼精灵 + 李逍遥原版精灵**（解码成 RGBA 给 Canvas 画）。
> - 落地为 reforge 内容格式的**手写场景数据**（tile 下标二维数组 + 碰撞 + 实体位置 + 对话），不经编辑器。
> - 具体哪张原版图 / 哪间房，build 时定（grep 提取数据里的破败民居场景）。
>
> ## 3. demo 台词（我定，demo 级别）
>
> 一只游魂，分页对话（验证翻页 + 说话人名）：
>
> 1. 游魂（飘忽）：「……活人气味……这地方，可不该有活人啊……」
> 2. 「南边……来过个使刀的侠客……听说，是个仗义的……」
> 3. 「咳，名字？谁还记得名字。鬼啊，只记得自己怎么死的。」
> 4. 「你问那侠客？……我也是听旁的鬼念叨来的……做不得准……」
> 5. （李逍遥心头一动：南边……使刀的侠客……）
>
> > 作用：演示分页对话；守「鬼只道听途说」规矩留碎片；埋南盗侠（= 李三思）→ 将来女飞贼那颗扣子。台词随便改，魂是你的。
>
> ## 4. 最小数据模型（P0 schema 的切片子集，够用即可）
>
> ```
> Scene    { id, entry:{x,y,facing}, map, entities[], dialogues[] }
> Map      { w, h, tiles:Int16[w*h], collision:Uint8[w*h](0 走 / 1 挡), tileset:ref }
> Entity   { id, x, y, sprite:ref, collide?:bool, interact?:dialogueId }
> Dialogue { id, lines:[{ speaker?, text }] }   // text 走 text-id 留 i18n 口(D9)，demo 先直存也行
> ```
>
> 稳定 id，不用下标。
>
> ## 5. 架构红线（这刀的真正目的：在真内容上证明干净架构）
>
> - **三层态**雏形：L2 = 场景静态数据(只读) / L1 = 队伍位置等世界态(内存，不存盘) / L3 = 进场合成的运行态(出场即扔)。
> - **可实例化、零模块单例**：引擎是 `new` 出来的对象，不是一堆 import 的全局。
> - **移动 = 意图 → 纯函数碰撞判定 → 结果**：不直接 mutate 坐标；判定器是纯函数（可单测）。
> - **渲染走 `Renderer` 接口**，本刀实现 = Canvas 2D（D10）；后处理插入点可留 identity，demo 可后置。
> - **触发 / 对话走小注册表**（action handler），不写死 if-else 链。
>
> ## 6. 构建顺序（按这尺寸，不是 21 任务）
>
> 1. `@type-pal/content`：上面的类型 + 手写那一间鬼界民居场景数据（裁原版民居）。
> 2. `@type-pal/reforge`：Canvas2D `Renderer`（画 tilemap + sprite）、主循环（rAF 固定步长）、键盘输入。
> 3. 资产加载：复用原版 tile / 精灵 PNG → 解码 RGBA。
> 4. 移动：intent → 纯函数 `resolveMove`(碰撞层) → apply。（单测这块）
> 5. 对话 + 触发：朝向鬼按键 → 跑它的分页对话框。
> 6. 串起来：load → render → 走 → 撞 → 谈。**完成 = 浏览器里跑通**。
>
> ## 7. 验收 / 测试（proportionate）
>
> - 验收：浏览器里走一圈、撞墙、和鬼对完话翻完页。
> - 测试：纯函数 `resolveMove` / 碰撞 + 对话翻页各几个单测即可；渲染 / 输入手验。demo 不堆测试。
<!-- original-source-quote:end -->
