# Cursor 内容模型十六模块纯逻辑补测（wave2）

[任务卡](../../ops/tasks/TEST-CURSOR-CONTENT-PURE-WAVE-2-sixteen-modules.md) /
[上一包接收](../cursor-pure-wave/codex-final-review.md) /
[负控工具](tools/module-mutants.mjs)。

冻结 `origin/main@8254ce64`。产品 freeze `31945f4e`。只改白名单新测试、
`packages/content/src/__tests__/cursor-pure-wave2-*.ts` 与本目录回执/负控。
fixture 不进 `src/*.ts`，避免再入官方源码统计。不重测上一包
`frame-sequence` 保留位、`item` puppet/protect、非法 script-library 错桶。

## 十六行账

| ID | 目标 | 生产调用 / 现行 guard | 旧测试精确标题 | 本包 | 关键断言 | 反控 |
|---|---|---|---|---|---|---|
| C1-1 | `author-dialogue.ts` | 编辑器/作者命令经 `checkAuthorDialogueCue` / `resolveAuthorDialogueCue` | `actor 默认名、称谓覆写、主立绘与表情只从本 Actor 解析`；`非法 slot 拒绝；四个合法值逐一通过` | 新测 `resolve 复制 slot/cursorFrame，无立绘 actor 只出 speaker` | 无立绘 actor 只出 speaker；slot/cursorFrame 复制；cue/actors 同一对象不变 | **c1** 去掉 slot 复制 → 该新测 `AssertionError` |
| C1-2 | `author-script.ts` | `checkAuthorCommands` → runtime 门；`validate-refs` / 编辑器引用用 `assertAuthorDialogueReferences` | `runtime 全树投影调用同一 resolver`；`author dialogue identity validates once and resolves to the runtime cue once` | 新测 `branch.then 内 dialog 过作者门后投影 slot，sibling wait 保持` | 先过作者命令门；嵌套 cue 带 slot；wait 原样 | 本组针在 C1-1 |
| C1-3 | `author-script-core.ts` | `enemy-script` 调 `checkAuthorCondition`；作者命令经同一 `checkCondition` | `current nested condition rejects equipped item id and preserves the actual command tree`（wave2 `itemEquipped` 空 id）；`all six current comparison operators and optional item/facing defaults remain accepted` | 新测 `checkAuthorCondition 接受 itemEquipped.atLeast=2，0 按路径拒绝` | 直接公共入口；`cond.atLeast: 期望正整数`；输入不变 | 本组针在 C1-1 |
| C1-4 | `script.ts` | runner 调 `applyStageNext` | `四个投影辅助函数的现行合同`（advance / 数字 3 / undefined stay） | 新测 `applyStageNext(0) 重置到首段，旁实体阶段不动` | `talker→0`，`other` 仍 4 | 本组针在 C1-1 |
| C2-1 | `character.ts` | `validate-refs.ts:1636/1650`、editor adapters 调两个 collect | `instantiate 角色 → 实例…`；`组装:party instantiate + seedStats…`；`离队进 reserve,状态不丢;再入队原样搬回` | 新测 `合法 buildWorld/setParty 后收集 reserve 模板与毒/技能叶` | party/reserve 模板 kind 分列；learnedSkills / skillUseCounts / reserve 毒完整 where | **c2** reserve kind 伪称 party → 该新测 `AssertionError` |
| C2-2 | `actor-condition.ts` | `buildWorld` / 物品 / 剧情命令 | `全部 StatusId 只有傀儡不可作为大世界携带状态`；`三种 carrier 一次性播种，毒统一从 tickIndex=0 开始`；`剧情命令完整覆盖 apply/clear 三类 condition 并拒绝多余字段` | **existing-proof** | 无独立剩余臂 | 本组针在 C2-1 |
| C2-3 | `enemy-ai.ts` | 战斗核 `pickAiTarget` | `random 走 rng;lowestHp 集火残血;strongest 打高攻`（含 lowestMp） | 新测 `highestHp 取最高血；并列取槽序靠前，旁队员不改` | 并列 200HP 取先出现的 index 2 | 本组针在 C2-1 |
| C2-4 | `enemy-script.ts` | 敌人定义校验 / choreography | `接受具名 hook state、真实 effect outcome、battle action 与受限 onDefeated`；`battle choreography 与 onDefeated 都拒绝宽泛世界命令`；`最小 stay 流通过` | **existing-proof** | 无独立剩余臂 | 本组针在 C2-1 |
| C3-1 | `item.ts` | 背包/装备/use；上一包已证 puppet/protect | `applyStatus(puppet) 仅 battle；protect 双上下文仍真；输入不变`；`21 种 effect × world/battle/throw 的消费矩阵完整且唯一`；`用金刚符 → 队员 extraStatuses 有 protect 7…` | **existing-proof**（不重演 puppet/protect） | — | 本组针在 C3-3 |
| C3-2 | `shop.ts` | `shopBuy`/`shopSell`/`validateShops` | `钱够:扣 buyPrice + 入包(已有叠加/新条目);源不变`（同测含钱不够 null）；`卖 1 个得 sellPrice;数量归零移除条目` | 新测 `钱够但未知物买为 null；卖 2 件剩 1，源世界不动` | 未知物不因有钱成交；count 2→1 | 本组针在 C3-3 |
| C3-3 | `rewards.ts` | 战后 `grantBattleRewards` → `applyLevelGrowth` | `通用成长在 99 级仍掷上界属性并把七项钳到 999`（levels=1） | 新测 `levels<=0 与不足 1 的小数不改目标，delta 全 0` | 0 / −3 / 0.9 不改 luck=11 | **c3** `count=1` → 该新测 `AssertionError` |
| C3-4 | `world-variable.ts` | `buildWorld` / 注册表校验 | `validates the exact discriminated registry and returns a detached value`；`builds fresh runtime values from author defaults`；`ID 128/129、name 80/81、description 500/501 各自恰好越界即拒；上界全绿` | **existing-proof** | — | 本组针在 C3-3 |
| C4-1 | `asset.ts` | catalog / 命令资产收集 | `validateProjectRelativePath` 族见 `asset.test.ts`；`commandAssetTaggedReferencesAtNode` 见 residual；`A3 validateManifestAssetConfig · 角色 kind 门与音频要求` | **existing-proof** | — | 本组针在 C4-3 |
| C4-2 | `tileset.ts` | 地图/图章经 `validateTilesets`/`resolveTilesetAsset` | `合法条目原样返回`；`注册表 id → AssetId；路径直通与未知 id 均报错`；`带 catalog 时 asset 不存在/kind 不符拒绝` | 新测 `匹配 tileset catalog 通过且输入不变，旁 sprite 记录不入解析` | 正式 `validateAssetCatalog` 后 kind=tileset 通过；旁 sprite 不改解析 | 本组针在 C4-3 |
| C4-3 | `project-map.ts` | 加载 `validateProjectMap`/`format`/`parse` | `同层同号 tileId 可来自不同瓦片集且解析无歧义`；`map authoring sorts identities…`；`合法地图通过且语义等价返回…` | 新测 `validate 后 isProjectMap 为真；缺 layers 或非 4 为假` | 谓词不替代结构门；v3/无 layers 为假 | **c4** 去掉 version===4 → 该新测 `AssertionError` |
| C4-4 | `command-target-reference.ts` | 校验/复制场景 | `collects scene/map/shop/battle/ambience targets through nested command trees`（含 toggleDayNight/learnSkill）；`recognizes current author and readonly legacy scene commands without guessing names` | **existing-proof** | — | 本组针在 C4-2 |

## Cursor 交付（作者自验，不能替代 Codex 独立复核）

隔离工作树 `/Users/zhangxu/illegal/type-pal-content-pure-wave-2`，分支
`codex/cursor-content-pure-wave-2`，起点 `8254ce64`。不合 main，不标 done，
不跑官方 ratchet / strict-fast。真实缺陷：无。

| 门 | 结果 |
|---|---|
| 定向 10 新测 | 10/10 |
| 相邻 20 文件 | 203/203 |
| content 全测 | 111 files / 1191 tests，exit 0 |
| `packages/content` typecheck | `tsc --noEmit` exit 0 |
| Biome 12 新代码文件 | 0 error / warning / info |
| `pnpm check:docs` | 712 Markdown / 0 issues |
| 四针 | 同跑 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-content-pure-wave2-mutants-aTI0uN`；c1–c4 均 `redExit=1`、`AssertionError`、`hit`、源 hash 未变 |

候选 SHA 见本分支最新提交。
