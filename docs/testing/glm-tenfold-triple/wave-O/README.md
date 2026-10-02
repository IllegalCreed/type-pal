# Wave O：当前供应链与内容守卫十倍包（部分交付，申请范围调整）

Owner GLM O；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-o-supply-validation-r1`
（自派发提交 `8b3ca062953b17a12178f8d1a9e36657971234b1` 建独立 worktree）。
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；verify-targets --wave O 通过（冻结 hash 有效；白名单路径随批次增长，以 [targets.json](../targets.json) 与 verifier 输出为准，194 为派发时历史数）。

## 交付状态（O-NEXT-01～03 后）：460 执行/净新上限 287、64 反控/62 不同目标

Codex 2026-10-01 counter 的 O-01/02/03 已闭合；O-R9-01～03 亦闭合（判据/typed/去重）。
**r9 续审删除 19 行旧证重复**（grid/entity-lifecycle/author-dialogue/rewards 同条件同答案，
已登记 existing-proof）；**r10 续审再删 2 行 merge 重复**（:318/:244，O02-CC2 退役）；**r12 按报告裁决再删
10 行 project-io 重复**（+ chunks 退役域不复活）；**r13 write-plan 域删重 6 行**（五旧例删除接受）+ **p13 Kimi/Grok 合并裁决**：
两快照拒收再删（next-wave:76/:81 同守卫同文案）；排序臂归旧（boundaries:57-64 +
test:166-171 已分权重 vs 字典序）仅留 map 委派新轴（Codex 去参变异独证）；
删除行补非 null 在场证据；退役行收窄诊断后缀（三守卫归旧 test:75-90，后缀 pending）；
恢复误删的 recover 清理 transactions/<id> 窄轴；**p13 续批 migration-plan 域删 7 行**
（旧 :453 hash-only 采纳两行、boundaries:30 精确 summary、旧 :48 重放零计划、
boundaries:99 输入不可变、boundaries:65+:30 kept/generated、旧 :131+boundaries:74
冲突零写盘；O02-CC4 连带退役）。
**r17**：恢复 incoming-only writes 窄轴；publication 域真账（前置两行删重、fixture
自检改标）。**r18（O-R18-01）**：修正「旧 pal.test 一个 it」错误模板（实际三 it：
:33-87/:88-229/:231-251）；角色尾保留改 existing-proof cross-check（旧 :179-191 九 ID
全序+deepEqual 更强直证）；商店拆货单臂（ID 序旧 :226-228）；268/270 拆生成基值臂
（消息同步旧 :217-225）；catalog 标题与两键断言一致。**O-next 有限证据整包**：310 固定行（23 文件）全部补真账并按臂分列——
existing-proof 160（旧 paths/ownership/overlays/casualty/labels/ASC/actor-condition/
item/asset/yj2/mkf/rle 等族同条件同答案，本轮只登记扣净新不改测试）+ cross-check 1 +
fixture 自检 2 + pending 1；mixed-subaxis 53；新轴 96；其余为已核域常规类。
**O-NEXT-01～03**：tokenizer it( 长度修复+6 例真实解析自测；点名六行五转
existing-proof（MKF 负索引/worldVariables 类型/wait 安全/stageIndex 钳制）+零哨兵
277 转 fixture-self-check、coveredBy error 语义误报撤回；mixed 四行按旧完整 matcher
拆分（sound 计数/record 与队列 tie/低/无 dex2 归旧，高 dex2 仅领未证子轴）→ 净新上限 287。
「497/487/485/475/469/468/461/456」为历史口径；净新上限=460−165 扣列=295：

| 批 | 用例（唯一主映射） | 反控 |
|---|---:|---:|
| O01 | 70 | 4 |
| O02 | 50 | 3 |
| O03 | 24 | 5 |
| O04 | 37 | 5 |
| O05 | 48 | 5 |
| O06 | 42 | 7 |
| O07 | 35 | 4 |
| O08 | 72 | 3 |
| O09 | 58 | 8 |
| O10 | 26 | 6 |
| **合计** | **460 执行（净新上限 287†）** | **64（62 目标）** |

† resources.herb=0 为同条件 cross-check 不计净新；9 枚退役针（O08-CC8/9、O09-CC13/14/15/17/18、
O08-CC11、O02-CC2）目标测试因去重删除，历史证据目录保留。

multi-batch 合同记入首个批次（O01/O03→O01、O03/O05→O03、O06/O08→O06、O08/O09→O08）。

- [directed-vitest.json](directed-vitest.json)：485/485 全绿（最终实跑重生，含全部 file/fullName/status；
  [run-directed.mjs](run-directed.mjs) 可复跑，顶层执行数与叶集合闭合校验）。
- [contracts.json](contracts.json)：**逐合同账（r9 修正）**：oracle=测试源**完整断言链**
  （共享 tokenizer [test-titles.mjs](test-titles.mjs) 全量提取，跨行/字符串/注释感知，
  0 空参/0 括号不配平——r8 及更早账本 182 空参/332 不配平已清零）；
  **O-R10-02 逐域真账**：contracts-overrides.json 已覆盖 75 行
  （merge 28/transaction 29/rewards 3/ambience 5/grid 1/rich-text 9，另内嵌 17 行）——
  含 r10 审核点名的 4 枚错锚修正与 2 行重复删除；其余 410 行 condition 仍空、
  oldAssertion 中 247 行仍为 token 近似锚（write-plan/project-io/plan/pal-*/content 守卫全域待补），
  **不以旧 join 当 closed，整卡验收前逐域闭合**。
  [build-contracts.mjs](build-contracts.mjs) 全量重建并强制不变量（违例即失败）。
- [counters.json](counters.json) + [counters/](counters/)：**65 枚有效三态反控/63 不同目标（≥50；9 枚退役保留历史）；
  判据源 [counter-judge.mjs](counter-judge.mjs)（runner 与 [run-counter.selftest.mjs](run-counter.selftest.mjs) 27 用例 + [re-adjudicate.selftest.mjs](re-adjudicate.selftest.mjs) 4 用例共用）**
  （control 全绿 → injected 恰一目标业务 AssertionError 红 → restored 恢复后真实重跑全绿；
  patch 以 --unidiff-zero 重建并校验字节 = mutatedSha；候选树零改动）。
  r9：判据修正（路径归一化保留完整 packages/包/子路径、顶层执行数闭合、逐相状态政策）；
  **r10（O-R10-01）：re-adjudicate 身份比较改 flattenTests 叶集合**（原 suite 直传折成 undefined 键恒通过），
  [re-adjudicate.selftest.mjs](re-adjudicate.selftest.mjs) 4 用例含「换 passed 邻居身份」真实拒收反例与
  suite-直传 bug 语义钉子；修后 65/65 存档再判定通过（不全量重采）；CC1/CC3/CC10 因文件变化重采。

## O-NEXT2（packet 有限实施批）

- [next2/contracts.json](next2/contracts.json) + [next2/directed-vitest.json](next2/directed-vitest.json)：
  O-NEXT2-01～12（TPFS 完整帧 provider 的 IO 顺序/压缩背压与失败身份/解码所有权与取消/
  非法块索引零 IO），12/12 绿；新文件 frame-sequence-provider-next2.glm-o.test.ts +
  next2 fixture（真 zlib + 声明式 port）；源 hash 与 packet 一致；旧证不重领；
  content 全包 1441/1441。**R1 修订**：zlib 经 node-zlib-bridge.mjs(+.d.mts) 局部真实类型桥（删 @ts-expect-error）；01/02/03 frame port 真实记录与多帧轴；09 真压缩/真解压 33 帧逐字节往返；12 转 existing-proof cross-check（旧 resource-boundaries:83-106 更强直证）。累计 472 执行/净新上限 297（Codex 旧信用 286 口径）/缺口 ≥403。

## 剩余范围（未到 700 的如实账）

r6 新增：item 执行器效果分支（healHp/healMp 钳位+消耗、scaleCurrentHp trunc、
gate 显式阈值、menu 透传、applyPoison 统一入口）、敌脚本 guard（fallback chance 域、
hook 状态结构、AI 聚合）、世界变量 fresh-record/sys: 保留轴、YJ2 长流确定性、
RLE 编码器 0x7F 分段/偶对齐 pad、MKF 容器——共 +33 例净增（468 报告 − 2 条 r6 扣除 + 9 条 r7 equip/资源/curePoison 新轴）、9 枚新反控（计 65）。

r9 续审：上述 r6 增量中的隐藏经验分配/几何反解等 19 行经逐条件复核确认系旧证重复已扣除；
新增 rich-text 标记识别残余 9 轴（未知色名/错配闭合/空内容/零间隔/同名嵌套/redAlt 交替/
大小写/孤儿闭合/内容含 <）+ CC19/CC20 两枚反控。

以下子域尚未建模（缺口至少 413 例；231/234/204/214/216/226/232/234/241/243/244 为历史口径——本轮按臂排重后真实缺口大幅扩大），非“不可合法构造”证明；后续按同法（typed 合法 fixture +
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

O01–O10 全部批次已有交付（见上表唯一主映射）；**余量 413 例**（按臂排重后的真实缺口；160 行旧证待 Codex 裁决删重/保留 cross-check）为各批深域：
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
