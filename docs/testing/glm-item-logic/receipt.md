# TEST-GLM-ITEM-LOGIC-1 · GLM 作者交付回执

2026-09-27，Owner：GLM；生产冻结 `a95618fc`（item.ts sha 见 targets.json，与当前源码一致），
分支自含任务卡的 origin/main（`6c66619e`）新建 `codex/glm-item-logic-r1`
（worktree `type-pal-glm-item-logic`，主工作树未动）。只新增六份 `.background.test.ts` +
一个薄 fixture + 本目录证据 + 卡内作者交付块；产品、旧测试、配置、官方 baseline 零 diff。

## 六组交付（每组先核旧标题去重；合法物品经 validateItems；单轴负例配同入口正控；实际入参逐次快照）

| 组 | 文件 | 去重（item.test.ts 既有标题，不复制） | 新增轴 | 行数 |
|---|---|---|---|---:|
| I1 | item.derived.background.test.ts | effectiveBattleSpriteId 四层/resistances 叠加上限/skills 去重保序/regen/grantStatus·attackAll/describeEquipEffects 六例 | describeEquipEffects regenMp·真气 maxPool·grantSkill id 回退；**effectiveStat 全函数**（同名累加/异 stat 不串扰/map 外回退）；resistance 与 statBonus 混装跳过臂；skills/battleSprite（合法映射覆盖臂）/grantStatus 去重/regen 下落臂的 map 外回退族 | 8 |
| I2 | item.inventory.background.test.ts | equippableItems 命中/不命中、equipItem 换装 happy 与三类非法原样、usableItems 背包侧 | 旧件回包合并臂、无关条目保留、equipableBy 拒绝、非 caster 引用不变、无旧件换装、equippedItemIds 多成员聚合、usableItems 装备侧入列/去重/battleOnly 排除、count 0 过滤；r2 新增**装备独有正控**（空背包但装备中的可用品入列，equippedUsable.push 臂） | 8 |
| I3 | item.preflight.background.test.ts | validate C8 支持矩阵、item.test useItem 四例 | preflight 四种失败（unknown-item/wrong-context/not-owned/missing-target）+ menu 提前成形 + allAllies 与非目标类豁免 + 装备中所有权正控；失败 outcome 统一形状（原 world 引用/零副作用） | 6 |
| I4 | item.ownership.background.test.ts | '材料计数覆盖背包与装备，扣除顺序固定…'（ownedItemCount=5、head/body 先于 accessory） | floor+max 语义（0/负/1.9）、供给不足自然走完（含 splice 与槽序结果）、跨队员 continue、旁对象保真、count 0 计数、worldResourceValue 空键/collectValue 回退/resources 命中/负·小数恰抛。**removeOwnedItems 按原地合同断言精确差值（计数/键集/数组），不施加不可变断言** | 8 |
| I5 | item.effects.background.test.ts | craftRecipe 成功/材料不足、drawFromResourcePool 掷档/封顶/空池(value=0)、三公共效果 happy、allAllies 结算、chance 显式、自毒/解毒/护体符/大蒜 | invalid-effect-chain 两形态（⚠ 刻意非法载体 rawItem，测 resolve 自身防御合同）、gate 缺省 chance=100 的 1% 失败、modifyHostileAwareness 免目标+同值零变化、revive 复活清态/活人零变化、curePoison 显式 id/缺 defs/未知毒/无毒、removeStatus 过滤、permanentStatBoost 三种钳位与钳位零变化（delta 0 非法不测）、dieIfNotPoisoned 中毒不停表、oneAlly 跳过、allAllies 复合链、levelUp 固定 rng 真实 8 项成长精确值（level 2/maxHP 114/maxMP 61/attack 15/…）与零经验仍 changed | 10 |
| I6 | item.external.background.test.ts | '外部脚本只返回待执行请求'、useItem 四例 | completeExternalWorldItemUse（content 零直测）：unknown-item、menu close、consuming 扣件 clone、consumedByExternal 原引用、consuming:false 原引用 changed true、非默认 host 世界保真（money/resources/learnedSkills）、world 引用合同合并用例；useItem external 原引用/battleOnly 联动 | 6 |

合计 **46 行**（I1 8/I2 7/I3 6/I4 8/I5 10/I6 6）。纯函数经 `expectAcceptsUnchanged` 独立快照前后
比较；失败/零变化 outcome 断言 `world` 为原引用（toBe）；原地 `removeOwnedItems` 只断精确差值。
池内不可达臂如实不测：assertNever 防御两处、preflight 后物品消失、hideParty/外部三 kind 错分支、
非携带态 applyStatus、drawFromResourcePool 档位越界（roll 基于 maxRoll 恒在档内，旧测已证 value=0
空池）、setWorldResourceValue/changeInventory 私有负 delta。

## 代表负控（复用 wave2/3 已验收判据）

[item-logic-mutants.mjs](item-logic-mutants.mjs)：同一 judge——恰 exit（对照 0/变异 1）、恰一红、
失败记录绝对文件+实际 fullName、其余全过无 skip、逐条拒混错/timeout、load 命中 entered.json 见证、
生产 sha256 不变；判据自测 10 例全按预期。六针覆盖卡面优先类别，各自**恰好只红目标 fullName**：

| 针 | 生产注入 | 类别 | 恰红用例（fullName） |
|---|---|---|---|
| derived-stat-assign | effectiveStat `v +=` → `v =` | 输入污染（派生累加改赋值） | I1 …同名 stat 累加、异 stat 与非 statBonus 不串扰，map 外装备 id 回退 |
| equippable-count-filter | `e.count > 0` → `>= 0` | 过滤放行 | I2 …equippableItems 过滤 count>0 与模板（count 0 不列） |
| ownership-floor-ceiling | floor → ceil（仅非整数 count 可感） | 输入语义 | I4 …需求 0/负数/非整数：floor+max 语义 |
| resolve-target-skip | `if (!targetIds.has(next.id)) continue` → `if (false) …` | 错目标 | I5 …oneAlly 跳过非目标；allAllies 复合链跳过已停表目标 |
| external-drop-consume | completeExternal `const consumed = consumeItem(…)` → `false` | 错误消费 | I6 …consuming 扣 1 件：世界为 clone、effectResults 全 changed 保序 |
| external-world-identity | `world: consumed ? nextWorld : world` → `world: nextWorld` | 丢外部变化 | I6 …world 引用合同：consumedByExternal 与不消费都返回原 world 引用 |

明细见 [evidence.json](evidence.json)；机账 `/var/folders/.../type-pal-item-logic-mutants-*`。

## 统一门禁（本批范围，最终树实测）

- 定向六文件：46/46 exit 0（新鲜 JSON）。
- 相邻：item.test.ts **51 项** + reforge item-use-executor 17 项均绿。
- 全 content：**98 文件 1177/1177** exit 0（新鲜 JSON `/tmp/item-logic-content.json`；净增恰 45 行测试身份）。
- TC：exit 0。Biome（本批改动九文件）：0 error、0 warning；全 src 另有 runtime-script.ts:146
  既有 noUnusedVariables error 属分支继承非本批引入（生产零 diff 可证）。
- docs：PASS；`git diff --check` 干净。不跑全仓 check/coverage，不碰主工作树与 E2E。

## 边界与观察

- 未发现产品疑似缺陷，无需诊断。锁绿现状合同：resolve 混链失败合法载体须 rawItem（validateItems
  拒混链）；consuming 计入 changed（零变化行用 consuming:false 隔离效果语义）；permanentStatBoost
  delta 0 非法，钳位零变化用 maxHP=1 + delta -1 表达；gate 阈值 N 成功率 N-1%。
- 披露：docs 门禁要求新目录进入 testing 导航，本批在 `docs/testing/README.md` **仅追加一行**
  glm-item-logic 索引（与既往目录登记同形）；卡面"不改共享索引"与 docs PASS 冲突，按最小加行处理，
  是否保留交 Codex 裁定。
- 视觉 N/A；作者自验不替代 Codex 独立验收；不合 main、不标 done。
