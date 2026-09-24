# ARCH-REFORGE-MENU-1 — Reforge菜单与物品会话控制器

Status: done
Owner: Codex
Reviewer: N/A（用户批准Codex本批独立实施、自验与收口）
Phase: phase2
Capability: architecture
Visual Verification Timing: dev-functional

## 目标与范围

基点09429b6c。把main的菜单会话状态、输入派发与异步物品操作归入独立模块，保持现有界面/玩法/存档行为。
本卡只是一轮[全仓治理](../../../audits/architecture-debt.md)的A1，不宣布主壳/编辑器/第一阶段全部拆分完成。

## 前提真值门

一句话前提：main同时持有菜单子态、导航记忆和物品异步操作所有权；这些不是启动入口必需的职责。

| 来源 | 已核事实 / 边界 |
|---|---|
| 原版/primary | N/A：纯内部所有权拆分，不重判原版机制或UI；当前二阶段已接受的交互由下述现行源与宿主回归钉住 |
| 第一阶段 | game/core/menu/menu-driver.ts、in-game-menu.ts为既有菜单语义参考；不移植旧全局GameState结构 |
| 当前二阶段 | main.ts:5293–5447状态与物品派发；:6384–6655菜单键盘；:5998–6062绘制读取；:5708–5723存档浏览收尾 |
| 目标 | 外部行为不变；菜单状态单一所有者，main读只读视图并路由输入；业务通过窄端口提交 |

最强替代解释：只是把若干函数放到另一个文件，所有状态和生命周期仍留在main。若出现万能RuntimeContext、
外部直接写菜单子态或两个取消所有者，判为未达到目标，不能仅凭main减少行数验收。

## 设计边界

- MenuSession拥有hub/魔法/装备/物品/状态/系统/存档浏览UI态与光标记忆；向main暴露只读view和open/close/input。
- 物品操作拥有自己的AbortController/pending/恢复菜单上下文；取消从main的abortScript显式调用，不共享局部变量。
- 不让控制器拿整个project/world容器：内容只给items/skills/poisons，世界通过read/replace端口；
  物品场景操作、提示/音效/结果呈现、音频偏好、存档请求和退出标题分别为有类型的窄端口。
- saveStore、快照队列、保存/恢复事务、存储故障和工程隔离仍在原层；只移动浏览器UI控制，不能改变提交顺序。
- 绘制函数和坐标保持；主帧循环的优先级保持（战斗/确认/商店/奖励/菜单/对话/脚本/探索）。
- 保留CLOSED身份语义及已有异常/取消协议；发现原有缺陷时单独记录/修复，不夹在机械拆分中。
- 新模块不新增barrel跨包出口，不引入依赖，不改变public bootGame调用方式或SAVE8/content20。

风险：初始化顺序/闭包捕获不能把实时world变成启动快照；绘制只读view不能创造第二份状态；
存档浏览完成回调要保持原先mode/cursor捕获与loaded后才关闭的条件；物品私有脚本切场不能恢复旧菜单。
以现行H5/H8断言和新控制器定向回归逐项锁定，不用“复制原代码”代替验证。

## 验证与锚点

- 必须先读AGENTS/CLAUDE/phase2 READ-FIRST、phase1-knowledge-harvest C7/X节与既有菜单拍板。
- 保留[宿主一批](../../../../testing/codex-runtime-shell.md)H3/H5、[宿主二批](../../../../testing/codex-runtime-shell-wave2.md)H7/H8业务断言。
- 新控制器直接测试：面板开关/光标记忆、物品等待/成功/失败/取消、旧异步结束不借用新会话、两实例隔离。
- AST调用链测试如涉及移动的UI接口，只适配依赖入口，不删除业务断言；历史只读取证探针不伪装为适配后新证据。
- 定向/相邻/TC/Biome；最小浏览器菜单打开、装备/物品返回、系统取消；真实存储回归不使用用户游玩存档。
- 整批末check、ratchet、保护09429b6c的单次strict，完整收录新生产模块；不减范围/超时/门槛。

## 推进签字

- build准入：Codex premise verified（上述main明确状态/输入/绘制/存储接点）/design agree。
- Kimi/GLM：额度受限，用户明确豁免本批设计与完成签字，不代签。
- 用户本批豁免：2026-09-24明确回答“是，本批由Codex独立完成”；Codex代设计/实现/测试/自审/收口。
  独立第三方审查不足为保留风险，本批不要求补签，不能自动外推其它治理卡。
- 结论：build allowed。
- done准入：Codex **accept**（实现dbe55b55；28新增、55正控/10针、155序列3798步等价与漂移负控、
  最小功能视觉、check8440、ratchet/单次严格fast7949/635全部通过）；Kimi、GLM用户本批豁免，不代签。
- done结论：2026-09-24 Codex核准done；独立审查不足已披露，下一批需按其范围独立准入。

## 交接

- 2026-09-24 Codex：用户允许第一阶段架构优化与确认后的bug修复，并要求推进全仓治理。
  已核main清洁且同步，完成A1范围、所有权与回归方案；等待本批单席推进裁决，不重用旧豁免。
- 2026-09-24 Codex：用户确认本批独立实施/自验收口，现核build allowed；开始代码拆分。
- 2026-09-24 Codex：主壳7153→6798，15个菜单/物品可变状态归入MenuSession与ItemUseSession；
  菜单控制器最大方法85行，输入入口只路由。40真实宿主回归、27直接单元、20存档链、54正控/8负控、
  155冻结输入序列及浏览器菜单最小验证通过，check8439 exit0。[实施记录](../../../../testing/menu-session-refactor.md)。
  进入review，官方ratchet与受保护单次strict尚待，不提前done。
- 2026-09-24 Codex自审补强：增加1条真实菜单存m01/坏档拒绝/好档恢复闭环和两针端口变异，
  弥补原H5只走快捷键的接线证据缺口；原产品实现与旧断言未改。新合计28项、55正控/10针，
  中间ratchet7948/635不作最终验收，随后统一重跑最终树门禁。
- 2026-09-24 Codex：最终dbe55b55通过check8440、ratchet与保护09429b6c的单次strict7949/635。
  [机账](../../../../testing/menu-session-refactor-evidence.json)含17个未改关键函数hash、范围/指标对账、负控及浏览器记录。
  另六包完整基线不变；新模块完整纳入，合并主壳/两模块核分母+60行，不伪装为同分母纯补测。
  本批核done并同步索引/看板。DEMO-CURRENT-1、s135调试落点观察、A2/A3与第一阶段后续不借此关闭。

## 下一位Agent提示词

无下一位Agent提示词；本批已按用户独立实施/自验授权收口。后续治理按新范围推进，不自动代签。
