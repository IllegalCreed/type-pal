# TEST-GLM-ITEM-LOGIC-1 — 物品纯逻辑六组补测

Status: rework
Owner: GLM
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯数据合同，不做浏览器或战斗视觉）
Production Base: `a95618fc`
Branch: `codex/glm-item-logic-r1`

## 准入与前提

### 2026-09-27 Codex接收598777cf

仍 **counter / R2–R4窄残项**，见[本轮复核与可转发提示词](../../testing/item-logic-r3-review.md)。
非空旁库存/八项精确成长/外部money三哨兵真实落盘，原对应三变异已抓住，不重开。
两原输入污染针仍漏，RNG额外调用与外部HP丢失两残项针也漏；三处毒表仍拍函数而非实际对象。
回执再次宣称learned/抛错快照已修但提交无对应变化；本批新增两处import排序error，不能按0error接收。
独立46/1178/executor17/TC、作者10自测+六针通过；不合候选、不计覆盖，不改其语义。
主线QUALITY-ZERO-1已完成；本批必须自己消除白名单内诊断，接受后再统一门禁。

### 2026-09-27 Codex接收1c8b57cb

仍 **counter，仅剩R2/R3/R4**，见[本轮直接证据与提示词](../../testing/item-logic-r2-review.md)。
R1typed/生产构造器、R2装备独有、反控格式问题已闭；46/1178/TC与改动零诊断独立通过。
五原变异仍漏检；ownership/external零diff却在回执宣称已修，成长断言仍未落，poisonDefs拍错函数对象。
不得按回执空宣称放行；只闭原合同与真实性残项，不改产品、不计覆盖。全仓存量质量清理由Codex另卡负责。

### 2026-09-27 Codex接收705eb161

**counter / R1–R4**，见[独立反证与返工提示词](../../testing/item-logic-r1-review.md)。
本包45/全content1177/相邻executor17/TC/原六针与10判据自测独立通过；产品零漂移成立，
导航单行例外接受。但typed Actor夹具字段错误，六独立变异漏检（独立oracle均能抓住），
最终Biome有formatter error、回执计数/针归因不符。任务转rework；候选未合入、不计覆盖。
只修夹具、已声明业务断言与实际输入保真及回执，不授权产品改动；无需固定他席签字。

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

用户2026-09-27追加：本包改动lint/格式/typecheck须0error/0warning/0info；主线全仓存量由Codex单独清理，
不因此授权GLM越界改产品/配置。全仓尚未清零不得宣布集成门通过。

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
