# 当前敌人钩子翻译回归

[任务卡](../../ops/archive/tasks/done/TEST-CODEX-ENEMY-HOOKS-1-current-translation.md) / [持续队列](../coverage-plus5/README.md)

基点a73c0ffc，六组cfg/dialog/media/effects/growth/errors。成功输入走真实translateEnemyScripts，
内置checkEnemyHookFlow；fixture对实际消费的source、hooks、initialCast、owner作深快照比较。
不改产品，不写projects，不以迁移单测声称视觉/E2E通过。

## 六组与去重

| 组 | 新增 | 相对既有证明的增量 |
|---|---:|---|
| cfg | 6 | 精确闭包/死代码排除、共享目标、非root reset、相邻leader切块、等价来源、地址来源与双通道独立 |
| dialog | 6 | speaker+控制码到完整cue、locale变体/冲突、分块样式隔离、说话人缺正文拒绝 |
| media | 5 | 自定义sound实际调用/缺资产、音乐三态/时长、等价恢复映射、空battleEnd来源 |
| effects | 7 | divide双臂与effect来源、self summon哨兵、opcode/table rate差异、终态三态/双终态拒绝 |
| growth | 8 | 八字段带符号累加、身份/命令边界不合并、无效目标、恢复量/角色身份 |
| errors | 16 | 缺根/目标/fallthrough、goto/reset/random、2048上限、公开畸形source与同步环拒绝 |

旧12项 `translate-enemy-scripts.test.ts` 的基本chance/random/三种END/单stage奖励未重做；
新例着重完整输出、来源/输入保真或新增错误边界，而非再断言同一基本kind。
产物通过的是hook结构守卫，不声称抽象asset id已具备真实项目资源闭包。
公开畸形source是防御合同；未知内部不可达分支不硬构造，也不要求模块100%。

## 可复跑验证

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate exec vitest run src/translate-enemy-hook-flow. src/translate-enemy-scripts.test.ts src/migrate-enemies
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate typecheck
env -u NODE_COMPILE_CACHE node docs/testing/codex-enemy-hooks/mutants.mjs
```

定向新增48 + 旧相邻26 = **74/74**，TC0；最终含机账10文件Biome0。首次定向46绿/2红是本席将
PAL sound/music ID误写为斜杠形态；对照 `content/src/asset.ts:207-216` 正式生成函数更正为
`sound.pal.007` / `music.pal.002`，未改产品、未掩盖产品缺陷。
新鲜JSON `/tmp/codex-enemy-hooks-adjacent.json`，首跑 `/tmp/codex-enemy-hooks-directed.json`。

[六针runner](mutants.mjs)及[隔离加载配置](mutants.config.mjs)复用上批真实判据：逐针一对照绿、一候选
AssertionError红；恰exit1/精确file+fullName/唯一加载/拒混错超时，产品hash不变。
实际目录 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-enemy-hooks-mutants-ORu0ao`。
六针覆盖非root reset、dialog speed、fade时长、divide数量、growth错误覆盖、指令上限。
按Vitest/Vite技能使用仅内存load替换与隔离/tmp报告，正式配置和生产文件零写入。

## 统一收口

Codex accept；[机器账](evidence.json)。同一shell串行完整check→ratchet→保护a73c0ffc的单次strict-fast，
三步exit0，无并发覆盖、无失败重跑取多数。check **9188**；ratchet/strict **8696 /701生产文件**。
日志 `/tmp/codex-enemy-hooks-{check,ratchet,strict}.log`。根lint仍62 warning/6 info，本批10文件0诊断。

| 指标 | 前 | 后 | 净增 |
|---|---:|---:|---:|
| 全仓B | 44779/63178 | 44891/63178 | +112 |
| 全仓L | 56291/70600 | 56368/70600 | +77 |
| 全仓S | 62586/80643 | 62674/80643 | +88 |
| 全仓F | 11522/15058 | 11524/15058 | +2 |

全仓分支 **71.05479755611131%**。migrate 4628/6436B、4906/6724L、5501/7712S、762/1165F，
714 fast；其它六包完整baseline对象全等，所有生产清单/分母不变。
持续目标累计+1473B/+292测试，距离46577尚差1686B；不把本批done称为母目标完成。
Cursor远端仍b6bcc9b4、GLM仍有独立counter，均未混入这次结果；未把自验冒充他席独立审查。
