# 当前脚本预览控制器六组补测

[上级](../README.md) / [任务卡](../../ops/archive/tasks/done/TEST-CODEX-PLAYBACK-1-canonical-controls.md) /
[机账](evidence.json) / [反控](mutants.mjs)（[配置](mutants.config.mjs)）。

起点82863cf2。只写六新测试、一fixture与证据，产品零改；不碰Cursor命令包和GLM守卫包。
现行真实消费者为SceneScriptWorkspace的playCanonical，所有新增正式用例经该公开入口，
guard + compiler + runtime runner + project host + preview host均为生产实现，无私有反射/核心mock。
测试使用数据结构合法的最小场景/flow，不声明完整工程资源闭包、Canvas像素或真实战斗已验收。
模拟时间只由tick推进，0ms事件循环checkpoint仅排空runner续体，不以wall-clock延迟判断到期。

## 去重与结果

| 组 | 新增 | 与旧12+lab4+Canvas2的差异 |
|---|---:|---|
| controls | 7 | current命令间gate、对话step/toggle、移动内暂停/换源；不重测旧play的wait换源 |
| motion | 10 | 四速度阈值、四像素象限、近端点height/朝向、倍速作用于走位和后续wait |
| entities | 9 | step+nudge+anim叠加、state与当前生命周期、动作loop/reset、owner焦点与清空 |
| presentation | 7 | 当前entry fade/dither/跳过、默认时长/中间alpha、活动fade取消、current切场景 |
| effects | 9 | 实际日志调用链/数量/可选参数/身份、成员gesture、teleport、追逐计时和桩结果分流 |
| queries | 12 | stub query逐臂、scratch flags/vars驱动并跨次丢弃、跨场景错误可见且停止尾命令 |

54新增，定向+相邻72/72，TC exit0。日志 `/tmp/codex-playback-directed-final.{json,log}`、
`/tmp/codex-playback-tc-final.log`。六正控+六针都通过精确file/fullName/exit/AssertionError判据，
拒绝错状态/混错/timeout，自测运行真实judge；来源hash不变。
原始反控目录：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-playback-mutants-gEttdo`。

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run src/core/playback.controls.test.ts src/core/playback.motion.test.ts src/core/playback.entities.test.ts src/core/playback.presentation.test.ts src/core/playback.effects.test.ts src/core/playback.queries.test.ts src/core/playback.test.ts src/__tests__/architecture-lab/playback-scope.test.tsx src/ui/PreviewCanvas.test.tsx
node docs/testing/codex-playback/mutants.mjs
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck
```

未用的旧play/旧绑定/vanish等域、非法speed fallback与仅私有host可达臂不为比例强测。
当前production只有playCanonical消费者；旧12项中legacy入口测试保持原样，不计为本批新增证明。

## 新发现与失败记录

- 首轮53绿/1红：首次canonical step只消费阶段门，没有执行第一条命令。保留[红诊断](diagnostics.test.ts)
  与[独立配置](diagnostics.config.mjs)，归[修复卡](../../ops/tasks/EDITOR-PREVIEW-STEP-1-command-gates.md)。
  未把down改成正确预期；正式controls用例只测真实wait之后的命令间单步，不声称首次单步已通过。
- 初版TC失败：editor没有node types；改为平台setTimeout0任务checkpoint。SceneReveal fixture遗漏
  fade.outMs/dither.source，按当前类型补齐，未改产品守卫/配置。原单步失败独立复跑仍exit1。
- 最终独立诊断 `/tmp/codex-playback-diagnostic.{json,log}`：0绿/1 AssertionError，expected down to be left。
  不进入官方快测、无skip/test.fails、更未宣称缺陷已修。

```sh
env -u NODE_COMPILE_CACHE pnpm exec vitest run --config docs/testing/codex-playback/diagnostics.config.mjs
```

## 全仓门

2026-09-26严格串行check→ratchet→保护82863cf2的单次strict-fast全部exit0。
完整check 9326项，fast 8834项/701生产文件；日志 `/tmp/codex-playback-{check,ratchet,strict}.log`。
官方全仓分支44993→45131/63178（**71.4346766279401%**），本批+138B/+203S/+188L/+76F/+54测试。
playback本身B208/252、L383/412、F118/135；不是将局部增量相加。
六个其它包完整baseline对象、所有包生产清单/scopeDigest/各分母原样，strict各包metrics与ratchet全等。
累计距+5pp目标还差1446分支，母卡继续build；本批accept并归档，诊断D1保持待修。

最终12个新增TS/MJS/JSON文件Biome零警告。完整check时本批两条模板字符串提示已按等价转义模板清理，
随后六处变异锚点唯一性复核、改动Biome与根lint exit0；根lint保留62条既有warning/6info，
未称全仓lint零警告。日志 `/tmp/codex-playback-{biome,lint}-final.log`。
无下一位Agent提示词，Codex已核定本批收口；不要求用户做纯控制器测试验收。
