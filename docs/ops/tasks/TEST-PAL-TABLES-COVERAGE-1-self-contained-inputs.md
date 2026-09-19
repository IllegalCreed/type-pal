# TEST-PAL-TABLES-COVERAGE-1 - 原版表格与文本自包含补测（TB-04）

Status: draft
Phase: phase1
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-pal-tables-r1（准入后独立worktree使用）

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-pal-tables.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。

## 目标、上下文与边界

before→after：既有产品行为不变，补有增量的合法合同回归与证据；不把已知缺陷/未定政策写成正确绿测。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、agent-workflow；一期相关另读engineering-notes及相关game-mechanics，不改变原版真值或二阶段canonical。
工作包逐行caller、旧测试、隔离项构成本卡锚点。共同长期覆盖目标不是本卡硬阈值，也不新增薄E2E前置门。

## 前提真值门

| 维度 | 直接证据/边界 |
|---|---|
| 原版/primary source | SDL参考定义 global.h:95–122（EVENTOBJECT/SCENE）、:135–165（Win95物品）、:252–255/:377–404（商店/战场/学习表/位置）；text.c:795–844是offsetCount−1条消息。当前原盘WORD为5650B，565只属于本内容包，不推广为全部PAL版本。 |
| 第一阶段 | pal-extract/cli.ts:200–220/334–364是当前消费者；SSS/WORD/MSG与tables资产测试保留，不因fast=0声称未测试。engineering-notes中梦蛇Object295例外不改。 |
| 当前二阶段 | N/A——不改二阶段模型；migrate仍消费现行提取输出，本包只为同一解析合同提供独立内存输入。 |
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

- Codex：**premise verified / design agree（2026-09-19，r1，冻结e58834f6）**。本人直读SDL global.h:95–122、text.c:795–844及当前解析/调用链；复跑extract十二文件的既有测试（详细限制见总回执）。核定完整字段/独立字节/非零offset优于仅规模断言；565不是通用常数，输入解耦与新增业务严格分栏。 可证伪条件见本卡与工作包；内部协作取证不冒充Kimi/GLM签字。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **一手参考核实**：`text.c:795-797` `g_TextLib.nMsgs = i - 1`（offsetCount−1 条消息属实）；
    SDL global.h 结构定义与当前解析链（cli.ts:200-220/334-364）在册；5650B 为原盘 WORD 实测
    尺寸、565 只属本内容包不推广；梦蛇 Object295 例外不改。
  - **设计同意**：只验已确定且当前有消费的合同；独立内存输入不经真实 extract；逐族去重+
    合法正控+单轴坏例+完整业务断言；无 caller 历史导出剔除；缺陷/未定政策隔离不固化。
  - **可证伪观察**：① 候选族无实际调用/合法输入或已有同强断言 → 剔除或登记已有；
    ② 负控仅超时/TypeError/未执行 → 无效；③ 用二阶段模型或编辑器数据构造一期输入 →
    域错；④ 产品/旧测试/基线 diff → 停。
  - 返工项：无。
- GLM：**premise verified / design agree**（2026-09-19，r1，冻结 e58834f6；以下锚点本人直读，未读 Kimi 结论）**。
  - **模块/入口直读**：parseSss:185、parseWordDat:87、parseMessages:8、parseEnemyPos:27、
    enemy-teams.ts:16 u16 装载（5 槽×WORD=10B/条，slot 语义 0/FFFF/绝对 index）——九模块真实
    parser 均在；caller 锚（cli.ts:201–364）与旧 tables/data-misc 测试标题列入工作包去重表。
  - **自包含输入可构造性**：全部为纯二进制 LE 字节 + 合法 MKF chunk 结构，无 JSON 守卫——
    工作包"正式 parser 成功正控 + SDL 结构手列预期、不虚称 schema 通过"的口径正确；
    P03 的 Uint32Array 4/8 对齐注意点是真实坑位（防宿主 RangeError 替业务拒绝）。
  - **r1 收窄复核**：enemy-teams 的 mapped 入口（names+objectIndexToEnemyId）确为当前 caller
    形态；"只测 mapped、不保活无映射旧模式"与源码一致。MSG 倒序/越界 offset 不立新合同正确。
  - **可证伪观察**：①某记录布局与 SDL 结构不符→该族撤；②旧 tables.test 已同字节同断言→
    记"输入解耦"不计新业务；③负控以被测 parser 回算预期→无效。
  - 返工项：无。
- build准入：**未开放**。本批是已细化待审核，不因队列存在或其他批签字自动开始实现。签齐后Codex再核；TB-00返工优先、未接收实施包合计最多两批。

### done前

- GLM：pending。
- Codex：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志
- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（七批联审之 TB-04），签 premise verified +
  design agree，无返工项。直读 text.c:795-797 offsetCount−1、SDL global.h 结构与 cli.ts 当前
  消费链；5650B/565 尺寸分界与梦蛇例外核实。四条可证伪观察写入本席。未改产品/他席/状态，
  未读 GLM 结论。Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 下一位Agent提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-pal-tables.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```
