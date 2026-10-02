# Wave O：当前供应链与内容守卫十倍包（部分交付，申请范围调整）

Owner GLM O；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-o-supply-validation-r1`
（自派发提交 `8b3ca062953b17a12178f8d1a9e36657971234b1` 建独立 worktree）。
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；verify-targets --wave O 通过（白名单内 194 路径、冻结 hash 有效）。

## 交付状态（r9 续审后）：487 执行/净新上限 486、66 反控/64 不同目标

Codex 2026-10-01 counter 的 O-01/02/03 已闭合；O-R9-01～03 亦闭合（判据/typed/去重）。
**r9 续审对新增 28 行逐条件复核后发现 19 行系旧证同条件重复**
（grid.test.ts:30-81 / entity-lifecycle.test.ts:13-87 / author-dialogue.test.ts:17-81 /
rewards.test.ts:43-160 已同答案覆盖几何反解、生命周期引用、对话身份解析、钳位与隐藏经验分配），
已删除并在测试文件头登记 existing-proof，WORD 截断轴加强为可证伪断言（100000→34464）。
原「497 执行」为含重复的旧数；本表为去重后唯一主映射真实账：

| 批 | 用例（唯一主映射） | 反控 |
|---|---:|---:|
| O01 | 72 | 5 |
| O02 | 66 | 5 |
| O03 | 31 | 5 |
| O04 | 37 | 5 |
| O05 | 48 | 5 |
| O06 | 42 | 7 |
| O07 | 35 | 4 |
| O08 | 72 | 3 |
| O09 | 58 | 8 |
| O10 | 26 | 6 |
| **合计** | **487 执行（净新上限 486†）** | **66（64 目标）** |

† resources.herb=0 为同条件 cross-check 不计净新；8 枚退役针（O08-CC8/9、O09-CC13/14/15/17/18、
O08-CC11）目标测试因去重删除，历史证据目录保留。

multi-batch 合同记入首个批次（O01/O03→O01、O03/O05→O03、O06/O08→O06、O08/O09→O08）。

- [directed-vitest.json](directed-vitest.json)：487/487 全绿（最终实跑重生，含全部 file/fullName/status；
  [run-directed.mjs](run-directed.mjs) 可复跑，顶层执行数与叶集合闭合校验）。
- [contracts.json](contracts.json)：**逐合同账（r9 修正）**：oracle=测试源**完整断言链**
  （共享 tokenizer [test-titles.mjs](test-titles.mjs) 全量提取，跨行/字符串/注释感知，
  0 空参/0 括号不配平——r8 及更早账本 182 空参/332 不配平已清零）；
  migration-merge 30 行人工 oracle 保留；r9 保留 9 行 + rich-text 新 9 行人工条件账；
  oldAssertion 为真实旧 fullName/行锚或显式 gap 说明（token 近似匹配已不再作为排重依据）。
  [build-contracts.mjs](build-contracts.mjs) 全量重建并强制不变量（违例即失败）。
- [counters.json](counters.json) + [counters/](counters/)：**66 枚有效三态反控/64 不同目标（≥50；8 枚退役保留历史）；
  判据源 [counter-judge.mjs](counter-judge.mjs)（runner 与 [run-counter.selftest.mjs](run-counter.selftest.mjs) 27 用例共用）**
  （control 全绿 → injected 恰一目标业务 AssertionError 红 → restored 恢复后真实重跑全绿；
  patch 以 --unidiff-zero 重建并校验字节 = mutatedSha；候选树零改动）。
  r9：判据修正（路径归一化保留完整 packages/包/子路径、顶层执行数闭合、逐相状态政策）后
  [re-adjudicate.mjs](re-adjudicate.mjs) 对全部存档三态证据以当前 judge 再判定 **66/66 通过**
  （变异锚点唯一性/目标仍在当前文件/执行集一致性机械化校验）；
  执行集变化的 CC10/CC16 重采、CC19/CC20（rich-text 白名单/非贪婪）新采。

## 剩余范围（未到 700 的如实账）

r6 新增：item 执行器效果分支（healHp/healMp 钳位+消耗、scaleCurrentHp trunc、
gate 显式阈值、menu 透传、applyPoison 统一入口）、敌脚本 guard（fallback chance 域、
hook 状态结构、AI 聚合）、世界变量 fresh-record/sys: 保留轴、YJ2 长流确定性、
RLE 编码器 0x7F 分段/偶对齐 pad、MKF 容器——共 +33 例净增（468 报告 − 2 条 r6 扣除 + 9 条 r7 equip/资源/curePoison 新轴）、9 枚新反控（计 65）。

r9 续审：上述 r6 增量中的隐藏经验分配/几何反解等 19 行经逐条件复核确认系旧证重复已扣除；
新增 rich-text 标记识别残余 9 轴（未知色名/错配闭合/空内容/零间隔/同名嵌套/redAlt 交替/
大小写/孤儿闭合/内容含 <）+ CC19/CC20 两枚反控。

以下子域尚未建模（缺口至少 214 例；231/234/204 为历史口径），非“不可合法构造”证明；后续按同法（typed 合法 fixture +
真实公开入口）继续：locale 大表、script.ts 执行器深域、
bake-assets CLI mkdtemp 临时工程、migrate pal-assets 真实语料 census 轴
（loadPal* 需 extracted corpus，属 fast 排除域）、world-sprite layout 语义深域、
equip/throw 效果域、ambience/skill 深域。

## 合成 typed 工程（本波核心资产）

[src/__tests__/glm-o/supply-fixture.ts](../../../../packages/migrate/src/__tests__/glm-o/supply-fixture.ts)
在纯合成数据上复刻真实 PAL 的全部 census 合同（49 方案/11 root/4 machine、商店 29 buy/6 sell、
伤亡 36 键 locale、51 别名锚点、636 精灵帧数表），使 publication/supply/守卫全套真实入口可在
unit 层（fast 覆盖口径）充分验证，不读真实工程、不写盘。

## 未完成范围与原因（真实残余账）

O01–O10 全部批次已有交付（见上表唯一主映射）；**余量 214 例**为各批深域：
locale 大表、script.ts 执行器深域、bake-assets CLI mkdtemp 临时工程、
migrate pal-assets 真实语料 census 轴（fast 排除域）、world-sprite layout 语义深域、
equip/throw 效果域、ambience/skill 深域。已交付部分不含凑数用例（r6 审查指出的
2 条重复/伪证轴已扣除并登记 existing-proof）；缺合法轴的子域逐项举证后申请调整。

r6 审查闭合项保留：七桥/两 oracle/canAct 删重、六针漂移重采；r7 新闭合：
item-use 全 typed（O-R6-02）、gate 失败轴去重与标题诚实化（O-R6-01）、
runner 判据收紧+stderr+局部清理+13 用例自测（O-R6-03）、最终树实数回执（O-R6-04）。
疑似产品缺陷单列 [defect-report.md](defect-report.md)（稀疏 pages merge 数组空洞，
未证明 canonical caller 合法，不夹修产品，待 Codex 裁决）。

不合 main、不标 done；done 准入仍按卡面 blocked。
