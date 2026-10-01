# TEST-GLM-ZCODE-DISPATCH-1 — ZCode 三路覆盖率补测持续调度

Status: build
Owner: Codex（调度、独立验收与正式结算）
Reviewer: Codex（贡献者交付独立复核；本卡不代替测试卡验收）
Phase: ops
Capability: ops / test-coverage
Visual Verification Timing: dev-functional（ZCode 操作验证）

## 目标与授权

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
| O / TEST-GLM-WAVE-O-1 供应验证十批测试 | GLM O；`/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal` | [O 卡](TEST-GLM-WAVE-O-1-supply-validation-tenfold.md) |
| P / TEST-GLM-WAVE-P-1 编辑器残差十批用例 | GLM P；`/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal` | [P 卡](TEST-GLM-WAVE-P-1-editor-residual-tenfold.md) |
| Q / TEST-GLM-WAVE-Q-1 runtime residual tenfold | GLM Q；`/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal` | [Q 卡](TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md) |

分支分别为 `codex/glm-wave-o-supply-validation-r1`、`codex/glm-wave-p-editor-residual-r1`、
`codex/glm-wave-q-runtime-residual-r1`。包目录独占、白名单、派发与冻结仍按
[共同协议](../../testing/glm-tenfold-triple/README.md)；本卡不批准贡献者修改共享文件。

## 前提与上下文

纯调度不改变产品、schema、机制或真实工程数据，产品前提真值门 N/A。
实际工程前提是能经受支持的 UI 接口读取并发送 ZCode 消息；2026-10-01 重建连接后，
O/Q 英文续派消息实际送达并出现工作中/停止生成。反证是输入未出现、消息未送达或没有运行指示；
遇此必须记录调度阻塞，不能从作者回执或窗口可见推断任务已启动。

- [根协议](../../../AGENTS.md)、[当前工作流](../agent-workflow.md)。
- O/P/Q 原卡及其中最新 Codex 审查、[共同协议](../../testing/glm-tenfold-triple/README.md)。
- [二阶段纪律](../../phase2/READ-FIRST.md)；Q 的 game/pal-extract 独立遵守第一阶段纪律。
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
7. 独立审核按各卡比例风险执行 test/typecheck、lint/格式完整 0/0/0、docs/diff/verifier、
   反控/排重/必要视觉。通过后串行全仓 check → 官方 ratchet → 受保护 fast，再决定
   选择性集成、done、推送和退休树清理。产品问题另卡，不夹入测试提交。
8. 更新本卡及原卡的证据/下一步；相同 SHA 或相同状态不重复跑重门，也不重复通知。

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
