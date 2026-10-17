# CODE64 speedrun detectors 当前复审切片

基点：`5dd341657`；分支：`codex/code-quality-3y`。本片只复核检测器的 prev/mem ownership、边界和真实消费方，不改变 checkpoint 数据、公共接口或产品行为；CODE-QUALITY-64 当前复审为 `partial`。

## 实际读取与依据

- 实现/直接测试：`packages/game/src/tools/speedrun/detectors.ts`（76 行）、`detectors.test.ts`（77 行）、`detectors.glm-phase1-leaves.test.ts`（65 行）。
- 真实 caller/消费方：`packages/game/src/tools/speedrun/timer.ts` 的 `SpeedrunTimer.tick`、`snapshot.ts`、`checkpoints.ts` 21 个 detector 配置。
- 设计 oracle：`docs/phase1/plans/2026-06-18-speedrun-timer.md` §4.2–4.3 与 PalTimer/checkpoint 约束；无仓内 SDLPal 同形态 detector primary。`ProgressSnapshot` 是状态投影 owner，detector 只读其字段。

## 逐文件结论

`detectors.ts` 的 enter/leave/enterAny 仅按当前/上一帧 scene 判定；`enterAnyScene` 在工厂时复制场景集合，避免调用者后续修改输入影响检测。`atSpot`/`atAnySpot` 使用显式矩形容差；`bossWon` 要求目标敌种仍在 battle 且全场总血不高于零；`hasItem`/`bgmIs` 是纯快照谓词。`caiyiDetector` 只在目标敌种首次出现时写入该 detector 自己的 `mem.seen`，随后以敌种消失或总血清零完成第二段，符合 timer 依序单节点消费。读取过程中未发现错误传播、共享可变状态或公共边界缺陷。

两份直接测试共 12 tests：主测试覆盖各原语基本合同、null prev、battle null 和两阶段彩依；GLM leaves 补默认容差的四边界、多点命中/不命中、空集合、prev=null、自定义敌 id。`snapshot.test.ts`、`timer.test.ts`、`timer.boundaries.test.ts`、`checkpoints.test.ts` 作为相邻 caller/oracle 一并运行，没有新增重复或恒真断言。

## 验证

- 定向/相邻：`detectors.test.ts`、`detectors.glm-phase1-leaves.test.ts`、`snapshot.test.ts`、`timer.test.ts`、`timer.boundaries.test.ts`、`checkpoints.test.ts` — 6 files / 42 tests passed。
- 类型：`pnpm --filter @type-pal/game typecheck` — passed。
- 覆盖率、protected fast、全仓 `pnpm check`：沿用 [`53-wave-gates`](../53-wave-gates/README.md) 稳定波次证据，本小批不重复运行昂贵门。

未关闭 speedrun 的 index/overlay/checkpoint 实跑和其它 pre‑94 卡；未知保持 pending/partial。
