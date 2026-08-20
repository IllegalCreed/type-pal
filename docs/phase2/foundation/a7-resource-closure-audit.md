# A7/R7 工程资源闭包与稳定资源注册表审计

> **现行结论（2026-08-20）**：本文件主体是 A7 各批次的历史审计。ARCH-CURRENT-ONLY-1 已将当前
> content16 工程收口为 catalog-only：PAL 1,935 条记录，effect sprite 56 文件 / 652,870 B / 922 帧；
> editor/reforge 不再读取 extracted 或 `assets.legacy`。以下“仍剩 effect-sprite/image”等结论只描述
> 旧审计时间点，不再是当前产品事实。
>
> 审计日期: 2026-07-16；最近更新:2026-07-31（A7-3W、A7-3B 均已 done；A7-4 候选版本顺延至 v11）
> 范围: `packages/content`、`packages/reforge`、`packages/editor`、`packages/migrate`、`projects/pal` 的资源声明、加载、克隆、保存与迁移链。
> 前置: [第二阶段开工铁律](../READ-FIRST.md)、[项目生命周期设计](../editor/project-lifecycle-design.md)、[路线图 §10](../roadmap.md)、[既有资产/迁移八单元审计](am-asset-migrate-audit.md)。
> 落地状态: A7-0 音乐/MIDI soundfont、A7-1 SFX、A7-2 四类静态图/engine chrome、A7-3 视频/完整帧动画
> 已完成；A7-3T 瓦片集、A7-3W 大世界精灵与 A7-3B 战斗精灵均已完成三方审查和用户验收。
> 本文件同时保留实现前基线和 A7 总体剩余缺口。

## 1. 结论

A7 总体**还没有形成全资源闭包**。当前已经闭合音乐/MIDI soundfont、SFX、视频/完整帧动画以及
portrait/face/item-icon/battle-background 四类静态图；默认标题、字形、光标和游戏 UI 已进入引擎 chrome。
A7-3T、A7-3W 与 A7-3B 已分别把 `tileset`、`sprite`、`battle-sprite` 收敛为 catalog-only 单链并完成审查。
当前仍未迁移的 legacy 条目为 `effect-sprite` 与 generic
`image` 两项；catalog-only 总门禁和 A7-4 的下一未占用 epoch（当前候选 contentVersion 11）
收口也尚未完成。
因此不能据此宣称整个工程已断开全部外部资源依赖。

问题由四层共同造成:

1. `manifest.assets` 声明的是目录约定,不是“稳定资源 id -> 明确文件”的注册表。
2. 两个剩余 legacy 条目仍保留数字/目录约定，尚未进入单一 catalog 链。
3. 克隆虽然已退出 `data/baked`，仍按 extracted 清单复制未迁 legacy，尚未完全从 catalog 派生闭包。
4. 迁移器可核验全 catalog 文件，保存/导出/显式“检查工程”的统一重哈希门禁仍待 A7-4 接线。

终态必须只有一条链:

```text
内容中的 AssetId
  -> 工程 assets/index.json
  -> 经过校验的工程相对路径
  -> AssetResolver
  -> 当前工程的 FileSource
  -> 文件字节 / 受管理的 URL
```

同一资源族不得长期保留“AssetId 注册表”和“数字号/目录/文件名推断”两套解析。迁移可以分资源族执行,
但每迁完一族就必须同时删除该族旧字段、旧加载器分支和旧编辑器回退。

## 2. 已拍板边界

### 2.1 工程自包含的含义

[项目生命周期设计](../editor/project-lifecycle-design.md) 已明确:一个工程文件夹包含该工程拥有的全部内容与素材,
克隆完成后项目内容零服务器资源依赖。默认 UI、字形、光标和标题属于引擎运行壳；A8 独立发行再把
“引擎壳 + 工程”组合成玩家包。

因此本轮采用以下边界:

- **工程资源**:地图用瓦片、精灵、战斗图像、头像、物品图标、RNG、视频、音乐、音效、MIDI 音色库和
  工程标准颜色表等项目内容文件。
- **应用壳 / engine chrome**:编辑器图标/样式、引擎 JavaScript、MIDI worklet、默认标题、默认 UI、
  默认字形与对话光标。它们随 bundler 产物分发，不进入工程资产注册表。
- [project-design.md](../editor/project-design.md) 的早期边界是现行真值；生命周期文档中“全部资源”的
  用语现统一解释为“全部项目资源”，不覆盖 engine chrome 归属。
- “调色板”概念不得回到内容 schema 或编辑器。旧 RLE 解码仍需要的唯一颜色查找文件只能作为
  `color-table` 运行时角色存在,不允许出现可选择的 `paletteId`。

### 2.2 版权与可再生产物

- `assets/migrated/**` 是从用户本地合法原始数据生成的开发期资产,由迁移器确定性维护,不默认提交受保护字节。
- `assets/authored/**` 是作者上传、获授权或 Codex 生成的替代资源,使用内容哈希路径,迁移器不得覆盖或删除。
- 资源记录必须标记来源类别,为 R8 替代清单、授权/生成记录和发布门禁提供依据。
- A7 只解决工程闭包和引用真值,不等于 R8 已完成版权替换。

## 3. A7-0 前历史证据(保留作回归基线)

### 3.1 PAL 工程仍指向外部目录

`projects/pal/manifest.json` 的 `contentVersion` 仍为 2,资源根如下:

| 字段 | 当前值 | 问题 |
|---|---|---|
| `assets.root` | `/extracted/data` | 工程外绝对路径 |
| `assets.sounds` | `/extracted/sounds` | 工程外绝对路径 + 数字号猜 `<id>.wav` |
| `assets.music` | `/extracted/music` | 工程外绝对路径 + 数字号猜 `<NNN>.mid` |
| `assets.portraits` | `/baked/portraits` | 工程外绝对路径 + 数字号猜文件 |
| `assets.faces` | `/baked/ui/face` | 工程外绝对路径 |
| `assets.itemIcons` | `/baked/ui/items` | 工程外绝对路径 |

`packages/content/src/character.ts:59-84` 把上述目录约定直接写进 `LoadedManifest`；
`packages/reforge/src/file-source.ts:4-18` 又明确允许 `/` 开头绕过工程根。这两处共同让外部依赖成为合法路径。

### 3.2 “复制全部”不等于“按引用闭包复制”

当前克隆读取仓库级 `asset-manifest.json` 与 `baked-manifest.json`:

| 来源 | 文件数 | 字节数 |
|---|---:|---:|
| `data/extracted/asset-manifest.json` | 2,905 | 207,702,409 |
| `data/baked/baked-manifest.json` | 327 | 1,041,900 |
| 合计 | 3,232 | 208,744,309 |

`packages/editor/src/core/clone.ts:37-38` 读取这两张仓库清单,
`packages/editor/src/core/seed.ts:173-223` 无条件复制全部文件。它存在三个问题:

- 文件是否被当前工程引用没有参与枚举,多余资源不能被识别。
- 复制后运行时裸 `fetch` 仍可能继续读服务器同名路径。
- 注册表缺失时,无法证明某个引用究竟应落到哪个已复制文件。

### 3.3 `music.json` 没有承担资源索引职责

`projects/pal/content/music.json` 有 86 条记录,全部只有数字 `id`,别名数量为 0。类型注释也明确说引擎不读该表,
而是把编号补成三位文件名(`packages/content/src/index.ts:18-26`)。迁移器只是
`midi.map(id => ({ id }))`(`packages/migrate/src/pal-derived-content.ts:170-172`)。

实现前 PAL 音乐引用扫描；权威迁移器后来证明旧语义站点总数为 1,227，其中 1,174 条最终成为
`playMusic`，53 条数字 0 最终成为 `stopMusic`：

| 引用 | 数量 |
|---|---:|
| 旧 `playMusic` 语义站点 | 1,227 |
| 最终 `playMusic` | 1,174 |
| 最终 `stopMusic` | 53 |
| 场景 `musicId` | 36 |
| 场景 `battleMusicId` | 80 |
| `startBattle.musicId` | 31 |
| 正数音乐号去重 | 71 |

提取清单有 86 个 MIDI(1..87,缺 29)和 8 个 CD OGG 文件；现有正数引用均能在 MIDI 清单找到。
但运行时另有普通战斗曲 37、首领/胜利曲 2/3 等硬编码(`packages/reforge/src/main.ts:1370-1373,1628-1629`),
仍不属于工程数据。`0` 同时承担“资源号”和“停曲哨兵”,也不是干净内容模型。

结论:`music.json` 应退役,音乐记录进入统一资产注册表；引用使用稳定字符串 AssetId,停曲使用显式语义。

### 3.4 资源双轨与隐式路径

| 资源族 | 当前登记情况 | 隐式/双轨问题 |
|---|---|---|
| 大世界精灵 | 580 个 `SpriteDef`,580 个都未写 path | `spriteNum -> <root>/<sprites>/<n>.rle`;上传资源又走 path |
| 瓦片集 | 223 条都有 path | path 有时工程根相对,有时 asset root 相对 |
| 战斗背景 | 58 条,全部无显式 bg | 默认猜 `battle/bg/<id>.png` |
| 敌人/角色战斗精灵 | 数字 sprite 号为主 | 数字约定 + 可选上传 path 双轨 |
| 音乐 | 86 条数字壳记录 | 数字补零猜 MIDI 文件名 |
| 音效 | 脚本/角色/敌人/技能保存数字号 | 数字猜 `<id>.wav` |
| 头像/图标 | 内容保存数字/chunk | 目录 + 数字猜 PNG 文件名 |
| RNG/视频/字形/UI | 无统一内容登记 | 多处绝对路径或应用根路径直取 |

`packages/reforge/src/assets.ts:102-144` 是精灵/战斗精灵双轨的集中证据；同类模式还散落在多个加载器。

> 上表是 A7-0 前历史证据，不代表当前工作态。A7-3T done 产物已有 223 个
> `TilesetDef.asset` 和 223 个 `kind=tileset` catalog record；真实 source mapNum 集合为
> `1..225` 且仅缺 `168/171`，不是连续 `1..223`。A7-3W 与 A7-3B 的当前证据分别见 §3.12/§3.13。

### 3.5 绕过 `FileSource` 的主要读取点

| 位置 | 当前行为 | 应收敛到 |
|---|---|---|
| `packages/reforge/src/assets.ts:29-62` | `source` 可缺省并裸 `fetch` | `AssetResolver` 必须持有 `FileSource` |
| `packages/reforge/src/audio/bgm.ts:32,60-66` | base URL + 数字补零 + `fetch` | 音乐 AssetId -> 显式文件字节 |
| `packages/reforge/src/audio/bgm.ts:85-98` | worklet 与 soundfont 都从应用根取 | worklet 留应用壳；soundfont 走工程角色 |
| `packages/reforge/src/audio/sfx.ts:17,62-70` | base URL + `<id>.wav` | 音效 AssetId |
| `packages/reforge/src/rng-player.ts:61-62` | 固定 `/extracted/data/animation` | RNG AssetId |
| `packages/reforge/src/text/glyph.ts:40-42` | 固定 `/extracted/data/font` | 字形表工程角色 |
| `packages/reforge/src/dialog/dialog-assets.ts:47-68` | 固定提取根/头像根 | 对话 UI/头像 AssetId |
| `packages/reforge/src/menu/menu-box.ts:352,382-383` | 裸 fetch + `/ui` 回退 | 工程 UI 主题,缺失即明确报错 |
| `packages/reforge/src/main.ts:229,249` | 战斗索引/头像表裸 fetch | 注册表或内容 JSON |
| `packages/reforge/src/main.ts:1513` | 战斗按钮固定 `/ui` | 工程 UI 主题 |
| `packages/reforge/src/main.ts:1743-1745` | 视频固定 `/extracted/videos` | 视频 AssetId |
| `packages/editor/src/main.tsx:47-51` | dev 音乐表绕过 source | 与本地工程同一加载链 |
| `packages/editor/src/ui/CutsceneTab.tsx:38,58` | RNG/视频固定服务器路径 | 复用 AssetResolver |
| `packages/editor/src/ui/BattleFieldPicker.tsx:13` | 战场表预览裸 fetch | 复用工程 source/resolver |
| `packages/editor/src/ui/ItemTab.tsx` 物品图标 fallback | 固定 `/baked/ui/items` | 后续 item-icon AssetId |

`?e2e-load=` 等明确的开发/测试输入 URL 不属于游戏资源,可继续作为受控调试入口,但不得进入正式工程引用。

### 3.6 现有闭包校验缺口

- `packages/content/src/validate-refs.ts` 校验内容对象 id,注释明确没有物理资源文件校验。
- `FileSource` 只抽象了读取位置,没有禁止绝对路径、URL scheme、`..`、反斜杠和非规范路径。
- `packages/reforge/src/fsa-source.ts:50-51` 每次 `urlFor` 都创建新 object URL；没有缓存、统一释放或测试 revoke。
- 当前资源缺失常被 `catch`、警告、静默黑图/静音吞掉,无法作为发布门禁。

### 3.7 A7-0 落地后的音乐族证据

- PAL、demo、e2e-own 均已是 `contentVersion: 3`；manifest 指向 `assets/index.json`，音乐族不在
  `assets.legacy.families`。
- PAL catalog 有 86 个 `music` 与 1 个 `soundfont` 记录。87 个文件逐项重读后 bytes/SHA-256 全匹配，
  总计 6,737,214 字节。
- 最终脚本有 1,174 个 `playMusic` 与 53 个 `stopMusic`；场景有 36 个 `music`、81 个
  `battleMusic`，31 个 `startBattle` 显式携 `music`。动态场景覆盖旁路修复后，s106 的战斗曲 37 被正确
  烘成 `music.pal.037`，因此最终战斗槽比实现前静态表 80 多 1。
- 写前闭包收集 1,327 条资产引用，缺失和 kind mismatch 为 0；12 个未引用曲目保留为 warning，不能用
  “未被当前脚本引用”冒充文件错误或擅自删除。
- `content/music.json`、最终产物中的 `musicId/battleMusicId`、内部 `overrideSceneBattle` 标记均为 0。
  BGM 与编辑器试听都只经 AssetResolver/FileSource，soundfont 不再从应用根读取。

### 3.8 A7-3 落地后的视频/帧动画证据

- PAL catalog 新增 6 个 `video`、12 个 `frame-animation` 与唯一 `visual.standardColorTable` 角色；12 段
  TPFS 共 1,464 帧、7,960,282 B（zlib level 9 正式产物；选型原型为 8,271,766 B）。视频约 20 MB，
  原 MP4 字节原样进入工程。
- 20 条旧 RNG 站点全部成为 `playFrameAnimation.asset`；9 个动画有引用、3 个未引用。未引用仅告警，
  缺 AssetId 或 kind mismatch 阻断。
- 视频引用闭包覆盖三类作者入口：启动 001/002 的 manifest 角色、入口剧情 003 的
  `entryPoints[].introVideo`、结尾 004/005/006 的 `quitToTitle.videos[]`。同一脚本位置拆成多个动画段时，
  引用索引按作者 site 合并并记录 occurrences，避免把一个 RNG 误报成多个独立引用。
- Reforge 删除旧 `rng-player/rng-presentation`，视频与帧动画都只经工程 `AssetResolver/FileSource`；editor
  也使用同一 catalog、未保存 blob 覆盖和 typed 引用表。
- 断开 `data/extracted/videos` 与 `data/extracted/data/animation` 后，HTTP 工程仍能预览视频和 410 帧动画；
  `s066` 真机脚本可全段播放、跳过并清理。FSA 字节读取/写回由同一 FileSource 与 project-io 测试覆盖，
  真实目录句柄烟测留 review 再独立复验。
- MG2 dry-run 为 `writes=0 deletes=0 conflicts=0`；作者替换保持 AssetId、转 authored/hash 路径，不被迁移器覆盖。
- 当前 PAL 全量写前闭包为 **1,354 条资产引用、15 条未引用 warning、0 条缺失/kind 错误**；其中视频入口覆盖
  manifest 角色、入口点 introVideo 和 quitToTitle 视频序列，帧动画分段按作者 site 归并计数。
- A7 总体仍未完成：A7-2 已接手字形/UI/头像/图标，精灵/瓦片等 legacy family 与总门禁仍按 A7-4
  继续收口。
- 最终迁移 dry-run 为 `writes=0 deletes=0 conflicts=0`。作者接管同一 AssetId 的记录与 migrated 兄弟条目
  并行更新已有专测，二进制保持在 MG2 JSON baseline 外。

实际文件/字节/引用与验证清单见
[`a7-0-music-resource-closure-report.md`](a7-0-music-resource-closure-report.md)。

### 3.9 A7-1 落地后的 SFX 证据

- PAL catalog 登记 363 个非空 `sound`，共 18,110,864 B，全部带 SHA-256；142 个空 chunk 不生成假资产，
  唯一误引空槽 122 的命令已在上游迁移边界删除。
- 脚本、角色、敌人、技能、召唤与四个战斗提示音角色全部使用稳定 AssetId；技能 377 的 174 与物品 151
  使用链的 45 已从迁移丢失中恢复，25 个负 enemy magic 被拆成正 AssetId 与显式抑制标记。
- 权威闭包为 1,666 条 sound reference edges、项目总引用 3,020、referenced 328、unused 35、warning 50，
  missing 与 kind mismatch 均为 0；MG2 双跑为 `writes=0 deletes=0 conflicts=0`。
- Reforge 的大世界和战斗 SFX 只经 AssetResolver/FileSource 读取；两级 readiness 屏障上界为 battleBase 51、
  entry/start base 26、单动作 2、活跃毒增量 0、六人作者包络 63≤64，`violations=[]`、`leased=0`。
- 编辑器音效工作台与共享 SoundPicker 支持导入、替换、改名、试听、选择、引用保护删除、撤销、保存重开和
  旧 v2/v3 sound-family 一次性升级；`legacy.sounds`、sound family、数字文件名推断和运行时提示音字面量已退役。
- Codex、Opus、GLM 三方最终均签 `accept`；Opus 独立复验冷缓存挂帧、OPFS 真句柄读写与 900×720 窄视口，
  用户于 2026-07-18 验收收口。完整实现、返工与测试矩阵见
  [`A7-1 任务卡`](../../ops/tasks/A7-1-sfx-asset-closure.md)。

### 3.10 A7-2 完成后的静态图与 engine chrome 证据

- PAL catalog 从 469 增至 **848** 条；新增四类静态图 **379** 条、5,464,181 B：portrait
  88 / 768,841 B，face 6 / 10,392 B，item-icon 233 / 262,667 B，battle-background
  52 / 4,422,281 B。
- typed 静态图引用精确为 **2,656**：portrait 2,365、face 6、item-icon 233、battle-background 52。
  其中 84 张 portrait 被引用，50/68/72/89 四张只报 unused warning；missing 与 kind mismatch 均为 0。
- 对话、持久换形象、角色头像、物品与战场字段只保存 AssetId；Reforge 和编辑器按 expected kind 经
  `AssetResolver/FileSource` 读取。旧 v3 与旧存档只在打开/读档边界一次升级，runtime 不接受数字或路径双轨。
- battle background 保持 320×200 索引 PNG；作者真彩图在编辑器导入边界按工程标准颜色表确定性量化，
  召唤期间的低 nibble shift 语义继续由同一索引数据驱动。
- 默认标题、Unifont、对话光标和 85 个 UI slot 由 `packages/reforge/src/engine-chrome/registry.ts` 统一
  交给 bundler（UI/标题/许可与来源记录位于其 `assets/**`）。Reforge standalone 与 editor play 共用
  bundler URL；engine chrome 不进项目 catalog。
- `data/baked` 与 `baked-manifest.json` 已无消费者，PAL 资源使用
  `pnpm --filter @type-pal/migrate run migrate:content -- --write` 物化。正式迁移后二跑为
  `writes=0 deletes=0 conflicts=0`。
- A7-2 当时的全 catalog 物理复核为 848 文件记录、59,704,628 B，missing file、bytes mismatch 与 hash
  mismatch 均为 0；当时 clone/seed 仍由 extracted 承载五个 legacy 条目。A7-3T 已从该集合移除 tileset，
  A7-3W 又移除 sprite，A7-3B 正式落地后再移除 battle-sprite；当前余 `effect-sprite/image` 两项，
  统一保存/导出闭包总门禁仍留 A7-4。

完整实现与验证矩阵见
[`A7-2 结果报告`](a7-2-static-images-engine-chrome-report.md) 和
[`A7-2 任务卡`](../../ops/tasks/A7-2-static-images-engine-chrome.md)。

### 3.11 A7-3T 瓦片集闭包实现证据（2026-07-19，done）

- `TilesetDef` 已收敛为 `{id,name,category,asset}`；地图和组合模板只引用定义 id，定义只引用 AssetId，
  catalog 的 `path` 是唯一物理地址。canonical runtime/editor 不再接受 `TilesetDef.path`、
  `legacy.tilesets` 或按编号拼路径。
- PAL 的真实集合是 `mapNum 1..225` 去掉 `168/171`，不是连续 `1..223`：223 个 definitions、223 个
  `kind=tileset` records、223 个 map references。物化 gzip 字节共 **6,501,041 B**，严格有效帧共
  **67,715**；catalog 路径为 `assets/migrated/tilesets/NNN.rle`，逐文件 bytes/SHA 与源 gzip 一致。
- PAL catalog 因本切片从 848 增至 **1,071** 条；tileset 已退出 PAL/demo/e2e-own/空白种子的 legacy
  families。示例与空白种子的标准色表也补齐为显式角色与 catalog 文件，预览不再依赖旧 palette 目录。
- RLE parser 只允许真实 PAL chunk 的末尾零 sentinel，同时兼容作者编码器的无 sentinel 形态；中间零、
  坏 offset、损坏 gzip 和非 sprite chunk 均 fail-loud。canonical 输出始终保留 gzip 头。
- clone、首次 Save As、普通保存和 ZIP 对 catalog `.rle` 逐字节处理；二进制签名包含完整 SHA-256，写盘顺序
  固定为二进制 → old/new 并集 catalog → 内容 JSON → manifest（最后引用表）→ 目标 catalog 收缩 →
  旧文件清理，
  并覆盖新增与删除方向各个 close 中断的可重试回归。
  同路径同长度替换不再被长度快照漏掉。
- 中断保存复用原快照作为实际磁盘恢复日志：保留未触及条目、逐次记录成功 close/remove；撤销新导入后
  重存可删除已写但未登记成功的孤儿二进制，多文件删除中断后撤销也能恢复尚未触及与已删除的文件。
- 编辑器导入/改名/替换/删除、共享 AssetId 影响、缩帧阻断、引用跳转与 undo/redo 使用同一可逆命令链；
  瓦片工作台、地图和组合预览均以 AssetRecord SHA 失效缓存。
- 最终迁移 dry-run 为 `writes=0 deletes=0 conflicts=0`；报告冻结
  `tilesets=223 bytes=6501041 frames=67715`。真实 HTTP 检查确认 `.rle` 无 `Content-Encoding`，声明
  `application/vnd.type-pal.rle` 与 `Cache-Control: no-transform`；临时断开 extracted tileset 请求后，
  PAL 编辑器和 Reforge 仍能读取工程内文件。

实现与完整验证矩阵见
[`A7-3T 任务卡`](../../ops/tasks/A7-3T-tileset-asset-closure.md)。A7-3T 已完成三方 `accept` 与用户验收；
这里只表示 tileset 单族闭包完成；当时仍有四个 legacy family，后续 A7-3W/A7-3B 的进展见 §3.12/§3.13。

### 3.12 A7-3W 大世界精灵闭包实现证据（2026-07-19，done）

- `SpriteDef` 已收敛为 `{id,asset,label,layout,poses?}`；角色、实体和脚本引用定义 id，定义再指向
  AssetId。21 条共享关系被保留，定义标签与资产标签可独立修改。
- PAL 迁移登记 `sprite.pal.001..636` 并逐字节物化到 `assets/migrated/sprites/NNN.rle`。
  636 个 gzip 文件共 **1,332,725 B / 4,133 有效帧**；tuple digest 为
  `c92c14b5dac5abc39006d94fdefaa699eb0bffddb925447ceb4070c32bb45d03`。
  580 个定义引用 559 个唯一二进制，21 个定义共享边保持，精确 77 个未引用记录只报 warning。
- 606 个源通过 canonical 严格解析；30 个历史坏尾源只在 `legacy-migrated` profile 下通过，逐帧结果与
  宽松原版真值一致。相同字节在 authored/generated 的 canonical profile 下 fail-loud；运行时代码不含
  30 个 AssetId 特判。
- 13 条历史 directional layout 债保留原声明；运行时和编辑器所有取帧入口均传实际解码帧数，真实帧数
  冻结为 `627:4, 361:5, 242:5, 273:4, 394:2, 385:2, 379:5, 550:2, 541:1,
  630:4, 631:7, 632:7, 236:1`，越界候选统一回第 0 帧。
- `setFollowers` 与存档 followers 已改为 SpriteDef.id；PAL s102 精确迁为 `[]` 和 `["sprite-82"]`。
  旧本地 v3/旧存档只在输入边界确定性映射，数字多义时拒绝，运行时没有数字旁路。
- clone、FSA、Save As、ZIP、pending blob 和 MG2 复用 A7-3T 的完整 SHA 与两阶段 catalog 协议；
  authored 同 AssetId 接管后保留作者字节、清理旧源，二次打开/迁移均零计划。
- 正式迁移写后 dry-run 为 `writes=0 deletes=0 conflicts=0`；A7-3W 完成当时 PAL manifest 已移除
  `sprite`，仍有 `battle-sprite/effect-sprite/image`。A7-3B 正式落地后移除了 `battle-sprite`。受保护的
  `projects/pal/assets/migrated/**` 按
  仓库策略由本地提取源确定性重建，不提交原版二进制副本。

三方 `review -> done` 签字和用户验收见
[`A7-3W 任务卡`](../../ops/tasks/A7-3W-world-sprite-asset-closure.md)。A7-3W 单族已 done，不能据此宣称
A7/R7 总体完成。

### 3.13 A7-3B 战斗精灵闭包实现证据（2026-07-21，done）

- `BattleSpriteDef` 已收敛为 `{id,label,asset,profile}`；Actor、Enemy、EquipEffect、summon、trance、持久
  appearance 与脚本只引用定义 id。player/enemy 同号由 AssetId channel 隔离，player 0 保持合法。
- PAL 逐字节物化 19 player + 153 enemy = **172 files / 900,973 gzip B / 2,313,598 raw B /
  775 有效帧**。19 player + 147 enemy canonical strict，6 个历史坏尾只在 `legacy-migrated` 通过；
  combined tuple digest 为 `ecbec106c6540de74adeec799bad19a22e7198272245c98b130522b0ac37a685`。
- 生成 **172 catalog records / 171 definitions / 179 direct refs / 171 used / 5 shared / 1 unused**；
  enemy 98 是唯一未引用 warning。PAL catalog 达 **1,879 records / 68,439,367 B**，manifest legacy 只剩
  `effect-sprite/image`。
- 7 条装备 row 1 在 migrate 上游翻译；3 appearance、1 trance、9 summon 全改语义 id。
  玩家 active appearance 统一按 base -> persistent -> equipment slot order -> trance 派生，图像、动作 ABI 与
  effect base 同读一个定义。梦蛇使用一阶段 6×40ms 色移 + 72×16ms 过渡，死亡/复活保持，战后清理。
- 战前 readiness 覆盖 effective/cooperative skills、装备授技 summon 以及敌 transform/summon 递归闭包；
  session 内同步换已准备精灵，不再有 fire-and-forget 迟到写。渲染按 Y 升序、equal-Y X 降序。
- 编辑器提供定义/资产双视图、逐帧/命名动作、typed 引用深链、导入/分配/替换/独立删除、共享/no-shrink、
  undo/redo 与 pending blob。local-v3 journal、save v4、HTTP/FSA/Save As/clone/ZIP 均走完整 SHA 和两阶段
  catalog 协议，mixed/ambiguous/tamper/interruption fail-closed。
- PAL 原版 battle RLE 仍按仓库政策由本地提取源确定性重建且不入 git；demo/e2e-own 的 generated placeholder
  自包含提交。迁移二跑为 `writes=0 deletes=0 conflicts=0`，正式路径的 number/path/godId、`g+10`、
  `spriteNum*2` 与旧 loader 调用均归零。

本节只登记实现和 Codex 自验证；Kimi/GLM `accept` 仍以
[`A7-3B 任务卡`](../../ops/tasks/A7-3B-battle-sprite-asset-closure.md) 为准。正式签字前不标 done，
A7/R7 总体也仍有 effect-sprite、generic image 与 A7-4。

## 4. 终态数据契约

### 4.1 单一物理资产注册表

工程文件 `assets/index.json` 由 `manifest.assets.catalog` 唯一指向，现行公共契约为:

```ts
export type AssetId = string

export type AssetKind =
  | 'music'
  | 'sound'
  | 'soundfont'
  | 'tileset'
  | 'sprite'
  | 'battle-sprite'
  | 'effect-sprite'
  | 'portrait'
  | 'face'
  | 'item-icon'
  | 'battle-background'
  | 'video'
  | 'frame-animation'
  | 'color-table'

export interface AssetRecordV1 {
  kind: AssetKind
  path: string                 // 只允许工程根相对路径
  mediaType: string
  bytes: number
  sha256: string
  label?: string
  origin: {
    kind: 'legacy-migrated' | 'authored' | 'generated' | 'licensed'
    ref?: string               // 授权/生成/替换记录锚点
  }
}

export interface AssetCatalogV1 {
  version: 1
  assets: Record<AssetId, AssetRecordV1>
}
```

选择 `Record<AssetId, AssetRecord>` 而不是数组,是为了让稳定 id 成为合并键、引用键与编辑器选择键；记录内不重复 id。
AssetId 是不透明身份,不得从它推导目录或文件名。路径、标签、文件格式都可变而引用不变。

示例:

```json
{
  "version": 1,
  "assets": {
    "music.pal.031": {
      "kind": "music",
      "path": "assets/migrated/music/031.mid",
      "mediaType": "audio/midi",
      "bytes": 12345,
      "sha256": "...",
      "label": "031",
      "origin": { "kind": "legacy-migrated" }
    },
    "soundfont.default": {
      "kind": "soundfont",
      "path": "assets/runtime/timgm6mb.sf3",
      "mediaType": "audio/sf3",
      "bytes": 0,
      "sha256": "...",
      "origin": { "kind": "licensed", "ref": "assets/runtime/LICENSE" }
    }
  }
}
```

示例里的 `bytes` 在生成时必须写真实值,`0` 只用于文档占位。

### 4.2 manifest 用显式迁移债务区跨切片,终态只保留 catalog/roles

A7 无法在一个小切片内同时改完所有资源族。若 A7-0 直接删掉精灵、瓦片等旧目录字段,游戏会立即失去尚未迁移
资源；若继续把旧字段与新字段平铺,又会让同一资源族出现双轨。因此采用两级版本:

- `contentVersion: 3` 是 A7 最初的迁移期形态:`catalog/roles` 是新真值,尚未迁移的资源族集中放入具名
  `assets.legacy` 债务区。音乐族在 A7-0 完成后不得出现在 legacy。
- C2-ACT 已把工程升级到 `contentVersion: 4`，该版本只增加精灵预制动作、实例动作绑定和语义播放命令；
  它不宣称 A7 资源闭包完成，`assets.legacy` 债务区仍可继续存在。
- N3-1 canonical P7 与 R13-1 cadence/save epoch 依次占用 `contentVersion: 5` 和
  `contentVersion: 6`。脚本 schema 仍是 V5；v6 是开发期存档 epoch 断点，也不宣称 A7 已完成。
- R13-2 占用 `contentVersion: 7`，SAVE/minimum 同步升至 7；R13-3 占用
  `contentVersion: 8`，只升级投掷内容 schema，SAVE 仍保持 7。
- R13-4 占用 `contentVersion: 9`，SAVE/minimum 同步升至 8；R13-5 占用
  `contentVersion: 10`，只收紧敌人脚本和 battle context，SAVE/minimum 仍保持 8。
- 每个后续切片把一个完整资源族迁入 catalog,并同时从 legacy 删除该族；不得为同一族保留新旧回退。
- A7-4 把所有 legacy 归零后升级到下一未占用 epoch（当前候选 `contentVersion: 11`），删除
  LegacyAssetAdapter；v10 -> v11 只存在迁移边界，v11 runtime 不解析 legacy。

A7-0 的 v3 示例:

```jsonc
{
  "contentVersion": 3,
  "assets": {
    "catalog": "assets/index.json",
    "roles": {
      "audio.midiSoundfont": "soundfont.default",
      "audio.openingMenuMusic": "music.pal.004",
      "audio.defaultBattleMusic": "music.pal.037",
      "audio.bossVictoryMusic": "music.pal.002",
      "audio.normalVictoryMusic": "music.pal.003"
    },
    "legacy": {
      "families": ["sprite", "tileset", "sound", "image", "rng", "video"],
      "root": "/extracted/data",
      "sprites": "sprite",
      "tilesets": "tileset",
      "sounds": "/extracted/sounds"
    }
  }
}
```

角色名必须是 content 包定义并校验的封闭联合,不能变成任意字符串配置袋。工程标准颜色表使用 catalog role；
默认字形、对话光标和 UI 不进入工程 role，而由 engine chrome registry 提供。角色值仍是 AssetId,不得直接写路径。`assets.legacy` 只允许隔离的 LegacyAssetAdapter 读取,
普通 FileSource/AssetResolver 不接受绝对路径；全量闭包报告必须把每个 legacy family 记为 error。

### 4.3 路径规则

所有 `AssetRecord.path` 必须经过同一个 `validateProjectRelativePath`:

- 禁止 `/`、URL scheme、盘符、`\\`、查询/fragment、NUL。
- 禁止空段、`.`、`..` 和规范化后越过工程根。
- 统一使用 `/`,注册表只存规范形式。
- 文件必须位于当前工程目录；HTTP source 也只能在工程 base URL 下拼接。

普通 `FileSource` 不再接受“`/` 开头原样透传”。这是安全边界,也是断开仓库级资源依赖的机械门禁。
A7 迁移期尚未转换的外部路径只能由 LegacyAssetAdapter 读取,不能重新进入 FileSource 或新 resolver。

### 4.4 引用与音乐语义

A7-0 首切片把音乐改成稳定 AssetId:

- `SceneDef.music?: AssetId | null`:缺字段 = 延续上一曲；AssetId = 切曲；`null` = 停曲。
- `SceneDef.battleMusic?: AssetId | null`、`startBattle.music?: AssetId | null`:缺字段 = 走具名默认角色；
  AssetId = 本场指定；`null` = 静音。
- `playMusic` 只接受 AssetId；新增显式 `stopMusic`,不再使用数字 0 哨兵。
- `WorldState.audio.currentMusic?: AssetId | null` 记录持久 BGM；删除 `world.script.vars['sys:music']` 魔法槽。
- 战斗临时曲不覆盖持久 BGM,战后恢复 `WorldState.audio.currentMusic`。
- `content/music.json` 删除；名称/别名进入 `AssetRecord.label`,编辑器音乐列表从 catalog 派生。

PAL v2 -> v3 迁移使用确定性 `music.pal.<三位号>` 映射,把现有 `music.json.name` 保留为 label；数字 0 改成
`stopMusic` 或 `null`。旧存档数字 `sys:music` 在存档升级边界转换后删除,运行时内部不保留数字兼容分支。

### 4.5 `AssetResolver` 与 URL 生命周期

模块边界固定为:

- `@type-pal/content`:AssetId/AssetKind/catalog/role schema、路径 guard、纯数据的 typed asset reference walker。
- `@type-pal/reforge`:`AssetResolver(catalog, FileSource)`；按 id + 期望 kind 读取 bytes/JSON/URL。
- `@type-pal/migrate`:PAL 资源登记、物化、v2 -> v3 引用改写、闭包报告和 MG2 保护。
- `@type-pal/editor`:列表/选择/导入/替换/删除、保存 pending blobs、显示闭包诊断；不自建第二解析器。

`AssetResolver` 的读取失败必须包含 AssetId、期望 kind、登记 path 和工程 id。FSA object URL 由 resolver/source 缓存,
工程关闭或切换时统一 `dispose()` 并 revoke；不能要求每个 UI 调用点自行记忆释放。

### 4.6 迁移所有权与 MG2

物理目录按所有权分开:

```text
assets/migrated/**     迁移器拥有,可确定性重建
assets/authored/**     作者拥有,内容哈希命名,迁移器永不覆盖/删除
assets/runtime/**      明确授权、工程运行所需的共享运行资源
```

- 作者替换资源时保留逻辑 AssetId,只把记录 path/origin/hash 改到 `authored/**`。
- 迁移器只可更新 `origin.kind == legacy-migrated` 且仍指向 `migrated/**` 的记录。
- 作者记录在重迁时按 AssetId 保护；不能由新提取结果回写旧路径。必须有“替换后连跑两次迁移仍零计划”的测试。
- 作者二进制用内容哈希路径,不会被同名覆盖；未引用旧 blob 只由显式垃圾回收处理。
- `assets/index.json` 作为按 key 合并的 JSON 真值进入 MG2；大二进制不塞进 JSON baseline。

## 5. 闭包门禁

闭包检查分两层,不能只做字符串扫描:

### 5.1 引用闭包

typed walker 递归收集 manifest 角色、场景、脚本分片、角色、敌人、物品、技能、战场、瓦片集等全部 AssetId,
并为每条引用记录 `ownerType/ownerId/field/expectedKind`。检查:

- AssetId 是否存在。
- 实际 `kind` 是否与字段期望一致。
- 删除/替换时能否列出全部引用者。
- 注册表未引用项作为 warning,不伪装成缺失 error。

这张资产引用表是后续 ED-3 通用引用图的输入之一；A7 不重复实现全部内容对象删除策略。

### 5.2 文件闭包

对 catalog 中**全部登记记录**检查规范路径、文件存在、字节数和 SHA-256；未引用记录同样必须是可交付的真实文件，
不能因只报 warning 而逃过物理闭包。报告至少分:

- `missing-reference`
- `kind-mismatch`
- `invalid-path`
- `missing-file`
- `size-mismatch`
- `hash-mismatch`
- `unreferenced-asset`(warning)
- `legacy-external-path`(A7 完成前 error)

全量哈希用于迁移写盘、保存/导出、CI 和显式“检查工程”,不在每次运行时启动重读 200MB。运行时按需加载并 fail-loud。

### 5.3 克隆与导出

`manifest + 内容索引 + assets/index.json` 是真值。迁移/构建可由它们派生只读的 `project-files.json` 传输清单,
供 HTTP 克隆高效枚举；该清单不是第二份作者数据。克隆不得再读仓库级 extracted/baked 清单。

A5 zip 仍可原样打包目录,但导出前必须调用闭包检查。A7 最终验收时把外部目录改名或断开,
用克隆出的本地工程启动编辑器与引擎；任何隐藏回退都会在此门禁暴露。

## 6. 执行分期

| 切片 | 范围 | 退出条件 |
|---|---|---|
| **A7-0** | 公共 catalog/guard/resolver/闭包地基 + 音乐/MIDI soundfont 首切片 | 音乐引用、试听、运行、保存、重迁全部只走 AssetId；`music.json` 与数字文件名推断归零 |
| **A7-1** | SFX 与音频剩余资源 | **done（2026-07-18）**：音效引用、角色/敌人/技能/召唤音效、导入替换全部只走 AssetId |
| **A7-2** | 四类静态图 + engine chrome + 颜色表 | **done（2026-07-19）**：三方审查与用户验收完成；379 records / 2,656 edges；项目静态图无旁路，默认 UI/字形/光标/标题走 bundler registry |
| **A7-3** | RNG、视频与完整帧动画 | **对应切片已完成**：稳定 AssetId + TPFS + resolver + 作者工作台 |
| **A7-3T** | 瓦片集索引资源闭包 | **done（2026-07-19）**：三方审查与用户验收完成；223 definitions / 223 records / 223 map refs；mapNum=`1..225 \ {168,171}`；gzip 6,501,041 B / 严格有效帧 67,715 |
| **A7-3W** | 大世界精灵索引资源闭包 | **done（2026-07-19）**：636 records / 580 definitions / 559 used / 21 shared / 77 unused；1,332,725 gzip B / 4,133 帧 / 30 legacy 坏尾 |
| **A7-3B** | 战斗精灵索引资源闭包 | **done（2026-07-21）**：三方审查和用户验收完成；172 records / 171 definitions / 179 refs / 171 used / 5 shared / 1 unused；900,973 gzip B / 775 帧 / 6 legacy 坏尾 |
| **A7-4** | 克隆/另存/zip/闭包总门禁 + 候选 v11 收口 | legacy families 归零并删适配器；克隆只复制工程闭包；断开仓库资源目录后本地工程仍完整运行 |

A7-3T 同时修复了 canonical fixture 的颜色表欠账：demo 使用
`assets/migrated/colors/project-standard.json`，e2e-own 与 blank seed 使用
`assets/generated/colors/project-standard.json`；三者都以 `color.project-standard` catalog record
绑定 `visual.standardColorTable` role，并退出 legacy `color-table/palettes`。这是夹具闭包修复，不是恢复
`paletteId` 或颜色表 UI。

A7-0/A7-1 等单一切片不得把 A7/R7 标为 done；全量剩余缺口报告只能减少，不能用 allowlist 隐藏。

## 7. A7-0 验证基线

首切片至少钉死:

1. 路径 guard 表驱动测试:绝对路径、URL、盘符、`..`、反斜杠、query/fragment 全拒绝。
2. catalog 校验:重复/空 id、未知 kind/role、坏 hash、kind mismatch、缺文件均 fail-loud。
3. PAL 音乐迁移:86 条 MIDI 记录；1,174 个 `playMusic`、53 个 `stopMusic`、36 个场景槽、81 个战斗槽、
   31 个显式 `startBattle.music` 字段全部改写；停曲点不生成假资源，正数引用零缺失。
4. `content/music.json`、`MusicDef`、`musicId`、`battleMusicId`、数字 BGM API、`<NNN>.mid` 拼接静态扫描归零。
5. 编辑器音乐 CRUD:新建/导入、改名、替换、受引用删除拒绝、未引用删除、试听、保存重开均走 catalog/resolver。
6. 旧 `music.json` 作者别名、旧存档当前曲和 MG2 作者替换均不丢。
7. `httpSource` 与 `fsaSource` 同一 fixture 行为一致；工程切换后 object URL 全部 revoke。
8. `pnpm check`、四包相关测试、迁移 dry-run、MG2 双跑零计划全绿。

## 8. 剩余风险

- **一次改太大**:资源引用遍布四包。缓解:先固定公共契约,按资源族纵向切片；每族完成时删除旧分支。
- **contentVersion / 存档兼容**:数字音乐已进入脚本、场景与存档。历史 A7-0 通过一次性
  v2 -> v3 项目迁移关闭该切片风险；现行 runtime 只接受 contentVersion 10，存档接受
  SAVE8/content10 与内建的 SAVE8/content9 identity normalization。A7-4 将以 v10 -> 候选 v11
  的显式工程迁移边界收口。
- **MG2 覆盖作者替换**:迁移器可能把 authored path 改回 migrated path。缓解:按 AssetId + origin 所有权测试,
  authored 二进制永不属于迁移器删除集。
- **闭包检查拖慢启动**:全量 SHA-256 约 200MB。缓解:启动按需解析；重哈希只在迁移/保存/导出/CI/显式检查运行。
- **看似自包含但仍有应用根回退**:UI、soundfont、字体最容易漏。缓解:禁止绝对资源路径 + 全仓静态扫描 + 外部目录断开 E2E。
- **“调色板”概念回生**:旧 RLE 需要颜色表。缓解:只登记唯一 `color-table` 运行角色,内容和 UI 不出现 palette id。
