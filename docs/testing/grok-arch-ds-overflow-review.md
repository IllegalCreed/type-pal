# ARCH-F2-DS-OVERFLOW-1 · Codex 独立接收

2026-09-25。结论：**accept，仅 F2 的 `DsOverflowText` 窄切片；不是整个 F2 或其它设计系统控件完成**。Grok 贡献候选 `09dddce6` 由 Codex 接入 main `fea0d9a0`，Grok 自验不是独立证明。代码差异仅把旧 `controls.tsx:147-272` 的类型与组件搬入 `overflow-text.tsx`、原出口 re-export；`index.ts`、CSS、`DsTooltip`/`DsHelpTip`、业务消费者零改。`text-overflow-adoption.json` 的 producer 从旧错误归属改到新实际 owner，规则和使用点没减少。新模块无 runtime 回引 `controls`。

## 独立验证

- Codex 复跑四个定向套件：`overflow-text` 7/7、`text-overflow-adoption` 9/9、`controls`+`boundary` 102/102，合计 118/118；editor typecheck 0。旧 `controls.js`、新模块与 design-system 根出口在新增身份测试里是同一组件函数；SSR 与布局/ARIA/焦点/ResizeObserver 旧断言未删弱。
- Codex 独立运行隔离单点反控：仅把加载视图中 `scrollWidth > clientWidth + 1` 改为 `> clientWidth`，同一旧用例 `uses a zero-width guard and one-pixel tolerance before adding a Tab stop` 恰一项业务 AssertionError 红（`expected '0' to be null`）；原树 7/7 绿，磁盘生产 SHA `32af1ddfa349930766b71a140ae27afa0a0c2464c07d2260dbc22173baa057e4` 不变。Grok 额外交的 mutant 脚本/JSON 与 adoption 登记超出卡面初始窄白名单，Codex 明示接收为诊断与迁移元数据，不视作产品范围扩张。Codex 把脚本固定 `.mutant-overflow.mts` 改为独占临时目录并 `finally` 清理，复跑仍 detected，防止覆盖现有同名文件。
- Codex 在候选独立 6013 与 main 原实现独立 6014 的 `design-lab.html?fixture=RF-06` 目视操作；没有访问用户 6010 或业务工程。短值不弹提示；长 ID 聚焦显示完整值，Esc 后浮层消失而焦点留在原值；同一实例宽→窄再次截断。相同长 ID 聚焦浮层的两个浏览器截图各 46,504 字节且**逐字节相同**；切宽后的两个截图各 44,419 字节且逐字节相同。两个临时 tab 与服务均已关闭。未执行 PAL 剧情 E2E，也未宣称其它 UI 已验。
- 全仓 `pnpm check` exit0（根 docs/coverage-tools、七包 typecheck/test、Biome）；原 `controls.tsx` 两条 `void | boolean` warning 未改且非失败。官方 `pnpm coverage:ratchet` exit0，生产范围 641→642 文件，新增 `overflow-text.tsx` 明确列入、全仓分支分母仍 63,176；fast 测试 8,109→8,110。随后受保护单次 `pnpm coverage:fast` exit0：8,110/642，总行 55,045/70,571（78.00%）、分支 43,134/63,176（68.28%），相对新基线无回退。未缩小 include/exclude、未下调阈值。

当前候选工作树的诊断脚本原版本保留作历史贡献；正式主线采用 Codex 安全收口版。后续 `ARCH-F2-DS-LABELS-1` 仍为 draft：虽然 Grok 的同文件前置切片完成，Cursor 自己的 `CURSOR-WAVE-2-1` W3/W4 尚未 done，不能并发开新拆分。
