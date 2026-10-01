# TEST-GLM-ZCODE-DISPATCH-1 — ZCode 三路覆盖率补测持续调度

Status: cancelled
Owner: Codex（调度、独立验收与正式结算）
Reviewer: Codex（贡献者交付独立复核；本卡不代替测试卡验收）
Phase: ops
Capability: ops / test-coverage
Visual Verification Timing: dev-functional（ZCode 操作验证）

## 目标与授权

**当前授权（2026-10-01后续撤回）**：用户明确「不用你来操作了，还是我来传话」。
本卡直接UI巡检/续派/归档/模型切换停止；下文为历史授权及执行记录，不再授权新操作。
Codex只按用户新交付固定候选独立审核并提供可复制提示词。尝试停用原automation时接口
报告该任务不存在，本地automation文件也已不存在；不重建或恢复自动派发。

用户于 2026-10-01 要求 Codex 直接查看 ZCode 执行情况，持续维持三个 type-pal 测试
对话并补充覆盖率，不再由用户搬运回执或续做提示词。授权直接向这三个会话发送本卡范围内
的常规补测/返工任务；不授权切换账号/付费套餐、扩大安全权限或更改产品取舍。

目标为三条不抢写的活动测试队列，朝正式全仓分支覆盖率 85% 推进；不是保证任意时刻
三个会话均运行，更不保证固定日期达到 85%。调度间隔内、额度不足、合法合同停线或宿主
不可用均可能空槽，必须如实披露，不用重复旧测、强转、降低门槛或额外会话填槽。

## 范围与路由

当前优先复用 ZCode（`dev.zcode.app`）的 type-pal 项目下三条已有会话，最多三个执行槽。
用户随后明确允许用项目悬浮“新建任务”建会话、用会话悬浮“归档任务”归档已结束会话。
轮换前核无运行/排队、完整交付 SHA 已登记且无唯一未保存证据；归档不等于测试卡 done。
允许将已结束会话归档并开同槽的新会话，携带任务卡/候选/冻结/Owner；不丢候选或并发抢写。
标题变更时按任务 ID、分支和任务卡共同核对；其它项目和非补测会话不在授权内。

| 通道 / ZCode 会话标题 | 唯一测试 Owner / 工作树 | 当前卡 |
|---|---|---|
| O / TEST-GLM-WAVE-O-1 供应验证十批测试 | GLM O；`/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal` | [O 卡](../../../tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md) |
| P / TEST-GLM-WAVE-P-1 编辑器残差十批用例 | GLM P；`/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal` | [P 卡](../../../tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md) |
| Q / TEST-GLM-WAVE-Q-1 runtime residual tenfold | GLM Q；`/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal` | [Q 卡](../../../tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md) |

分支分别为 `codex/glm-wave-o-supply-validation-r1`、`codex/glm-wave-p-editor-residual-r1`、
`codex/glm-wave-q-runtime-residual-r1`。包目录独占、白名单、派发与冻结仍按
[共同协议](../../../../testing/glm-tenfold-triple/README.md)；本卡不批准贡献者修改共享文件。

## 前提与上下文

纯调度不改变产品、schema、机制或真实工程数据，产品前提真值门 N/A。
实际工程前提是能经受支持的 UI 接口读取并发送 ZCode 消息；2026-10-01 重建连接后，
O/Q 英文续派消息实际送达并出现工作中/停止生成。反证是输入未出现、消息未送达或没有运行指示；
遇此必须记录调度阻塞，不能从作者回执或窗口可见推断任务已启动。

- [根协议](../../../../../AGENTS.md)、[当前工作流](../../../agent-workflow.md)。
- O/P/Q 原卡及其中最新 Codex 审查、[共同协议](../../../../testing/glm-tenfold-triple/README.md)。
- [二阶段纪律](../../../../phase2/READ-FIRST.md)；Q 的 game/pal-extract 独立遵守第一阶段纪律。
- 正式覆盖率只认接受后的 main 并集实测；三卡私有覆盖率不能相加。

## 每次巡检与续派

1. 用受支持的电脑操作接口查看 ZCode 三条会话最新用户指令、执行状态、末尾回执及队列。
   只读源码/证据/ Git 可用普通仓库工具；不读写 ZCode 私有会话数据库、内部接口或记忆文件。
2. 正在运行或已有相同排队任务的会话不重复发送，不停止生成、不接管其浏览器。
   空闲时先登记已交付完整 SHA、文档 pin 和候选证据，再决定审核/返工/续做。
3. 交付候选不等于 accept。独立复核固定提交，可与贡献者继续未完合法合同并行；复核中
   不向活动贡献者树写入文件，不因后续 HEAD 变化丢失旧候选锚点。
4. 原卡未完成：按最新 counter 和未完账续做；明确保留已关闭项，不能反复整包返工。
   新机制、缺合法输入、产品缺陷或冻结漂移仅停止受影响子组并举证，其它合法组继续。
5. 原卡完成且独立 accept：Codex 先核新缺口、旧断言去重与独占白名单并开下一卡，
   再直接发送自包含指令；用户无需转发。没有合法新范围时诚实空槽，不凭覆盖配额扩权。
6. 用户确认下方“提出后续修改要求”是输入框、回车发送。每次发送必须核消息确实
   出现在正确会话，且出现工作中/停止生成等运行指示。
   输入框有文字、点击发送或退出码 0 都不等于成功；不确定时先查状态，避免重复发送。
   本宿主已证方式：刷新 AX、核对会话及输入框焦点，用单行 ASCII 英文完整任务指令
   typeText，读回全文确认后 Return，再核消息与工作中。中文键盘输入实测丢字，不能发送
   残缺中文；粘贴超时或连接异常时可重建受支持连接，不使用私有接口/系统注入绕过。
   **用户2026-10-01追加：每条消息只触发一次发送。** 回车与点击发送二选一，不连用；
   触发后立即转只读核验，不能因 AX 仍显示旧“发送”就补点同一位置/索引。
   该控件会切换为“停止生成”，快照可能滞后；无确认时保留未定状态，后续只读核实，
   不自动重发、不补按回车或点击。出现工作中/停止/排队则绝不触碰该控件。
   用户正操作或工具报告 user changed 时重新只读定位，不接着用旧索引执行动作。
7. 独立审核按各卡比例风险执行 test/typecheck、lint/格式完整 0/0/0、docs/diff/verifier、
   反控/排重/必要视觉。通过后串行全仓 check → 官方 ratchet → 受保护 fast，再决定
   选择性集成、done、推送和退休树清理。产品问题另卡，不夹入测试提交。
8. 更新本卡及原卡的证据/下一步；相同 SHA 或相同状态不重复跑重门，也不重复通知。

## 用户授权的模型选择（2026-10-01）

用户说明 GLM-5.3 为文本模型、能力更强，GLM-5.3-Flash 有视觉多模态，并授权 Codex
按任务自行选择。纯代码补测、合同排重、类型/反控修复优先个人套餐已有 GLM-5.3；
读图/截图/视觉验收选个人套餐已有 GLM-5.3-Flash。仅在正确会话空闲且无排队时切换，
并核实际选中值；不以点击成功冒称切换完成。不切账号/个人或免费套餐、不订购、
不扩大权限，不为切模型打断执行。文本-only阶段也不能因此宣称视觉已完成。

## 巡检机制与停止条件

在当前 Codex 对话建立每 10 分钟 heartbeat；不创建后台 cron 替代品或新 Codex 对话。
2026-10-01 已创建：`zcode-type-pal`，工具确认 `ACTIVE`；名称“ZCode · type-pal 三路补测巡检”。
本地巡检需要电脑开机、Codex 与 ZCode 可用；登录/权限/额度阻塞只报告事实，不自行扩权。
状态未变保持安静，仅交付、审核失败、正式覆盖变化或需要用户裁决时通知。

用户要求停止或暂停时停止续派并更新定时任务。正式 main 分支覆盖率达到 85% 且所需
质量门通过后停止补充新卡、通知用户，不将仍在运行的贡献者任务强制中断；收妥其交付。

## 当前模式推进记录

- Codex build allowed：仅本卡调度、既定测试续派、独立审查及对应文档维护。
- O/P/Q 原卡的测试 build 准入与 Owner 不变；本卡不授予产品实现准入。
- done 尚未满足：持续调度活动，正式 85% 未结算；O/Q 发送已验证。
- 用户产品体验裁决 N/A（纯测试调度）；新产品取舍仍交用户。

## 2026-10-01 首次直接巡检

- O 已空闲，r3 回执与本地 HEAD `b9bc14085019f66ff0d8fe862832a37238d814b3` 相符；
  作者报 400/700、44/50，尚未独立 accept。续做方向 O07–O10，不重开关闭项。
- P 在执行 r3 返工，实际工作中指示与新工具输出可见；未打断或重复投喂。
- Q 已空闲，r4 测试候选 `9da8354dc6b1c68ee8aee42c66f577c93d38c2a6`、
  文档 pin/本地 HEAD `86d2a4c42925ce636691ca573baa5eada94e940e`；
  作者报 116/700、39/50，尚未独立 accept。下一步已准入余族逐条件展开，不整体缩围。
- 读状态、切换会话成功；原生坐标输入返回 `noWindowsAvailable`，粘贴返回读取剪贴板
  超时；setValue/typeText 后输入仍空、发送仍禁用。**未发送成功，未保持三路运行。**
  已请求用户仅将 ZCode 主窗口置于当前桌面前台一次，无需搬运任务内容。
- 用户随后提供输入框及新建/归档截图，操作位置已明确。进一步经 Tab/即时 AX 定位
  取得输入框焦点，普通按键后截图仍空；粘贴仍超时。误弹文件选择框已取消，未选取/上传
  文件，未发出任务、未创建/归档会话。问题是输入通道未验证可用，不认定为用户操作错误。
- 已启用本对话 heartbeat `zcode-type-pal`，每 10 分钟按状态检查；同一输入失败不无限
  重试或重复通知，未修复前只读取/登记/审查，不冒称三路执行。
- 原卡状态保持 rework，未改产品/测试、未合 main、未正式结算。
- 本次纯调度文档门：首次 docs 因任务索引未登记失败，补索引后 820 Markdown /
  4337 本地链接 / 247 卡，0 issues；根 lint 2749 文件完整 0/0/0，diff-check 干净。

### 输入阻塞已解除与槽位轮换

- 上方输入失败为历史尝试，不是当前阻塞。重建受支持连接后普通键盘输入生效；
  中文丢字，改用完整单行英文指令，逐次读回确认再 Return。
- O 已收到原卡 O07–O10 合法残余续派，保留 r3 固定 SHA 待独立审查；
  实际新增用户消息、工作中与停止生成可见。Q 同样已收到 Q07/Q08 typed lifecycle
  逐条件余族与 Q10 合成输入公共 CLI 续派，保留 r4/文档 pin；未扩产品范围。
- P 随后结束 r3，UI 回执与干净工作树 HEAD
  `48ade197eb508273168f62384141f8d1dde854ec` 一致；测试排重提交
  `5899dae6057d73a852b37617635e823d2e388c58`。作者报 67/700、14/70组、10/50反控、
  18/20实际流程，F14/F18 未证；README 的630剩余与700−67不符，尚未独立 accept。
  已钉候选，允许结束会话轮换后仅原卡 P02 剩余及 P03–P10 继续，原卡仍 rework。
- P 的“更多→归档任务”实际打开了可恢复归档确认框，目标标题正确；确认/取消的 AX
  点击与键盘没有产生可验证变化，重新绑定仍见确认框。**尚未确认归档，未新建 P，
  当前只证 O/Q 两路续跑，不冒称三路均运行。**不继续无限重试或启动重复 P Owner。
  下一轮先核确认框/归档列表实际状态，必要时请用户只处理此确认框；不让用户搬运回执。

### P 槽下一次直接发送内容（轮换成功后）

下段为单行 ASCII 传输提示词；先核无原 P 运行/排队并确认新会话属于 type-pal。
未能归档时可在确认框已关闭且原会话空闲后复用原槽，不并发开第二位 P Owner。

```text
Codex direct dispatch authorized by the user: continue TEST-GLM-WAVE-P-1 as the only GLM P test owner. This is the replacement for the idle completed P conversation, not a fourth execution slot. Work ONLY in /Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal on codex/glm-wave-p-editor-residual-r1; never implement in the main project checkout. Preserve r3 candidate 48ade197eb508273168f62384141f8d1dde854ec and test anchor 5899dae6057d73a852b37617635e823d2e388c58 for independent Codex review: author receipt is not acceptance or done. First read AGENTS, phase2 READ-FIRST, /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md latest Codex review, the common glm-tenfold-triple protocol, targets, and your wave-P README/contracts/browser evidence. Continue the already approved P02 residual then P03-P10 batches, not another pass of the same closed narrow rework. Targets remain 700 legal nonduplicate cases, 70 groups, 50 valid controls, 20 real functional flows; r3 reports 67 cases/14 groups/10 controls/18 flows, so remaining case count is 633, not the stale 630. For each new contract record exact production condition/caller, legal typed input, old test fullName and assertion anchors, precise observable business result, and classification before coding; differing names or numbers do not establish novelty. Prioritize actual frozen uncovered branches and public workflows; seven axes are creation/edit/delete-reference/undo-redo/cancellation-failure/keyboard-focus/late-resource-ownership where genuinely available. Use new *.glm-p.test.ts(x), dedicated src/__tests__/glm-p fixtures and wave-P evidence ONLY. Production, old tests, shared fixtures/configs/docs/cards/board, baselines, O/Q, real PAL projects and saves are read-only. Keep dispatch 8b3ca062953b17a12178f8d1a9e36657971234b1 and freeze 3ac9a2e2f6aba8a5cc97640c18fef8549d199380 unchanged. No private state backdoors, business-core mocks, unsafe casts/ignore/timeout increases or quality-rule weakening. Preserve healthy r3 evidence; F14/F18 are unproven, not accepted or automatically waived. Reproduce only those missing functional phases in your own isolated synthetic project when needed, record real before/action/after screenshots+hashes+console and legal error recovery, never story routes/E2E002 or another agent's browser. Keep runtime lab outside tracked project directories with a reproducible white-listed recipe. Counter controls must run in temporary copies with original/mutated/restored JSON/raw/exit codes/execution sets, exactly one designated business assertion failure and final source SHA256; re-collect affected controls after test changes instead of patching hash fields. Validate directed and adjacent tests plus typecheck per batch; commit and push milestone evidence then CONTINUE the next legal batch without asking the user to relay. Final serial Editor full test/typecheck, root lint complete 0 errors/0 warnings/0 infos, docs/diff/full verifier, final file x fullName x status JSON and honest remaining ledger with complete candidate SHA. Chinese evidence is welcome. New product truth, defect, missing legal input or freeze drift stops only the affected group with evidence; continue other approved groups. Do not merge main, mark done, clean worktrees or run official ratchet/protected-fast. Codex independently reviews fixed commits and settles official main-union coverage.
```

## 下一位 Agent 提示词

当前无用户转发提示词。由本对话 Codex heartbeat 按上方路由直接巡检与续派；
先核 UI 输入通道和实际工作中状态，再核交付 SHA，不能将本卡历史快照当作最新状态。

后续撤回覆盖本节：不再由heartbeat或Codex直接发送，最新各卡提示词由用户手动转发。

## 2026-10-01 19:25 JST 巡检与固定候选预审

- P 归档确认框仍未解除，有限重试无变化；未归档/未新建/未派发第三槽，不重复请求相同用户动作。
- O 新增4枚阶段提交，观测tip `d0bb58f95065f6d83ecbf9c21d33a0ba61863c45`；Q 新增
  `battle-action-error-arms.glm-q.test.ts`。只有Git活动证据，UI被模态挡住，不冒称新UI运行核验。
- [P/Q固定工具与证据预审](../../../../testing/glm-tenfold-triple/codex-zcode-pq-preflight-20261001.md)
  已落各原卡：P10个作者自测绿但4个拒收反例误收，patch索引10/10旧值；旧业务三态/hash对应。
  Q39枚index/meta/三态hash复算对应，但receipt所写完整候选SHA不是有效提交。
- 本卡历史快照及此前续派转录了Q错误值，当前必须使用真实测试候选
  `9da8354d4e7c706d0c9e1fc70035b351807bf3a3`，文档pin `86d2a4c42925ce636691ca573baa5eada94e940e`。
  不把40位字符串或作者receipt当对象真实性证明；新交付一律git rev-parse/cat-file复核。
- 上方P单行续派需加最新原卡窄补充：先修判据/恢复相/mkdtemp及10枚索引，再连续补残余。
  Q仅待发送receipt有效对象窄补充，不打断运行、不得为重复提示再排同任务。
  本轮零新UI消息、未动活动贡献者源/产品/main；未跑整包/官方门或结算。
- 提交前再次核UI时，支持工具返回 Mac已锁屏、自动解锁失败，需用户手动解锁。
  立即停止桌面动作，不输入凭据/绕锁或更改安全设置；heartbeat保持启用，宿主未变时静默。
  锁屏后的三槽实时UI状态未知，不能沿用旧“工作中”快照；解锁后先重新核会话/队列，
  再按已有待办续派，不重复发送或假定P已经归档。

## 2026-10-01 19:53 JST 新交付与归档核验

- UI不再报锁屏；旧P实际在可恢复归档列表，标题/type-pal匹配，活动项目仅O/Q。
  原P r3 SHA/证据保留、树干净；归档不等于卡done，不重复请求旧确认框处理。
- 面板关闭/导航/快捷键有限重试无可验证变化，坐标仍noWindowsAvailable；
  零新消息/零替换P启动，不无限重试、不增加第四槽。O/Q实时运行状态未新核定。
- 新固定O测试树 `590dd57ab867519281065c7aadc998b263907ae3`，docs pin
  `894641a41be1d7099abda08c3b170b84007d39f5`；Q测试树
  `63129473574ac21a082d1c5902b1fddfe62b02d7`，docs pin
  `c05edb4e9fb4b32bf258848e2581a53137288650`。后续区间均仅receipt.json。
- [O r4/Q r5预审](../../../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.md)、
  [机器账](../../../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.json)已落原卡：
  O442账仍模板、六针执行集漂移、末尾格式；Q123有缺字段强转/两重复、44针证据对应，
  旧无效候选对象问题关闭，窄修后只重采受影响针。
- 下一轮先核实际UI，补P原卡judge/恢复/mkdtemp/10索引最新窄项，再连续P02–P10；
  O/Q只在空闲无相同排队时直发最新原卡窄项再续余族，用户无需转交。
  不将作者闭合当accept，700/组数/50及P20流程保留、原冻结/白名单不变。
- 本轮仅固定blob/diff/格式对照/三态执行账，不写活动树、不新跑重门/合main/正式结算。

## 2026-10-01 20:13 JST 静态调用链补核与有限输入尝试

- O/P/Q HEAD及干净状态未变，不重复同SHA整包/反控重门。
- 归档面板已关闭，首页 composer 聚焦后完整单行 ASCII typeText 读回仍空、发送按钮禁用；
  未按 Return，零新消息/零替换P启动。O/Q当前运行/队列仍未知，停止本轮UI重试，
  不重复通知旧输入阻塞或要求用户搬运。旧P可恢复归档证据保留。
- Q-R5-03已核一手：`shared/src/tables.ts:562` 已声明 `PlayerRole.magic?: number[]`；
  `game-state.ts:569/1577/1670` 公开 runtime 投影及 `shell/bootstrap.ts:1197` 真实 caller
  证明合法已学法术输入现成，不须补产品字段。候选/冻结五个blob逐字一致；
  [补核详情](../../../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.md)及
  [机器记录](../../../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.json)已补原卡。
- Q下次空闲无同任务排队时直接发原卡最新 ASCII 补充，撤回magic blocked-input误记，
  排重后续原合法余族；不放行learnedSpells fallback、不改产品/冻结/范围。
  其余O/P/Q窄项及700/组数/50目标原样保留，本轮未新增业务通过数/覆盖结算或accept。
- 本审核树 docs 为822 Markdown/4357链接/247卡、0问题；lint2751文件完整
  0 error/0 warning/0 info，配置格式与diff零。仅审核文档收口，不替代贡献者最终门。

## 2026-10-01 用户纠正后的投递/停止记录

- 原O/P/Q HEAD未变、树干净。Q正确会话空闲后输入最新窄项，移除键盘传输丢失的
  标点、改成无特殊标点的完整 ASCII prose，已核完整读回；实际出现第7条用户消息。
- Codex随后两次Return后又以旧发送索引补点击，快照曾显示工作中/停止生成。
  用户指出Q已被停止；新绑定**直接确认最新一轮“已停止”**。撤回“Q仍在执行”表述；
  这是操作失误，不归责于用户，也不把中途运行快照算持续执行证明。
- 今后每条发送总触发只一次（回车或点击二选一），触发后只读；即使仍见旧标签也不能
  补触发。该约束已加入上方规则，并同步同一个heartbeat，不改频率/通知意图。
- Q已送达指令保留，不重发整包；恢复第7条的短提示**尚未输入/发送**，工具先报
  user changed，最新界面为用户打开的模型菜单。有限选择/键盘尝试没有核实选中改变，
  不能称已切5.3或恢复Q；停止本轮UI动作，不继续点菜单/发送或请求搬运。
- O输入尝试报cgWindowNotFound，零新O消息；P仍无替换槽启动证明。最多三槽/单Owner
  不变。下一轮先只读核Q是否已恢复/有排队；只有明确已停止、未由用户恢复且无队列，
  才用原Q卡的短恢复一次发送。O/P依旧按最新窄项，未跑重门/合main/结算。
