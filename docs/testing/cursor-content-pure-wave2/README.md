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
| C1-2 | `author-script.ts` | 编辑器/loader `resolveAuthorDialogueTree`；生产用 `checkAuthorScriptFlow` | `runtime 全树投影调用同一 resolver`（扁平数组） | 新测 `stages 流 branch.then dialog 过作者流门后投影，cond 保持` | 先过 `checkAuthorScriptFlow`；嵌套 cue+slot；cond/wait 原样 | 本组针在 C1-1 |
| C1-3 | `author-script-core.ts` | `validate.ts` 调 `checkBaseEntityPages` | `validates pages against local behavior registries`（只证匹配页/未命中 behavior） | 新测 `initialPage 未命中 page 精确拒绝，页与 behavior 输入不变` | `entity.initialPage: 未命中 page ghost` | 本组针在 C1-1 |
| C1-4 | `script.ts` | runner / preparer 调 `stageIndexFor` | `四个投影辅助函数的现行合同`（缺省 0 / 越界 5→末段） | 新测 `负 entityStage 经 checkStages 后钳到 0，越界对照仍是末段` | raw=-2 → 0 | 本组针在 C1-1 |
| C2-1 | `character.ts` | `applySetParty`；collect 另有 editor/validate-refs 父级边 | `离队进 reserve,状态不丢;再入队原样搬回`（两人） | 新测收集器 + `setParty 再召回两人时未点名第三人仍留 reserve` | 第三人原实例/hp 留 reserve | **c2** reserve kind 伪称 party → 收集器新测 `AssertionError` |
| C2-2 | `actor-condition.ts` | runtime `applyActorCondition` | `好状态只施加给活人且取更长回合` | 新测 `死者 apply confused 成功；好状态对照仍拒，毒表与命令不变` | 坏状态对 hp=0 为真 | 本组针在 C2-1 |
| C2-3 | `enemy-ai.ts` | 战斗核 `pickAiTarget` | `random 走 rng;lowestHp 集火残血;strongest 打高攻`（含 lowestMp） | 新测 `highestHp 取最高血；并列取槽序靠前，旁队员不改` | 先过 `checkEnemyAi`；并列 200HP 取 index 2 | 本组针在 C2-1 |
| C2-4 | `enemy-script.ts` | `checkEnemyHookFlow` → `setFallback` | wave2 直接 `checkEnemyFallback`；residual 缺省 fallback | 新测 `hook setFallback 只许 pass；attack 精确拒绝且流不变` | 嵌套 fallback 仍走 `checkEnemyFallback` | 本组针在 C2-1 |
| C3-1 | `item.ts` | `resolveWorldItemUse`；奖励须先过 `validateItems` + `validateReferences` | `资源池 value=$value 按 1..value 掷后封顶`（只抽 `collectValue`）；不重演 puppet/protect | 新测 `drawFromResourcePool 写 herb，reward 先过结构与引用闭包，collectValue 与源世界不动` | 真实 `reward` 记录过结构/引用门后 `herb` 3→2；collectValue=99 | 本组针在 C3-3 |
| C3-2 | `shop.ts` | `shopBuy`/`shopSell` | `卖 1 个得 sellPrice;数量归零移除条目`；钱不够已证 | 新测 `钱够但未知物买为 null；卖 2 件剩 1，源世界不动` | count 2→1；旁符不动 | 本组针在 C3-3 |
| C3-3 | `rewards.ts` | 战后 `grantBattleRewards` 存活门；`applyLevelGrowth` 非正次数不可达 | `通用成长在 99 级仍掷上界…`（levels=1）；死者不获经验已证、未绑 hiddenCounts | 新测 `死者跳过 hiddenCounts，活人仍成长；死者仍吃 Phase F`。`applyLevelGrowth(0/-3/0.9)` 已撤「当前可达业务」归因 | 死者无 hiddenUps；hp 半恢复 | **c3** 去掉 `hp<=0` 存活门 → 该新测 `AssertionError` |
| C3-4 | `world-variable.ts` | `buildWorld` / 注册表校验 | `validates the exact discriminated registry…`；越界叶与双向隔离 | **existing-proof / saturated** | — | 本组针在 C3-3 |
| C4-1 | `asset.ts` | editor `collectAssetReferences` | 旧 walker 从不传 `source.tilesets` | 新测 `collectAssetReferences 只收 tileset.asset，不把 id 当路径` | 先过 catalog+`validateTilesets` | 本组针在 C4-3 |
| C4-2 | `tileset.ts` | loader 总带 catalog | `合法条目原样返回`；map-index 错 kind 正则拒 | 新测匹配 catalog + `catalog 缺 AssetId 与 kind 不符各自精确拒绝` | 精确 missing / kind-mismatch | 本组针在 C4-3 |
| C4-3 | `project-map.ts` | `formatProjectMap` 再校验后落盘 | 多来源夹杂 index 1 的 format；单来源省略 | 新测 `多来源全 0 格 format 仍写 sources，往返保真且输入不变` | 文本含 `"sources"`；`isProjectMap` 无行为消费者已撤 | **c4** 去掉 `tilesetRefs.length===1` → 该新测 `AssertionError` |
| C4-4 | `command-target-reference.ts` | 校验/复制场景 | 旧 startBattle 总带 `fieldId`、从不带 `music` | 新测 `合法 startBattle.music 只出敌队边，不发明战场 0` | 先过 `checkAuthorCommands` | 本组针在 C4-3 |

## Cursor 交付（作者自验，不能替代 Codex 独立复核）

隔离工作树 `/Users/zhangxu/illegal/type-pal-content-pure-wave-2`，分支
`codex/cursor-content-pure-wave-2`，起点 `8254ce64`。不合 main，不标 done，
不跑官方 ratchet / strict-fast。真实缺陷：无。

| 门 | 结果 |
|---|---|
| 定向 15 文件 / 17 新测 | 17/17 |
| content 全测 | 116 files / 1198 tests，exit 0 |
| `packages/content` typecheck | `tsc --noEmit` exit 0 |
| Biome 17 新代码文件 | 0 error / warning / info |
| `pnpm check:docs` | 712 Markdown / 0 issues |
| 四针 | 同跑 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-content-pure-wave2-mutants-fTxrUK`；c1–c4 均 `redExit=1`、`AssertionError`、`hit`、源 hash 未变。c3 改为死者 hiddenCounts 存活门 |

候选 SHA 见本分支最新提交。
