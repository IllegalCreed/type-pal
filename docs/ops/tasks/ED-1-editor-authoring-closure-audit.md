# ED-1 - 编辑器一级模块与创作闭环审查

Status: draft
Phase: phase2
Capability: Editor / R6（拟调整 W1/W7/E1/C1/W5/B2/N8）
Coding Owner: N/A（本卡只做审查与实施总纲；子任务另开卡）
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + User（后续子任务）
Unavailable Agents: none
Branch: main

## 目标

以“空白工程能创作完整 RPG”为标准，对编辑器全部工作域执行统一闭环审查；退役“大杂烩数据页”的一级信息架构，
定案地图资产库与场景地图选择方向，形成可分批实施、可验收、不会重复返工的路线。

本卡交付物是审计共识和子任务边界，不在本卡直接实现全部编辑器改造。

## 范围

- 范围内:
  - 统一“发现/选择、创建、引用/绑定、编辑、预览/运行、保存/重开、删除约束”七环判据。
  - 审查场景、地图、实体、角色、物品、技能、敌人、毒、氛围、商店、战场、音乐、瓦片集、过场、入口、变量、共享脚本、locale。
  - 把一级导航重组为场景、地图、剧情、角色、物品、战斗、资源、工程。
  - 定向地图独立注册表、稳定 id、场景选择/复用、未引用地图保存重开的方案。
  - 提出 capability-map 拟降级项和分期实施顺序。
- 范围外:
  - 不修改 editor/content/reforge 实现文件。
  - 不在三签前修改 capability-map 状态。
  - 不在本卡完成 A7 资源闭包、R7 资源注册表或所有 CRUD；它们按子任务另开卡。
- 明确不做:
  - 不用“给现有 MapMode 加一个列表”掩盖底层无 map index 的问题。
  - 不把 15 个数据页变成 15 个塞进 52px rail 的图标。
  - 不让路径、数组位置或原版数字编号继续充当新内容的稳定身份。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：第二阶段是现代化创作平台，原版只作内容包/试炼场。
  - `docs/phase2/roadmap.md:154-179`：创作平台、资源自包含、R6 能力收口、R7 资源注册表是最终路线。
  - 用户 2026-07-13：场景应能选择地图；地图要有列表/新建/编辑；编辑器需要整体闭环审查；“数据”下功能应展开为和场景/地图平级的一级模块。
  - `AGENTS.md`：capability-map 状态、schema、跨包公共接口均属三方必审。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/App.tsx:456`：当前一级导航只有四项。
  - `packages/editor/src/ui/DataMode.tsx:41`：15 个异质标签集中在“数据”。
  - `packages/editor/src/ui/App.tsx:491`、`packages/editor/src/ui/MapMode.tsx:84`：地图模式绑定当前场景。
  - `packages/editor/src/ui/App.tsx:1426`：场景自有地图只读，无法选择。
  - `packages/reforge/src/loader.ts:335`：场景引用被当作地图索引。
  - `packages/editor/src/core/project-io.ts:99`：serializer 写 maps，但无独立重开索引。
  - `packages/editor/src/ui/App.tsx:580`、`packages/editor/src/core/commands.ts:1734`：空白工程新场景回退原版地图 0。
  - `packages/content/src/validate-refs.ts:72`、`packages/editor/src/ui/App.tsx:867`：校验覆盖有限但 UI 显示“引用完整性 OK”。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-audit-2026-07-05.md` 是旧审计，当时许多能力尚未实现，不能直接当当前真值。
  - `docs/phase2/editor/editor-design.md` 的模式壳/Command/undo 地基保留，但 MVP 的“数据模式”分组已不适合当前功能规模。
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md` 是本卡当前审计正文。
  - `docs/ops/tasks/W7D-nlayer-map-schema.md`、`W7B-tileset-library.md`：OwnMap v1 与 tileset 地基已完成，不得重做图层/碰撞/量化管线。
- 不得重新引入:
  - paletteId/调色板 UI、原版 opcode、路径/数组下标身份、双份编辑真值、直接 mutate EditorState。
  - 只为 PAL 迁移产物服务而让空白工程失效的 UI/loader 特判。
- 相关测试:
  - `packages/editor/src/core/project-io.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/core/seed.test.ts`
  - `packages/editor/src/core/script-references.test.ts`
  - `packages/reforge/src/loader.test.ts`

## 验收条件

- 功能:
  - 三方确认七环判据、八个一级模块边界、地图注册表方向和分期顺序。
  - 审计逐项区分“已闭环、可编辑但不闭环、空白工程阻断、资源主线后置”，不把所有缺口混成一张巨型任务。
  - capability-map 拟调整项有明确恢复条件。
- 测试:
  - 本卡为文档审查，不运行实现测试；每张后续实现卡必须从审计“总验收矩阵”裁出对应自动化与浏览器验证。
- 文档:
  - 审计正文、任务卡、看板三者一致。
  - 三签完成后再更新 capability-map 与路线图当前入口，并建立 ED-2/W7E 等子任务卡。
- 视觉 / 手工验证:
  - 本卡只审信息架构；ED-2 必须提供 1280/900/720 三档截图和折叠/深链验证。

## 推进签字

签字是阶段门禁。当前只允许审查文档，不得开始实现或修改 capability-map 状态。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-13）**。当前代码证明地图缺独立索引、场景地图不可选择、空白工程新场景回退原版地图 0；“数据”15 页已超出单模块边界。赞成七环判据、八个一级业务模块、稳定 map id + index、通用引用图和分卡实施。
- Opus: **agree（2026-07-13;六维全过,附 R1-R3 子卡必落 + S1-S3 建议。锚点逐一核实:P0-1 三点(seed own start/App:580 `reuseMapNum??0`/commands:1734 固定 reuseOriginalMap)成立;loader:335 注释自证"own 场景引用即索引,无需单独 maps 索引"——审计发现即代码供词;capability 当前值与"当前 ✅"声明一致。详见主审立场）
- GLM: pending
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: blocked（本卡三签后只允许文档收口/拆子卡；实现仍按子卡门禁）

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

审计正文：[`docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`](../../phase2/editor/editor-authoring-closure-audit-2026-07-13.md)。

当前建议：

1. 退役“数据”一级入口，建立场景、地图、剧情、角色、物品、战斗、资源、工程八个同级业务模块。
2. 一级模块栏可展开/折叠；每个对象只有一个权威编辑页，跨模块选择器只做引用和深链。
3. 地图升格为一等资产：`manifest.content.maps -> MapIndexV1`，稳定 map id 与文件 path 分离；场景引用 map id。
4. 原版 `reuseOriginalMap` 只留 PAL 兼容边界；空白工程默认不出现原版地图号创作流。
5. 建统一工程引用图，删除、反向引用、保存校验、问题跳转和 A7 资源闭包共用。
6. 先做一级模块壳，再做地图资产/场景绑定，再补引用地基、场景/实体和各业务域 CRUD；A7/R7 沿总路线推进。

### 已知风险

- 风险: map index + `ownMapId` 是 schema/contentVersion/loader/editor 多包变化。
  - 缓解: W7E 单独开高风险卡；显式迁移旧 `{ownMap:path}`，禁止静默重解释字段。
- 风险: 信息架构重排时复制组件，形成两套编辑入口。
  - 缓解: ED-2 只改路由/容器和深链，原组件单实例迁移，不重写业务表单。
- 风险: 通用引用图扫描 PAL 大脚本库造成输入卡顿。
  - 缓解: 沿 N6 按需/增量构建，不放入输入热路径。
- 风险: 一次补全所有 CRUD 范围失控。
  - 缓解: 角色/物品优先，每个领域单独 lite/full 卡；七环矩阵作为统一退出条件。
- 风险: capability-map 大面积降级造成“已完成工作被否定”的误解。
  - 缓解: 引擎完成状态不动；编辑器列只按新增的创作闭环判据暂降，恢复条件逐条列明。

### 主审立场

- Reviewer: Opus（架构/schema/信息架构主审）+ GLM（覆盖矩阵/capability 口径复核）
- 结论: **agree(2026-07-13)**。六维逐项:
  1. **八模块边界** — agree。业务域组织正确;"每对象一个权威编辑页+跨模块选择器只做深链"消灭双真值;分层自洽(瓦片集归地图=地图专属资产/商店归物品/过场**编排**归剧情而**文件**归资源,与 §7.3 一致)。
  2. **MapIndexV1 + ownMapId + 显式迁移** — agree。id/path 分离符合稳定身份铁律;`{ownMap:path}` 显式迁移+同路径冲突报错、禁静默重解释正确;影响面实测很小(pal 全 reuseOriginalMap 零涉,own 用户仅空白种子)。判别联合是 content schema 破坏性变更,W7E 单独三签已列 ✓。
  3. **统一引用图与删除守卫** — agree。P1-2 诊断准确(共享脚本拦/tileset 不查/精灵先删后报三种语义并存);复用 N6 按需模式防输入卡顿 ✓。
  4. **P0/P1 分级** — agree。P0=空白工程创作阻断、P1=一致性/IA,分级准确;P0-1 证据链逐锚点核实;P1-3"引用完整性 OK"过度承诺属实(validate-refs 覆盖面 vs 底栏文案)。
  5. **capability 拟调整** — agree。引擎列不动+编辑器列按七环暂降+恢复条件逐条,是真值修正不是否定工作;N8 降 ❌ 有硬编码 `/extracted` 实据;A4 收窄说明而非降级,诚实。
  6. **分期依赖** — agree。壳→地图 schema→引用地基→生命周期→CRUD 波次→资源主线→效率层→复核,梯度合理、避免搬两次。
- 必改项(子卡必落,非本卡阻塞):
  - **R1(W7E)**:消费方清单成卡内章节——SceneMap 判别联合变更涉 loader/serializer/validate-refs/seed/迁移器/**MG2 合并域表**;`MapIndexV1.maps` 是 id 数组,必须在 MG2 `migration-merge` 的 arrayMode 登记 `content/maps/index.json → id 模式`,否则默认 atomic,双边改地图注册表会整文件冲突。
  - **R2(次序钉死)**:W7E 的地图删除守卫先于 ED-3 引用图存在——允许 W7E 内做**临时地图专用反查**(scene.map 全扫,量小),但卡内显式标注"ED-3 收编,禁演化为第二套长期引用实现";或把 ED-3 提前。二选一写明。
  - **R3(P0-1 止血提前)**:用户当前阻断不等 ED-2——空白工程 AddScene 默认新建/复制自有地图(禁回退原版 0)的最小修复应为 W7E 第一步或独立 hotfix 小卡;"壳先行避免搬两次"约束的是页面迁移,不约束这条断链修复。
- 建议(非必改):
  - S1: P1-3 文案一行改("已检查的引用无问题")挂最近实现卡立即做。
  - S2: ED-3 引用图边定义携带**删除策略元数据**(block/warn/replace-suggest),避免统一图上再长每域 if。
  - S3: "模块子页 2-5 上限"写进 ED-2 验收防"数据"复活;跨模块深链协议(模块+对象 id+子页)在 ED-2 一并定义。
- 是否建议进入 build: **是(三签后仅文档收口/拆子卡;实现按子卡门禁)**。

### 三方争议记录(按需)

- Codex: 赞成八个一级业务模块；赞成地图稳定 id + 独立 index，不接受继续用 path 当 id；赞成 capability-map 编辑器列按七环重审。
- Opus: 与 Codex 无分歧;R1-R3 是子卡执行纪律(MG2 域表登记/临时反查标注收编/P0-1 止血提前),非方向异议。
- GLM: pending
- 用户拍板: 已明确要求一级展开、场景可选地图和整体闭环审查；具体 schema/分期待三方意见后终裁。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: N/A
- 修改文件: pending（三签后只允许审计文档/能力真值/子任务卡收口）
- 实现摘要: 未开始
- 运行命令: N/A
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因: 本卡尚在 draft，未修改实现。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + User（ED-2/W7E 子任务）
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: 全部实现级视觉验证留子任务。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: ED-2 一级模块壳；W7E 地图库与场景绑定；其余按审计分期。

## 交接日志

- 2026-07-13 Codex: 完成当前实现、旧审计、能力地图、路线图、Command/loader/serializer 的静态核查；确认地图、空白场景、核心 CRUD、资源库和引用校验存在系统性断环，形成七环矩阵、八模块 IA、地图 index 方向与分期。Evidence: 审计正文 + 本卡。Next: Opus 架构/schema/信息架构主审；不得改实现或 capability 状态。
- 2026-07-13 Opus: 设计主审签 **agree,六维全过 + R1-R3 子卡必落 + S1-S3 建议**。锚点逐一核实(P0-1 三点/loader 注释自证/capability 当前值);八模块权威页+深链规则消双真值;MapIndex id-path 分离+显式迁移方向正确(影响面实测小);分级与拟降级准确(引擎列不动+恢复条件=真值修正)。R1=W7E 列消费方清单+MG2 arrayMode 登记 maps/index;R2=W7E 临时删除反查须标注 ED-3 收编;R3=P0-1 止血不等 ED-2。Evidence: 主审立场六条。Next: GLM 覆盖矩阵/capability 口径复核;三签后文档收口+开 ED-2/W7E 子卡(实现按子卡门禁)。未改实现文件与 capability 状态。

## 下一位 Agent 提示词

```text
接手任务: ED-1 编辑器一级模块与创作闭环审查(GLM 复核)
任务卡: docs/ops/tasks/ED-1-editor-authoring-closure-audit.md
当前状态: draft;Codex agree + Opus agree(附 R1-R3 子卡必落/S1-S3 建议),GLM pending,build blocked
你的角色: GLM,覆盖矩阵/capability 口径复核;只审文档,不改实现,不改 capability 状态
先读: AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全部(尤其 Opus 主审立场六条+R1-R3)、docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md、docs/phase2/capability-map.md
Opus 已过: 八模块边界(权威页+深链消双真值)/MapIndex id-path 分离+显式迁移/引用图与删除守卫/P0-P1 分级(锚点逐一核实,loader 注释自证)/capability 拟调整(引擎列不动+恢复条件)/分期梯度。R1=W7E 消费方清单+MG2 arrayMode 登记 content/maps/index.json;R2=W7E 临时删除反查显式标注 ED-3 收编;R3=P0-1 止血(空白 AddScene 禁回退原版 0)提前,不等 ED-2。
请你复核: (1)§4 逐域闭环矩阵 18 域的状态标注抽查——按七环判据抽 5 域(建议:地图/角色/过场/入口点/共享脚本)对照代码验证 ✅/⚠️/❌ 无虚标;(2)§8 capability 拟调整表与 capability-map 当前值逐行对账(降级项/恢复条件/未降级项 X6-X7-N6 的豁免理由);(3)§9 分期依赖无环且每期有独立验收(对照 §10 总验收矩阵可裁剪性);(4)§10 总验收矩阵对七环判据的覆盖完整性(空白工程/地图复用/引用安全/PAL 兼容/IO/视觉/门禁七类是否漏环);(5)R1 的 MG2 域表登记项与 MG2 卡合并策略表的一致性。在设计签字 GLM 行签 agree/counter,更新交接日志与下一位提示词(三签后=文档收口+开 ED-2/W7E 子卡)
不要做: 不改实现文件;不改 capability-map;不推进 build/done
输出要求: 明确 agree/counter、矩阵抽查结果、capability 对账表、提交 hash
```
