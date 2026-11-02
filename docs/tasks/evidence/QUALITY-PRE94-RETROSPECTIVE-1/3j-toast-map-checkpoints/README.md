# CODE3j toast / map-names / checkpoints 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3j第三个有限切片(基点cfed1430e,0 behind),核三个剩余生产小文件(toast/map-names/checkpoints)、直接测试与相邻detector/store/共享map-name caller;3j整卡仍partial。

## 范围与证据

完整读取toast.ts(81行)/toast.test、map-names.ts(11行)/map-names.test、checkpoints.ts(110行)/checkpoints.test、detectors.ts(76行)/detectors.test/detectors.glm-phase1-leaves、shared/pal-authored-map-names.ts(240行primary表);tools-panel只读导入与display/FPS/timer/map段,store.ts作相邻持久化读,清单SHA见[read-boundaries.json](read-boundaries.json)。toast拥有单例容器/toast元素/淡入淡出两timer/空容器清理,save/tool callers只传消息类型与可选duration,pointer-events:none不挡输入,测试用fake timers且每例前后清理DOM/timer;map-names只是shared getPalAuthoredMapName薄适配(已知名原样/缺名回退『地图N』/hasMapName报告存在性);checkpoints只定义21个速通checkpoint与BANANA配置,detector/store是真实消费者。

## 发现

定向5 files/22 tests passed,0 failure/skip/stderr;未发现toast timer/container ownership、map fallback、checkpoint id/时间或detector纯函数的直接缺陷。未知项仅速通路线/坐标的真实运行验证(文件注释明确PalTimer坐标尤其石碑/边缘点偏移需实跑),本片没有把静态配置或相邻detector绿灯升级成坐标实跑。

## 结论

本片不运行coverage/official ratchet/protected fast/全仓check;3j七个生产文件至此均有直接切片证据,但整卡仍partial,checkpoint实跑未知保持显式pending;不修改数据、不改玩法。

## 整改与复核

未重跑;无真实浏览器/E2E速通路线或checkpoint坐标验收。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2109B / SHA-256 cc316a24f1e2865722772bb4f0bca781720097fc3d00d22eb608f73ff907a791；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3j toast / map-names / checkpoints 当前复审切片

基点：`cfed1430e`；分支：`codex/code-quality-3y`，相对 `origin/main` `0 behind`。这是 CODE-QUALITY-3j 的第三个有限切片，核三个剩余生产小文件、直接测试和相邻 detector/store/共享 map-name caller。3j 整卡仍 partial。

## 逐文件与 caller

完整读取清单、SHA、行数和边界见 [`read-boundaries.json`](read-boundaries.json)。`toast.ts` 拥有单例容器、toast 元素、淡入/淡出两个 timer 和空容器清理；save/tool callers 只传消息、类型和可选 duration，`pointer-events:none` 不挡输入。测试使用 fake timers，并在每例前后清理 DOM/timer，覆盖多条堆叠、类型、到期和未到期反控。

`map-names.ts` 只是 shared `getPalAuthoredMapName` 的薄适配：已知名原样返回，缺名显式回退 `地图N`，`hasMapName` 只报告 authored 名是否存在。tools-panel/minimap caller 只消费字符串和存在性；共享 authored 表作为 primary 全文读取，未复制表或擅改内容。

`checkpoints.ts` 只定义 21 个速通 checkpoint 和 BANANA 配置，detector/store 是真实消费者；测试核 21/id 唯一/时间单调、首尾节点和香蕉三格/物品/零容差。文件注释明确 PalTimer 坐标仍需真实运行核验，尤其石碑/边缘点的偏移；本片没有把静态配置或相邻 detector 绿灯升级成坐标实跑。

## 判别力与结论

定向 `toast.test.ts`、`map-names.test.ts`、`checkpoints.test.ts`、`detectors.test.ts`、`detectors.glm-phase1-leaves.test.ts`：`5 files / 22 tests passed`，0 failure/skip/stderr。未发现 toast timer/container ownership、map fallback、checkpoint id/时间或 detector 纯函数的直接缺陷；未知项仅是速通路线/坐标的真实运行验证，不修改数据、不改玩法。

本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；按用户规则留到完整大模块收口。3j 七个生产文件现均有直接切片证据，但整卡仍 partial，checkpoint 实跑未知保持显式 pending。
```
<!-- incremental-original-source:end -->
