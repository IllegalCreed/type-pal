# CODE66 speedrun overlay 当前复审切片

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点：`746776368`；分支：`codex/code-quality-3y`。本片只复核 overlay DOM ownership、数据映射、清理和测试判别力，不改变 UI 形态或 timer API；CODE-QUALITY-66 当前复审为 `partial`。

## 实际读取与依据

- 实现/直接测试：`packages/game/src/tools/speedrun/overlay.ts`（120 行）、`overlay.test.ts`（49 行）、`overlay.glm-phase1-leaves.test.ts`（59 行）。
- 真实 caller/相邻类型：`speedrun/index.ts` 的 `tickSpeedrunTimer`、`timer.ts` 的 `RunState`、`store.ts` 的 `BestTimes`、`time-format.ts`、`tools-panel.ts` 的 speedrun 设置。
- UI oracle：当前 speedrun design 与 format helpers/真实 index 委托；没有独立剧情或 SDLPal overlay primary。

## 逐文件结论

`overlay.ts` 以固定 id 单例拥有 style/root，SSR 无 `document` 时 no-op；每次 render 只清空并重建 root 子项，保留根节点身份。21 个 checkpoint 行按 index 映射最佳/当前/差值，差值按 ±1000ms 分 fast/slow/even；ETA 使用最后 checkpoint best 加最近完成 split 的差值，主时钟在 banana/manual pause 任一状态加 `*`；`hideOverlay` 只移除 root，样式可复用。读取与 index caller 对照未发现错误传播、资源清理或公共边界缺陷。

现有测试原先没有差值/ETA 独立 oracle；本片补充一条最小真实 checkpoint 行测试，覆盖最佳值、`-0:02` 文本/fast class 和 ETA 计算。直接两文件共 6 tests（主 4、GLM 2），覆盖 21 行/主时钟、暂停、差值/ETA、原位更新、style 注入幂等和 hide 幂等；与 time-format/index 相邻测试职责分离。

## 验证

- 定向/相邻：overlay 两文件、time-format 两文件、index 主测试 — 5 files / 25 tests passed。
- 类型：`pnpm --filter @type-pal/game typecheck` — passed。
- 覆盖率、protected fast、全仓 `pnpm check`：沿用 [`53-wave-gates`](../53-wave-gates/README.md) 稳定波次证据，本小批不重复运行昂贵门。

未关闭 countdown、checkpoint 实跑或其它 pre‑94 卡；未知保持 pending/partial。
