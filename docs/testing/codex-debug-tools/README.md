# Codex 调试面板六组公开动作

[上级](../README.md) / [任务卡](../../ops/archive/tasks/done/TEST-CODEX-DEBUG-TOOLS-1-public-actions.md) /
[机账](evidence.json) / [反控](mutants.mjs)（[配置](mutants.config.mjs)）

起点cd1baa6c；产品/旧测试/配置/资产零改。六新增文件61项，不借Cursor/GLM待返工包计算增量。
真实入口main.ts:5958→installDebugTools，经DOM键盘/按钮/change事件进入生产控制台/触发器/表单逻辑。
fixture复用shellProject的完整当前工程、真实gzip资源，增补合法enemy/profile/sharedScript后重新走正式loader。
DOM宿主使用标准Node Blob替代JSDOM缺stream的Blob，结束恢复global；不mock产品压缩器或脚本核心。
脚本使用真实ScriptProjectRuntime/编译器/runner，世界flag结果来自生产提交；其他宿主效果端口仅记录参数，
不冒称已跑真实战斗/画布/磁盘保存。预设经buildWorld，free-form装备/毒文本只证明解析，不证明任意输入可用于正式游玩。

## 去重与定向

| 组 | 新增 | 新合同 |
|---|---:|---|
| commands | 24 | scene/pos/give/money实际叶参数、各缺参/坐标拒绝、身份转交与真实shared flag |
| failures | 13 | 六入口拒绝/同步throw、忙碌确认取消/继续、battle结果、完成释放与迟到反馈隔离 |
| triggers | 10 | shared/trigger/auto/两hook实际flag、entered后取消尾命令、场景丢失/列表重建/未命中 |
| battle | 7 | 选队前门、生产预设HP0/MP、各文本解析、template身份、自定义敌人、清表与取消 |
| inspect | 3 | 实际world多状态只读投影、运动小数/owner缺席/全部关门、资源就绪 |
| navigation | 4 | 两向图层同步、已有激活态单步、剩余roving键、keyup隔离与badge周期 |

旧debug-tools.test七项（样式/tab、非法field、四类motion、Backquote、重复安装、hide保操作、Esc帧步进）
原样保留；新增不重做旧样式/重复安装/非法field用例。相邻runtime-script-project七项和dev-preset三项保留。
定向61+相邻17=78/78，editor不涉及；Reforge TC与九个新增代码文件Biome exit0。
六正控+六单点反控均通过exactfile/fullName/exit1/AssertionError/拒混错与timeout；源码hash不变。
原始输出 `/tmp/codex-debug-directed-final.{json,log}`、`/tmp/codex-debug-tc-final.log`、
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-debug-tools-mutants-S6GOta`。

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/debug-tools.commands.test.ts src/debug-tools.failures.test.ts src/debug-tools.triggers.test.ts src/debug-tools.battle.test.ts src/debug-tools.inspect.test.ts src/debug-tools.navigation.test.ts src/debug-tools.test.ts src/runtime-script-project.test.ts src/dev-preset.test.ts
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge typecheck
node docs/testing/codex-debug-tools/mutants.mjs
```

## 失败与收窄

- 首轮61失败共同为JSDOM Blob缺stream，未触及业务；以与Response匹配的标准Node Blob补宿主并在cleanup恢复。
- 首轮TC两处夹具类型错误、次轮node:buffer类型不可见：修为精确泛型回调/从typed实际请求读preset，
  Node内置通过局部动态模块边界取Blob（只声明此桥的Blob接口），不改tsconfig、不引全局Node类型。
- wait命令是实际executeEffect叶，不是after边界wait；夹具把叶wait交给可控IO等待器。
  首次60/61揭示本席原同步见证取错宿主位置；已改真实entered Promise，finally dispose/await原操作，
  不用固定sleep或放宽timeout使之通过。无产品缺陷由本批确认。
- 不强测无DOM操作可达的panelFor缺项、private缓存/私有row数据损坏、任意非法项目或菜单像素。

## 全仓质量门

2026-09-26整批串行check9387→官方ratchet→保护cd1baa6c的单次strict8895全部exit0。
全仓B45304/63178（71.70850612555003%），本批+173B/+61tests；S63277/80643、
L56908/70600、F11678/15058。701生产文件/全部分母不变，其它六包完整baseline对象不变。
目标debug-tools自身B135→305/332、L498→710/713、F50→106/110；其余+3B来自实际消费链，
只报官方并集、不把模块增量二次相加。日志为`/tmp/codex-debug-{check,ratchet,strict}.log`。
全仓Biome保留62项既有warning/6info，无新增文件告警。无产品/旧测试/配置/资产变更。
无下一位Agent提示词，本批Codex验收收口，母卡+5pp目标仍持续推进。
