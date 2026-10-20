# 第一阶段工具面板：控件规范与复核（2026-10-15）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: audit-report-v1 / 1.0.0

本页是第一阶段工具面板控件规范审计（2026-10-15）：用户从计时器「节点选择/跳转按钮」发现控件尺寸混用要求整体检查；范围为当前工具面板六个页签；不修改游戏机制、存档、计时器/音源/存档动作，不延伸到第二阶段编辑器或游戏画布菜单；参考 Web Interface Guidelines 的焦点、语义控件、长内容、窄屏和减弱动画要求，保持深色、金边及红色动作按钮。

## 审计问题

- 工具面板六页签控件尺寸/间距/焦点/窄屏/减弱动画的一致性。

## 范围与证据

- 已收敛规范表：文字按钮/文本输入/下拉统一高 32px、字号 14px、圆角 5px、左右内边距 10px；同组间距 8px（flex gap）；下拉共用 select.tp-input（箭头右侧 12px、文字右内边距 34px）；数值输入同高同字号（计时器时间保留等宽数字）；共用 hover/disabled/键盘 focus-visible；窄屏自然换行（快捷键 420px 以下上下排列）；辅助文字从过暗灰金提高到 #a38f70；专门控件按角色保留尺寸（复选框 16px、迷你地图缩放 19px、浮动入口 38px）。

## 发现

- 问题锚点与处理（tools-panel.ts 八处）：:86 集中控件变量；:138 button/input 同盒模型撤局部 25px/13px；:157 所有下拉共用箭头；:205 跳转/三动作行独立 action-row 窄屏换行；:95 公共 inline-flex 曾使 ready 重试按钮仍显示——显式保护 hidden（修前截图 tools-style-system-before-hidden-fix.png、最终 DOM retryHidden=true）；:162 统一键盘可见焦点（Tab 输入 2px 实线、页签 2px/-3px 内环）；:230 减弱动画与 hover 同选择器优先级禁用位移过渡；:298 滑块/搜索/节点选择/时间输入可访问名称保持原生键盘交互。

## 结论

- 实际当前 Codex 内置浏览器默认 689px 及临时 375×667 逐页检查：每页签 body 无横向溢出、可见表单/文字按钮均 32px/14px、375px 下按钮文字无横向裁切；已还原 viewport 覆盖保留用户预览；桌面/窄屏数据见 tools-style-desktop.json/tools-style-mobile.json。

## 整改与复核

- 截图与 JSON 数据留档复核。

## 历史范围

- 第一阶段工具面板控件规范审计（六页签八锚点）；固定源 revision 381cab90f8d6…。

## 原始结论

- 尺寸/间距/焦点/窄屏/减弱动画统一；hidden 优先级修复有前后证据。

## 当时证据

- 规范表与锚点清单在 quote 保全。

## 当前有效性

historical。2026-10-15 时点。

## 继任文档

当前结论归任务卡与桌面/窄屏 JSON 数据。

## 原文保全

固定 source revision `381cab90f8d6cc26171bd4bc8c2b025c15bc6f36`，source SHA `8c9dbc9672e99ae9c27f45bc1d7a6d7569413bff84aba2eb3ff04567422b0e94`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 第一阶段工具面板：控件规范与复核（2026-10-15）
>
> 用户从计时器“节点选择/跳转按钮”发现控件尺寸混用，要求整体检查。范围为当前工具面板六个页签；不修改游戏机制、存档、计时器/音源/存档动作，不延伸到第二阶段编辑器或游戏画布菜单。
>
> 检查参考 [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) 的焦点、语义控件、长内容、窄屏和减弱动画要求。保持深色、金边及红色动作按钮。
>
> ## 已收敛的规范
>
> | 项目 | 统一规则 |
> |---|---|
> | 文字按钮、文本输入、下拉 | 高32px、字号14px、圆角5px、左右基础内边距10px |
> | 同组控件 | 间距8px；使用flex gap，移除相邻按钮margin及局部小号覆盖 |
> | 下拉 | 两处均由select.tp-input共用样式，箭头右侧12px、文字右内边距34px |
> | 数值输入 | 与其他输入同高同字号；计时器时间保留等宽数字以便纵向比较 |
> | 状态 | 共用hover、disabled与键盘focus-visible；hidden状态优先于公共display |
> | 窄屏 | 操作行自然换行；长标签可收缩/换行；快捷键在420px以下上下排列 |
> | 配色 | 保留原暖色系，辅助文字从过暗的灰金色提高为#a38f70 |
> | 专门控件 | 复选框16px、迷你地图缩放19px、浮动入口38px、导航页签和只读数据按各自角色保留尺寸 |
>
> ## 问题锚点与处理
>
> - packages/game/src/tools/tools-panel.ts:86：集中control高度、字号、圆角、间距和内边距变量。
> - packages/game/src/tools/tools-panel.ts:138：button与input使用同一盒模型，撤掉save-row中的25px/13px局部按钮样式。
> - packages/game/src/tools/tools-panel.ts:157：所有下拉共用箭头，计时器不再遗漏。
> - packages/game/src/tools/tools-panel.ts:205：跳转和三动作行采用独立action-row，避免复用存档行带入局部覆盖；窄屏换行。
> - packages/game/src/tools/tools-panel.ts:95：公共inline-flex曾使开发候选中的ready重试按钮仍显示；显式保护面板内hidden。实际修前截图为tools-style-system-before-hidden-fix.png，最终系统DOM记录retryHidden=true，截图中不再出现重试按钮。
> - packages/game/src/tools/tools-panel.ts:162：统一键盘可见焦点；页签内环避免父级overflow裁切。实际Tab验证输入为2px实线、在滚动区内，页签为2px/-3px内环。
> - packages/game/src/tools/tools-panel.ts:230：减弱动画规则与hover使用相同选择器优先级，禁用位移和过渡。
> - packages/game/src/tools/tools-panel.ts:298：滑块、搜索、节点选择及时间输入有可访问名称；保持原生键盘交互。
>
> ## 验证与边界
>
> 实际当前Codex内置浏览器，默认689px及临时375×667下逐页检查。每个页签body均无横向溢出，可见表单/文字按钮均32px/14px，375px下按钮文字没有横向裁切。已还原viewport覆盖并保留用户预览。桌面数据见 [tools-style-desktop.json](tools-style-desktop.json)，窄屏见 [tools-style-mobile.json](tools-style-mobile.json)，焦点见 [tools-style-focus.json](tools-style-focus.json)。
>
> [计时器桌面](tools-style-timer.png)、[系统桌面](tools-style-system.png)、[计时器窄屏](tools-style-timer-mobile.png)、[快捷键窄屏](tools-style-keys-mobile.png)、[键盘焦点](tools-style-focus-mobile.png)。另保留场景/战斗/对话截图；本次战斗和对话为当前空态，没有注入游戏状态或重跑剧情来制造内容。原生引擎特定的Safari/Firefox验证未执行。
>
> 现有工具面板及速通回归99/99，撤回临时样式断言后面板18/18。未新增测试数量或改变测试身份。尝试在jsdom中增加computedStyle断言时，错误候选仍18/18全绿，不能区分真实浏览器层叠行为；这些断言已删除，tools-style-jsdom-nondiscriminating.json.raw仅保留为测试局限记录，不计红绿反控。该显示回归由实际浏览器修前截图、修后DOM与截图验证。
>
> 本轮没有重跑官方fast覆盖率；原19857项报告保留原候选与时间边界。最终typecheck、lint、文档及构建结果见verification-manifest。只读reviewer已核当前源码和DOM/图片证据accept，未运行测试或浏览器；源码SHA256为1690410dfda8b125cecf8f650c3f91f4efcc3ee79200ff74795b49647f68e8e1。
>
<!-- original-source-quote:end -->
