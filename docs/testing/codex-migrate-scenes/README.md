# Codex 当前场景迁移六组回归

[任务卡](../../ops/archive/tasks/done/TEST-CODEX-MIGRATE-SCENES-1-current-scenes.md) / [持续目标](../coverage-plus5/README.md)

基点20544351。产品、旧测试、资源与统计配置零改；六新测试文件53项、typed fixture、
六针内存变异工具。只调用当前内存转换，不执行CLI迁移写盘。

## 合同与去重

| 新文件（migrate-scenes前缀） | 项数 | 新增边界 | 旧证据及差异 |
|---|---:|---|---|
| entries | 11 | head/local/index/shared优先级、gap4/5、扫描停止/8步、静音、显式地址拒绝 | migrate-content.test.ts「s003:默认落点…」「s001:mapNum…」原盘golden；本批为独立优先级/边界反例 |
| entities | 15 | zone/anchor完整顺序与状态、触发范围、空阶段与缺根区分、朝向sentinel/显式0/16步、精确stub拒绝 | 旧「实体语义映射…」「朝向折叠…」；不重复布局注册表矩阵 |
| encounters | 7 | 标准模板数据及原根证据、静止/追逐、三个故事命令保留边界、败北链与引用尾 | translate-events.test.ts既有opcode翻译；新增mapScenesStatic真实模板聚合/保留证据 |
| bindings | 4 | 完整作者场景保真、端口替换/删除、增页、无匹配实体 | migrate-content.test.ts:1204基本同步例；新增完整深比较及空/新增/未匹配端口 |
| sessions | 10 | finish输出脱离、delta精灵、完整排序根、alias稳定正文/拒绝、动态双hook与缺失gap | 旧session工厂身份与G08重复迁移隔离；本批是会话可变输出/真实注册与post-pass |
| defaults | 6 | 嵌套配置剥离与顺序、逆序多跳传播、歧义/显式值/静默/hostile/每场景引用环 | translate-events.test.ts「finalizeBattleConfig…」单层旧形态；本批typed中间场景+图传播 |

输入工厂用SourceScene/SourceCmd/SceneDef，迁移结果过`validateScenes`迁移中间态守卫。
**不宣称**这些中间产物已通过最终author/runtime loader；vanish和配置marker后续由当前管线
专用步骤消费，本批不恢复历史版本产品入口。配置marker只由生产`battleCfgMarker`构造，剥离后再过guard。
同一实际输入成功后深比较；拒绝例另比原输入。正文断言读实际注册表chunk，缺正文fail-loud。

## 本席验证与失败记录

- 定向53/53、相邻13文件165项、migrate TC与9个新代码文件Biome exit0；六针每针一正一反共12跑均符合精确file/fullName、exit1、
  AssertionError业务红，禁止超时/混错；产品hash不变。判据执行exit0/2/null、错标题、混错自测。
- 反控锚：入口优先级、`autoDir ??`保留南向0、剧情尾不折叠、作者trigger元数据、
  session registry body深克隆、上游歧义不传播。
- 反控证据：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-migrate-scenes-mutants-TzLjJ9/`。
- 首跑14红/39绿：本席初始测试误用60ms帧（生产`translate-events.ts:572`明确40）、
  把空end阶段误认缺页（:725-817每段保留）、不合法`global/a`路径（默认global分片未配置）、
  地址错误消息匹配过宽假设；TC另揭示审计元数据在`origin.sceneHook`而非顶层。
  已逐项按源码改新测试与fixture，第二次53/53、TC0；未改产品/旧测试，不把初次失败包装产品缺陷。

## 可重跑命令

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate exec vitest run src/migrate-scenes
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate typecheck
env -u NODE_COMPILE_CACHE node docs/testing/codex-migrate-scenes/mutants.mjs
env -u NODE_COMPILE_CACHE pnpm exec biome check packages/migrate/src/migrate-scenes.*.test.ts packages/migrate/src/__tests__/scene-migration-fixtures.ts docs/testing/codex-migrate-scenes/*.mjs
```

## 统一质量门

- `env -u NODE_COMPILE_CACHE pnpm check` exit0：七包9,081项，migrate91文件725项；
  根Biome既有60warning/6info，本批新增代码零诊断。日志`/tmp/codex-migrate-scenes-check.log`。
- `env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=20544351 pnpm coverage:ratchet`
  exit0：8,589 fast /701生产文件。六个非migrate包的完整baseline对象不变，所有生产清单与分母不变。
  日志`/tmp/codex-migrate-scenes-ratchet.log`。

| 指标 | 批前 | 本批ratchet | 净增 |
|---|---:|---:|---:|
| 分支 | 44,114/63,178 | 44,441/63,178（70.3425242964323%） | +327 |
| 行 | 55,856/70,600 | 56,106/70,600 | +250 |
| 语句 | 62,089/80,643 | 62,386/80,643 | +297 |
| 函数 | 11,475/15,058 | 11,514/15,058 | +39 |

migrate 3,851→4,178/6,436（约64.92%）。主体`migrate-content`990→1248/1361，
真实下游`translate-events`649→717/1331；其余1臂来自同包依赖链。全仓累计+1,023B/+185测试，
距离总目标还差2,136B；未计未接收贡献者候选。
ratchet基线SHA256：`91b1ef55d97548c9d5be9000cf29cc41a7f169cf1b73058b274073e88e2444c1`。
`env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=20544351 pnpm coverage:fast`
单次exit0：8,589/701，与ratchet所有统计一致，基线hash不变，无重试取多数。
日志`/tmp/codex-migrate-scenes-strict.log`。2026-09-26 Codex核定本子卡accept/done；
整体+5pp目标仍未达成，继续推进。
