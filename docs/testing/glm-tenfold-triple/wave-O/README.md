# Wave O：当前供应链与内容守卫十倍包（部分交付，申请范围调整）

Owner GLM O；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-o-supply-validation-r1`
（自派发提交 `8b3ca062953b17a12178f8d1a9e36657971234b1` 建独立 worktree）。
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；verify-targets --wave O 通过（白名单内 194 路径、冻结 hash 有效）。

## 交付状态（r9）：469 执行/净新上限 468、62 反控/60 不同目标（O-R8 闭合）

Codex 2026-10-01 counter 的 O-01/02/03 已闭合（见 [receipt.json](receipt.json).reworkFixes）：
lint/diff 零诊断、17 处类型桥改 typed 合法 fixture、44 枚反控补齐恢复后真实执行三态。
COMMON-01 按原范围继续推进，但本轮会话仍未到 700 —— 余量逐批如实列示，不凑数：

| 批 | 用例（唯一主映射） | 反控 |
|---|---:|---:|
| O01 | 72 | 5 |
| O02 | 66 | 5 |
| O03 | 31 | 5 |
| O04 | 37 | 5 |
| O05 | 48 | 5 |
| O06 | 42 | 7 |
| O07 | 35 | 4 |
| O08 | 68 | 4 |
| O09 | 44 | 6 |
| O10 | 26 | 6 |
| **合计** | **469 执行（净新上限 468†）** | **62（60 目标）** |

† resources.herb=0 为同条件 cross-check 不计净新；O08-CC8/9、O09-CC13 三针目标已删退役（历史保留）。

multi-batch 合同记入首个批次（O01/O03→O01、O03/O05→O03、O06/O08→O06、O08/O09→O08）；
此前的 593 为批次表相加口径（重叠双计），已改用唯一 case→batch 主映射，批次覆盖域不变。

- [directed-vitest.json](directed-vitest.json)：469/469 全绿（r7 审核扣除 item-equip 六条旧合同后的净计数）（最终实跑，含全部 file/fullName/status）。
- [contracts.json](contracts.json)：**逐合同账**（r8 全量真账、469 条（oracle=完整断言、oldAssertion=行号锚）（含 r6 审查的 existing-proof 扣除）：source/caller 取自真实 import 域、
  oldAssertion 为旧测 fullName token 匹配锚点、oracle 从测试体括号平衡提取首条断言，0 条模板残留）；
  enemy-ai 中与 battle-formulas.test.ts:219-224 重复的 canAct/canCastMagic 5 断言整例删除不计。
- [counters.json](counters.json) + [counters/](counters/)：**62 枚有效三态反控/60 不同目标（≥50；3 枚退役保留历史）；判据源 [counter-judge.mjs](counter-judge.mjs)（runner 与 [run-counter.selftest.mjs](run-counter.selftest.mjs) 27 用例共用，含整段 0→1→0 生命周期正控与 collection/runtime 反例）**
  （control 全绿 → injected 恰一目标业务 AssertionError 红 → restored 恢复后真实重跑全绿；
  patch 以 --unidiff-zero 重建并校验字节 = mutatedSha；候选树零改动）。
  r5：O08-CC1/CC2、O10-CC2/3/4/5 六枚执行集漂移已按最终测试源重采；其余 50 枚控制证据保留。
  r6：新增 O08-CC6/7、O09-CC11/12、O10-CC7/10 六枚（含换针重打），计 65 枚（r7：O08-CC8/9、O09-CC13）。
- [coverage-delta.json](coverage-delta.json)：migrate 同分母（fast 口径）st 82.753% / br 84.344% /
  ln 82.458%，**三项比率门全部高于旧比率**（77.246/75.667/78.663）。官方 baseline 未触碰。
- [receipt.json](receipt.json)：全部门禁（三包全量 test、三 typecheck 0 诊断、根 lint（文件数以最终跑为准）
  0/0/0、docs 0 问题、git diff --check 干净、verifier --wave O 通过）。
- [defect-report.md](defect-report.md)：DEFECT-O-1 维持“疑似 generic-JSON 问题”降级表述
  （缺 canonical stable-id/cue 证据，不证明合法作者文档可达），不修产品。
- **r3 闭合**：O-R2-01 七处禁止桥与两处 oracle 已修（详见 receipt.reworkFixes.O-R2-01）；
  三个 JSON 格式诊断清零；回执数字按最终实跑同步（migrate 704 / content 1351 / shared 145 /
  lint 3037 文件）。

## 剩余范围（未到 700 的如实账）

r6 新增：item 执行器效果分支（healHp/healMp 钳位+消耗、scaleCurrentHp trunc、
gate 显式阈值、menu 透传、applyPoison 统一入口）、敌脚本 guard（fallback chance 域、
hook 状态结构、AI 聚合）、世界变量 fresh-record/sys: 保留轴、YJ2 长流确定性、
RLE 编码器 0x7F 分段/偶对齐 pad、MKF 容器——共 +33 例净增（468 报告 − 2 条 r6 扣除 + 9 条 r7 equip/资源/curePoison 新轴）、9 枚新反控（计 65）。

以下子域尚未建模（缺口至少 232 例），非“不可合法构造”证明；后续按同法（typed 合法 fixture +
真实公开入口）继续：locale 大表/ rich-text 嵌套轴、script.ts 执行器深域、
bake-assets CLI mkdtemp 临时工程、migrate pal-assets 真实语料 census 轴
（loadPal* 需 extracted corpus，属 fast 排除域）、world-sprite layout 语义深域、
equip/throw 效果域、ambience/skill 深域。

## 合成 typed 工程（本波核心资产）

[src/__tests__/glm-o/supply-fixture.ts](../../../../packages/migrate/src/__tests__/glm-o/supply-fixture.ts)
在纯合成数据上复刻真实 PAL 的全部 census 合同（49 方案/11 root/4 machine、商店 29 buy/6 sell、
伤亡 36 键 locale、51 别名锚点、636 精灵帧数表），使 publication/supply/守卫全套真实入口可在
unit 层（fast 覆盖口径）充分验证，不读真实工程、不写盘。

## 未完成范围与原因（真实残余账）

O01–O10 全部批次已有交付（见上表唯一主映射）；**余量 234 例**为各批深域：
locale 大表/rich-text 嵌套轴、script.ts 执行器深域、bake-assets CLI mkdtemp 临时工程、
migrate pal-assets 真实语料 census 轴（fast 排除域）、world-sprite layout 语义深域、
equip/throw 效果域、ambience/skill 深域。已交付部分不含凑数用例（r6 审查指出的
2 条重复/伪证轴已扣除并登记 existing-proof）；缺合法轴的子域逐项举证后申请调整。

r6 审查闭合项保留：七桥/两 oracle/canAct 删重、六针漂移重采；r7 新闭合：
item-use 全 typed（O-R6-02）、gate 失败轴去重与标题诚实化（O-R6-01）、
runner 判据收紧+stderr+局部清理+13 用例自测（O-R6-03）、最终树实数回执（O-R6-04）。

不合 main、不标 done；done 准入仍按卡面 blocked。
