# ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 独立模块

Status: build
Phase: phase2 editor / 架构治理 F2
Coding Owner: Grok
Review / Integration Owner: Codex
Branch: `codex/grok-arch-ds-overflow-r1`（独立 worktree）
Base / production freeze: `620a29dd`（开工先同步 main 并登记实际 SHA）

## 前提与准入

用户 2026-09-25 将可验证的中低风险架构切片委派其他 Agent，Codex 保留高风险宿主与最终验收。`packages/editor/src/ui/design-system/controls.tsx:147-272` 的 `DsOverflowText` 有独立裁剪测量、聚焦/悬停/关闭与浮层生命周期，使用现有 `DsFloatingLayer`，而 `controls.tsx` 当前约 2,589 行。`overflow-text.test.tsx` 已测测量容差、ResizeObserver、焦点、浮层与 SSR；`text-overflow-adoption.test.ts` 钉消费者。**before → after = DOM、class、ARIA、键盘/指针、SSR 输出和旧导入出口完全不变，仅实现从控件总文件搬出。**

最强替代解释是它与 `controls.tsx` 私有 `classes`/React hooks 不可分；源码显示需要的辅助很小，但若迁移需要从新模块 runtime import 回 `controls` 或改变浮层时序，就停线交 Codex，不硬拆。可证伪观察：同输入 DOM/`aria-describedby`/Tab 止点/浮层开闭轨迹、SSR 输出、ResizeObserver 订阅释放与旧导出身份改变。

## 白名单与实施

- `packages/editor/src/ui/design-system/controls.tsx`：只移出 `DsOverflowTextProps` 与 `DsOverflowText`，保持从 `./controls.js` 旧入口 re-export 同一实现；不得动 `DsTooltip`、`DsHelpTip`、其它控件或公共样式。
- 新建 `packages/editor/src/ui/design-system/overflow-text.tsx` 承接原实现。辅助 `classes` 可在新文件保真局部实现，**不能从新文件 runtime import 回 `controls`**；不得添加第二个状态源。
- 仅必要时改 `overflow-text.test.tsx`、`controls.test.tsx`、`text-overflow-adoption.test.ts` 或明确受结构移动影响的 `boundary.test.ts`，但旧业务断言不删弱、不通过排除源文件过关。可交 `docs/testing/grok-arch-ds-overflow.md` 回执与测试索引一行，不改任务卡/看板。
- 不改 CSS、`index.ts` 对外路径、其它 UI/产品模块、schema/save/资源、配置/覆盖率基线。发现旧实现缺陷须单列诊断，不夹带 UX 修复。

## 验收

拆前固定 `overflow-text.test.tsx` 和 `controls.test.tsx` 相关测试名；拆后跑二者、`text-overflow-adoption.test.ts`、`boundary.test.ts`、editor typecheck 与 Biome。至少一个隔离负控制能使裁剪容差或焦点/关闭业务断言红，不能仅报“文件已移动”。核旧 `controls.js` 与 design-system 根出口返回同一组件、DOM/ARIA/SSR 快照不变，视觉只需非用户隔离环境的最小功能复验；若没浏览器能力，如实登记由 Codex 接收时补，不碰用户 6010 项目。

Grok 只在隔离分支提交推送，不合 main、不标 done。Codex 独立核源码与测试，再统一全仓 check→ratchet→受保护 strict-fast。Cursor 后续标签组件窄拆必须等本卡接入，不能同时改 `controls.tsx`。

## 阶段门

Codex：**premise verified / build allowed**，仅此组件；用户新分工覆盖旧“全队列 Codex 独立”对本切片的限制。固定三签暂停，Grok 自验不作独立证明。done 未开放。
