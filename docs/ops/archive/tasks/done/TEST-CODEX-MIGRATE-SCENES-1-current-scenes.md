# TEST-CODEX-MIGRATE-SCENES-1 — 当前场景迁移六组回归

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（内存数据转换，无剧情观感或生成工程写盘）
Production Base: `20544351`

## 准入与前提

[持续目标](../../../tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md)第三批。2026-09-26 Codex核定 build allowed，
只新增真实内存入口回归，不改产品/旧测试/配置/资产；GLM content与Cursor editor白名单不重叠。

| 方向 | 一手证据 | 本批边界 |
|---|---|---|
| 提取输入 | `packages/migrate/src/source-facts.ts:12-20/66-73` | typed SourceCmd；0x46像素/菱形换算不变 |
| 原版/第一阶段 | `docs/phase2/reference/phase1-knowledge-harvest.md` W；`migrate-content.test.ts:975-1259` | 已有原盘golden保留；不重新裁定玩法或资源真值 |
| 当前二阶段 | `migrate-content.ts:2078-3313`、`pal-migration.ts:390` | 现行current-r13-6b/stable-id，真实注册表/翻译器 |
| 目标 | 入口/实体/遇敌/脚本同步/会话/战场传播六组 | 验证真实产物、同一输入保真与可证伪反控 |

最强替代解释：一些臂已有full-only原盘证明。新增矩阵补独立优先级、拒绝边界、完整输出与
隔离性，不把fast执行增加包装成新机制发现。产品策略争议另记，不借本卡修行为或主树重迁。

## 白名单与验收

- 六新测试 `packages/migrate/src/migrate-scenes.{entries,entities,encounters,bindings,sessions,defaults}.test.ts`。
- typed fixture `src/__tests__/scene-migration-fixtures.ts`；证据 `docs/testing/codex-migrate-scenes/`。
- 主输出先过当前正式结构守卫；中间态单列，不强造canonical合同。
- 定向、相邻、TC/Biome、六代表单点内存反控；整批统一串行check→ratchet→受保护单次strict-fast。
- 本席维护卡/导航/看板与最终基线；不重复每个小组跑覆盖率。

## 日志

- 2026-09-26：已直读现行调用链与旧测试，开始实施。done未开放。
- 2026-09-26：六文件53项、相邻13文件165项、TC/Biome/docs通过；六单点反控12跑业务鉴别通过，
  产品hash不变。初次14测试红与TC误用字段已按真实源码修正，失败记录见[回执](../../../../testing/codex-migrate-scenes/README.md)。
- 2026-09-26：完整check9,081、官方ratchet、保护20544351的单次strict8,589/701均通过；
  六个其它包baseline完整对象与所有生产分母不变。本批+327B/+250L/+297S/+39F，
  全仓44,441/63,178=70.3425242964323%。Codex核定 **accept / done**，已满足纯测试包收口条件。
  无产品变更、无视觉/full/Q1-Q2扩张；总目标继续执行。

无下一位Agent提示词；本席连续实施与验证。
