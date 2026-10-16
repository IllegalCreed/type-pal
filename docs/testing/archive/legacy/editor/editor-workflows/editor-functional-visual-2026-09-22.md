# 编辑器功能视觉补证（2026-09-22）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 3dc90ad8f6dde5a7ddcafc6b749b61dd53152751；本轮 R78。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- 编辑器功能视觉补证（2026-09-22）：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `2ed1e749c1062496c097b0387a76496b11b099dbf92af214e920dd087d5db3e7`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 编辑器功能视觉补证（2026-09-22）
>
> Owner：Codex；生产树 `f828b9fc`（相对 `57dda7ed` 的产品零改动）。
> 用户要求在GLM非视觉覆盖率准备返工期间并行推进测试。本批为 `dev-functional`，
> 沿用已验收的[模拟器设计与实现](../../runtime/battle/battle-simulator-implementation.md)，不重开其历史签字，
> 不修改产品、GLM工作包、测试选择或覆盖率基线，不声称full/Q1/Q2或完整编辑器E2E通过。
>
> ## 环境与隔离
>
> - 先核main干净、与origin/main同步。6010/6011/6012当时均无监听；仅启动已有
>   `node docs/testing/domains/runtime/battle/tools/battle-simulator-functional.mjs`，6011为正式编辑器配合法自有工程。
>   该宿主用正式loader校验fixture，HTTP源只读，不改PAL、作者工程或普通存档。
> - Chrome新建两个自有标签，真实鼠标/键盘操作；浏览器viewport分别360×800与720×480。
>   新标签不自动继承旧标签的viewport，第二个对照标签单独重设720×480后取证。
> - 采用Web Interface Guidelines的焦点、错误提示、窄窗口可达性检查方向；具体结论来自真实页面，
>   不以静态规则或DOM存在代替目视验证。截图与DOM/AX证据已由本轮浏览器工具回传，未宣称有仓内截图文件。
> - 原生保存专用空目录 `/tmp/type-pal-simulator-native-8wFDI6`。原生Chrome控制两次连接超时；
>   没有获得目录句柄，目录复核为空。没有用替身保存或HTTP下载代替原生保存链。
>
> ## 本批检查
>
> | ID | 实际操作与观察 | 结论 |
> |---|---|---|
> | V01 | 文件→另存为；尝试连接Chrome原生目录选择窗口，两次超时；返回页面继续独立检查 | 工具阻塞；原生选择器→保存→重开仍未完成 |
> | V02 | 360×800打开方案；再用⌘⌥L隐藏对象列表。两态右侧仍被裁切；主壳根360px但内部网格约731px（对象列表显示时） | 既有360主壳边界复现，不记通过 |
> | V03 | 720×480打开添加队员；说明、搜索、列表与确认/取消可见。搜不存在名称显示无匹配，确认不可用；Tab到取消、Escape回添加按钮。重开搜队员5，Down/Enter选中后确认可用，取消不添加 | 通过；未重做宽屏已验收矩阵 |
> | V04 | 切指定技能模式→多选；720×480弹层向上展开，搜索/全选/清空/唯一技能均可见。勾选试炼术、Escape回指定技能按钮，摘要与有效技能显示一致 | 通过；在本批自有内存工程修改，未保存 |
> | V05 | 干净对照标签→建立本场临时副本→移出唯一队员→滚到底部。配置错误只在长表单顶部，底部仅有禁用的开始试打，无原因/关联说明 | 新增提示可见性缺口，详见下节；校验拒绝本身有效 |
> | V06 | 同一对照标签从空队伍重新添加hero；开始试打恢复enabled，顶部保存仍disabled | 通过；只证明本次临时配置没有使作者工程dirty，不外推为全SaveStore零IO证据 |
> | V07 | 临时金钱改137并Tab提交→选基础试打→建立本场临时副本。720×480确认框说明和两按钮完整可见；点击取消后归焦原按钮，重进临时方案实际input.value仍137 | 通过 |
> | V08 | 再触发替换确认；明确焦点在弹窗取消按钮上按Escape，dialog.open归零，焦点回建立本场临时副本 | 通过；未宣称完成全平台读屏/焦点循环验收 |
>
> 测试过程校正：最初按按钮可见文字“已选0项”定位失败，实际可访问名称是“指定技能”，更正后操作成功；
> “调整我方”实际展开内联覆写，不是dialog。Tab越过原生dialog末尾时焦点可进入浏览器chrome，
> 此时Escape不作为弹窗取消证据；重新聚焦实际取消按钮后复验V08。以上不是产品失败，也未把未生效操作记成通过。
>
> ## 新发现：启动区没有就近说明配置错误
>
> 代码锚点：`packages/editor/src/ui/BattleSimulatorWorkbench.tsx:367-379`把issues放在正文顶部，
> 只有planError具有`role=alert`，issues普通段落没有动态播报；`:679-701`底部只对projectDirty显示说明，
> 配置issues只参与disabled条件，按钮无`aria-describedby`或错误导航。
>
> 可复制步骤：
>
> 1. 启动上述6011宿主，进入战斗模拟器→试打方案→基础试打；确认顶部保存禁用（干净项目）。
> 2. 建立本场临时副本→移出唯一队员；检查“请至少选择一名可参战角色（party）”。
> 3. 滚到底部开始试打区。720×480下按钮矩形约`x16/y368.5/82×36`，处于可见范围，
>    但该区只有disabled按钮，无错误摘要。顶部错误已滚出视口；不是项目未保存门造成的假反例。
> 4. 添加hero：开始试打恢复可用，作者保存仍禁用，证明门本身工作且页面可恢复。
>
> 判定：功能性UX/可访问性改进项，不是校验绕过或存档污染。建议后续由Codex在启动区提供同源错误摘要与
> 回到配置问题的操作，并关联可访问说明；保持原校验及disabled合同，不复制校验逻辑。
> 本轮用户要求测试，**没有顺手修改产品或把该项写成已修**。后续回归应先用上面真实反例验失败，
> 再核错误可见、键盘能定位、修复配置后提示消失及启动恢复。
>
> 360问题另归编辑器主壳/窄窗，不与这条提示缺口合并：实际`.editor`宽360、内部隐式grid列约731，
> 与`editor.css:19-29`根网格及裁切相关；这里仅定位可观察容器层，尚未完成全主壳根因/方案裁决，
> 不臆称某个固定最小列常量就是唯一根因。
>
> ## 交付边界
>
> 本批完成8项检查：5项通过、1项新提示缺口、1项既有窄窗边界、1项工具阻塞；不是新增8条Vitest用例。
> 不改官方覆盖率，fast仍采用既有7538项/633生产文件。原生目录保存重开、360主壳、full/Q1/Q2继续保留；
> R4 content20薄基线→N6b content21→完整Q1/Q2顺序不变，见[准入台账](../../e2e/route-and-checkpoint/pre-e2e-admission.md)。
>
> 文档校验：`pnpm check:docs` exit0（工具测试20/20，492 Markdown / 2676 links / 166 tasks，0 issues），
> `git diff --check`通过；`git diff 57dda7ed -- packages/ scripts/`为空。自建两标签已关闭、viewport重置，
> 本轮6011宿主已停止；未操作用户原6010标签或其它服务。原生空目录保留作未写入证据。
>
> 无需交GLM或Kimi做视觉复验；无下一位Agent提示词。本批证据由Codex维护，后续提示修复与原生工具补证另行推进。
>
<!-- original-source-quote:end -->
