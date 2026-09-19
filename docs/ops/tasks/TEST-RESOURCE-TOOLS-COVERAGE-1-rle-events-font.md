# TEST-RESOURCE-TOOLS-COVERAGE-1 - RLE、事件与资源工具补测（TB-05）

Status: rework
Phase: phase1
Capability: 已有合同补测，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-resource-tools-r1

Revision: r1，2026-09-19。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`，策划树 `4473c367`。
完整族账/去重/唯一白名单：[工作包](../../testing/glm-resource-tools.md)。共同规则与合并交接：[七批统一审核](../../testing/glm-coverage-remaining-review.md)。


## 当前接收裁决（2026-09-19，候选d083e5c6）

用户本轮明确批准九批先行实施、Codex恢复后统一接收；认可本批排期例外，不因旧两槽限制追溯判违规。设计签字保持，不重签。
**本席独立结论counter，任务rework，未合入正式测试/产品、不更新官方基线、不转Kimi终审。**
定向24项、原3对照+9针、包typecheck均通过；
Biome实测11文件/1 errors/1 warnings。
见[统一复核 TB-05](../../testing/glm-nine-intake-review.md#tb-05)与[机器接收账](../../testing/glm-nine-intake-evidence.json)。
公共C0判据误收适用，C1全部新增文件格式/回执不符也须修复；具体最小返工如下。

- **R05-1，缺label默认0被重新保活**：`events/recompile.boundaries.test.ts:65–66`将dangling goto写0当正确合同。已签R04明确排除无当前consumer/未定缺label政策，撤回此新绿测；保留有真实target的独立字节oracle。
- **R05-2，标题/覆盖账需贴实际断言**：RLE两个标题写126/127/128，实际只构造128；recompile称整条8字节完整却漏若干unused WORD。补所称边界和完整数组，或据既有精确证据如实减少贡献，不将未测标已测。
- C0/C1适用。RLE当前获准legacy profile、u16 giveItem、BDF宽高/bitmap、manifest的path:size合同保留；不用此次返工删产品兼容面或改格式。


## 目标、上下文与边界

before→after：既有产品行为不变，补有增量的合法合同回归与证据；不把已知缺陷/未定政策写成正确绿测。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、agent-workflow；一期相关另读engineering-notes及相关game-mechanics，不改变原版真值或二阶段canonical。
工作包逐行caller、旧测试、隔离项构成本卡锚点。共同长期覆盖目标不是本卡硬阈值，也不新增薄E2E前置门。

## 前提真值门

| 维度 | 直接证据/边界 |
|---|---|
| 原版/primary source | SDL palcommon.c:803–851定义精灵offset；script.c:970–975执行时才把giveItem数量转SHORT；palette.c:66–82定义夜色768偏移。BDF当前Unifont输入与parser模型是宽高/bitmap，不保BBX偏移。 |
| 第一阶段 | cli:260–271走disasm→recompile/annotate/slice；slice产物被game/assets/loader.ts:165消费。当前palette由63→255位复制，与SDL左移到252不等同；本包不新裁颜色政策。 |
| 当前二阶段 | shared严格RLE有真实消费者reforge/assets.ts:571/editor/project-io.ts:660；legacy-migrated输入profile有批准用途，不按名字删除。 |
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

- Codex：**premise verified / design agree（2026-09-19，r1，冻结e58834f6）**。本人直读disasm.ts:190–196与BDF解析全文件、shared严格/宽容入口、asset-manifest.ts全文件及SDL源；复跑shared两文件26项与extract相邻。确认提取保u16位模式、BDF无偏移输出、清单键为path:size，原队列三处前提已订正。 可证伪条件见本卡与工作包；内部协作取证不冒充Kimi/GLM签字。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读，未读 GLM 结论）**。
  - **收窄裁决核实**：giveItem——`disasm.ts:190-196` emitGiveItem 原样保 u16 位模式，
    `script.c:970-975` 执行时才 `(SHORT)` 转换（提取不转符号属实）；BDF——
    `bdf-to-json.ts:30-34` 只取 BBX 宽高（无 offset 输出，不立未实现合同）；清单——
    `asset-manifest.ts:29-40` hash 键为 `${path}:${size}`（path:size 属实）；精灵 offset 见
    palcommon.c:803+；palette.c:66-82 夜色 768 偏移与当前 63→255 复制不同源（不新裁颜色政策）。
  - **严格/宽容分域核实**：shared 严格 RLE 有真实消费者（reforge/assets.ts:571、
    editor/project-io.ts:660）；legacy-migrated 输入 profile 有批准用途——不按名字删除正确；
    annotate 唯一 CLI 输入是 flat、无 caller 别名/skipFilePrefix:true/递归 choice 不续测——
    无 caller 不保活正确。
  - **设计同意**：只验当前有消费的合同；二进制 oracle 手列独立字节（不以被测解码器回算
    预期）；RLE 宽容 parse 与严格入口分域；宿主窄替身只替边界。
  - **可证伪观察**：① 某族已有同强断言 → 登记已有；② 拟造输入不在支持域 → 撤回；
    ③ 负控仅 TypeError/超时/未执行 → 无效；④ 把 SDL 执行期语义当提取期合同 → 域错；
    ⑤ 产品/旧测试/基线 diff → 停。
  - 返工项：无。
- GLM：**premise verified / design agree**（2026-09-19，r1，冻结 e58834f6；以下锚点本人直读，未读 Kimi 结论）**。
  - **giveItem 保 u16 直读**：disasm.ts:190–196 emitGiveItem 直接透传 operands[0]/[1]，
    无符号翻转——"提取保位模式、执行才转 SHORT"的 r1 裁决与源码一致，只钉原始位模式正确。
  - **RLE 宽容/严格分域**：rle.ts:167 parseSpriteChunk（宽容）与 :189 parseSpriteChunkStrict
    （严格）双入口直读——工作包按入口分栏不混测正确。
  - **BDF 无 offset**：bdf-to-json.ts:30–34 BBX 只取 width/height，模型确无 offset 字段——
    不立未实现合同正确。
  - **manifest path:size 键**：asset-manifest.ts:29–40 逐行拼接 path:size 喂 sha256——
    r1 勘误（非内容 hash）与源码一致；engineering-notes 旧文字已更正，不改缓存键正确。
  - **可证伪观察**：①recompile(disasm(x)) 自洽 oracle→无效（须独立 8 字节向量）；②annotate
    递归 choice 构造不出 flat 输入→按无 caller 别名收窄；③RLE 严格臂用宽容输入→域错。
  - 返工项：无。
- build准入：三席r1设计签字保持；用户本轮明确批准额度空窗期九批先行实施（排期例外），本卡据此进入实施后接收。当前counter/rework不要求重签设计，未开放done；不将本次例外泛化给未来新批。

### done前

- Codex：**counter（2026-09-19，候选d083e5c6）**。本人独立复跑定向/原负控/tc与全部新增文件Biome，抽核合法输入/实际对象/范围；C0与本卡TB-05返工证据已落[统一复核](../../testing/glm-nine-intake-review.md#tb-05)。不合并、不代签、不标done；设计有效不重签。

- GLM：pending。
- Kimi：pending。
- done准入：未开放；不代签、不标done。

## 交接日志
- 2026-09-19 Codex：按用户九批统一接收授权独立审本候选；测试通过不等于证据有效，签counter并转rework，返工限公共C0/C1及本卡章节。GLM原回执/他席签字保留；用户最新确认Mimosa为GLM私有MCP，Codex不处理且不作接收门；TB00/TB01另排。
- 2026-09-19 GLM：按用户拍板（Codex 额度空窗期先行实施 TB-02～TB-10）领取 TB-05 并完成实施
  （r1）。worktree `type-pal-glm-resource-tools`、分支 `codex/glm-resource-tools-r1`、基点
  41cc7cd9；产品零漂移已核。交付：8 新测试文件 24 项（R05 记已有，减 3 白名单项）；双包 tc/
  Biome/官方口径 106→115、110→125 双 exit0；负控 9 针+3 对照全 detected；覆盖与机器账见工作包
  回执。pal-extract 4 项真实资产 ENOENT 与基线相同。状态同步 build；不代签 done，等 Codex 恢复
  额度后统一接收。

- 2026-09-19 Kimi：完成 r1 独立前提/风险审查（TB-05），签 premise verified + design agree，
  无返工项。直读 giveItem 提取保 u16（disasm.ts:190-196 vs script.c:970-975 执行期转换）、
  BDF 无 offset（bdf-to-json.ts:30-34）、清单 path:size（asset-manifest.ts:29-40）、严格/宽容
  RLE 分域与真实消费者、legacy-migrated 批准用途；无 caller 别名不续测核实。五条可证伪
  观察写入本席。未改产品/他席/状态，未读 GLM 结论。Next：三席齐后 Codex 统一准入。
- 2026-09-19 GLM：完成 r1 设计审核（七批联审之一），签本人席位，无返工项。证据见 build 前 GLM 签字块；未读 Kimi 结论。

- 2026-09-19 Codex：用户要求把剩余批次一次细化审核；本卡r1连同TB-04～10准备。逐项收窄无caller、非法fixture、已有断言和未定政策；内部并行只读取证由本人核关键primary锚点，非他席签字。既有套件复跑及限制在统一审核页，未新增正式测试或改产品，待两席并行审核。

## 历史交接提示词

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font.md（r1/draft，生产冻结e58834f6）。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-resource-tools.md、docs/testing/glm-coverage-remaining-review.md；一期范围额外读engineering-notes和相关真值。
Kimi负责独立前提/架构风险压力测试；GLM负责独立调用域、旧测试去重、合法fixture/负控可实施性。二者并行、不读/复述另一席结论；完整七批合并提示词见统一审核页。
只在本人build前席位/本人日志写带primary file:line与可证伪观察的premise verified/design agree或counter，提交推送前同步保留另一席。不得改产品/正式测试/另一席/任务状态，不标build/done。七卡独立裁决，不因一张counter阻塞全部；三席齐后Codex统一准入。
```

## 当前下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-RESOURCE-TOOLS-COVERAGE-1（TB-05），卡 docs/ops/tasks/TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font.md 已rework，候选d083e5c6，生产冻结e58834f6；设计r1不重签。
先同步当前Codex counter到独立 codex/glm-resource-tools-r1，读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、本卡当前裁决和 docs/testing/glm-nine-intake-review.md 的公共C0/C1与TB-05章节、原工作包docs/testing/glm-resource-tools.md。
只修列明残项，保留有效测试与他席结论；正式guard合法、实际同一入参深快照、禁止把已排除未知/旧接口写正确绿测。公共工具判据必须按目标错误首行，真实运行与自测同函数。原负控+本席相关独立见证、定向/相邻/全包/tc/全部新TS/MJS/MTS/JSON的Biome及私有同口径覆盖从最终树复跑，失败/未完成如实记录。
只动原白名单/本人回执，分支不互合、不改产品/旧测试/官方基线/原审计探针/他席见证语义，不代签、不标done、不直接转Kimi。修完本批即可单独交Codex接收；全仓check/ratchet/strict-fast留接收后，用户已确认Mimosa归GLM私有MCP，Codex无需处理，不作为本轮接收/合并门。
```
