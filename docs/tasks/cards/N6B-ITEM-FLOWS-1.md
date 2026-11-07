# N6B-ITEM-FLOWS-1 — 四类共享取物流程与参数表单

Status: review
Phase: phase2
Owner: Codex（范围、独立验收与集成）
Coding Owner: item_flow_model（内容模型与运行时）；item_flow_editor（编辑器）；Codex（作者数据与版本切换）
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Last reviewed: 2026-11-07
Template: task-card-v1 / 1.0.0
Branch: main（PR #48 已合并；codex/shared-item-flows 已退役，原 HEAD 481ac0b7b0b0adf395a7b1e8f54ffe29ded14246）

## 目标

创作者通过具名取物流程和类型化参数，完整配置剧情奖励、普通宝箱、可见物品拾取与无精灵地点搜刮。保存重开后继续编辑同一业务表单；系统维护领取、再次调查与持久状态。需要特殊编排时可以明确展开为普通脚本。使用既有 E2E 取物样本验证行为，010 苗刀箱继续使用独立脚本。

## 范围

实施第二阶段已定的 N6b 窄版：四种内置意图、物品与金钱奖励参数、显示提示/静默/自定义提示、适用的开盖与再次调查参数、引用与删除保护、预览、撤销重做、保存重开和单向展开。调用方持久化参数，运行时消费统一编译结果。

迁移样本为 `s001/e4` 房间隐藏止血草、`s017/e263` 五灵符箱、`s036/e607` 绣花鞋箱、`s017/e235` 雪莲子、`s016/e233` 止血草和 `s020/e342` 紫金丹发放。002、005 的金钱发放以实际编排为准，只在保持原提示/清屏/等待顺序时替换发放指令。`s020/e363` 特殊箱完整子树保持不变。其余全项目取物脚本不机械批改。

不建设任意表达式、局部变量、返回值、用户自定义模式语言或双向同步生成脚本；这些仍属于第三阶段。普通脚本库的固定逻辑共享和取物模式各自保留明确职责。

## 前提与证据

### 工程前提

共享完整取物流程必须拥有正确的生命周期；参数表单不能只替代首段指令或让作者手写防重领取。

| 维度 | 当前真值 | 直接证据 |
| --- | --- | --- |
| 原始数据 | 五灵符箱 `L_5167 → L_36505`；雪莲子 `L_4196`；止血草 `L_38091`；紫金丹 `L_4332`；苗刀箱 `L_5139`。原盘入口及提取只作为行为来源。 | `data/extracted/events/all.json`，本机只读原件位于主项目数据目录；各正式 E2E 报告记录原盘对象。 |
| 第一阶段 | 正常调查、实际给物/给钱、箱体与草实体呈现、空提示及存读由真实输入采集。 | [008 报告](../../testing/e2e/stages/008-fairy-island-maze/report.md)、[009 报告](../../testing/e2e/stages/009-fairy-island-pool/report.md)、[010 报告](../../testing/e2e/stages/010-water-moon-palace/report.md)。 |
| 开工基点 | 作者树仅把运行时对话替换为作者身份；普通共享脚本没有调用参数。实体方案已有持久步骤游标，不能从共享根跨出修改调用方步骤。 | `packages/content/src/author-script.ts`、`author-script-core.ts`、`runtime-script.ts`；[共享脚本指南](../../phase2/guides/shared-script-author-guide.md)。 |
| 本任务目标 | 作者参数与实现只有一份真值；剧情奖励作为内联指令，三类有领取生命周期的模式作为实体交互方案，统一展开为现有步骤与叶子。 | 用户 2026-11-07：“把四种共享取物流程都完整做好吧，参数配置和编辑器表单一起完善，再用已有的e2e样本验证，010特殊宝箱保留独立脚本。” |

### 反证与替代解释

旧 N6b 概括不能替代已接受样本：止血草先隐藏后提示与入账；雪莲子取走后仍可调查空莲蓬；五灵符箱一次获得五种物品。因此参数必须支持奖励列表，搜刮模式保留重复反馈，不强制一律删除触发。用户补充初始房间隐藏道具后，已核 `s001/e4` 原始 L1902–1907 为声音→提示→给止血草→停用点；搜刮因此显式区分停用和保留再次调查，两者不增加自由动作列表。

若模式在读档后重奖、开盖作用于错误实体、草实体消失时序改变、雪莲子不再显示空提示、紫金丹新增剧情之外的提示，或展开前后业务结果不同，即推翻行为保持结论。两端相同最终库存不足以证明通过，须核实际 caller、原始事件和可见过程。

### 用户可见偏离

编辑器由展开后的低层指令改为可再次编辑的业务表单，属于本次明确授权。既有 PAL 运行演出保持原顺序与显示方式；普通 Reforge 获得提示等待确认与 Game 自动收起的既有差异分别记录，不借本卡静默改动。010 紫金丹使用静默发放。

## 上下文锚点

- [第二阶段规则](../../phase2/READ-FIRST.md)、[N6b 已定范围](../../phase2/design-backlog.md#n6b-强类型脚本模式库)、[脚本系统](../../phase2/specs/script-system.md)、[存档合同](../../phase2/specs/save-system.md)。
- [编辑器 UI 开工](../../phase2/specs/editor-architecture.md#编辑器ui开工与验收)、[设计系统](../../phase2/specs/editor-design-system.md) DS-F.4/4a、DS-C.2/2a/5/5a/7、DS-R.3、DS-A.2。
- [E2E 合同](../../testing/e2e/contract.md)、[剧情时间线](../../lore/timeline.md)、[逐步骤台账](../../testing/e2e/cross-stage/script-progress.md)、[普通开盖候选](PAL-SHARED-CHEST-1.md)。
- [代码质量与证据验收](../../engineering/guides/code-quality.md)、[工作流](../../engineering/guides/agent-workflow.md)、[测试治理](../../testing/governance.md)、[文档验收](../../engineering/guides/document-quality.md)。

## 验收

1. 四种业务表单均可创建、修改、保存和重开；物品/金钱奖励有语义类型，数量为正安全整数，错误引用拒绝。多奖励保持顺序。标准提示从实际物品名称与数量呈现，静默不新增对白，自定义提示保留明确表现。
2. 普通箱开盖、奖励与空箱；草实体消失且不重领；无精灵搜刮的领取与空提示；剧情奖励与外围正常步骤推进，均由实际运行验证。各实体/方案持久游标相互隔离；没有隐式全局领取标记。
3. 模式参数是唯一作者真值；运行时、编辑器预览和显式展开共用 content 的编译/展开函数。展开一次事务，撤销恢复原参数模式，展开后普通脚本不再回写参数。
4. 引用索引读取真实参数位置，物品/资源/文本的删除保护与跳转有效；预览稳定步骤身份保持现有初态绑定。复制方案不会共用领取状态，移动或参数修改不改变稳定身份。
5. 008、009、010 使用已有同路线 runner、采集器与离线比较器，正常路线与重复领取守卫分开。当前 Reforge 检查点随格式/内容摘要变化重新从合法上游产生；禁止改写旧存档或伪造过关状态。终档新会话恢复，并交可暂停的双轨短片。
6. `s020/e363` 子树与原候选相同；010 四次实际调查继续依次给观音符、空提示、苗刀、空提示，开盖声只有首轮。
7. 命中代码的贡献者逐文件八维审阅、必要定向测试及反控、最终全仓类型/lint/文档零诊断；官方覆盖率不降低原受保护门槛。静态、运行时、视觉与用户判断分别记录。
8. 同提交更新现行脚本规范、共享脚本指南、编辑器架构、版本及任务入口；保留历史执行身份。代码与证据明确基点、候选、caller、输入、退出结果和失效边界，按原任务收口必要证据与自有临时资源。

## 状态与交接

2026-11-07 Codex build allowed。集成基点 `0973c2c25795fd2aacf78daedebb8d8f2a5113fc` 包含主线 `c3b3a8b88032a32ba2d464c088fbde8113a4083f` 与普通开盖候选 `374ec2984b5f511cbbd5ab0089e199f9085dc910`。三个只读审计已核作者模型/编辑器入口、实际样本语义和已有 E2E 取证边界；关键结果写入本卡。

独占范围：item_flow_model 在隔离树实施 `packages/content`、`packages/reforge` 的模型、校验、引用、编译、标准提示及受影响测试；item_flow_editor 在独立树实施 `packages/editor` 表单、方案/指令编辑、引用、预览及测试；item_flow_canary 负责获准的 `scripts/e2e` 守卫与实际取证。Codex 持有作者数据、版本常量与现行文档、台账和中央集成。跨范围依赖通过明确交接，不同时写同一文件。

## Draft: 设计与风险

作者态新增剧情奖励指令及宝箱/拾取/搜刮交互方案联合；奖励为物品或金钱的非空列表，提示为静默、标准或明确自定义。非静默提示有明确先后时机。三类生命周期模式仅用于实体交互方案，保留本方案稳定步骤身份，展开成普通阶段并继续使用现有世界游标。

标准获得提示使用对话中的显式奖励行，持有物品名称 TextId 与数量，或金钱数量；由呈现层使用当前本地化名称显示。展开后仍使用现行 dialog 指令，该行不入账、不控制步骤。通用表达式、文本插值脚本或生成 locale 假 ID 不进入作者数据。其余展开继续使用现行运行时命令。

内容格式原子升级至 content23，SAVE12 世界布局不新增领取表；旧开发内容与旧版本检查点不加入兼容分支。格式声明、当前夹具与工程同提交更新。E2E 新版本前驱按现行执行链重建，保留旧报告原件。

编辑器交互方案的创建入口可选空白或三种取物流程；流程表单显示实际名称与奖励摘要，首次/再次调查仍可预览。剧情发放奖励通过现行指令弹窗插入，与方案共用奖励字段。特殊箱保留普通步骤编辑器。旧不完整宝箱/拾取展开模板由完整流程入口接替。

主要风险为作者/运行态边界、场景按需加载漏编译、预览初态引用悬空、标准提示假文本 ID、再次调查重奖，以及 schema 改变使旧 E2E 前驱失效。对应验证覆盖这些实际边界，不以对象结构自比较替代业务运行。

## Build: 实现与自测

content23 已接入四类意图。运行时、按需场景加载、编辑器预览、显式展开及来源对照均走同一公共实现。8 处作者入口已迁移；原 `pal/chest/open` 的两个消费者改为完整宝箱流程，零剩余消费者后退役该固定开盖条目。通用共享脚本的具名调用和显式 self 能力继续保留。作者参数和生成正文不双存。

| 验证 | 实际范围与结果 |
| --- | --- |
| 原盘及作者等值 | 8 处逐子树独立核读；首箱只去掉开盖声之后重复的无内容清屏。拾取增加完成游标、隐藏搜刮点增加空的已领取游标，显隐顺序不变。绣花鞋箱本轮只接受静态等值，不声明新林家堡剧情实跑。 |
| 正常路线 | Reforge 从新游戏重建 001→010；Game 从已保全的原生 007 输入跑 008→010。008 的 636 步、009 的 239 步及 010 的 279 步沿既有路线，三组正式离线比较均 passed / 0 findings。 |
| 领取后守卫 | 当前 008/009 正常路线只采原生快照，另起浏览器真实调查空箱、空莲蓬、已采止血草，各再保存并新会话读回重复。未增加正式路线交互。 |
| 房间隐藏物 | 两引擎从各自实际 001 结束档 Down 2 / Left 3 找 e4；音效→提示→给药→停用、重复静默、新存档再开浏览器仍不重领均通过。 |
| 剧情奖励与特殊箱 | 002 的 500 钱、005 的 50 钱、010 的紫金丹维持原入账时机。e363 完整子树 SHA256 `0a04502d071067ddd3f1e74ade54a86ae9b592ffbe9ff1970a06875ed52bab6a` 不变，010 四次真实调查、饮水与取药通过。 |
| 来源身份 | 原生 18 份报告逐份重核当前 source closure；集成树另对其去重后的 914 份实际依赖重算，全部相同。产品候选为 c574764d8；工具修正候选 1246729c5 的 008–010 两端严格同 HEAD 配对。001–007 原报告仍保留 c574 身份，没有改写版本或候选。 |
| 编辑器 | 业务表单创建/回改、三种提示、多奖励排序、引用、单向展开/撤销/重做与首次/再次预览定向通过。1280/900/720 实页核控件同高、换行与固定弹窗主操作。实际预览依次显示物品数量与金钱。 |
| 实际写盘重开 | Chromium 原生 OPFS 目录句柄，只有目录选择器被替换；正式克隆、事务保存、IndexedDB 句柄登记、最近项目重新装配均执行。e4 数量 1→2→保存→重开表单仍为 2，原仓库内容未改。此例不授操作系统原生选夹 UI 信用。 |
| 测试与门 | 模型实际 shell 4 例、loader 13 例及 PAL 6192 例通过；整包编辑器早期 5023 例中的 5 项 DS fixture 漂移已修，DS 定向 23 例通过。首次官方采集主动中断于 content 拒绝输入/格式化合同缺口；第一轮完整 20420 测试全过但 editor 三指标低于原门槛；第二轮 20425 测试全过、只余两个正常提示切换分支。均保留原始失败，补合法 parser/表单合同及真实 I/O 的 act 等待，没有改产品或降门。 |
| 冻结候选统一门 | 官方 fast ratchet 20426 测试 / 836 生产源文件通过；各包与总指标相对原候选及主线门槛均不下降。typecheck、lint 6767 文件零 error/warning/info，作者工程 294 场景 / 223 地图 / 1934 资源通过；质量工具 50、E2E 工具 417、脚本治理 41 通过。 |
| 文档与发布元数据 | 完整 docs 555 测试、结构、模型、testing、phase/lore、strict review 与 integrity 均通过；归档注册及本段最终结果文字另做有界结构/位置/lint 复验，避免把归档自身 SHA 写进自身。 |

用户可见的新版验收仍待用户判断。普通 Reforge 获得旁白等待确认与 Game 自动收起的既有差异保留；片段视频按真实录制速度展示，不以剪掉等待或改路线制造一致。

## Review: 审查与返工

贡献者交付及原始结果按文件指纹接收；模型原交付的 65 文件在接收时逐件相同。当前 64 文件仍相同，`item-acquisition.test.ts` 另有获准的边界合同补例，产品实现未因此改变。Codex 定向复核 schema/host ownership、引用原路径、统一展开、按需 loader、typed row 呈现及作者数据；另由 `item_flow_final_review` 独立核原盘、8 样本、现行规范保全、来源桥接与真实位置消费者。正式裁定见证据包中的 `independent-review.json`，不把静态接受当用户视觉接受。 当前编辑器另有 123 文件的实际增量 A–H、read ranges 与 SHA 回执；新组件和三份新测试全文核读，旧版本夹具只授版本对齐。原 984 自验原件缺失已明列，由本次当前审阅与实际复验承接，未倒填旧接受。最后 41 行提示合同作为可恢复原 SHA 的 followup 追加，其余 122 文件不变。

实际返工保留原件：保存对象的 undefined 经 JSON 正常省略，守卫改以真实序列化字节作期望；异步 dumpSave 必须 await 后采快照；原版 001 的 0 号当前槽按真实菜单选入 1 号槽处理，未放宽共享恢复 oracle。编辑器修同值选择重置自定文字、长表单 footer、typed row 摘要与旧测试 caller；逐步工具改用真实 TS 依赖加载。来源桥接仅接有限 22 条目及其旧指针，不覆盖原运行身份。

## 用户验收

本次实施范围与房间隐藏物补充已获用户明确授权。新版参数表单及四类取物的最终视觉判断待用户验收；010 原特殊箱的旧接受保留，本轮回归另按当前录制记录。分屏视频为 Game 左、Reforge 右，分别为 008 224.12 秒、009 129.84 秒、010 73.44 秒，可暂停查看。

2026-11-07 用户要求“合并之后记得清理所有垃圾分支”。按该指令完成集成与分支清理；本卡继续保留 review，未将合并或清理写成用户已观看并接受新版表单、视频。

## 交接日志

- 2026-11-07 Codex：按基点开卡，隔离分派模型、编辑器、原生 E2E，集成各自冻结候选。
- 2026-11-07 用户补充逍遥房间隐藏物；核原盘 e4 后补齐搜刮停用与空反馈两种闭合生命周期。
- 2026-11-07 原生 18 报告、三组正式对照、实际保存重开及 62 条步骤事件已接入。9 个 recipe 步骤和 3 个剧情发奖步骤各有审查/优化记录，初态只提升到实际支持的取证范围；旧事件 append-only，未 blanket 提升所有初态。
- 2026-11-07 自有中间分屏压缩稿已退役 3 文件、173,525,751 字节；原生 WebM、执行身份、失败与最终分屏保留。统一门结果见下节质量原件；另退役三个可从原视频重建的诊断 PNG（2,202,406 字节），取样说明见 `media-visual-review.json`。保留原生目录与 6016 审阅服务供当前绝对前驱路径和用户视频/表单验收；其余临时树在用户接受后依原件恢复入口清理。
- 2026-11-07 PR [#48](https://github.com/IllegalCreed/type-pal/pull/48) 的文档、覆盖率及安全检查全部通过，核定 HEAD `481ac0b7b0b0adf395a7b1e8f54ffe29ded14246` 后于 06:09:32 UTC 合入 main `466af5e6e5102849c62172e1cb6e99d1d940efd6`。CI 执行分别为 [Documentation](https://github.com/IllegalCreed/type-pal/actions/runs/42343626212)、[Coverage](https://github.com/IllegalCreed/type-pal/actions/runs/42343626172)，没有以本地通过代替远端结果。
- 2026-11-07 合并后清理原 70 个本地分支中的 67 个、4 个远程分支；46 棵工作树在原 HEAD 分离，逐树核未提交 patch 与未跟踪文件身份不变。其余 3 个原分支为用户主工作区的 main、其它治理任务的 `codex/code-quality-94-102` 和 `codex/slimming-local-resource-followup`，未认定退役。当前收尾分支只用于提交本次实际回执，合并后删除。
- 2026-11-07 主线包含 16 个退役分支的原 HEAD，按固定 SHA 可恢复；其余 51 个非祖先候选由 112,401 字节的最小 Git bundle 保全，已实际 verify/unbundle，SHA256 `e69be4d3f560dd3ee7b4661d631d7fa290a0b1828996d48724af8ed94c62c9b0`。逐怪遇敌距离和旧诊断原型不重新授产品接受，model 草稿有最小 delta 恢复证明。没有删除 source、未提交文件或 ignored 原件，也没有回收工作树目录；本轮 Git 元数据实际新增 0 文件、删除 89 文件、改变 95 文件，净减少 73,301 字节。完整分类、原 SHA、实际命令与恢复入口见下方 cleanup 包。
- 2026-11-07 清理后核本地只余 3 个保留分支与临时收尾分支，远程只余 main 与代码治理分支；三份分屏视频原绝对路径及 SHA 不变，6010/6016 均返回 HTTP 200。原生 build 的未分类旧尝试、editor 的独有诊断图及 dirty 工作树仍保留，不冒称已回收磁盘或已完成全部资源退役。
- 2026-11-07 用户进一步要求“有用就提交没用就删了”，不继续把旧草稿当未提交进度保留。核 6 棵工作树的 101 项：82 处旧 tracked 修改已按精确清单还原；3 份重复 helper/路线、1 份过时瘦身草案和 1 份与 Win 原件完全相同的 DOS 词条副本已删除。没有独有的有用作者内容需要漏补提交，已接受语义由当前主线承接；不是将旧提案重新发布。主工作区从 `02a67c5aa639d43813511a552d44a1c4e5a99b78` 快进到 `d3be9f73d255a7bb329e06c9ecbae3d3af6b4c6b`，旧 CLAUDE 及旧目录状态随主线同步退出。
- 2026-11-07 13 份英文补丁原件归现有本地原始输入边界，其中 5 份是提取器/既有脚本审计的一手输入，另 8 份是已识别的原包变体；不上传二进制。195 字节 committed 保存状态是与浏览器 receipt 配对的有效本地事务状态，保留其生命周期而不提交随机 operationId，也不直接 unlink。提交缺失的精确 `.gitignore` 规则及英文输入/工程生命周期说明；保留已跟踪的开发 sentinel 和所有作者正文。旧检出的本地 exclude 仅镜像相同四条规则，不排除代码或掩盖诊断。
- 2026-11-07 旧 WIP 还原净减少 146,045 字节，5 个删除文件共 57,705 字节，本次废稿处置净减少 203,750 字节；主工作区快进与新增说明/证据分别计，不将源同步伪装成瘦身。已核其余 53 棵工作树清洁，本树只余本次要提交的规则/说明；提交后再核全部 54 棵。独立 Git 目录的 9 类真实路径检查、移除新规则后的 4 项反控及恢复后的 9 项均通过，原始输入/保存状态字节不变。

## 证据恢复与复跑

| 归档 | SHA256 | 字节 | 成员 |
| --- | --- | --- | --- |
| [N6B-ITEM-FLOWS-1-20261107-prefix.tar.gz](../evidence/N6B-ITEM-FLOWS-1-20261107-prefix.tar.gz) | `733d071ad69428993645bf6bd62dd9d2ef63f3075b0fef85e67c12e68bbfdd41` | 21,546,252 | 182 |
| [N6B-ITEM-FLOWS-1-20261107-stories.tar.gz](../evidence/N6B-ITEM-FLOWS-1-20261107-stories.tar.gz) | `5ad2c5c1a2b47dd9636a819d9d6c89d65b126c2e3874ac8c788050956b861a9a` | 94,533,523 | 58 |
| [N6B-ITEM-FLOWS-1-20261107-media.tar.gz](../evidence/N6B-ITEM-FLOWS-1-20261107-media.tar.gz) | `b7e3ab4d3d16335bfb676e03976ae9db2116b54c510f8ddfb28235105c41296c` | 43,650,088 | 16 |
| [N6B-ITEM-FLOWS-1-20261107-quality.tar.gz](../evidence/N6B-ITEM-FLOWS-1-20261107-quality.tar.gz) | `e7244ec945796f1239cdf7dfeaac5b5b19ecd00fca17f2b582dee2906fa76ae3` | 6,818,387 | 293 |
| [N6B-ITEM-FLOWS-1-20261107-cleanup.tar.gz](../evidence/N6B-ITEM-FLOWS-1-20261107-cleanup.tar.gz) | `d47afdb7517d4db6435df4f3f29ab5243c94b9d6607ccc62dd54cf8f121e024d` | 196,310 | 11 |
| [N6B-ITEM-FLOWS-1-20261107-uncommitted.tar.gz](../evidence/N6B-ITEM-FLOWS-1-20261107-uncommitted.tar.gz) | `1aff285f2a86c366c0a1c2b9c3b1f09e96bde725f400de1d5e6e016c03d2cbd8` | 35,931 | 7 |

prefix 包含 001–007、房间和领取后守卫、必要失败、执行链与来源复验；stories 包含正式 008–010 两轨的报告、原始 trace、原生存档、WebM 和离线比较；media 包含最终可暂停分屏及抽帧和合成身份。各包内 `build/item-flows/*-index.json` 可逐件重算 SHA。quality 包保全代码/测试逐文件审阅、必要失败、实际命令、真实反控、UI/OPFS 及当前集成离线复核；`build/item-flows/quality-index.json` 逐件给原路径/长度/SHA。补例的原 Git 候选以最小 `test-candidates.bundle` 保留，复核/恢复命令在 `test-candidates.json`；代码原件不复制整棵临时树。

cleanup 是新增的 196,310 字节持久恢复包，不计作磁盘净收益。其 `cleanup-index.json` 核 10 个原件；`cleanup-plan.json` 给出 67 个退役名称与原 HEAD，`cleanup-execution.json` 记录逐树分离及精确 SHA 删除，两个独立审阅分别保留分类与工作树恢复边界。既有四包不重写、不复制。需要找回非主线旧候选时先核上表包 SHA，再执行：

```sh
tar -xzf docs/tasks/evidence/N6B-ITEM-FLOWS-1-20261107-cleanup.tar.gz build/item-flows/cleanup-plan.json build/item-flows/retired-branch-candidates.bundle build/item-flows/cleanup-branch-review.json build/item-flows/cleanup-worktree-review.json
git bundle verify build/item-flows/retired-branch-candidates.bundle
git bundle unbundle build/item-flows/retired-branch-candidates.bundle
```

unbundle 恢复 Git 对象并列出原 HEAD，不批量重建退役分支。按清单中的固定 SHA 用 `git show` 读取原候选；原型可从审阅原件中的 patch/delta 恢复，原生证据目录仍保留，废弃 WIP 按下段后续收口退出。

后续未提交收口由 uncommitted 包记录：101 项的具体处置与主线承接来源、82 项实际还原、5 项删除、13 份原始输入及 1 份本地事务状态的保全身份，以及隔离 Git 检查/反控。包内 `uncommitted-index.json` 核 6 个成员；新包只留必要处置证据，不重复存放整份废稿或原始补丁。已明确退役的未接收草稿不承诺逐字节恢复；有效正文与必要执行原件仍由固定 Git、已有归档和实际消费者保全。

正式报告保留了原生执行目录的绝对前驱路径。恢复后复跑时，将 prefix/stories 的 `build/` 内容放回 `/Users/zhangxu/.codex/worktrees/item-flow-e2e/type-pal`，已有原件先按包内 index 核 SHA，不覆盖不同字节；Game 007 的四个原件也按下段入口恢复到同一目录。media 和质量包可在当前仓库展开。跨机器复跑需要同路径的目录或挂载映射；不改写报告中的前驱身份。

在具备 PAL 原始资源的当前代码仓库中，复用现有比较器与守卫：

```sh
acquisition_native_root="/Users/zhangxu/.codex/worktrees/item-flow-e2e/type-pal"
node scripts/e2e/recompare-recording.mjs 008 "$acquisition_native_root/build/e2e/game-008-visual-review-2026-11-07T03-38-58-248Z/report.json" "$acquisition_native_root/build/e2e/reforge-008-2026-11-07T03-38-58-160Z/report.json" build/item-flows/recompare-008.json
node scripts/e2e/item-acquisition-guards-reforge.mjs --headless --from "$acquisition_native_root/build/e2e/reforge-008-2026-11-07T03-38-58-160Z/report.json"
node scripts/e2e/item-acquisition-guards-reforge.mjs --headless --from "$acquisition_native_root/build/e2e/reforge-009-2026-11-07T03-42-35-135Z/report.json"
```

Game 原生 007 前缀按 `E2E-008-1-mounted-pose-recheck-20261106.tar.gz` 的固定原件恢复；其身份和四个成员在 prefix 的 `game/original-prefix.json` 中已有 SHA/路径，不复制整棵旧证据树。复跑需要当前 PAL 原版资源；现存存档不改写版本或摘要。分屏播放器结果仍待用户确认。

## 下一位 Agent 提示词

实现和当前运行已冻结并经 PR #48 合入 main；旧实现分支已退役。接手先读顶部状态、最终质量门与独立回执，按固定 SHA 或 cleanup 包恢复旧候选。当前保留用户验收与必要证据路径，不再扩取物语言或机械迁移全项目。原生报告、旧失败与逐步事件不可重写。
