# TEST-GLM-STATE-COMMANDS-1 — 菜单与编辑命令十六组连续补测

Status: rework
Owner: GLM
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（同步状态/命令测试，不验UI或剧情）
Production Base: `1bc7df91d4078813230d812c5cd3d99582715bef`
Branch: `codex/glm-state-commands-r1`

## 目标与准入

2026-09-27用户要求给GLM再分配更大一批工作。Codex核定 **build allowed**：四批A→B→C→D，
每批四模块，连续完成；不逐组等用户确认。Codex仍负责E2E，不借分派恢复本席主动补覆盖率。
这次只补独立、确定性的同步合同，不把大型实时会话、异步竞态、视觉和存档迁移揉在一起。
每批单独提交、证据独立；一批存在疑点可单列诊断并继续其它无关批，不让一个counter阻塞全部。

冻结官方fast9295项/728生产文件。16目标合计 **277个未命中分支臂、43行**，只是选题池，
不是已证可达、不承诺全部覆盖、不要求100%或固定新增用例数。禁止复制旧用例凑工作量。
详见[工作包/交付合同](../../testing/glm-state-commands/README.md)与[机械冻结账](../../testing/glm-state-commands/targets.freeze.json)。

## 前提真值与范围

before→after：当前产品行为、API、数据格式完全不变；增加能拒绝错误实现的测试与可复验证据。

| 来源 | 本包前提与一手锚点 |
|---|---|
| 原版/第一阶段 | N/A：不重新裁定原版公式/布局，也不改产品；涉及机制疑义只登记，不能用旧实现压过当前canonical模型 |
| 当前Reforge | magic-menu-state:43/82/103/154、system-menu-state:35/67/99、equip-menu-state:25/62/84、use-menu-state:69/99/110均有真实公开状态入口；castOutdoorSkill原地改world，magicConfirmSpell可原地改菜单，不能机械要求不变 |
| 当前Editor | command-contract.ts:3-12规定apply/invert不可污染入参；skill/poison/enemy等命令有首次捕获/undo分支；shop/battle-field创建还原manifest；资源命令同时维护定义/catalog/blobs |
| 本包目标 | 用真实公开入口、合法构造器/守卫和当前引用索引证明状态转换、旁对象保真与undo；不改16个目标源码，不修产品，不操作磁盘工程 |

最强替代解释：未命中臂可能是旧测试跨包已证、上游guard挡住、不可达或仅错误输入防御。
GLM须先读旧测试再选差异；有相反证据即归existing-proof/guarded/unreachable/pending，不强造合法输入或期待。
所有权：仅GLM写新增测试/专属fixture/本包交付目录；Codex独立验收。无固定第三席或缺签豁免要求。
用户体验验收N/A：不改UI/行为；任何新产品取舍由Codex核定后另交用户。

## 四个连续批次

| 批 | 模块 | 工作主线 | 冻结未命中臂 |
|---|---|---|---:|
| A | Reforge magic/system/equip/use-menu-state | 真实phase入口、返回请求、世界结果、零效果/成功消耗；A01重点未被旧E4消费的castOutdoorSkill | 43 |
| B | Editor skill/poison/enemy-team/enemy-commands | 定义编辑、首轮捕获、重复apply/undo、缺席/no-op、真实引用拒删与合法删除 | 56 |
| C | Editor actor/sprite/battle-sprite/tileset-commands | 合法定义/资源、共享消费者、替换证明与缩帧修复、三表联动和回滚 | 118 |
| D | Editor shop/ambience/battle-field/world-variable-commands | 表声明、稳定ID、旁记录、引用阻断、完整undo与id重占用 | 60 |

## 唯一白名单

1. `targets.freeze.json`中16个`newTest`精确路径；每个模块最多一新测试文件，文件名统一`.glm-boundaries.test.ts`。
2. 四个可选薄fixture：
   - `packages/reforge/src/__tests__/glm-state-commands-a.ts`
   - `packages/editor/src/core/__tests__/glm-state-commands-b.ts`
   - `packages/editor/src/core/__tests__/glm-state-commands-c.ts`
   - `packages/editor/src/core/__tests__/glm-state-commands-d.ts`
3. `docs/testing/glm-state-commands/{a,b,c,d}/**`（批回执/ledger/必要隔离诊断），及`tools/**`（共用严判据/四批负控/最终树清单工具）。
4. 本卡只能追加GLM自己的交付块；不改Codex结论/状态，不改共享看板与导航。

本目录根README与targets.freeze.json是Codex冻结合同，GLM不得改；父导航已预登记，无需再加索引例外。
不得改产品、旧测试/旧fixture、package/lock、Vitest/coverage/timeout/exclude、基线、原审计探针、
E2E/main/dialogue/motion接口、暂停的FrameAnimationEditor测试。禁止main检出竞态、实际工程写盘和浏览器6010。

## 验收与节奏

- 每批开始先完成4行去重/合同表；随后连续补测。16行都要有证据归属，不要求每行都新增测试。
- 每批2–3个代表单点负控，共8–12针；优先输入污染、错误扣费、坏undo、旧引用放行、资产旁记录被删。
  必须新增测试自身业务AssertionError、精确file/fullName、单点命中、原文件hash不变。判据共用一份，不能各批放宽。
- 每批定向/相邻/包TC/改动Biome；四批末统一两包全测一次。静态诊断0error/0warning/0info，所有失败如实记录。
- 禁止GLM跑全仓check/ratchet/strict-fast或写共享coverage；Codex整包接收后统一执行一次。
  不要求重复局部覆盖统计；如需定位，按官方testSelection在/tmp隔离，明确口径，不拿局部增量冒充正式增量。
- 回执从**最终提交树**及新鲜JSON生成：精确fullName、逐文件数、候选SHA、命令/exit。每句“已修”须有相应diff。
  非必要共享helper不要反复重构，尤其不能跳过空输入时的执行、拍函数对象或另造一份fixture当实际实参。

## 上下文锚点

- AGENTS/CLAUDE、phase2 READ-FIRST、[交付清单](../../testing/glm-delivery-checklist.md)。
- [刚结束物品包](../../testing/item-logic-integration.md)及r7/r8复核：重点防“回执完成、树上没改”和错实参快照。
- 各模块exports行号、source hash、LCOV臂及旧测试候选清单见冻结账；旧清单是词法匹配，不能冒充完整语义去重。
- 当前`buildBlankProject`/`buildWorld`/`instantiate`和各validate*守卫；引用provider须真实，不用恒空数组mock。
- Editor命令允许no-op返回原引用；不可变约束针对实际输入，命令对象自身缓存old/added是合同，不要求冻结它。

## 推进记录

- 2026-09-27 Codex：核当前源码、旧测试、官方严格LCOV，四批准入；GLM Coding Owner，独立验收待交付。
- done准入：未满足。GLM不得自行标done/合main，不需Kimi提示词。

## 可直接转发给GLM

接手TEST-GLM-STATE-COMMANDS-1，状态build、已允许实施。先读本卡、工作包README、冻结账与交付自检清单。
在独立codex/glm-state-commands-r1中按A→B→C→D连续做16组，只动白名单；每批单独提交推送，不等逐组回复。
先去重、合法fixture、核实际输入/原地合同，再真实业务断言与2–3代表单点反控。问题只记隔离诊断，不改预期洗绿。
每批局部门、四批末两包全测/TC/全部新文件零诊断；不得跑官方覆盖门，不动主目录和E2E。
每批ledger与回执来自最终树/JSON，整包给完整SHA和命令证据；不代签、不改状态、不合main。

## Codex 独立接收复核（2026-09-27）

候选 `codex/glm-state-commands-r1@36c1f034` 暂签 **counter**，详情见
[接收反证](../../testing/glm-state-commands/codex-intake-review.md)。16 个源文件 hash 与冻结账一致，
16 个新增测试文件定向运行 116/116（A 34、B/C/D 82），B/C/D 的 9 针独立复跑业务红。
但 A 批回执仍为“待实施”且共用反控工具未登记 A；全部新增文件 Biome 有 6 error/1 warning；
B/C/D 共用正例状态的入口场景 `s` 不在 `scenes: []`，现行项目保存门明确拒绝。
最后交付块写的候选 `7be02ad6` 不是最终头 `36c1f034`。这四项闭合前不得集成或标 done；
全仓 check、官方 ratchet、严格 fast 延至独立接收后统一执行。
