# Cursor地图六组：070d3bf3独立接收

2026-09-27，Codex独立复核`070d3bf3173024ea0dd79369cb34f02afb7484e5`，结论 **counter / CM1–CM4**。
[任务卡](../ops/tasks/TEST-CURSOR-MAP-LOGIC-2-selection-stamps.md) /
[独立见证](cursor-map-review-witnesses.mjs) / [本席机账](cursor-map-logic-r1-review-evidence.json)。
不合候选、不改其测试语义、不跑全仓check/ratchet/strict，不恢复主动覆盖率扩展。

## 已核通过

- 六新测试+专属fixture/证据+本卡作者块；生产六模块、旧测试、配置和基线零改。
  导航README一行例外已披露，本席接收机械导航例外，不作阻断。
- 定向与相邻17文件**105/105**，其中M1–M6 **6/5/6/5/4/4=30**新增；全editor **359文件3049/3049**。
  本席TC、15文件Biome（0error/0warning）、docs/diff均通过。
- 原runner六个正控和六个单点反控独立通过，15项判据自测通过；运行输出独占tmp、不回写入库JSON。
- 真实blank/painted/group三种map都经本席正式validateProjectMap通过，不把以下EditorState问题扩成“地图非法”。
- 没有证明产品当前存在下方变异；这些是候选断言与回执的不足。没有视觉/全仓覆盖结果声明。

## CM1｜逐次实际输入保真未落实

M1 `stamp-draft.background.test.ts:64-112`移动/resize成功后不比较原draft；M2五例没有原state/map/action深快照。
M3部分成功/拒绝、M4/5/6多数计划和应用前后的实际map/clipboard/template也未按卡逐调用核保真。
只检查少数结果或用调用后状态再拍快照，不能证明原输入未被污染。

本席只在Vite加载层改一处返回：

| 针 | 生产变异 | 候选 | 独立oracle |
|---|---|---|---|
| draft-move-input-mutation | stamp-draft.ts:388将返回新draft改为先写draft.layers再返回原draft | M1 6/6仍绿 | 原实现7绿，变异6绿/1输入快照AssertionError |
| selection-reducer-input-mutation | map-selection.ts:521将返回新maps改为原地写state.maps | M2 5/5仍绿 | 原实现6绿，变异5绿/1输入快照AssertionError |

修订：在原六文件逐调用核实际数据参数，特别是成功和抛错路径；每次调用前独立structuredClone，
调用后立即比同一原对象。计划应用返回的新map允许变化，传入计划/地图/剪贴板等不应因此被原地改写。
不用新增大矩阵，也不修改产品API。

## CM2｜完整搬移结果与非空哨兵不足，并须实质去重

`stamp-group-transform.background.test.ts:43-69`声称两组成员一起走和未选普通哨兵保真，实际夹具
所有非空视觉都属于被选两组，根本没有未选普通哨兵；tree-b只断言anchor“不等于原值”，未钉精确目标。
M4主要检查owner/id，没有钉住实际高度等内容。

本席将`stamp-group-transform.ts:311`的`heightWrites ... value: member.height`改成0：候选M4 **5/5仍绿**。
同一合法map用真实plan→Command→EditSession应用，独立oracle核objects层目标格高度3，原实现6绿、
变异5绿/1AssertionError。owner更新正确不能证明真正搬过去的矩阵内容正确。

修订：所保留的新“双组移动”合同钉两个组精确成员/目标、tile/source/height/collision与原位置清理，
加真实非空未选普通哨兵并完整比较；不是只补一个toBe(3)迎合本席针。
同时M4的单组复制/删除等应对账旧`stamp-group-transform.test.ts:111/152/200`三个完整合同：
旧测试已经覆盖单组真实移动、copy/repeat/cut、新ID和删除全通道。若候选没有独立新轴，删重复并记existing-proof；
若新轴是另一组保真，就保留且明确只声明这项差异。不得为了保留30项把旧证明换标题重报。
M5“精确三通道”也应按真正断言收窄或核完整patch/应用值，不能以两个find+局部匹配宣称全量比较。

## CM3｜反控判据会接受带缩进的混错

`module-mutants.mjs:113-157`的isErrorHeader直接锚行首，无trimStart。直接抽取候选真实judgeRed执行：

```text
AssertionError: wrong result\nTypeError: broken       → 拒绝（正确）
AssertionError: wrong result\n  TypeError: broken     → 接受（错误）
AssertionError: wrong result\n\tError: broken          → 接受（错误）
```

修实际judge并把两种缩进加入同一判据自测；保留合法AssertionError与runWithTimeout堆栈正控。
本轮六实际变异的红因确实是业务AssertionError，不倒推为假结果；阻断是判据没有满足卡面的拒混错要求。
`m6-inherit-index`实际删的是stampVisualOwner查询，不证明索引继承保护；命名/分类按实际收窄，
不要求“去掉继承缓存就必须红”（正确性可能由正式重建路径保护）。

## CM4｜EditorState夹具强转与声明修正

`core/__tests__/cursor-map-logic-fixtures.ts:83-106`用`as unknown as EditorState`掩盖不完整manifest/内容表。
本席在Vite下实际调用editorStateWithMap，再喂正式validateCurrentManifestStartup，拒绝
`manifest: 缺键 "id"`。不能把EditSession没访问缺失字段当作当前EditorState合同成立。

改用当前typed内存EditorState或现有blank-project构造入口，不通过强转跳过字段约束；
这里不额外要求PAL资产、浏览器或完整保存E2E，明确仍是命令/地图层单测。保留已合法的地图与组合数据。
回执按最终JSON重新计数，明确每例新轴与未测路径；M1“两点对调”实际为重叠平移，M4“普通哨兵”须真实存在。
不把本轮guard验证结果声称为作者保存闭包验证。

## 证据

```sh
env -u NODE_COMPILE_CACHE node docs/testing/cursor-map-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-cursor-map-logic-r2
```

三针×四跑=12次；候选原实现/变异都绿，独立oracle原实现绿、变异各恰一AssertionError。
源码/候选/fixture hash不变，唯一load命中；不使用官方coverage，不把追加oracle记为贡献者测试。
最终原始目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-cursor-map-review-nvdduV`；
judge/fixture补证`codex-cursor-map-runner-2Hg6wm`。首遍三针也同结果，后加判据/夹具取证重跑，并非失败重试取多数。
夹具首试plain tsx因reforge import.meta.glob环境缺失失败，本席改用Vite真实加载，不计作候选业务红。
日志`/tmp/codex-cursor-map-r1-{directed,tc,biome,mutants,editor,witnesses-final}.log`，新鲜JSON同名directed/editor。
本席工具格式门通过，5条源码模板字面量warning单列（非候选15文件零warning口径）。

## Cursor返工提示词

在codex/cursor-map-logic-r2原工作树接收CM1–CM4；先fetch并读origin/main本文/机账及本卡，保留审查原文。
CM1原六组逐次实际输入深快照，成功/拒绝都保护，三针中的两个原地污染必须候选自身抓住。
CM2完整双组移动结果+非空未选普通哨兵；对旧单组move/copy/delete实质去重，允许删重复登记existing-proof，不凑30。
CM3真实judge拒带空格/tab缩进的混错并补同判据自测，保留合法红/绿和stack正控；M6针归因收窄。
CM4用当前typed EditorState替代强转假状态，修标题/回执声明。地图本身已通过guard，不必重造全部地图。
复跑定向/相邻/TC/Biome/docs/diff与代表反控，提交推送完整SHA/新鲜JSON。
不改产品/旧测试/基线/本席见证，不跑全仓coverage，不合main、不标done；Codex独立验收。
