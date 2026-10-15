# 第一阶段工具面板：控件规范与复核（2026-10-15）

用户从计时器“节点选择/跳转按钮”发现控件尺寸混用，要求整体检查。范围为当前工具面板六个页签；不修改游戏机制、存档、计时器/音源/存档动作，不延伸到第二阶段编辑器或游戏画布菜单。

检查参考 [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) 的焦点、语义控件、长内容、窄屏和减弱动画要求。保持深色、金边及红色动作按钮。

## 已收敛的规范

| 项目 | 统一规则 |
|---|---|
| 文字按钮、文本输入、下拉 | 高32px、字号14px、圆角5px、左右基础内边距10px |
| 同组控件 | 间距8px；使用flex gap，移除相邻按钮margin及局部小号覆盖 |
| 下拉 | 两处均由select.tp-input共用样式，箭头右侧12px、文字右内边距34px |
| 数值输入 | 与其他输入同高同字号；计时器时间保留等宽数字以便纵向比较 |
| 状态 | 共用hover、disabled与键盘focus-visible；hidden状态优先于公共display |
| 窄屏 | 操作行自然换行；长标签可收缩/换行；快捷键在420px以下上下排列 |
| 配色 | 保留原暖色系，辅助文字从过暗的灰金色提高为#a38f70 |
| 专门控件 | 复选框16px、迷你地图缩放19px、浮动入口38px、导航页签和只读数据按各自角色保留尺寸 |

## 问题锚点与处理

- packages/game/src/tools/tools-panel.ts:86：集中control高度、字号、圆角、间距和内边距变量。
- packages/game/src/tools/tools-panel.ts:138：button与input使用同一盒模型，撤掉save-row中的25px/13px局部按钮样式。
- packages/game/src/tools/tools-panel.ts:157：所有下拉共用箭头，计时器不再遗漏。
- packages/game/src/tools/tools-panel.ts:205：跳转和三动作行采用独立action-row，避免复用存档行带入局部覆盖；窄屏换行。
- packages/game/src/tools/tools-panel.ts:95：公共inline-flex曾使开发候选中的ready重试按钮仍显示；显式保护面板内hidden。实际修前截图为tools-style-system-before-hidden-fix.png，最终系统DOM记录retryHidden=true，截图中不再出现重试按钮。
- packages/game/src/tools/tools-panel.ts:162：统一键盘可见焦点；页签内环避免父级overflow裁切。实际Tab验证输入为2px实线、在滚动区内，页签为2px/-3px内环。
- packages/game/src/tools/tools-panel.ts:230：减弱动画规则与hover使用相同选择器优先级，禁用位移和过渡。
- packages/game/src/tools/tools-panel.ts:298：滑块、搜索、节点选择及时间输入有可访问名称；保持原生键盘交互。

## 验证与边界

实际当前Codex内置浏览器，默认689px及临时375×667下逐页检查。每个页签body均无横向溢出，可见表单/文字按钮均32px/14px，375px下按钮文字没有横向裁切。已还原viewport覆盖并保留用户预览。桌面数据见 [tools-style-desktop.json](tools-style-desktop.json)，窄屏见 [tools-style-mobile.json](tools-style-mobile.json)，焦点见 [tools-style-focus.json](tools-style-focus.json)。

[计时器桌面](tools-style-timer.png)、[系统桌面](tools-style-system.png)、[计时器窄屏](tools-style-timer-mobile.png)、[快捷键窄屏](tools-style-keys-mobile.png)、[键盘焦点](tools-style-focus-mobile.png)。另保留场景/战斗/对话截图；本次战斗和对话为当前空态，没有注入游戏状态或重跑剧情来制造内容。原生引擎特定的Safari/Firefox验证未执行。

现有工具面板及速通回归99/99，撤回临时样式断言后面板18/18。未新增测试数量或改变测试身份。尝试在jsdom中增加computedStyle断言时，错误候选仍18/18全绿，不能区分真实浏览器层叠行为；这些断言已删除，tools-style-jsdom-nondiscriminating.json.raw仅保留为测试局限记录，不计红绿反控。该显示回归由实际浏览器修前截图、修后DOM与截图验证。

本轮没有重跑官方fast覆盖率；原19857项报告保留原候选与时间边界。最终typecheck、lint、文档及构建结果见verification-manifest。只读reviewer已核当前源码和DOM/图片证据accept，未运行测试或浏览器；源码SHA256为1690410dfda8b125cecf8f650c3f91f4efcc3ee79200ff74795b49647f68e8e1。
