# CODE3j toast / map-names / checkpoints 当前复审切片

基点：`cfed1430e`；分支：`codex/code-quality-3y`，相对 `origin/main` `0 behind`。这是 CODE-QUALITY-3j 的第三个有限切片，核三个剩余生产小文件、直接测试和相邻 detector/store/共享 map-name caller。3j 整卡仍 partial。

## 逐文件与 caller

完整读取清单、SHA、行数和边界见 [`read-boundaries.json`](read-boundaries.json)。`toast.ts` 拥有单例容器、toast 元素、淡入/淡出两个 timer 和空容器清理；save/tool callers 只传消息、类型和可选 duration，`pointer-events:none` 不挡输入。测试使用 fake timers，并在每例前后清理 DOM/timer，覆盖多条堆叠、类型、到期和未到期反控。

`map-names.ts` 只是 shared `getPalAuthoredMapName` 的薄适配：已知名原样返回，缺名显式回退 `地图N`，`hasMapName` 只报告 authored 名是否存在。tools-panel/minimap caller 只消费字符串和存在性；共享 authored 表作为 primary 全文读取，未复制表或擅改内容。

`checkpoints.ts` 只定义 21 个速通 checkpoint 和 BANANA 配置，detector/store 是真实消费者；测试核 21/id 唯一/时间单调、首尾节点和香蕉三格/物品/零容差。文件注释明确 PalTimer 坐标仍需真实运行核验，尤其石碑/边缘点的偏移；本片没有把静态配置或相邻 detector 绿灯升级成坐标实跑。

## 判别力与结论

定向 `toast.test.ts`、`map-names.test.ts`、`checkpoints.test.ts`、`detectors.test.ts`、`detectors.glm-phase1-leaves.test.ts`：`5 files / 22 tests passed`，0 failure/skip/stderr。未发现 toast timer/container ownership、map fallback、checkpoint id/时间或 detector 纯函数的直接缺陷；未知项仅是速通路线/坐标的真实运行验证，不修改数据、不改玩法。

本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；按用户规则留到完整大模块收口。3j 七个生产文件现均有直接切片证据，但整卡仍 partial，checkpoint 实跑未知保持显式 pending。
