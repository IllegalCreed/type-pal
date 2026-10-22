# GAME-ENGLISH-1 - 第一阶段英文语言包与界面

Status: review
Phase: phase1
Capability: 第一阶段多语言展示
Coding Owner: Codex（集成与画布界面）；english_patch_audit（提取）；english_runtime_audit（对话）；english_shell_audit（DOM壳层）
Generation Owner: N/A
Reviewer: Codex（独立验收贡献者交付）
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: Codex 与隔离贡献者
Branch: codex/game-english

## 目标

第一阶段可选择简体中文或 English，记住选择；英文覆盖剧情、名称、菜单与玩家工具。两种语言使用相同的已修正玩法脚本与存档，英文文本较长时仍可读、可翻页。用户于2026-10-22授权继续英文版工作。

## 范围

- 范围内：SLF文本解析与可再生语言包、残留中文补译、语言偏好、探索/战斗对话、物品说明、画布菜单与DOM壳层、必要字体及布局、定向测试和浏览器核验。
- 范围外：第二阶段及编辑器界面翻译、英文配音、视频/图片内文字重制、重新校订全篇译文。
- 明确不做：使用英文SSS.MKF覆盖玩法；提交EXE、原盘二进制或整包data/en；修改save版本；恢复已删除的错误描述/乱码；把旧任务E2E免测外推成本任务通过。

## 前提真值门

### 一句话行为 / 工程前提

英文是展示层；SLF按原消息起止索引匹配一组可变行数台词，不能按英文行数改写指令数量或IP。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 本地补丁含独立WORDS、MESSAGE、LAYOUT；其SSS还含玩法变化，不作为语言输入 | `data/en/readme.txt`；`data/en/win_files/m_eng.slf:159`；[前置核查卡](GAME-SCRIPT-CORRECTIONS-1.md) |
| 第一阶段 | showDialog保留messageIndex，探索、同步战斗和说明分别消费；当前字体按字形宽绘制 | `packages/shared/src/events.ts:36`；`packages/game/src/core/event-system.ts:2056`；`packages/game/src/core/menu/script-desc.ts:23`；`packages/game/src/present/font.ts:116` |
| SDLPal参考 | 按实际连续消息范围匹配翻译组，翻译行数不决定原脚本IP | `reference/sdlpal/script.c:3088`、`:3444`；`reference/sdlpal/text.c:1010` |
| 当前二阶段 | N/A（本卡不改Reforge canonical或编辑器） | 本卡范围 |
| 本任务目标 | 中文默认；独立文本包；修复后的共同脚本、数值及存档语义保持 | 用户本轮授权；[前置卡](GAME-SCRIPT-CORRECTIONS-1.md) |

### 反证与替代解释

- 只替换M.MSG不足：英译按组重新分行，WORD还残留敌人/敌方法术中文，界面有硬编码和烤在背景内的中文。
- 若实际组范围无法精确映射，必须核原控制流并补映射，禁止按行号比例猜译；没有对应的中段入口不得截取错误英译。
- 反证：切语言后指令数组、标签、对象脚本进度或数值发生变化；英文组结束跳过非展示指令；中文路径回归；任一成立都阻断交付。
- 已确认补丁message0用署名替代原呼喊；本卡恢复其剧情含义，署名单列保留。D01/D16沿用前置卡真值，保留中文有效属性。

### 用户可见偏离

- 是否主动偏离已核真值：yes（用户授权增加英文展示，玩法不变）。
- before -> after：仅中文 -> 可选英文，翻译所需换行和布局适配。
- 代表场景：开场呼喊、客栈对话、背包说明、状态/装备、战斗、移动端工具。
- 用户裁决：2026-10-22“你可以继续推进英文版的工作了吧？”；原始需求为第一阶段英语支持。

## 上下文锚点

- 规则：[CLAUDE](../../../CLAUDE.md)、[质量](../code-quality.md)、[工作流](../agent-workflow.md)、[机制真值](../../phase1/game-mechanics.md)、[E2E合同](../../testing/e2e/contract.md)。
- 前置：[两阶段共同脚本修复](GAME-SCRIPT-CORRECTIONS-1.md)，main基点`6a29b455fc51664df85334bc177d0994348a7987`。
- 数据：本地`data/en/win_files/m_eng.slf`与其readme；前置证据`docs/ops/evidence/GAME-SCRIPT-CORRECTIONS-1/`。
- 不得重新引入：英文玩法分叉、message1504乱码、把雪蛤蟆灵力写成MP、直接改extracted、无保护的输出清理、移动端已移除功能。

## 验收条件

- 功能：选择语言后名称/台词/菜单一致；保存偏好；不重置游戏，不影响存档；切回中文恢复。翻译组可多页且仅执行一次之后的玩法指令。
- 资源：可再生、来源/hash可追踪、字形覆盖核查、三处范围差异有确定处理；不读英文SSS；全量再提取幂等。
- 测试：真实group resolver、探索/战斗/说明caller、clear/page/controls、中文回归、偏好和DOM工作流、英文布局边界；Vitest合法输入、独立oracle与必要反控。
- 文档：本卡、看板、索引与证据一致；check:docs/lint/diff零诊断。新源码加入inventory后核账本，不把专项验收算全文件关闭。
- 视觉：dev-functional核语言设置/菜单/移动端；剧情观感mixed，登记原入口、准备数据、操作、预期和截图；未跑全剧情不得声称全剧情通过。
- 代码质量：贡献者给逐文件八维、实际caller/合法输入/oracle/排重、候选与原生日志；Codex核实际差异及风险点。静态门零诊断，集中全包/覆盖率窗口在稳定实现后运行。
- 快速复验：各贡献者定向Vitest、game/extract/shared typecheck；具体命令、SHA、原件和失效条件在交付时追加。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Owner / 白名单：提取Owner仅`pal-extract`语言模块及CLI、语言文本源/署名；对话Owner仅game对话解析/游标/说明/战斗队列及测试；DOM Owner仅玩家DOM展示与字典/偏好；Codex独占shared语言合同、bootstrap集成、画布名称与菜单、文档。贡献者在隔离worktree交付，详细路径随分派记录。
- 前提核验：verified（上述本地原件、reference和实际caller已读，SLF组与IP必须解耦）。
- 范围、设计和验收条件：agree；先定共享语言包合同再分派写入，不改玩法数据或存档schema。
- 高风险产品裁决：本卡不新增玩法取舍；英文语言功能已获用户授权。
- build准入结论：Codex build allowed；单文件单Owner，未知映射先核证。

### 进入 done 前：独立验收

- 贡献者交付与自验：三个隔离包及集成实现已完成；提取、对话、DOM各自逐文件审查与原生结果见[文本审查](../evidence/GAME-ENGLISH-1/text-review.json)、[对话审查](../evidence/GAME-ENGLISH-1/dialog-review.json)、[DOM审查](../evidence/GAME-ENGLISH-1/shell-review.json)。作者自验不代替独立验收。
- Codex独立复核：已核共同脚本、精确分组、字形/名称身份、贡献者差异/原件、自然英文开场及实际浏览器切换；装备宽度用户反例、JSON输入与定时清屏补验见集成回执。最终全仓检查与官方coverage/ratchet已通过，有限核验不关闭旧广域源码。
- 用户体验/产品验收：accepted（用户2026-10-22“可以了”，并明确授权提交推送、CI后合并、阿里云部署与清理多余分支）。
- done准入结论：用户体验已接受；发布收尾保持review。同步main`acb96a123`后统一门、CI、合并及阿里云验证按后继实际结果写回，不把旧脚本修复卡的剧情免测外推到本卡。

## Draft: 设计与风险

语言包保存WORDS和按原始message起止范围索引的台词组，保留转义、颜色、速度、等待/clear语义。运行时不扩展commands或重排labels，展示游标逐行消费后才回到原始resume IP；战斗与说明消费同一解析边界。静态数据的名称通过word身份查询，不把语言文本写进玩法状态。中文默认，偏好独立于存档。英文长名采用必要的小字体及英文专属布局，不压缩/改动中文布局。DOM字典在展示边界翻译，原检查器的逻辑键保持稳定。

风险：补丁译文不完整、旧分组差异、额外控制符、长名称及图片内中文；分别以补译清单、范围核对、真实caller回归、浏览器实看处理。原补丁本身声明并非全面校订译文，本卡不冒充重新审校全篇。

## Build: 实现与自测

- 冻结候选：`05e1cfcff`（文档包基点）；shared语言合同、提取、对话、DOM及画布/加载集成已进入`codex/game-english`。后继受影响源码变更须刷新相应证据。
- 提取：独立SLF文本包加显式修订；不加载英文SSS。生成物核闭合为43,522条共同指令、4,768组精确匹配、578词条、364个clear控制边界、0汉字残留及0缺字形；两次完整提取manifest均为`00fa07bbb38ef7a6`。原件见[资源核验](../evidence/GAME-ENGLISH-1/docs-maintenance.json)。这些是静态资源与真实resolver核验，不能等同全剧情实跑。
- 运行时：展示游标与原脚本IP分离；探索、战斗与说明共用精确消息组；当前组固定语言，切换不重建GameState、不改变玩法指令/存档进度。英文字形、名称、描述换行、状态/装备与战后结算按展示身份处理。
- DOM：系统页增加双语语言选择与补丁署名；准备成功才开放English，存储失败仍可内存选择，资源失败临时回中文但保留偏好。工具、触键、加载/预缓存与隐私文字按语言更新；移动端已拍板显隐与定位保持。
- 贡献者定向：DOM 129项及对象身份单业务红→恢复5绿；对话9项与77相邻、原指令continuation单项反例（其余8项未选，不计反控信用）；提取/文本原件见各审查入口，均不算官方覆盖率或整文件治理关闭。
- Codex包级验证：shared 13文件/114项；pal-extract初轮83文件中两项默认5秒超时，原件保留；同一83文件/496项以`maxWorkers=2`全部通过，未改timeout、exclude、规则或测试选择。game 347文件/3,789项全部通过，无stderr/警告；全仓七包typecheck零诊断；game生产build无warnings。命令及原件见[本轮静态/包级证据](../evidence/GAME-ENGLISH-1/docs-maintenance.json)。
- Codex画布反控：小字体空格错误、战后名称使用旧注释文本各一枚精准业务AssertionError，分别恢复3项/1项全绿；两次夹具API校准失败单列，不算有效反控。
- [最终集成回执](../evidence/GAME-ENGLISH-1/integration-review.json)记录有限独立验收、候选指纹、资源/浏览器原件和门禁状态；[无损原件索引](../evidence/GAME-ENGLISH-1/native-publication.json)保留失败校准、有效反控及恢复结果。后继结果按实际执行更新，不改写初轮失败。
- 官方初轮：全部20,141项通过，但ratchet在game/pal-extract分支和全仓比例处真实失败，原件保留；后继补定时清屏、SLF/alias拒绝、未知JSON网络输入及英文标点显示合同。最终以`VITEST_MAX_WORKERS=2 TYPE_PAL_COVERAGE_BASE_REF=6a29b455fc51664df85334bc177d0994348a7987 pnpm coverage:ratchet`实跑20,180项全绿，12项指标提升、10项范围变化，原规则下更新基线。最终摘要对新基线及受保护基点只读核算均0回退、0删减。
- 最终统一门：`VITEST_MAX_WORKERS=2 pnpm check`通过；七包共1,684文件/20,609项通过，TC及lint零诊断。默认并发整轮曾有1项旧CLI测试5秒超时，原件保留；复跑仅降低并发，不改测试选择、timeout、规则或阈值。最终生产build0warnings。
- 英文冻结候选的本地实现及必要门已完成，用户体验已认可并授权发布。同步main`acb96a123`引入资产质量修订后须按合并候选重验统一门；本笔仅记录授权，尚未取得CI、合并或阿里云部署回执。全剧情逐段英文E2E/专业译文校订不由本次功能抽样外推。
- 代码库存：Git实际3,401条，较原3,373净增28条，全部保留pending；377closed/110review不变，pending2,914、unclosed3,024。本卡功能验收不自动关闭旧代码质量记录。

- 同步main后的发布候选门：官方ratchet实跑20,181项/774源文件通过、相对保护基点无回退；七包TC、check:docs及lint零诊断，见[合并候选回执](../evidence/GAME-ENGLISH-1/release-gates.json)。旧英文基线和主分支结构调整各自保留，不拼接旧覆盖率数字。

## 视觉验证记录

- Owner：Codex；Timing：mixed。
- Codex实际浏览器核验：桌面系统页中英文切换、中文回切、刷新后记住English、状态页，以及移动端System布局。`browser-smoke.json`记录切换前后玩法状态比较`beforeMatchesAfter=true`、`errors=[]`、持久化语言与偏好均为`en`；保留原件见[文档核验索引](../evidence/GAME-ENGLISH-1/docs-maintenance.json)。文档Owner未代跑该浏览器检查。
- 截图：根工作区`build/english-integration/english-menu.png`、`english-settings.png`、`english-status.png`、`english-mobile-settings.png`；`chinese-menu.png`另留中文回切见证。截图保留在临时产物目录，hash与实际来源在上述证据索引，不将其当作全剧情比较。
- 自然英文开场：独立贡献者从正常标题New Game实跑原视频、呼喊、婶婶对话和暗道演出至scene2返回控制；[原始报告](../evidence/GAME-ENGLISH-1/opening-browser.json)及输入/状态原件已核，Codex实看呼喊、多行页与无遮挡底部补拍。仅英文功能smoke，不改正式001、剧情时间线或编辑器预览验收状态。
- 装备返工：实际菜单选帽子进入选角，英/中文截图已看，语言切换前后选角/物品状态相同。此项明确通过公共库存helper准备真实物品201，仅供dev-functional视觉，不冒充自然剧情检查点。
- 生产预览：真实SW缓存2,909文件/208,976,882字节，断网请求英文包200并可页内切换；未验证离线导航/刷新，不等于阿里云部署。
- 范围限制：背包、战斗及其它剧情的完整视觉范围不能由上述抽样外推；全剧情逐段英文E2E仍未全面执行。用户体验已在2026-10-22认可。

## Review: 审查与返工

- Reviewer：Codex；当前为review，用户已验收，CI及发布收尾待完成。已有贡献者分文件A–H、真实caller、合法输入和独立oracle；Codex按实际差异/原件作有限独立复核，未因包级绿数或文档门关闭广域文件。
- 已核修订：SLF三处范围差异与message0剧情恢复；控制/转义与clear；同一enemy type的对象词条身份；小字体空格与战后实际角色名；英文桌面CSS不覆盖移动尺寸。
- 装备返工已闭合（用户2026-10-22追加）：本次英文适配写死4格造成过宽；按SDLPal的WORD36..39半角宽计算改为当前3格，真实宽119→103px，中文仍87px。源证据、真实菜单像素断言及旧4格精准反控→恢复4绿、浏览器中英文实看和独立复核均已完成，见集成回执；不预填用户体验认可。
- 后继审查：未知JSON语言资源20个输入边界用例经独立排重/合法性核验；SHA校验代表性突变仅指定拒绝合同失败，恢复24/24；首次反控harness类名匹配错误独立保留。私有校验改assertion function仅移除不可达throw。
- 偷物名称字面量返工已闭合：新英文WORD的撇号/连字符曾被控制语法吞掉，仅在偷物提示拼接处转义name，保留外层颜色；真实caller最终可见文本/红色/库存及偷取余数通过，精准去escape反控后恢复70项相邻全绿。当前敌表无偷取110/135，不冒充自然剧情已到该场景；合法公共caller缺陷已修。
- 英文冻结候选的代码审查、全仓检查及coverage已接收；用户UI体验已认可。当前维持review，等待同步main后的真实统一门和发布回执。

## 用户验收

- 用户结论：2026-10-22 accepted。“可以了，那就把这次英文版提交推送，过CI后合并并部署到阿里云，顺便清理多余分支。”此为英文功能/UI验收及本次发布授权，不增加未实跑的全剧情E2E结论。
- 后续：完整全剧情英译质量仍按实际玩测逐段记录。

## 交接日志

- 2026-10-22 Codex：用户授权继续第一阶段英文；建立本卡，3个只读分工核SLF、对话及DOM，记录共同脚本边界。
- 2026-10-22 分派：提取Owner在`/Users/zhangxu/.codex/worktrees/english-text/type-pal`；对话Owner在`/Users/zhangxu/.codex/worktrees/english-dialog/type-pal`；DOM Owner在`/Users/zhangxu/.codex/worktrees/english-shell/type-pal`。各白名单按本卡“进入build前”保持；Codex集成shared/bootstrap/画布。各包交付SHA与原件以对应review JSON为准，不把作者提交当独立验收。
- 2026-10-22 Codex：包实现已集成，真实资源两次提取幂等、包级测试/七包TC/生产build及浏览器抽样记录如上；保留初轮extract超时与夹具校准失败。自然开场正式报告、官方coverage及用户体验仍待，状态推进到review。
- 2026-10-22 english_shell_audit：文档维护独占`codex/english-docs`、路径`/Users/zhangxu/.codex/worktrees/english-shell/type-pal`，基点`05e1cfcff`；仅任务卡/看板/生成索引、库存汇总与受影响review SHA链。复用任务配对证据，不新造重复testing domain/report；未改产品/测试/配置/coverage门。静态文档结果另写本卡证据，最终统一门由Codex追加。

- 2026-10-22 Codex后继：用户装备框反馈已按一手公式修复并核真实像素；自然开场报告已接收，生产SW/断网页内切换有原件。初轮官方coverage真实失败后按业务合同补验；最终全仓check和ratchet通过，保护基点/新基线比较0回退，原失败与校准保留。

- 2026-10-22 Codex发布接手：用户明确认可英文并授权推送、CI后合并、部署及分支清理；发现main已推进至`acb96a123`，先保留双方代码/证据与历史，重新核合并候选门。当前不预填远端结果；发布前同步见[回执](../evidence/GAME-ENGLISH-1/release-preflight.json)。

## 下一位 Agent 提示词

无用户转交；用户已验收并授权本次发布。接手先读本卡、AGENTS现行协议、集成回执和发布前同步回执；当前保持review，完成同步main后的统一门、推送/CI/合并、阿里云部署与真实上线验证，再按实际证据收口并清理退休分支/worktree。此前冻结候选的门保留原基点，不冒充当前合并候选门或全剧情E2E通过。
