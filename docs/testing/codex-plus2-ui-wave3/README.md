# Codex 自有覆盖率第四批 · 合法地图目录与作者表单

本批仅新增三份 editor 测试与三针隔离负控，生产、旧测试、资产、测试选择及
排除配置均零改。`MapMode` 测试不继承旧 `MapMode.test.tsx` 中的伪造 manifest/
强转场景：从 `buildBlankProject` 的实际文件表进 `loadCurrentProjectFrom`，
分别加载 author 场景并用 `validateScenes` 验 runtime 场景，用
`parseProjectMap` 取得真正 seed 地图，再经 `toEditorState`/`EditSession`
走当前 UI。仅隔离无关的 canvas 绘制宿主，不 mock `MapMode`、地图命令、
引用门或会话。确认/删除始终对同一真实会话的 mapIndex、地图内容、
场景引用与原快照作深比较。

| 新文件 | 项数 | 独立业务轴 |
|---|---:|---|
| `MapMode.catalog-coverage.test.tsx` | 5 | 当前合法项目中新建/复制/重命名地图；起始场景真实引用阻止删除；无引用副本首次确认零写、二次确认后只删目标 |
| `CommandForm.dialogue-workflow-coverage.test.tsx` | 3 | 两句正文与速度同序重排；删除到最后一行即禁用；首句速度修改不污染旁句 |
| `CommandForm.actor-workflow-coverage.test.tsx` | 3 | 当前角色状态/清除种类切换；一人到合法三人队伍保留稳定 ID 与队长次序 |

`node docs/testing/codex-plus2-ui-wave3/mutants.mjs` 的
`new-map-name`、`dialog-row-order`、`party-next-identity` 三针各有绿对照和
指定新用例自身业务 `AssertionError` 红；精确 fullName/单次执行、源码
SHA-256 前后不变。定向/相邻 10 文件、147 项通过；editor typecheck 0，
五个新增代码文件 Biome 0 error/warning/info。

串行完整 `pnpm check` exit0：**10,000** 项、严格 lint 2,319文件零问题；
官方 `pnpm coverage:ratchet` exit0，再以
`TYPE_PAL_COVERAGE_BASE_REF=561c8af8 pnpm coverage:fast` 受保护单次
exit0。两份 fast 均为9,539项/730源码文件、分支
**46,811/63,323=73.92%**；相对46,797/63,323，本批 Codex 自有
测试净增14已覆盖臂，分母不变。旧 MapMode 测试虽用非法 fixture，仍已
执行到很多相同生产分支；本批业务可信度提升不冒称大幅新覆盖。

从用户本轮起点46,201/63,315=72.9701%起算，当前提升约0.9541个
百分点。+2pp 按当前分母需47,474/63,323，尚差**663**臂；
母任务继续 build。GLM与Cursor尚未接收的新包未混算进本批。
