# E-06 · 质量门禁修复回执

状态：2026-09-06，Codex 同会话常规维护完成；不修改内容/存档版本、迁移产物、业务公式或界面样式合同。
依据 [审计总收口](summary.md) 与用户“继续”的实施授权。历史审计原文保留，本页记录后续修复。

## 复核基线

`main@02ec94a2`：Biome 240 error / 50 warning / 13 info。174 个错误为格式/导入顺序，
其余 66 个为回调表达式、类型断言、Hook 依赖与可访问性静态检查。诊断数不是业务缺陷数。

## 处置边界

- 先仅运行格式化与导入排序；不使用 unsafe 全量修复，不动 projects、迁移 baseline 或第三方参考目录。
- forEach 明确使用无返回值的语句体；赋值从表达式中分离；已检查的状态先绑定局部值以供类型收窄。
- cancelFrame 改为模块内稳定 helper；工具选项与虚拟列表 id 函数用稳定 callback；补齐实际读取的依赖。
- 保留缓存 identity、对象切换、文字/几何重测、revision/key 失效等真实触发依赖；不能按“多余依赖”建议删掉。
- 标签检查登记实际输出原生输入框的 Ds 控件和 ItemTab 的 Num 适配器；不豁免无控件的 label。
- 预览与只读编辑区域使用命名 section，保留既有键盘/滚轮入口；装饰缩略图显式不进入 Tab 序列。
- option 的焦点留在 combobox/listbox，按角色一起给出选择状态；不通过给每个 option 增加 Tab 停靠点来消除误报。

## 精确静态分析例外

没有全局关闭规则。逐点注释只解释检查器无法表达的既有合同：

- ARIA 命令/菜单 group 与带几何 spacer 的虚拟 list，不等同于普通表单 fieldset 或直接 ul/li。
  [ARIA group](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/group_role)
  定义的是 UI 对象集合；具体命令键盘行为仍由按钮/菜单 owner 承担。
- 使用 aria-activedescendant 的选项不逐项获取 DOM 焦点；键盘由 owner 处理，见
  [WAI-ARIA listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)。
- Tab panel 与命名滚动预览区保留已有键盘入口，依据
  [Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) 和
  [overflow 的键盘可达性](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow#accessibility)。
- 原生 summary 已可交互；动态角色、ref-held 状态以及 CSS/文本驱动的重测不能由局部语法分析完全推导。
  所有注释都保留具体理由，并由相关业务回归验证；不使用“历史存量”作为豁免理由。

## 验证

- 主修复 `90b74f34` 的 `pnpm check` 独立完整执行通过：七包 537 个测试文件 / 6,175 项测试
  （含 PAL 真数据与静态门禁），以及文档工具、覆盖率工具、各包 typecheck 和 lint。
  后续完整检查在最终实现 `67df612d` 再次通过：537 文件 / 6,176 项，编辑器为 194 文件 / 1,756 项。
- Biome 最终为 **0 error / 50 warning / 11 info**。50 条 warning 仍属后续清理，未把它们说成已消除。
- 新增标签关联测试直接检查 `label.control` 与原生 `input/textarea.labels`，覆盖六种 Ds 输入控件；
  目录行用同一 DOM 节点重渲染验证 option / toggle button 的 aria-selected / aria-pressed 切换，共 7 项。
- 迁移写入计划新增 8 项：越界/非法路径及缺指纹计划拒绝、写删冲突、manifest 缺前置条件拒绝、
  相同 baseline/manifest 不重复写入。仅临时目录 fixture；不改迁移行为或真实 PAL 工程。
- `pnpm coverage:ratchet` 通过，608 个生产文件、486 个 fast 测试文件 / 5,690 项；
  所有包和全仓四项指标不回退，12 个包/总计指标提高，详细整数计数见[覆盖率记录](../../../testing/coverage.md)。
  没有改低基线、coverage ignore 或测试超时。full coverage 本批未重跑。
- 开发期最小视觉验证：浏览器设计实验页 RF-14（1280×720）正常渲染，检查截图与无障碍树中的表单名称、
  数字输入与下拉控件。没有操作用户的 PAL 工程；此项不声称完成实机键盘/弹窗交互或工作流 E2E，
  焦点、键盘、关闭与还焦点行为由现有组件回归验证。
- 差异复核：143 个已跟踪代码文件中 113 个在忽略格式与导入排序后 AST 一致；余项按实际 diff 复核。
  大块 `text-overflow-adoption.json` 只有排版差异，解析值完全一致；CSS、projects、迁移 baseline 均无 diff。
- `pnpm check:docs` 与 `git diff --check` 通过；CI 的 fast coverage 前置加入 typecheck/lint，防止门禁再次失效。

第一次将完整 check 与 coverage 同时执行，造成两个全源码扫描用例超过原 15 秒阈值；独立运行完整 check
后全部通过。保留这次失败事实，不调高阈值、跳过扫描或追加自动重试；后续两种重型检查顺序执行。

## 提交后的 CI 时序补查

主修复提交 `90b74f34`。回查其上一基线的
[CI 失败](https://github.com/IllegalCreed/type-pal/actions/runs/33988706085)，另发现
`EntityPageAnimationEditor.test.tsx` 的草稿提交计数偶发从 3 变 4：
`DsSelect.closeSelect(true)` 在下一动画帧还焦点，而测试不等该帧就立即 focus 数字框并输入。
延迟还焦点使数字框 blur，按既有合同提交草稿；不是“input 立即提交”的证据。

先控制 requestAnimationFrame 并在输入后推进，独立稳定重现同一 3→4 失败；最终测试在选项确认后推进
下一帧并断言焦点回到下拉按钮，然后开始数字输入。输入后再推进一帧，断言焦点仍在数字框、提交数未增加；
显式 blur 后才断言增加一次。3 项定向测试通过。只改测试时钟与增加焦点断言，不改组件或松动提交合同，
也不将这项顺序交互测试说成已覆盖同帧争焦的所有用户交互边界。
随后完整 `pnpm coverage:fast` 通过：608 个生产文件 / 5,690 项测试，四项精确覆盖计数与
`90b74f34` 中上调的 fast 基线完全一致；此补查没有改写基线。

`f5e83f31` 的 [Linux CI](https://github.com/IllegalCreed/type-pal/actions/runs/33991646989)
进一步暴露敌人页查看器焦点断言的同类时序问题：原测试在派发 Escape 的同一个 `act` 内固定等 20ms，
但 React 关闭提交后的还焦点帧未必已运行。受控帧探针稳定复现 activeElement=body，而不是触发按钮。
最终测试先等待关闭提交，再推进动画帧；打开/重新打开均验证焦点进入弹窗，Escape/关闭按钮两种关闭后均验证
焦点回到原按钮，完整事件顺序和历史零写入断言保留。敌人页、实体动作字段、组合模板弹窗三文件共 27 项通过。
核对其余焦点断言时区分同步聚焦、已受控帧和显式等待下一帧，不全局把 RAF 改成同步函数，
也不调宽任意 sleep 或移除焦点断言。

受控时钟后严格门禁曾检出语句/分支各少命中 1 项（展示百分比相同仍拒绝）。独立对照新旧查看器测试的
逐文件覆盖，确认旧测试随帧时序偶然走到 `cancelFrame`；不能拿这种偶发命中代替明确断言。
另增 1 项 DsDialog 回归，直接验证初始聚焦帧尚未执行就关闭时取消该帧，以及已出队的旧回调晚到时
不调用字段 focus、不重复关闭、不残留滚动锁。该回归不更改生产实现。
最终 `coverage:ratchet` 通过，608 个生产文件 / 5,691 项测试；全仓 statements 为 52,073/78,182、
branches 为 37,331/61,578（比主修复基线各多命中 1 项），lines/functions 不变。当前累计新增 16 项回归。

最终实现 `67df612d` 的 [Linux 类型检查、lint 与 fast 覆盖率 CI](https://github.com/IllegalCreed/type-pal/actions/runs/33992670277)
和[文档 CI](https://github.com/IllegalCreed/type-pal/actions/runs/33992670257)均通过；不是重试旧失败候选，
也没有放宽原断言或覆盖率门禁。后续收口提交仅补本回执与覆盖率文档的最终测试计数。

既有审计的存档/迁移/战斗业务缺陷尚未修复，下一步先做存档与作者数据安全的修复准入。
无下一位 Agent 提示词，本轮为同 Owner 常规维护自验证收口；不代替下一批高风险任务的设计/审查签字。
