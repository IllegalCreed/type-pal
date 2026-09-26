# Codex 当前迁移汇总回归

任务：[TEST-CODEX-MIGRATE-ASSEMBLY-1](../../ops/archive/tasks/done/TEST-CODEX-MIGRATE-ASSEMBLY-1-current-aggregation.md)。
基点f81d365f。49新测试、六代表反控、完整check/ratchet/受保护单次strict全部通过。

| 组 | 既有证明 | 新增边界 |
|---|---|---|
| records | migrate-content.test.ts「全量护栏零命中」「6角色齐」；pure records | 实际数组地址/显隐标签等价、跨域描述诊断、全输入与两次结果隔离 |
| equipment | 同文件「demo7件手作装备」；pure equipment | 汇总flags门、无slot不生成装备、带pending的已知效果与身份接线 |
| use | 同文件「观音符/茶叶蛋」「炼蛊皿」；pure item-use | 汇总优先级、battleOnly/target/menu/sound接线、失配整件诊断 |
| throw | 同文件「0x42只在零玩法参数」；pure throw | 真实OBJECT→MAGIC解析、拒非视觉源、冲突整件诊断，不注入替代resolver |
| enemies | migrate-enemies.wave2.test.ts叶映射 | 真实mapEnemies→技能闭包，fallback与hook共同补齐/去重、来源缺失、团队联结 |
| diagnostics | full-only全量pending总账 | 逐类归属精确id/name/address与有损接线，拒绝后实际输入不变 |

不运行主树migrate/bake，不把中间throw结果称为已过canonical；当前buildPalMigration会随后执行overlay。

## 本席验证

- 新49项（records5/equipment4/use10/throw11/enemies11/diagnostics8），相邻并集14文件150项绿。
  `/tmp/codex-migrate-assembly-{directed,adjacent}.log`。
- migrate typecheck、9个新增代码文件Biome、docs与diff-check通过。
- [六针runner](mutants.mjs)与[隔离load配置](mutants.config.mjs)：地址前检、装备flags门、
  Store0选择、OBJECT/MAGIC关联、hook技能闭包、禁止发布半截use。每针唯一file/fullName/运行期hit；
  6对照绿+6业务AssertionError红，同一judge拒非exit1/错标题/普通Error/混错/timeout，生产hash不变。
  JSON/log目录：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-migrate-assembly-mutants-Xs0Urq`。
- 两次准备失败如实披露：首次TC因新fixture未声明messageIndex（不是产品错误），补typed字段后绿；
  首次反控地址守卫字符串出现两处，唯一性断言拒绝，收窄到migrateAll本身后12跑通过。
  没有把零执行/工具错误当有效红；未改变任何旧断言。
- 完整`env -u NODE_COMPILE_CACHE pnpm check` exit0：七包9,028项（migrate85文件672项）；
  根Biome既有60warning/6info，本批代码0诊断。日志`/tmp/codex-migrate-assembly-check.log`。
- `env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=f81d365f pnpm coverage:ratchet`
  exit0：8,536fast/701生产文件。其它六包完整baseline对象不变，所有生产分母不变。
  日志`/tmp/codex-migrate-assembly-ratchet.log`。

| 指标 | 批前 | 本批ratchet | 净增 |
|---|---:|---:|---:|
| 分支 | 43,945/63,178 | 44,114/63,178（69.82493906106556%） | +169 |
| 行 | 55,722/70,600 | 55,856/70,600 | +134 |
| 语句 | 61,941/80,643 | 62,089/80,643 | +148 |
| 函数 | 11,454/15,058 | 11,475/15,058 | +21 |

migrate分支3,682→3,851/6,436；相对整个持续目标起点累计+696分支，剩余2,463。
本批属于fast同口径常驻证据，不声称原盘full首次证明；`source-special`为未知源类型的诊断/兜底防御轴，
不是声明PAL正式表已有该类型。未涉及视觉/E2E/full覆盖或迁移写盘。
ratchet后基线SHA256：`578637a239b4ea15ac0596fae38ce3bc35e8dac9bc9e78e79103bdeb34a5651e`。
`env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=f81d365f pnpm coverage:fast` 单次exit0，
8,536项/701文件，与ratchet所有统计一致，基线hash不变，未重试取多数。
日志`/tmp/codex-migrate-assembly-strict.log`。2026-09-26 Codex按当前独立实施模式核定子卡accept/done；
总体+5pp目标仍在执行，不把本批收口称为总目标完成。
