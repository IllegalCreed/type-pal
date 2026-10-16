# 溢出文本窄拆独立接收历史回执

Status: historical
Last reviewed: 2026-10-16
Owner: Codex（文档治理；原贡献与验收身份保留）
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

Grok贡献09dddce6，Codex接入fea0d9a0；只接受DsOverflowText窄拆，controls/根出口身份与CSS/消费者保持。

## 来源与输入

历史RF-06短值、长ID聚焦、Esc关闭和同实例宽窄变化；真实加载视图将scrollWidth > clientWidth + 1改为> clientWidth，磁盘生产不变。

## 断言与业务 oracle

一像素容差、Tab止点、ARIA/焦点/ResizeObserver与SSR合同不变。原7/7绿、同一旧业务用例恰一项AssertionError红；不以超时或普通Error认针。

## 结果

118/118、typecheck与旧出口身份通过；两个状态截图分别46504/44419字节且同状态两实现逐字节相同，仅限该RF-06操作。原fast8110/642、分支43134/63176与两条旧warning保留。

## 限制与复核

不认证其它UI或PAL剧情。mutant工具与adoption额外登记由Codex明示接收，固定临时文件改唯一目录/finally清理；不把作者原脚本视作安全收口版。文末标签卡仍draft属于09-25快照，不倒写09-26后状态。

本轮仅全文审读并迁移历史记录，未执行旧产品测试、诊断工具、浏览器或coverage；旧exit0不能替代当前零诊断门。

## 历史范围

原范围为2026-09-25配对归档卡所记窄切片。原本地/远端、作者/接收者与中间/最终时态分别保留，不重开旧任务或执行旧交接提示词。

## 原始结论

以下完整保留原文，仅将原ATX标题降两级；原链接仍在原目录，原完整字节另由Git源对象固定。原标题身份继续可达。

### ARCH-F2-DS-OVERFLOW-1 · Codex 独立接收

2026-09-25。结论：**accept，仅 F2 的 `DsOverflowText` 窄切片；不是整个 F2 或其它设计系统控件完成**。Grok 贡献候选 `09dddce6` 由 Codex 接入 main `fea0d9a0`，Grok 自验不是独立证明。代码差异仅把旧 `controls.tsx:147-272` 的类型与组件搬入 `overflow-text.tsx`、原出口 re-export；`index.ts`、CSS、`DsTooltip`/`DsHelpTip`、业务消费者零改。`text-overflow-adoption.json` 的 producer 从旧错误归属改到新实际 owner，规则和使用点没减少。新模块无 runtime 回引 `controls`。

#### 独立验证

- Codex 复跑四个定向套件：`overflow-text` 7/7、`text-overflow-adoption` 9/9、`controls`+`boundary` 102/102，合计 118/118；editor typecheck 0。旧 `controls.js`、新模块与 design-system 根出口在新增身份测试里是同一组件函数；SSR 与布局/ARIA/焦点/ResizeObserver 旧断言未删弱。
- Codex 独立运行隔离单点反控：仅把加载视图中 `scrollWidth > clientWidth + 1` 改为 `> clientWidth`，同一旧用例 `uses a zero-width guard and one-pixel tolerance before adding a Tab stop` 恰一项业务 AssertionError 红（`expected '0' to be null`）；原树 7/7 绿，磁盘生产 SHA `32af1ddfa349930766b71a140ae27afa0a0c2464c07d2260dbc22173baa057e4` 不变。Grok 额外交的 mutant 脚本/JSON 与 adoption 登记超出卡面初始窄白名单，Codex 明示接收为诊断与迁移元数据，不视作产品范围扩张。Codex 把脚本固定 `.mutant-overflow.mts` 改为独占临时目录并 `finally` 清理，复跑仍 detected，防止覆盖现有同名文件。
- Codex 在候选独立 6013 与 main 原实现独立 6014 的 `design-lab.html?fixture=RF-06` 目视操作；没有访问用户 6010 或业务工程。短值不弹提示；长 ID 聚焦显示完整值，Esc 后浮层消失而焦点留在原值；同一实例宽→窄再次截断。相同长 ID 聚焦浮层的两个浏览器截图各 46,504 字节且**逐字节相同**；切宽后的两个截图各 44,419 字节且逐字节相同。两个临时 tab 与服务均已关闭。未执行 PAL 剧情 E2E，也未宣称其它 UI 已验。
- 全仓 `pnpm check` exit0（根 docs/coverage-tools、七包 typecheck/test、Biome）；原 `controls.tsx` 两条 `void | boolean` warning 未改且非失败。官方 `pnpm coverage:ratchet` exit0，生产范围 641→642 文件，新增 `overflow-text.tsx` 明确列入、全仓分支分母仍 63,176；fast 测试 8,109→8,110。随后受保护单次 `pnpm coverage:fast` exit0：8,110/642，总行 55,045/70,571（78.00%）、分支 43,134/63,176（68.28%），相对新基线无回退。未缩小 include/exclude、未下调阈值。

当前候选工作树的诊断脚本原版本保留作历史贡献；正式主线采用 Codex 安全收口版。后续 `ARCH-F2-DS-LABELS-1` 仍为 draft：虽然 Grok 的同文件前置切片完成，Cursor 自己的 `CURSOR-WAVE-2-1` W3/W4 尚未 done，不能并发开新拆分。

## 当时证据

真实变异生产SHA 32af1ddfa349930766b71a140ae27afa0a0c2464c07d2260dbc22173baa057e4 与截图字节由原文保留；本次未取回原临时工具/图片或重跑。

原临时路径为历史产物标识，不认定当前存在或可恢复；现存被引机器证据/诊断脚本保留字段与路径，本次不改写、不执行、不继承迁移完成信用。

## 当前有效性

historical。本次接受对象是文档语义、结构和来源保留；原产品实现、动态反证、视觉及覆盖率只按原候选时点读。未重验项保持unknown，不能由文档静态门推成当前通过。

## 继任文档

[配对历史任务卡](../../../../../ops/archive/tasks/done/ARCH-F2-DS-OVERFLOW-1.md)拥有该历史任务收口；[当前全量文档任务](../../../../../ops/tasks/DOCS-FULL-TEMPLATE-1.md)拥有本次治理进度。当前新产品变更另走现行准入，本回执不提供build授权。
