# 标签与只读值窄拆独立接收历史回执

Status: historical
Last reviewed: 2026-10-16
Owner: Codex（文档治理；原贡献与验收身份保留）
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

Cursor贡献9593b06f，Codex选择性接入27f61a4e；只接受DsTag/DsReadonlyValue窄切片，不代表F2整批完成。

## 来源与输入

合法输入是默认及neutral/warning/danger tone、monospace、span/div与data属性透传；真实Vite模块加载视图只改默认tone。独立Design Lab RF-22只呈现neutral Tag，ReadonlyValue不在该页面。

## 断言与业务 oracle

同一函数出口身份、精确DOM/SSR与属性透传保持。真实tone变异只让同一正式测试的一项AssertionError失败；截图字节略异，不能宣称像素相等。

## 结果

138/138与typecheck为当时定向证据。首轮adoption登记错误由Codex额外最小集成修正；ratchet未改game子进程SIGABRT后隔离25/25及原范围重跑均保留。最终8122项/643文件、78.00%行/68.28%分支是原strict统计。

## 限制与复核

旧controls两条warning及boundary warning不追溯归零。未跑剧情E2E，ReadonlyValue没有该页目视；内存分配失败若复发需另卡，不许可跳过。原临时截图/日志未在本轮恢复。

本轮仅全文审读并迁移历史记录，未执行旧产品测试、诊断工具、浏览器或coverage；旧exit0不能替代当前零诊断门。

## 历史范围

原范围为2026-09-26配对归档卡所记窄切片。原本地/远端、作者/接收者与中间/最终时态分别保留，不重开旧任务或执行旧交接提示词。

## 原始结论

以下完整保留原文，仅将原ATX标题降两级；原链接仍在原目录，原完整字节另由Git源对象固定。原标题身份继续可达。

### ARCH-F2-DS-LABELS-1 · Codex 独立接收

2026-09-26。结论：**accept，仅 F2 的 `DsTag` / `DsReadonlyValue` 窄切片；不代表整批 F2 完成。** Cursor 贡献候选 `9593b06f` 经 Codex 选择性接入 main `27f61a4e`；贡献者自验不是独立证明。源码仅把 `DsTagTone`、两个被动展示组件移到 `status-values.tsx`，`controls.tsx` 和 design-system 根出口继续 re-export 同一函数/类型；`index.ts`、CSS、消费组件、schema/save/资源零改。新文件只有 React type import，不运行时回引 `controls`。

#### 独立验证

- `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 3 文件 **138/138**，editor typecheck exit0；旧 Tag 用例未删弱。新增业务断言钉默认/neutral/warning/danger tone、monospace、span/div、`data-*` 透传与 SSR 精确 HTML，且 controls/根出口与新模块的组件函数身份相同。改动文件 Biome exit0；`controls.tsx` 两处旧 `void | boolean` warning 与 `boundary.test.ts` 既有 warning 未借本卡改变。
- Codex 在候选隔离 Vite 加载视图内仅把生产 `status-values.tsx` 的 `tone = 'accent'` 改为 `tone = 'neutral'`；新增的同一正式测试在原树绿、变异树恰一项 `AssertionError: expected 'ds-tag ds-tag--neutral' to be 'ds-tag ds-tag--accent'` 红。Vite 进入见证命中真实模块，磁盘生产 SHA-256 `fef08ab290a004613eed62cb23b0cbdf91e38485af8f72dcfef36724dac72104` 不变。Codex 临时 config/依赖软链接已精确移除，候选工作树恢复干净。
- 候选 6013 与主线原实现 6014 的独立 Design Lab `RF-22` 实际打开“添加道具”列表，含 `DsTag tone=neutral` 的多行布局/字体/标签目视一致；主线与候选截图 PNG 字节数略异，**不宣称逐像素相等**。`DsReadonlyValue` 的 span/div 样式未在此页面呈现，其 DOM/SSR 精确合同由上述实际测试覆盖。没有访问用户 6010 或业务工程，浏览器标签与隔离服务均已关闭。
- 首次根 `pnpm check` exit1：`text-overflow-adoption.json` 的 `.ds-readonly-value` 与 `.ds-tag` producer 仍指向旧 `controls.tsx`/`DsPressable`，不是产品 DOM 漂移。Codex 仅把这两条登记改为新 `status-values.tsx` 的真实 `DsReadonlyValue`/`DsTag` owner，政策/CSS/选择器/消费者不变；两套 adoption 测试 **32/32**。此登记超出 Cursor 原白名单，属于 Codex 明示的最小集成修正，不把它冒充贡献者原候选已闭环。之后完整 `pnpm check` exit0（editor 2761/2761 等七包均通过）。
- 首次 `pnpm coverage:ratchet` 在**未改动的 game** `snapshot-input-boundaries.test.ts` 子进程被 `SIGABRT` 终止，原始日志含 `memory allocation of 48 bytes failed`；不是本卡断言失败。Codex 隔离原用例 25/25 通过；无并发门后按**原范围**重跑 ratchet exit0，game 2395/2395、editor fast 2599/2599。受保护单次 `pnpm coverage:fast` exit0：fast **8,122 项 / 643 个生产文件**，全仓行 55,046/70,572（78.00%）、分支 43,134/63,176（68.28%），相对新基线无回退。新增 `status-values.tsx` 列入范围，未减少分母、缩 include/exclude 或增超时。若 game 资源子进程 SIGABRT 在后续 CI 重复，应按环境稳定性另卡调查，不用本卡默许跳过。

本卡没有发现新的产品缺陷，也未执行剧情 E2E；功能界面只做上述最小隔离目视。Cursor 的贡献与 Codex 集成元数据修正分别披露。F2 其余命令族和大宿主拆分仍归各自任务，不借本卡 done。

## 当时证据

生产SHA fef08ab290a004613eed62cb23b0cbdf91e38485af8f72dcfef36724dac72104、真实单针和6013/6014页面范围由原文记录；本次不重新核生产源码或取回截图。

原临时路径为历史产物标识，不认定当前存在或可恢复；现存被引机器证据/诊断脚本保留字段与路径，本次不改写、不执行、不继承迁移完成信用。

## 当前有效性

historical。本次接受对象是文档语义、结构和来源保留；原产品实现、动态反证、视觉及覆盖率只按原候选时点读。未重验项保持unknown，不能由文档静态门推成当前通过。

## 继任文档

[配对历史任务卡](../../../../../ops/archive/tasks/done/ARCH-F2-DS-LABELS-1.md)拥有该历史任务收口；[当前全量文档任务](../../../../../ops/tasks/DOCS-FULL-TEMPLATE-1.md)拥有本次治理进度。当前新产品变更另走现行准入，本回执不提供build授权。
