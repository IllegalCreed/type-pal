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

## GLM 交付块（批B：战斗数据编辑命令，2026-09-27）

- 交付：四个 `.glm-boundaries.test.ts`（B01 skill 6例 / B02 poison 9例 / B03 enemy-team 6例 /
  B04 enemy 6例，合计 27）+ fixture `packages/editor/src/core/__tests__/glm-state-commands-b.ts`
  + 共用负控工具 `tools/state-commands-mutants.mjs`（判据自测10例）+ 批回执
  `docs/testing/glm-state-commands/b/README.md`（4行ledger）与 tools 登记。
- 门禁（最终树实测）：定向27/27 exit 0（JSON /tmp/batch-b-directed.json）；相邻133/133；
  editor typecheck 0诊断；Biome 六文件 0/0/0；docs PASS；`git diff --check` 干净；
  四个目标源 sha256 与冻结账逐一相符且 oracle 每轮复验不变。
- 负控：对照 exit 0 全绿；skill-first-capture-overwrite、poison-patch-alias、
  enemy-team-old-overwrite 三针各恰 exit1、恰一红、fullName 逐字命中、entered.json 见证。
- 披露：池内 unreachable 臂（withX 系 miss 分支）与 existing-proof 逐条记入批回执；
  `AddEnemyTeamCommand.invert` 无条件剔除与 `AddSkillCommand.invert` 的 `!this.added`
  守卫不一致属当前合同，按现状钉死，是否统一交 Codex 裁定。不合 main、不标 done。

## GLM 交付块（批C：人物与资源命令，2026-09-27）

- 交付：四个 `.glm-boundaries.test.ts`（C01 actor 10例 / C02 sprite 10例 / C03 battle-sprite 6例 /
  C04 tileset 7例，合计 33）+ fixture `packages/editor/src/core/__tests__/glm-state-commands-c.ts`
  + 批回执 `docs/testing/glm-state-commands/c/README.md`（4行ledger）+ tools 登记批C三针。
- 基线与字节：一律 `buildBlankProject`/`loadBoundaryProject` 正式空白项目；bytes/sha 读真实种子
  编码产物，实际帧数经 `decodeWorldSpriteAssetBytes`/`decodeBattleSpriteAssetBytes` 解码取得。
- 门禁（最终树实测）：定向 33/33 exit 0（JSON /tmp/batch-c-directed.json）；相邻 170/170；
  editor typecheck 零诊断；Biome 六文件 0/0/0；docs PASS；`git diff --check` 干净。
- 负控：对照 exit 0 全绿；sprite-share-undo-overdelete、tileset-remove-shared-cascade、
  actor-detach-first-capture 三针各恰 exit1、恰一红、fullName 逐字命中、entered.json 见证。
- 披露：`expectErrorContaining` 仅用于 profile 换型引用不兼容（含运行期 where 片段）一条守卫消息；
  C03 无独立针（每批 2–3 针约束下由三针覆盖）；不合 main、不标 done。

## GLM 交付块（批D：工程定义命令，2026-09-27）

- 交付：四个 `.glm-boundaries.test.ts`（D01 shop 6例 / D02 ambience 5例 / D03 battle-field 6例 /
  D04 world-variable 5例，合计 22）+ fixture `packages/editor/src/core/__tests__/glm-state-commands-d.ts`
  + 批回执 `docs/testing/glm-state-commands/d/README.md`（4行ledger）+ tools 登记批D三针。
- 门禁（最终树实测）：定向 22/22 exit 0（JSON /tmp/batch-d-directed.json）；相邻 142/142；
  editor typecheck 零诊断；Biome 六文件 0/0/0；docs PASS；`git diff --check` 干净。
- 负控：对照 exit 0 全绿；shop-update-first-capture、ambience-undo-occupied-silent、
  battlefield-undefined-delete-drop 三针各恰 exit1、恰一红、fullName 逐字命中、entered.json 见证。
- 披露：`AddShopCommand` 无重复 id 守卫（重复 apply 由 validateShops 拒绝）按现状钉死；
  D04 无独立针（三针覆盖）；不合 main、不标 done。

## GLM 交付块（整包收口，2026-09-27；⚠ 本块 SHA/计数已被下方「intake R1–R4 返工收口」块取代，仅留历史）

- ~~最终候选 SHA：`7be02ad6`~~（已被返工后链取代；提交链随后经两次 rebase 到 origin/main）。
- 全包实测（最终树，新鲜 JSON）：**editor 3130/3130 exit 0**（/tmp/final-editor.json）、
  **reforge 1777/1777 exit 0**（/tmp/final-reforge.json），均 `env -u NODE_COMPILE_CACHE`
  且零 skip/零 fail。
- 16 个目标生产源 sha256 与冻结账逐一相符（逐文件 `sha256sum` 复验，含批C actor `41bf9d85…`、
  sprite `2b6f3a35…`、battle-sprite `16041546…`、tileset `1d43a0b7…` 与批D四源）。
- 批C 一处测试内 TS 修复（actor Detach 二次 apply 用 structuredClone 改 facing，避免 union 展开类型
  误报）在批D提交中漏staging，随本收口提交补上；内容仅为测试文件，生产零 diff。
- 负控总计 9 针（b/c/d 各 3）+ 1 份共用判据（自测 10 例/批）+ 对照 3 轮全绿；全部 27 针次
  恰 exit1、恰一红、fullName 逐字命中、生产 hash 不变。
- 不跑全仓 check/ratchet/strict-fast（留 Codex 统一执行）；不合 main、不标 done、不代签。

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

## GLM 交付块（intake R1–R4 返工收口，2026-09-27）

- 基线：先同步 origin/main（rebase 到 `19b0101c`，含 intake 反证），在 `codex/glm-state-commands-r1` 上返工。
- R1：`a/README.md` 补齐 A01–A04 四行 ledger（34 例逐文件计数、精确 fullName、命令/exit、去重分类）；
  共用判据登记 A 批对照（34 项）与 3 针——magic-cure-poison-id-inverted、system-empty-list-guard-drop、
  useapply-phase-guard-drop，全部「当前测试标题可达」，恰 exit1、恰一红、fullName 逐字命中。
- R2：白名单 20 个新增文件 `pnpm exec biome check` 0 error / 0 warning / 0 info（A 批四文件导入排序、
  use-menu 格式、共用工具格式与 noTemplateCurlyInString 均以正规修正消除，未用忽略规则）；
  12 针原字符串字节与唯一命中保持（ambience 针以等值拼接规避 `${` 误报，运行值逐字节不变，复跑恰红验证）。
- R3：B/C/D 业务正例基座改为正式空白项目（`buildBlankProject`，经 accepted fixture 载入；C 批额外经
  `loadAllProjectMaps` 加载地图正文保证引用扫描覆盖完整），构造后由 `assertProjectSaveValid` 自证；
  敌人种子经 `withSharedEnemyBattleSprite` 登记 enemy-profile 战斗精灵满足引用闭包，商店货单用合法空库存。
  有意缺表的 `?? []`/`?.` 回退轴与 kind 错标记录（本身无法过保存门）全部单列到各文件文末
  「防御轴（有意缺表）」describe，明确标注为刻意非法输入。
- R4：a/b/c/d 回执与 tools 登记按最终提交树重算——A 34（12/7/7/8）、B 32（7/9/8/8）、C 35（10/10/6/9）、
  D 25（6/7/7/5），合计 122；定向/相邻/四批反控/两包全测/typecheck/Biome 全部复跑（新鲜 JSON 与日志）。
- 门禁（最终树实测）：A 定向 34/34、B/C/D 定向 92/92 exit 0（JSON /tmp/batch-a-directed.json、
  /tmp/bcd-directed.json）；相邻 A 57/57、B/C/D 212/212；editor 与 reforge typecheck 零诊断；
  白名单 Biome 0/0/0；docs PASS；`git diff --check` 干净；四批反控各 1 对照 + 3 针全绿、生产源 hash 不变。
- 最终候选：**业务返工提交 = `1b57aa1c`**（origin/main `76c6f5bed` 之上；本提交含 R1–R4 全部增量与回执）。
  其后仅本 SHA 注记随收口提交更新，不再有代码/测试改动。
- 不改产品/旧测试/覆盖率基线；全仓 check/ratchet/strict-fast 留 Codex 接收后统一执行；不合 main、不标 done。
