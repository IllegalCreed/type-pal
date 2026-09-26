# TEST-GLM-ITEM-LOGIC-1 — 物品纯逻辑六组补测

Status: build
Owner: GLM
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯数据合同，不做浏览器或战斗视觉）
Production Base: `a95618fc`
Branch: `codex/glm-item-logic-r1`

## 准入与前提

2026-09-27用户明确GLM/Cursor继续补测，Codex转E2E讨论。Codex核定本包build allowed；
只测试当前content物品合同，不能修改产品政策/公式或以当前行为替代未知设计。
一手入口`packages/content/src/item.ts`的公开函数；消费链`reforge/src/item-use-executor.ts:98/135/163/186/246`。
官方fast冻结item.ts为221/326分支（105未命中），只是选题池，不承诺全部可达。
[共同交付规则与冻结账](../../testing/background-tests-20260927/README.md)。
一阶段/原版实现对齐N/A：不改第二阶段机制。若触及概率/毒/装备规则争议，列待证，不自行修产品。
最强替代解释：旧item.test或上层executor已覆盖；先查精确标题，重复合同登记existing-proof。

## 六组连续工作

| 组 | 公开入口 / 源锚 | 应补的剩余合同，不重复旧例 |
|---|---|---|
| I1 | describeEquipEffects :71、effectiveStat/Resistances/Skills/Sprite/Statuses/Regen :350–495 | 当前可表达的空/缺席/多项组合、名称resolver回退、稳定次序；完整返回值与实际角色/物品输入不变 |
| I2 | equippableItems/equipItem/equippedItemIds/usableItems :495–566 | 列表筛选与身份、非空背包哨兵、装备交换/无动作分支；不重复旧交换happy path |
| I3 | preflightWorldItemUse :645、上下文函数 :219/256 | 拒绝reason/menu/world身份与零副作用；一条同型合法对照，不能只测抛错 |
| I4 | ownedItemCount/removeOwnedItems/worldResourceValue :742–802 | 计数、扣除不足/零/跨队员与非目标保真；removeOwnedItems本来原地修改，必须核精确变化，不能强加不可变合同 |
| I5 | resolveWorldItemUse :827–1164 | 现行可达效果/配方/资源池/多目标的剩余组合；固定RNG与次数、完整outcome和库存/世界；未知语义单列 |
| I6 | completeExternalWorldItemUse/useItem :1167–1217 | 外部成功后的正式消费、已被外部消费/不消费/失效物品、保留外部真实世界变化；不伪造外部脚本执行 |

每组先写旧标题与差异，然后连续做完。I5若范围过大，只做被冻结未命中臂对应且合同明确的输入；
不扩成新物品系统，不追100%或固定用例数。

## 唯一白名单

- `packages/content/src/item.{derived,inventory,preflight,ownership,effects,external}.background.test.ts`（六个可选新文件）。
- `packages/content/src/__tests__/glm-item-logic-fixtures.ts`（可选，薄数据/断言，不复制算法）。
- `docs/testing/glm-item-logic/**`（README/receipt/evidence/mutants及必要只读诊断）；本卡仅追加GLM交付块。
- 不改产品/旧测试/资产/共享索引/配置/超时/排除/基线；不触碰Codex帧编辑WIP和E2E入口。

合法物品先过validateItems，人物/世界来自当前合法构造器及适用结构守卫；不要使用旧fixture中的强转坏数据。
不可变函数每次调用前独立深快照，调用后比同一实际入参；原地变更函数则比较精确差值和旁对象保真。
4–6代表单点反控，优先错误消费、错目标、丢外部变化、输入污染、过滤放行；每针同一输入正控，候选自身业务红。
定向→相邻item/executor→content全包→TC→改动Biome/docs/diff；不跑全仓check/coverage。
有疑似产品缺陷时只写隔离红诊断，不改成错误绿预期；继续无关组，交Codex裁定。

## 交接

从含本卡的最新origin/main新建独立worktree/上述分支；以前GLM目录已清理，不复活旧分支。
冻结只对应a95618fc七包官方基线；交付基点写实际新分支SHA。整包提交推送后给完整SHA、命令/exit/新鲜JSON计数。
不合main、不标done、不代签。Codex独立接收后安排必要统一质量门，不以本包阻塞E2E讨论。

## GLM 作者交付（2026-09-27）

- I1–I6 连续完成：六份 `.background.test.ts` 共 **45 行**（I1 8/I2 7/I3 6/I4 8/I5 10/I6 6），
  复用已验收 `guard-leaf-fixtures.ts` 助手，新增薄 fixture `__tests__/glm-item-logic-fixtures.ts`
  （物品构造即过 validateItems；hero/world/heroActor/毒表；另有 rawItem 仅供 I5 混链防御合同并显式标注）。
- 去重：item.test.ts 既有 96 项逐组核对（describeEquipEffects 六例、equipItem happy/三类非法、
  C8 支持矩阵、扣除顺序、craftRecipe/资源池/公共效果/chance 等），相同合同登记于回执去重列不重报；
  **effectiveStat 与 completeExternalWorldItemUse 在 content 内零直测**，为本批两组核心增量。
- 纪律：合法物品构造即过 validateItems；单轴负例配同入口同型正控；纯函数 expectAcceptsUnchanged
  独立快照前后比较；**removeOwnedItems 按原地合同断言精确差值**（计数/键集/数组长度/返回值），
  不施加不可变断言；I5 混链行用 rawItem 刻意非法载体只测 resolve 防御合同。
- 负控：[item-logic-mutants.mjs](../../testing/glm-item-logic/item-logic-mutants.mjs) 复用已验收
  judge——自测 10 例 + 45 项对照 + 6 针（错误消费/错目标/丢外部变化/输入污染·派生累加/过滤放行/
  输入语义 floor）各恰红目标 fullName。
- 门禁：定向 45/45；相邻 item.test 96 + reforge executor 17 绿；全 content **98 文件 1177/1177**；
  TC exit0；改动九文件 Biome 0 error 0 warning（全 src runtime-script.ts:146 既有问题属分支继承）；
  docs PASS；diff --check 干净。未发现产品疑似缺陷；池内不可达臂如实不测（详见
  [回执](../../testing/glm-item-logic/receipt.md) / [机账](../../testing/glm-item-logic/evidence.json)）。
- r2 窄返工（2026-09-27，仅 R1–R4，见 origin/main `docs/testing/item-logic-r1-review.md`）：
  R1 heroActor 用 `satisfies ActorDef` + **当前 player 侧 baseStats**（hp/maxHP/mp/maxMP/attack 等）
  构造并经 validateActors 验证；hero/world 改用生产 instantiate/buildWorld 可消费基线；
  移除 preflight `as never`。R2 四合同：I2 补**装备独有正控**（空背包+装备中可用品入列
  equippedUsable.push 臂）；I4 beadRing 加非空 potion 哨兵并以 deepSnapshot 比较；I5 levelUp
  改为固定 rng 的真实 8 项成长精确值（level 2/maxHP 164/maxMP 111/attack 15/…）；
  I6 consuming 行加非默认 host 世界（money 37/resources/learnedSkills）保真。R3 全部六文件
  对象/数组拒绝调用经 expectInputsUnchanged（多入参逐次快照）或显式快照对保护，worldResourceValue
  抛错路径补 before/after，removeOwnedItems 保持原地精确差值。R4 mutants:27 空行/Biome format 修、
  相邻 item.test 实际 51 项（非 96）、runner 第四针正名 resolve-stopped-skip、
  derived-stat-assign 类别改派生数值错误、external-world-identity 改引用选择合同、
  runtime-script 既有 warning 表述修正、derived/effects/external 头注释按实际用例收窄。
  复验：定向 46/46（I2 新增 1 行）；6 针负控各恰红；全 content **98 文件 1178/1178**、TC 0、
  改动 Biome 0 error（runtime-script 既有 warning 属分支继承）；docs PASS、diff --check 干净。
- r3 定点收口（2026-09-27，仅 R2 三项落盘 + R3 learned/抛错 + R4 勘误，见 origin/main
  `docs/testing/item-logic-r2-review.md`）：
  R2 ownership beadRing 增加非空 `potion` count=3 哨兵（deepSnapshot before/after）、
  effects levelUp 断言固定 rng 真实 8 项成长精确值（level 2/maxHP 114/maxMP 61/attack 15/…）、
  external consuming 行改非默认 host 世界（money 37/resources/learnedSkills）并以
  `expectInputsUnchanged` 保真。R3 derived effectiveSkills 改具名 learned 数组+
  expectInputsUnchanged；ownership worldResourceValue 两条恰抛路径补 structuredClone→deepSnapshot
  before/after。R4 receipt 96→51/1177→1178/45→46 全同步、第四针 resolve-stopped-skip、
  derived 类别=派生数值错误、external-world-identity=引用选择、runtime-script warning(非 error)、
  fixture 清单补 glm-guard-residual-fixtures。复验：定向 46/46、6 针各恰红、
  全 content **98 文件 1178/1178**、TC 0、改动 Biome 0 error 0 warning、docs PASS、diff --check 干净。
  候选 SHA：见本分支头部提交；不合 main、不标 done，交 Codex 独立验收。
