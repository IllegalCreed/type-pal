# GLM剩余边界大批回执（二）

范围：[六组72检查点工作包](glm-pre-e2e-boundary-batch-2.md) r1，2026-09-14。
产品冻结：70e3f62770bbe0a23c4b9d90c31258a3d2883772。贡献者：GLM；接收复核：Codex。
状态：**GLM已交付，待Codex接收复核**。本批为卡前只读取证/可运行诊断/回归草案，不是修复声明。

## GLM执行回执

- 起点/分支：worktree `/Users/zhangxu/illegal/type-pal-glm-b2`，分支 `codex/glm-pre-e2e-boundary-batch-2`，
  起点提交 c5152fcf（工作包落盘），`git diff 70e3f627..c5152fcf -- packages scripts` 为空（冻结核验通过）。
- 六组独立提交：A `9ed7f3d8`、B `e77915af`、C `592f08ea`、D `6aa3ef46`、E `4ba47f82`、F `de30cdd7`，
  补账 `557e162e`（A-ok/E03 记录补齐）。白名单新增恰六诊断 +
  [机器账](glm-pre-e2e-boundary-batch-2-evidence.json) + 本回执区；packages/scripts/projects/data/reference/锁文件零 diff。
- 72行机器账：`docs/testing/glm-pre-e2e-boundary-batch-2-evidence.json`（每行唯一ID/组/分类/证据摘要，
  由六组 observe 日志程序化汇总）。**分类小计：covered 48 / reproduced 5 / risk 19 / blocked 0 / N/A 0 = 72**
  （A 7覆盖+5复现；B 10+2风险；C 8+4风险；D 11+1风险；E 12覆盖；F 12风险全静态）。
- 诊断入口（`--mode=observe|contract` + `--case ID|all` 双模式；真实实现+内存宿主）：
  - A：`node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-async.mjs`（16记录；contract 在 A03 业务红）
  - B：`node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs`（12记录；obs/con 均 exit0）
  - C：`node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-battle-result.mjs`（13记录；obs/con 均 exit0）
  - D：`node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-battle-actions.mjs`（12记录；obs/con 均 exit0）
  - E：`node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-migration.mjs`（12记录；obs/con 均 exit0）
  - F：`node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-coverage.mjs`（12行静态盘点 exit0）
  - 日志：`/tmp/glm-b2/{A,B,C,D,E}-{observe,contract}.log`、`F-static.log`（可由仓内入口重建）。
- 逐组证据要点（正控/反控/观察与待证详见机器账 detail 列）：
  - **A**（异步提交/取消）：A01/A02/A04/A05/A06/A07/A08 覆盖（换图成功/预载失败后覆写仍存+可重试/
    非当前场景不走现场 reload/选择变化/不变/use-disabled-inherit 消费域/无关世界变化不清除）；
    **5 reproduced**=A03/A09/A10-cancel/A11-cancel/A12-cancel——提交前 abort 后 canonical 覆写或行为写入
    仍残留（与旧探针 B-09 同族，合同草案=abort 后不残留，contract 模式 A03 处业务红 exit1）。
  - **B**（保存屏障/收尾/导出）：B01/B03 confirm 期间 barrier 超时放行（60ms 诊断 vs 生产 10000ms）、B02/B04
    非 confirm 正控、B05 限时内/超时/重试三态、B06 取消后 barrier 收尾+后续保存可用、B08 旧链 gate-abort
    终止后新 runtime 权威（不 fake invoke）；B07/B10/B11 主壳 census（detached 3 入口+桥接、runner 槽/
    startScript guard、capture/dumpSave），B09/B12 risk（主壳 finally 时序/导出恢复链需浏览器壳域）。
  - **C**（战果/终态）：真实 PAL 偷取链 C01-C06（新偷物 writeBack 丢弃=原树 C-04 审计项、逃跑留偷物（战内）、
    已有数量×2、战内空不改世界、净结果=新增不落、同 ID count 覆盖）；C07 养蛊/C08 战败域/C11 双死顺序 risk
    （Q2/待裁决）；C09 引用旧探针毒杀观察+正控；C10 死亡终态 fixture 未致死→risk；C12 空 step 经验不变。
  - **D**（目标/附带/菜单）：真实敌附带链 D01（毒经敌攻）/D03（sleep+healHp-1 复合）/D04 抗性门禁对照只列不删；
    D02 risk（silence 未见日志）；D05-D08 复活/治疗/合体技分类（fixture 骨架+数据层 target 契约，真实施放链 Q2）；
    D09-D12 真实按键路由（父→子菜单/双能力并集/同键序对照/预占最后一件）。
  - **E**（迁移/旧接口）：内存 repo+mktemp 本人父根内 symlink（首写前校验全路径属根）；E05 无链接正控、
    E06/E07 逐级 lstat 守卫捕获父链/多层链（migration-transaction.ts:76-82）、E08 经链接写入真实落点
    realpathSync 在 repo 外；E09/E10/E11 dense enemies（@deprecated 标注/497 dense 调用计数）、
    battle-anim targetIdx 28 处、translate-events 12 文件 census；E12 不得删合同+删除候选白名单（不实际删除）。
  - **F**（七包覆盖缺口）：主树 coverage/fast 各包 summary（关键源码 hash 已核与冻结树一致）+ baseline 盘点；
    F01-F07 各包缺口与最高价值真实调用点、F08 文件优先级、F09 可实施用例草案（含命令）、F10 ts-nocheck 计数
    与动态举证原则、F11 classified 分栏原则、F12 去重分流（不发明 90% 门槛）。全静态不虚标动态 covered。
- 过程失败（全部已修复/绕开，未改产品）：A03 初版 reloadMap 挂起未随 signal 拒绝→宿主监听 abort；
  A07 inherit/disabled 携 value 被校验拒绝→按 Selection 联合类型拆分；A10-A12 实体 fixture 的
  behaviors/pages 形状三轮修正；B 组 digest 需 64 位 hex、B05 计数时机、B06/B08 挂起 confirm 改 gate-abort；
  C 组 writeBack 语义按源码（:2450-2456 只覆盖世界已有 ID）修正断言方向、C10 fixture 未致死降 risk；
  D 组 mockBattleAssets 需按队伍数、party 长度校验；E 组 vite 需从 reforge 解析、跨包 SSR 路径、
  resolve→realpathSync；F 组模板字符串 `pal-extract` 中划线解析为减法。旧探针五条基线复跑全 exit0。
- 根因归并与后续归属：A 组 5 复现（提交前 abort 写入残留）→ D-01 同族全局历史 cancel 域（已 done，
  列 Codex 复核是否重开）；C 组新偷物丢弃 → C-04 审计修复卡；B01/B03 barrier 时序 → B-06/B-07 域；
  E09-E12 旧接口退役 → N6b 前清理卡；Q2/R4 按现有排期。可转正式回归最小集：A03/A09/A10-A12 cancel
  不残留合同（双模式已具备）、C01/C03 偷取写回矩阵、B05/B06 barrier 三态、E06/E07 symlink 守卫。
- 环境边界：五个旧探针只读复跑；主树 coverage 只读（hash 一致性已核）；本人 tmp 日志标注产品 SHA/命令/exit；
  未运行全仓 check/coverage/ratchet、真实迁移 CLI、浏览器/视觉；未读写用户数据/浏览器存储。

## Codex接收复核（保留，不由GLM填写）

pending：尚无候选。接收须核冻结树、反例合法性/鉴别力、静动态分类、计数/白名单与可重建性；
接收取证不代表产品已修，后续正式回归与实施仍按各卡准入。采用GLM材料须披露贡献。
