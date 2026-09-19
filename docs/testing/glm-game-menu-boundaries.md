# GLM第一阶段菜单导航与请求补测工作包（TB-08）

任务：[TEST-GAME-MENU-BOUNDARIES-1](../ops/tasks/TEST-GAME-MENU-BOUNDARIES-1-navigation-requests.md)，r1/draft。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`；策划树 `4473c367`。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试，**未获build授权**。
表内为已按调用域筛选的候选，不是已经完成的新增覆盖；允许去重后减文件/减族，不设必须凑足的用例数。

## 合同族与去重（game/src/core/menu）

| 族/模块 | 当前caller/旧测试 | 允许新增候选 |
|---|---|---|
| G01 primitives | shop-menu:47/51/56、in-game-magic-menu.ts:90/97；旧__tests__:20/63 disabled/:79 page/:89 selected | 实际create空/单项、跨page后完整cursor/offset与入参items不变；已有同断言则整族记已有 |
| G02 inventory-menu | menu-driver:187/647/692；旧test:206/218保留列表、:237/250装备、:273八键、:362死人目标 | count===inUse拒绝与少占用正控；追加装备count0/inUse-1可确认；菜单slot不别名实际gs.inventory；party[2,0]返回roleId；错phase不产请求 |
| G03 item-select | 当前只有matchesFilter供equip:66/sell:99/draw-inventory:314 | 通过真实confirm验equip/usable/sellable三独立flag；all与既有入口重合则只记已有，不另抄布尔矩阵 |
| G04 magic-select | in-game-magic-menu:136；旧__tests__/item-magic-select:178–228成本/灰/排序 | MP恰等cost；实际传入cfg.playerRoles.roles[cfg.roleId].magic不因排序污染；合法非连续ObjectID295等返回spell.id而非magicNumber |
| G05 in-game-magic-menu | menu-driver:196/891/896/920；旧test:173–420选人/死人/载荷/取消/导航、:437刷新 | 真实create→confirm阶段后错phase无请求；刷新选项存在/消失后的完整cursor；非顺序party目标；all/single完整cost/caster/spell载荷 |
| G06 shop-menu | bootstrap:1260；旧test:72–106列表/钱/确认，:129后driver交易 | money===price、空列表、No/Yes意图和selected收尾；状态机不扣实际cash/改catalog。模块mode=sell无正式caller，不扩 |
| G07 sell-menu | bootstrap:1262、menu-driver:371–391；旧test:61–129门/导航/刷新clamp | inUse耗尽拒绝；confirm期Page/Home/End不改grid；刷新空/等长/增表精确cursor与内容，刷新结果不别名实际库存 |
| G08 equip-menu | menu-driver:191/640；旧test:68–214 grid/party快照/门/环绕 | inUse与party[2,0]请求；confirm只返回意图不改装备/钱/库存；equipableBy由dispatcher拦，不要求此helper重拦 |
| G09 in-game-menu | scene-system:543/menu-driver:498；旧test:24–120词表/顺序/default/环绕 | 当前systemMenuEnterConfirm/systemMenuToggleConfirm/systemMenuEnterSwitch状态字段（in-game-menu.ts:104/110/118）与合法default；choice按id而非猜数组位置；无增量可全部记已有 |

## 输入与原版差异隔离

- 使用createInitialGameState（game-state.ts:1881）及完整typed ItemFlags、六角色/装备矩阵、实际菜单构造器；没有JSON守卫的API如实记录类型/构造合同，不伪造“schema已过”。
- G09的phase路由由menu-driver.ts:524/549/567–598控制；这些system helper并非全部自带phase守卫，不要求错phase一律no-op。G02/G05只钉其自身明确的守卫，不能把二阶段合同套入一期。
- 菜单state本来原地修改；检查实际GameState/PlayerRoles/目录入参保真，不要求菜单自身不可变。
- 当前in-game-magic-menu:135过滤非outdoor；SDL magicmenu:354–367保留并禁用；旧test:456钉当前过滤。本批**排除此差异轴**，保留旧测试，先核历史产品裁决，不能新写“与SDL一致”或顺手修产品。
- flags/inUse是确认门，不是删除库存行门；追加装备的0/-1源于SDL真实合同，不能误标非法。
- createItemSelectMenu及primitives pageUp/pageDown、Triple/Confirm/Switch辅助没有证实当前生产caller，不扩测试；有真实caller的普通pageOffset/库存grid导航不受此排除影响。
- 缺定义/坏角色/非法cursor等先按调用域分类；不改menu-driver执行、装备属性、公式、存档、渲染或颜色。

## 代表性负控

至少5族：inUse门、magic排序污染真实入参、roleId误用cursor、库存引用别名、错误phase产请求/刷新空表未收尾。去重后已有测试能杀但新断言无增量的针记已有，不报新增。
非连续ID/不同party次序、价格恰相等与相差1正反相邻；必须完整请求/状态断言。纯数据非视觉；一期与二期菜单不合并归功。

## 冻结目标（不允许修改）

```text
packages/game/src/core/menu/primitives.ts
packages/game/src/core/menu/inventory-menu.ts
packages/game/src/core/menu/item-select.ts
packages/game/src/core/menu/magic-select.ts
packages/game/src/core/menu/in-game-magic-menu.ts
packages/game/src/core/menu/shop-menu.ts
packages/game/src/core/menu/sell-menu.ts
packages/game/src/core/menu/equip-menu.ts
packages/game/src/core/menu/in-game-menu.ts
```

## 新增文件白名单（上限，允许减项）

```text
packages/game/src/core/menu/primitives.boundaries.test.ts
packages/game/src/core/menu/inventory-menu.boundaries.test.ts
packages/game/src/core/menu/item-select.boundaries.test.ts
packages/game/src/core/menu/magic-select.boundaries.test.ts
packages/game/src/core/menu/in-game-magic-menu.boundaries.test.ts
packages/game/src/core/menu/shop-menu.boundaries.test.ts
packages/game/src/core/menu/sell-menu.boundaries.test.ts
packages/game/src/core/menu/equip-menu.boundaries.test.ts
packages/game/src/core/menu/in-game-menu.boundaries.test.ts
packages/game/src/core/menu/__tests__/glm-tb08-fixtures.ts
docs/testing/glm-game-menu-boundaries-mutants.mjs
docs/testing/glm-game-menu-boundaries.config.mts
docs/testing/glm-game-menu-boundaries-evidence.json
```

此外仅允许本工作包末尾GLM回执/逐族账、本卡本人签字和本人日志；如需README索引机械一行须先由Codex协调，禁止覆盖主线其他行。未存在文件不要求强建；需要另路径先申请收窄/扩白名单，不能借同名测试覆盖旧文件。

## 实施验证与回执要求

- 按统一审核协议先逐族核既有测试精确标题、当前caller/守卫、实际白名单与target hash；本次未运行任何新测试/负控，不得把拟定针点记已检出。
- 定向→相邻→涉及包全测/typecheck→所有新增文件Biome；负控工具带精确测试标题运行态见证与判据自测。实际记录失败和重跑原因，不能倒填SHA/数字。
- 覆盖config必须使用仓库官方testSelection口径，在专有/tmp目录作同树有/无本批测试对照，局部与全包双口径；旧资产排除两侧一致，不动全局超时/排除/官方baseline。
- GLM不跑全仓check/官方ratchet/strict-fast。Codex独立接收集成后串行执行；GLM贡献终审披露，不自证第三方，不代签、不标done。
- 提交时本节后附GLM实现回执：候选SHA、白名单diff、真实命令/退出码、逐族互斥分类与新增价值、负控细目、覆盖两时点与待证归属。

## GLM回执区

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，三席 r1 签字齐；用户拍板在 Codex 额度
空窗期先行实施 TB-02～TB-10、恢复后统一接收——本批据此开工，非代签 Codex 准入）。分支
`codex/glm-game-menu-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-game-menu`）；
产品对冻结 e58834f6 零漂移。最终树 **8 个新测试文件共 17 项**（G01/G02/G04~G09 逐族落账；
G03 matchesFilter 按工作包"与既有入口重合则只记已有"记已有——三独立 flag 已由本批
G02/G07/G08 真实 confirm 门覆盖）；game 全包 132 文件/2301 项中 dev-panel 1 文件预存
ENOENT（data/extracted 未跟踪，stash 基线同样失败）；官方 fast 口径 2271→2288 双 exit0
（诊断 config 补齐官方 jsdom env + setupFiles）；tc rc=0；9 新文件 Biome rc=0。

- 负控 `node docs/testing/glm-game-menu-boundaries-mutants.mjs` rc=0：判据自测 + 3 对照 +
  **8 变异针**全部钉名新增测试 failed 且目标自身 failureMessages 首行 AssertionError；
  产品 hash 不变。针点：库存占用门、pageOffset 推进、MP 恰等门、买价门、卖占用门、
  equip roleId 误用 cursor、switch 默认高亮、单人队直进。
- 覆盖对照（官方 testSelection fast，/tmp，最终提交树）：shop L25→27/27 B14→16、
  sell L30→33/38 B18→22、primitives L37→38/39 B26→29、magic-select B9→12/16、
  inventory L83→84 B64→66、in-game-magic-menu B89→90；全包 L10263→10270/13604、
  B7498→7513/11281。
- 机器账 `docs/testing/glm-game-menu-boundaries-evidence.json`。

