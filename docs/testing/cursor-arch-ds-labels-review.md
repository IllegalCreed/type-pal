# ARCH-F2-DS-LABELS-1 · Codex 独立接收

2026-09-26。结论：**accept，仅 F2 的 `DsTag` / `DsReadonlyValue` 窄切片；不代表整批 F2 完成。** Cursor 贡献候选 `9593b06f` 经 Codex 选择性接入 main `27f61a4e`；贡献者自验不是独立证明。源码仅把 `DsTagTone`、两个被动展示组件移到 `status-values.tsx`，`controls.tsx` 和 design-system 根出口继续 re-export 同一函数/类型；`index.ts`、CSS、消费组件、schema/save/资源零改。新文件只有 React type import，不运行时回引 `controls`。

## 独立验证

- `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 3 文件 **138/138**，editor typecheck exit0；旧 Tag 用例未删弱。新增业务断言钉默认/neutral/warning/danger tone、monospace、span/div、`data-*` 透传与 SSR 精确 HTML，且 controls/根出口与新模块的组件函数身份相同。改动文件 Biome exit0；`controls.tsx` 两处旧 `void | boolean` warning 与 `boundary.test.ts` 既有 warning 未借本卡改变。
- Codex 在候选隔离 Vite 加载视图内仅把生产 `status-values.tsx` 的 `tone = 'accent'` 改为 `tone = 'neutral'`；新增的同一正式测试在原树绿、变异树恰一项 `AssertionError: expected 'ds-tag ds-tag--neutral' to be 'ds-tag ds-tag--accent'` 红。Vite 进入见证命中真实模块，磁盘生产 SHA-256 `fef08ab290a004613eed62cb23b0cbdf91e38485af8f72dcfef36724dac72104` 不变。Codex 临时 config/依赖软链接已精确移除，候选工作树恢复干净。
- 候选 6013 与主线原实现 6014 的独立 Design Lab `RF-22` 实际打开“添加道具”列表，含 `DsTag tone=neutral` 的多行布局/字体/标签目视一致；主线与候选截图 PNG 字节数略异，**不宣称逐像素相等**。`DsReadonlyValue` 的 span/div 样式未在此页面呈现，其 DOM/SSR 精确合同由上述实际测试覆盖。没有访问用户 6010 或业务工程，浏览器标签与隔离服务均已关闭。
- 首次根 `pnpm check` exit1：`text-overflow-adoption.json` 的 `.ds-readonly-value` 与 `.ds-tag` producer 仍指向旧 `controls.tsx`/`DsPressable`，不是产品 DOM 漂移。Codex 仅把这两条登记改为新 `status-values.tsx` 的真实 `DsReadonlyValue`/`DsTag` owner，政策/CSS/选择器/消费者不变；两套 adoption 测试 **32/32**。此登记超出 Cursor 原白名单，属于 Codex 明示的最小集成修正，不把它冒充贡献者原候选已闭环。之后完整 `pnpm check` exit0（editor 2761/2761 等七包均通过）。
- 首次 `pnpm coverage:ratchet` 在**未改动的 game** `snapshot-input-boundaries.test.ts` 子进程被 `SIGABRT` 终止，原始日志含 `memory allocation of 48 bytes failed`；不是本卡断言失败。Codex 隔离原用例 25/25 通过；无并发门后按**原范围**重跑 ratchet exit0，game 2395/2395、editor fast 2599/2599。受保护单次 `pnpm coverage:fast` exit0：fast **8,122 项 / 643 个生产文件**，全仓行 55,046/70,572（78.00%）、分支 43,134/63,176（68.28%），相对新基线无回退。新增 `status-values.tsx` 列入范围，未减少分母、缩 include/exclude 或增超时。若 game 资源子进程 SIGABRT 在后续 CI 重复，应按环境稳定性另卡调查，不用本卡默许跳过。

本卡没有发现新的产品缺陷，也未执行剧情 E2E；功能界面只做上述最小隔离目视。Cursor 的贡献与 Codex 集成元数据修正分别披露。F2 其余命令族和大宿主拆分仍归各自任务，不借本卡 done。
