# 六组自包含迁移转换回归

[任务卡](../../ops/archive/tasks/done/TEST-CODEX-MIGRATE-PURE-1-self-contained-translators.md) / [总目标](../coverage-plus5/README.md)

产品冻结8add8c66。六组只调用纯转换，不写当前工程，不替代完整PAL迁移测试。
六文件83项、包TC已过，六代表反控全部检出；check/ratchet/受保护单次strict全部通过，子卡已收口。

## 去重边界

旧`packages/migrate/src/migrate-content.test.ts`依赖真实原盘/生成数据：

- :114「mapActor(role0) 与 demo 手作 li-xiaoyao 深等…」、:155 levelUp列主序、:171六精灵：本批不复制真实六角色；补独立输入缺省/非法编号/符号/实际输入隔离。
- :332门类5技、:365线性技能spot、:388有损登记：本批新增未支持/回环/缺标签/冲突声音/原始WORD与分支诊断，基本映射属于已有语义的自包含fast执行，不称首次证明。
- :245七装备、:267七形象、:293回补伪毒：本批补未知行/混合pending保留、最后形象覆盖和空可装备者，保持原golden。
- :471/490/515配方与:573/584资源池已有严格失败臂轴：只追加不同公开输入分支（入口缺失/材料与产品默认数量/完整输出与实参保真等），重叠守卫不称新合同。
- :802/818放置与:835/846投掷声音/演出：保留旧证明，新例聚焦冲突顺序、回调不返回、缺省参数、完整诊断与输入保真。

## 本席验证（2026-09-26）

- 定向六文件83/83，migrate typecheck exit0。日志 `/tmp/codex-migrate-pure-{directed2,tc2}.log`。
- [六针runner](mutants.mjs)及[隔离配置](mutants.config.mjs)：每针精确file/fullName唯一执行；
  6正控+6业务AssertionError反控；原模块SHA不变；同一judge拒exit2/null、错误标题、混错/timeout。
  针分别为actor经验别名、抗性门丢失、物品默认数量、最后形象覆盖、放置地址别名、投掷玩法参数吞掉。
  原始JSON/log：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-migrate-pure-mutants-nyNOLr`。
- 初次83项为82绿1红：测试把当前shared16分片的`shared/c12`误写`shared`，核正式哈希/分片算法后更正；
  首次TC拒绝测试的EntityAddress旧字段sceneId/entityId及presentation缺kind，改为当前scene/entity及magic。
  不是产品缺陷、未改产品。第一次mutant在Vitest4的`$name`长标题截断处未执行，已改显式逐行it，
  实际JSON精确标题复跑12轮通过；未把零执行算绿。
- 改动Biome exit0。完整`env -u NODE_COMPILE_CACHE pnpm check` exit0：七包8,979测试，
  migrate79文件/623测试，旧Biome60warning/6info（本批改动文件0诊断）。
- `TYPE_PAL_COVERAGE_BASE_REF=8add8c66 pnpm coverage:ratchet` exit0：701生产文件/8,487fast测试，
  除migrate外六包baseline对象逐字JSON一致，所有生产分母不变。日志 `/tmp/codex-migrate-pure-ratchet.log`。

| 指标 | 冻结全仓 | 本批全仓 | 净增覆盖 |
|---|---:|---:|---:|
| 分支 | 43,418/63,178 | 43,945/63,178（69.56%） | +527 |
| 行 | 55,266/70,600 | 55,722/70,600（78.93%） | +456 |
| 语句 | 61,414/80,643 | 61,941/80,643（76.81%） | +527 |
| 函数 | 11,412/15,058 | 11,454/15,058（76.07%） | +42 |

migrate分支3,155→3,682/6,436（49.02%→57.21%）；全仓+0.8341511285574086个百分点。
这属于同范围fast常驻可执行证据增量，不声称所有527臂在full历史中从未被测；去重边界见上。
Cursor隔离候选未合、未计；GLM新批尚未交付。本轮不涉及视觉/full覆盖/E2E。
`env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=8add8c66 pnpm coverage:fast` 单次exit0：
8,487/701，全部计数与ratchet一致，无重试取多数。日志 `/tmp/codex-migrate-pure-strict.log`。
2026-09-26 Codex按当前独立实施模式核定本子卡done；持续+5pp总目标仍未完成，剩余2,632分支。
