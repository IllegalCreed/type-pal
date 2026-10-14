# CODE-QUALITY-96 — sell 测试精确退役保护账

Status: build
Owner: Codex
Reviewer: Codex（独立验收）
Phase: ops
Capability: coverage precise test retirement metadata
Visual Verification Timing: N/A（工程保护账，无产品/UI修改）

## 目标与白名单

按用户“测试少而精、确认重复必须精简、重新实测官方基准”的授权，把 CODE93 已证重复缩表用例的真实退役登记到官方精确保护账。只改：

- `scripts/coverage/approved-test-retirements.mjs`
- `scripts/coverage/approved-test-retirements.test.mjs`
- 本卡、CODE93 证据/账本/导航。

## 前提与直接证据

原 `sell-menu.glm-phase1-leaves.test.ts` 第三例与主 `sell-menu.test.ts` 的 `refreshSellGrid` 非空缩表同合同：前 cursor 在被移除末项，刷新后 clamp 到新 `length-1`。CODE93 删除重复、保留主 oracle，未删生产范围。

`run.mjs:386-402` 要求真实 test-count 删除用 `--allow-scope-removal` 确认；`:415-466` protected 检查还要求精确历史 count、两端 execution identity digest 和当前文件 SHA。原完整 ratchet 实测全部19874 tests/731 sources通过、指标提升，但在 scope acknowledgment 处 exit1；protected 未启动，原件保留。

精确源证据 `docs/ops/evidence/CODE-QUALITY-96/test-retirement-proof.json`：原 baseline 与 origin/main 均3例/相同 digest；当前2例与完整文件 SHA 已由机器读取。最强替代解释是删掉独有行为；主测试仍完整执行相同非空缩表合同，3针反控与相邻96 tests通过，反证成立。

## 准入与边界

Codex build allowed：只新增这一精确批准数据项，更新冻结账数量断言。predicate、扫描范围、生产源码/包删除禁止、阈值、ignore/exclude、provider、timeout全部不变；不提供通用移除开关，未来字节/身份/count不符仍拒绝。

当前规则/用户测试精简授权已涵盖确认重复的删除；这不是降低门槛或产品兼容 fallback。schema/save、公共函数签名、第一阶段机制、资产管线与 UI均 N/A。

## 验证

- `node --test scripts/coverage/*.test.mjs`：包括 exact-approval 正控及所有拒绝/冻结反例。
- 白名单 Biome、全仓 check/lint/docs/ledger；官方 `pnpm coverage:ratchet --allow-scope-removal` 重新完整采集，不手改 baseline。
- 随后真实 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`；最终失败时继续 review，不把旗标当通过。
- 新登记两个工具文件先 review；机器 PASS只证账本完整性，不代替语义核验。

无下一位 Agent 提示词，同一 Codex 继续；CODE93/96 全部门通过后收口，CODE95三份旧测试 counter 独立保持 review。

## 当前检查点

- coverage 工具59/59、docs/content-review、lint4049零诊断通过。第一次新全仓check被真实账本测试拒绝：两条工具记录误放在表区外，declared21review/actual19review；已归位，失败原件保留。
- 原ratchet全部19874测试/731源码已通过采集，只有精确退役确认门未过；其exit1保留，protected未启动。下一步按原门重跑check，再用明确allow-scope-removal官方命令与protected。

## 全仓检查检查点

`VITEST_MAX_WORKERS=1 pnpm check`真实exit0：7包typecheck和各包测试均通过；最终lint4051/0/0/0，无React act/Unhandled/Warning诊断。退役工具59项、quality工具37项与docs/content-review通过。当前官方ratchet带精确退役确认正在采集，之后串行真实protected；exec session **93008** 必须续接，旧68449/39466已经失败终态，不得当成活进程或通过。四条sell与两条保护账仍review。

用户要求本部分完成后Codex停止；后续GLM候选已推送abf284d75，不领取新pending。当前goal服务返回null，本机automations目录未找到旧type-pal-goal-recovery配置；view只渲染卡片，pause工具因缺现存完整配置拒绝，未宣称定时任务已暂停。后续heartbeat不授权越过用户停止指令继续工作。
