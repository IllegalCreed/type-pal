# TEST-GAME-MENU-BOUNDARIES-1 - 第一阶段菜单导航与请求补测（TB-08）

Status: build
Phase: phase1
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-game-menu-boundaries-r1（准入后独立worktree使用）

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-game-menu-boundaries.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。

## 目标、上下文与边界

before→after：既有产品行为不变，补有增量的合法合同回归与证据；不把已知缺陷/未定政策写成正确绿测。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、agent-workflow；一期相关另读engineering-notes及相关game-mechanics，不改变原版真值或二阶段canonical。
工作包逐行caller、旧测试、隔离项构成本卡锚点。共同长期覆盖目标不是本卡硬阈值，也不新增薄E2E前置门。

## 前提真值门

| 维度 | 直接证据/边界 |
|---|---|
| 原版/primary source | SDL ui.c:486–572（disabled不跳过）、itemmenu.c:63–112/287–306/340–375（列表/确认/装备追加）、magicmenu.c:337–409（ObjectID/MP/禁用）、uigame.c:677–735/841–855/1683–1691（选人与购买）。这是SDL参考源，不冒称原盘实机验收。 |
| 第一阶段 | 当前menu-driver和bootstrap真实菜单入口；库存保留列表、flags/inUse只拦确认；MP等于cost允许。法术outdoor filter与SDL保留disabled有差异，排除此轴并登记待证。 |
| 当前二阶段 | N/A——只测game，不挪用Reforge TB00断言，不把一期数值roleId改成二期稳定字符串ID。 |
| 本任务目标 | 只验证已确定且当前有消费的合同；新增文件按工作包白名单。无生产/旧测试/公共fixture/官方基线变更 |

最强替代解释：覆盖空臂已由相邻包测试、输入被上游守卫排除、历史导出无caller、宿主替身替换了真正逻辑、原版/当前行为存在未裁决差异。
可证伪：任一候选找不到实际调用/合法输入，或旧测试已有同一强断言、负控仅超时/TypeError/未执行即“成功”，应分类剔除或counter，不以统计推动实现。
运行时分类、参考行为、原始解码、测试模型四类替代解释均由工作包收窄项显式排查；此卡不授权修迁移/重写生成内容。

## 实施、验证、风险与回滚

1. 三席同r1签齐后由Codex核定准入；GLM每批从最新已接收main开独立分支/worktree，不在主树切分支、不恢复stash、不串未接收成果。
2. 逐族去重，正式合法正控→仅坏目标轴→完整业务断言/实际输入保真；只新增白名单测试/薄fixture/诊断/账，不改产品导出以便测。
3. 宿主窄替身只替边界，实际产品链仍执行；entered/deferred/事件见证替代sleep。负控具体族与最小代表数见工作包，不机械一模块一针。
4. GLM跑定向/相邻/全包/tc/Biome、隔离负控、私有同口径覆盖；Codex独立接收后串行check→ratchet→受保护strict-fast；Kimi独立终审。
5. 真缺陷/未定合同单独归属，不skip/test.fails、不固化错绿；本批可缩减，重大前提变化重签受影响卡，其他卡不陪绑。
风险：虚高覆盖、假合法fixture、输入别名漏测、历史接口保活、跨worktree污染。对策详见工作包；回滚只revert本批测试/文档提交，不恢复旧产品或资产。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-19，r1，冻结e58834f6）**。本人直读SDL itemmenu:287–306/340–375、magicmenu:337–370与game buildSpellMenu:125–145，确认filter差异不能声称忠实原版；复跑game25文件303项。允许明确导航/请求合同，排除效果执行、旧helper和未知产品差异。 可证伪条件见本卡与工作包；内部协作取证不冒充Kimi/GLM签字。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读，未读 GLM 结论）**。
  - **一期参考源核实**：SDL itemmenu.c:287-306/340-375 保留列表+确认门（直读）；MP==cost
    允许（uigame.c:677-735 域）；非顺序 party 返回 roleId 而非 cursor 的合同锚点在册。
  - **法术过滤差异核实**：当前 `magic-menu.ts:135` 过滤 vs SDL `magicmenu.c:354-367` 保留
    disabled——差异真实存在；本批**排除该轴并登记待证**（不改产品、不写正确绿测），隔离正确。
  - **设计同意**：只测 game 包一期现有菜单/请求合同；不挪用二阶段断言、不把一期数值
    roleId 改成二期稳定字符串 ID；逐族去重+负控业务红；差异轴待证不归本包。
  - **可证伪观察**：① 候选族已有同强断言 → 登记已有；② 把 SDL 参考当原盘实机验收 →
    前提倒；③ 用一期数组下标当二期身份 → 域错；④ 负控仅 TypeError/超时 → 无效；
    ⑤ 产品/旧测试/基线 diff → 停。
  - 返工项：无。
- GLM：**premise verified / design agree**（2026-09-19，r1，冻结 e58834f6；以下锚点本人直读，未读 Kimi 结论）**。
  - **一期真值先行**：卡面钉 SDL itemmenu:287–306/340–375（保留列表/确认门）与
    magicmenu:354–367（保留 disabled）——本人读当前 in-game-magic-menu.ts:135 确为
    filter(usableOutsideBattle)，与 SDL 保留语义存在差异——r1 裁决"此轴待查历史裁决、
    排除新增正确绿测、不直接改产品"正确，是待证不是缺陷定性。
  - **item-select 现行域**：matchesFilter 是唯一生产消费（equip:66/sell:99/draw-inventory:314
    直读）；createItemSelectMenu 无生产构造——不为无消费者 API 补测正确。
  - **非顺序 party roleId**：G02/G04 的 roleId-vs-cursor 轴与 menu-driver 真实消费一致。
  - **可证伪观察**：①某交互与 engineering-notes/game-mechanics 一期真值冲突→停该轴交 Codex；
    ②空/disabled 已被旧测试同断言覆盖→登记已有；③confirm 不产请求的负控须真实 create→
    confirm 链而非手拼 state。
  - 返工项：无。
- build准入：**未开放**。本批是已细化待审核，不因队列存在或其他批签字自动开始实现。签齐后Codex再核；TB-00返工优先、未接收实施包合计最多两批。

### done前

- GLM：pending。
- Codex：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志
- 2026-09-19 GLM：按用户拍板（Codex 额度空窗期先行实施 TB-02～TB-10）领取 TB-08 并完成实施
  （r1，八/九族）。worktree `type-pal-glm-game-menu`、分支 `codex/glm-game-menu-r1`、基点
  41cc7cd9；产品零漂移已核。交付：8 新测试文件 17 项（G03 记已有）；tc/Biome/官方口径
  2271→2288 双 exit0；负控 8 针+3 对照全 detected。状态同步 build；不代签 done，等 Codex
  恢复额度后统一接收。

- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（TB-08），签 premise verified + design agree，
  无返工项。直读 SDL itemmenu.c:287-306/340-375 保留列表与确认门、MP==cost 允许、非顺序
  party 返回 roleId；一期 magic-menu.ts:135 过滤 vs SDL magicmenu.c:354-367 保留 disabled
  差异属实——排除该轴登记待证正确。五条可证伪观察写入本席。未改产品/他席/状态，
  未读 GLM 结论。Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 下一位Agent提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-GAME-MENU-BOUNDARIES-1-navigation-requests.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-game-menu-boundaries.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```
