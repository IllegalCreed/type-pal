# ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 独立模块

Status: done
Phase: phase2 editor / 架构治理 F2
Coding Owner: Grok
Review / Integration Owner: Codex
Branch: `codex/grok-arch-ds-overflow-r1`（独立 worktree）
Base / production freeze: `620a29dd`（开工先同步 main 并登记实际 SHA）
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 B 文档治理）
Template: task-card-v1 / 1.0.0

## 目标

保留DsOverflowText独立模块窄拆：裁剪测量、焦点/悬停/关闭与浮层生命周期不变；同一旧出口身份，F2其它控件不随本卡完成。

## 范围

原controls.tsx:147–272类型/实现移入overflow-text.tsx；原CSS/index/DsTooltip/DsHelpTip和业务消费者保持。Grok贡献与Codex诊断工具安全收口分开，不重开当前产品。

## 前提与证据

原620a29dd准入与ResizeObserver/SSR/浮层合同构成历史前提；新模块不得runtime回引controls。若一像素容差、Tab止点、aria-describedby、订阅释放或SSR漂移即反证。已核[独立回执](../../../../testing/archive/legacy/ops/testing-records/grok-arch-ds-overflow-review.md)，非由组件路径推断通过。

## 验收

原09dddce6→fea0d9a0、118/118与真实加载单点>clientWidth容差变异保留。6013↔6014两状态截图逐字节相同只覆盖当时RF-06操作；不是其它UI或PAL E2E。fast8110/642、未缩分母与旧两条warning照原文，不能解释为今天零诊断。

## 状态与交接

保留原顶部状态、Owner或Coding Owner及原审查身份。2026-10-16根线程已独立接收本次文档迁移并写中央review/SHA；接收范围仅文档，旧产品build不重新准入。原交接提示词与旧“待门禁/待签字”按下述历史时点读取，不作为可执行授权。无下一位产品贡献者提示词；原未决验证按本卡历史范围保留。

## 历史范围

2026-09-25独立接收；原“done未开放”和标签组件仍draft/前置未齐是当时先后状态，9月26标签卡接收不倒写本卡原时间片。

## 当时证据

完整原卡、12行独立接收回执已读；旧临时mutant文件被改为唯一目录/finally清理，图像字节和生产SHA由原记录说明，本次未重新取回。

## 当前有效性

historical。相同截图、原业务红和exit0仅对应旧候选；不把warning豁免延续到现行硬门，不将诊断工具存在当当前可执行性。

## 继任文档

窄拆结论见[独立回执](../../../../testing/archive/legacy/ops/testing-records/grok-arch-ds-overflow-review.md)；后续标签切片见[标签卡](ARCH-F2-DS-LABELS-1.md)，原Grok提示词只作历史。

## 原始结论

完整原卡按原始时点保留；原字节可从 Git blob `e5c13b5a66538bc0500048559aa299d65b767a77` 回读。引用中的旧授权、命令、提示词与分支清理不能因本次迁移重新执行。

> # ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 独立模块
>
> Status: done
> Phase: phase2 editor / 架构治理 F2
> Coding Owner: Grok
> Review / Integration Owner: Codex
> Branch: `codex/grok-arch-ds-overflow-r1`（独立 worktree）
> Base / production freeze: `620a29dd`（开工先同步 main 并登记实际 SHA）
>
> ## 前提与准入
>
> 用户 2026-09-25 将可验证的中低风险架构切片委派其他 Agent，Codex 保留高风险宿主与最终验收。`packages/editor/src/ui/design-system/controls.tsx:147-272` 的 `DsOverflowText` 有独立裁剪测量、聚焦/悬停/关闭与浮层生命周期，使用现有 `DsFloatingLayer`，而 `controls.tsx` 当前约 2,589 行。`overflow-text.test.tsx` 已测测量容差、ResizeObserver、焦点、浮层与 SSR；`text-overflow-adoption.test.ts` 钉消费者。**before → after = DOM、class、ARIA、键盘/指针、SSR 输出和旧导入出口完全不变，仅实现从控件总文件搬出。**
>
> 最强替代解释是它与 `controls.tsx` 私有 `classes`/React hooks 不可分；源码显示需要的辅助很小，但若迁移需要从新模块 runtime import 回 `controls` 或改变浮层时序，就停线交 Codex，不硬拆。可证伪观察：同输入 DOM/`aria-describedby`/Tab 止点/浮层开闭轨迹、SSR 输出、ResizeObserver 订阅释放与旧导出身份改变。
>
> ## 白名单与实施
>
> - `packages/editor/src/ui/design-system/controls.tsx`：只移出 `DsOverflowTextProps` 与 `DsOverflowText`，保持从 `./controls.js` 旧入口 re-export 同一实现；不得动 `DsTooltip`、`DsHelpTip`、其它控件或公共样式。
> - 新建 `packages/editor/src/ui/design-system/overflow-text.tsx` 承接原实现。辅助 `classes` 可在新文件保真局部实现，**不能从新文件 runtime import 回 `controls`**；不得添加第二个状态源。
> - 仅必要时改 `overflow-text.test.tsx`、`controls.test.tsx`、`text-overflow-adoption.test.ts` 或明确受结构移动影响的 `boundary.test.ts`，但旧业务断言不删弱、不通过排除源文件过关。可交 `docs/testing/archive/legacy/ops/testing-records/grok-arch-ds-overflow.md` 回执与测试索引一行，不改任务卡/看板。
> - 不改 CSS、`index.ts` 对外路径、其它 UI/产品模块、schema/save/资源、配置/覆盖率基线。发现旧实现缺陷须单列诊断，不夹带 UX 修复。
>
> ## 验收
>
> 拆前固定 `overflow-text.test.tsx` 和 `controls.test.tsx` 相关测试名；拆后跑二者、`text-overflow-adoption.test.ts`、`boundary.test.ts`、editor typecheck 与 Biome。至少一个隔离负控制能使裁剪容差或焦点/关闭业务断言红，不能仅报“文件已移动”。核旧 `controls.js` 与 design-system 根出口返回同一组件、DOM/ARIA/SSR 快照不变，视觉只需非用户隔离环境的最小功能复验；若没浏览器能力，如实登记由 Codex 接收时补，不碰用户 6010 项目。
>
> Grok 只在隔离分支提交推送，不合 main、不标 done。Codex 独立核源码与测试，再统一全仓 check→ratchet→受保护 strict-fast。Cursor 后续标签组件窄拆必须等本卡接入，不能同时改 `controls.tsx`。
>
> ## 阶段门
>
> Codex：**premise verified / build allowed**，仅此组件；用户新分工覆盖旧“全队列 Codex 独立”对本切片的限制。固定三签暂停，Grok 自验不作独立证明。done 未开放。
>
> ## Codex 独立接收与 done 准入（2026-09-25）
>
> - **accept / done，仅本组件窄拆**。Grok 候选 `09dddce6` 经 Codex 源码、公开导出、定向 118/118、独立负控及隔离 6013↔6014 两状态逐字节画面对照；[完整接收记录](../../../../testing/archive/legacy/ops/testing-records/grok-arch-ds-overflow-review.md)。Grok 是贡献者，不代作独立审查。
> - main 接入 `fea0d9a0`；Codex 仅修诊断脚本临时文件独占与清理，不改产品语义。根 check、ratchet 与单次严格 fast 均 exit0，新增生产模块进入 642 文件范围，8110 测试且分支总分母未缩。
> - 原卡“done 未开放”是候选实施前历史状态；本段按当前 Codex 独立验收模式核准。整组 F2 与 Cursor 后续标签组件仍未完成；无下一位 Grok 提示词，本卡收口。
>
> ## 下一位 Grok 提示词
>
> ```text
> 在 /Users/zhangxu/illegal/type-pal 接手 ARCH-F2-DS-OVERFLOW-1。先读 AGENTS.md、CLAUDE.md、
> docs/phase2/READ-FIRST.md、本卡、controls.tsx:147-272与overflow-text.test.tsx。
> 从最新 origin/main 新建独立 worktree，分支 codex/grok-arch-ds-overflow-r1。
> 仅迁出DsOverflowText及类型到新模块，旧controls.js与design-system入口保持同一导出；
> DOM/class/ARIA/焦点悬停/关闭/ResizeObserver/SSR行为不变，不改CSS或其它控件。
> 按白名单跑定向/相邻、editor typecheck、Biome和隔离单点负控制；提供前后DOM与API对照，
> 可用时在非用户隔离环境作最小功能目视验证。候选提交推送精确SHA；不合main、不标done。
> Codex独立复核与统一全仓门禁。Cursor同文件后续切片尚未开放。
> ```
