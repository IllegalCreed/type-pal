# TEST-PAL-TABLES-COVERAGE-1 - 原版表格与文本自包含补测（TB-04）

Status: rework
Phase: phase1
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-pal-tables-r1

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-pal-tables.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。


## 当前接收裁决（2026-09-19，候选851a6ede）

用户本轮明确批准九批先行实施、Codex恢复后统一接收；认可本批排期例外，不因旧两槽限制追溯判违规。设计签字保持，不重签。
**本席独立结论counter，任务rework，未合入正式测试/产品、不更新官方基线、不转Kimi终审。**
定向19项、原3对照+8针、包typecheck均通过；
Biome实测13文件/1 errors。
见[统一复核 TB-04](../../testing/glm-nine-intake-review.md#tb-04)与[机器接收账](../../testing/glm-nine-intake-evidence.json)。
公共C0判据误收适用，C1全部新增文件格式/回执不符也须修复；具体最小返工如下。

- **R04-1，SSS输入保真空转**：`io/sss.boundaries.test.ts:51`比较调用前snapshot与**新造fixture**的snapshot，未比较实际wrapped/view。单点污染已经读取的原buf，候选3/3仍绿、oracle红（`sss-mutates-consumed-buffer`）。暴露同一输入及前后保护字节，调用后比较。
- **R04-2，越过已签排除**：`io/msg.boundaries.test.ts:34`新增offset递减→空段的正确绿测，P03已明确此政策未定。删除该新语义承诺或仅在诊断分类，不改产品。
- **R04-3，P07名字轴缺交付**：两个enemy-team用例均传names=undefined；真实caller传names和映射，两不同OBJECT映同enemyId时各自名字未测。该轴可自包含构造，不能一概归“真实资产依赖”。补同输入names+映射的精确_names与补映射后零新增warn；输入解耦/新增业务分栏。
- C0/C1适用；565仅为该内容包，原版位模式和梦蛇例外不重开。


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
- build准入：三席r1设计签字保持；用户本轮明确批准额度空窗期九批先行实施（排期例外），本卡据此进入实施后接收。当前counter/rework不要求重签设计，未开放done；不将本次例外泛化给未来新批。

### done前

- Codex：**counter（2026-09-19，候选851a6ede）**。本人独立复跑定向/原负控/tc与全部新增文件Biome，抽核合法输入/实际对象/范围；C0与本卡TB-04返工证据已落[统一复核](../../testing/glm-nine-intake-review.md#tb-04)。不合并、不代签、不标done；设计有效不重签。

- GLM：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志
- 2026-09-19 Codex：按用户九批统一接收授权独立审本候选；测试通过不等于证据有效，签counter并转rework，返工限公共C0/C1及本卡章节。GLM原回执/他席签字保留；用户最新确认Mimosa为GLM私有MCP，Codex不处理且不作接收门；TB00/TB01另排。
- 2026-09-19 GLM：按用户拍板（Codex 额度空窗期先行实施 TB-02～TB-10、恢复后统一接收）领取
  TB-04 并完成实施（r1）。worktree `type-pal-glm-pal-tables`、分支 `codex/glm-pal-tables-r1`、
  基点 41cc7cd9；领取时产品对 e58834f6 零漂移已核。交付：9 新测试文件+1 fixture 共 19 项
  （P01-P09 逐族落账）；官方 fast 口径 110→129 双 exit0；tc rc=0；11 新文件 Biome rc=0；
  负控 8 针+3 对照全 detected（钉名 AssertionError 判据+四向自测）；覆盖与机器账见工作包回执
  与 `docs/testing/glm-pal-tables-evidence.json`。全包 4 项真实资产 ENOENT 与本批无关
  （stash 基线同样失败）。状态同步 build；不代签 done，等 Codex 恢复额度后统一接收。

- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（七批联审之 TB-04），签 premise verified +
  design agree，无返工项。直读 text.c:795-797 offsetCount−1、SDL global.h 结构与 cli.ts 当前
  消费链；5650B/565 尺寸分界与梦蛇例外核实。四条可证伪观察写入本席。未改产品/他席/状态，
  未读 GLM 结论。Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 历史交接提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-pal-tables.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```

## 当前下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-PAL-TABLES-COVERAGE-1（TB-04），卡 docs/ops/tasks/TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs.md 已rework，候选851a6ede，生产冻结e58834f6；设计r1不重签。
先同步当前Codex counter到独立 codex/glm-pal-tables-r1，读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、本卡当前裁决和 docs/testing/glm-nine-intake-review.md 的公共C0/C1与TB-04章节、原工作包docs/testing/glm-pal-tables.md。
只修列明残项，保留有效测试与他席结论；正式guard合法、实际同一入参深快照、禁止把已排除未知/旧接口写正确绿测。公共工具判据必须按目标错误首行，真实运行与自测同函数。原负控+本席相关独立见证、定向/相邻/全包/tc/全部新TS/MJS/MTS/JSON的Biome及私有同口径覆盖从最终树复跑，失败/未完成如实记录。
只动原白名单/本人回执，分支不互合、不改产品/旧测试/官方基线/原审计探针/他席见证语义，不代签、不标done、不直接转Kimi。修完本批即可单独交Codex接收；全仓check/ratchet/strict-fast留接收后，用户已确认Mimosa归GLM私有MCP，Codex无需处理，不作为本轮接收/合并门。
```
