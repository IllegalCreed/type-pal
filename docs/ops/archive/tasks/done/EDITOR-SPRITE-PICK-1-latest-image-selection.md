# EDITOR-SPRITE-PICK-1 - 精灵上传选图异步归属

Status: done
Phase: phase2
Capability: D-03既有缺陷修复（不改变能力地图状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

Revision: r1，2026-09-18；取证基线`467a5f41`，SpriteUploadWizard产品与已接收GLM只读材料冻结树相同。
用户要求GLM测试返工期间Codex并行推进；2026-09-18核两席设计签字b131d0f4/d6ddd4a3齐备，Codex开build，不重签。
与[已收口编辑器补测](TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md)分离：不修改其八文件/fixture/诊断/回执，
不改commands/reference目标产品。
当前（2026-09-18）：实现候选`a88ab18d51328432f559b41ee6e8f7880379880e`，对比`be1868f39f672ebe705961f0d551d4584da90818`。
Codex已完成实现、20项新回归/2项旧回归、36相邻、6负控、最小真实界面验证、check7302→ratchet→受保护单次strict fast6814/617。
实现与精确边界见[验证回执](../../../../testing/sprite-selection.md)。三席实现终审均accept，无counter/返工；Codex于2026-09-18核定同候选与零漂移。
2026-09-18用户明确验收“通过”；Codex核定done并归档，r1设计及实现终审均无需再签。

## 收口结论（2026-09-18）

- 三席均对r1/a88ab18d签accept，无生效counter、无返工项、无缺签豁免；用户已明确验收通过。
- 同步后HEAD与origin/main均94ef2671；a88ab18d→HEAD的packages/scripts/projects/data/lock零diff，工作树干净。
  原22定向/36相邻/6负控、check7302、ratchet/受保护单次strict fast6814及Codex最小界面证据继续有效。
- 本次只更新终态、归档与链接/索引，不改实现、不重复跑同一产品或视觉验证；三席签字与历史回执保留。
  文档工具20/20、434篇文档/2188条本地链接/148张卡检查及git diff --check通过；三席审查块经链接迁移规范化后逐字不变。
- G-I04已开始提交后的卸载/取消策略仍范围外；完整导入→保存→重开→引用/试玩按R4登记另推。
  本卡完成不代表全仓覆盖率目标或完整E2E完成，不扩张为其它上传器/缓存/引用缺陷的修复授权。

## 目标与范围

同一个上传向导中，先选A再选B，只有当前选择B的解码结果或错误能更新当前状态，入库只消费B的成功结果；
所有已取得的ImageBitmap在成功、失败、过期或取消后均恰好释放一次。

- 范围：`packages/editor/src/ui/SpriteUploadWizard.tsx`选图请求身份/等待状态/异常收尾，与当前向导生命周期；
  新建`SpriteUploadWizard.selection.test.tsx`，必要时本卡独立test-only fixture/隔离诊断；不改既有测试断言。
- 不改布局、按钮规格、用途分类、切帧/量化/RLE/gzip/SHA/去重、AddSpriteCommand或保存/工程版本；
  不批量改其它上传器，不新增公共异步框架，不改用户已填的ID/标签策略。
- 提交一旦开始，现有submitting互斥/禁取消及既有提交完成语义保持；**不把G-I04尚待产品裁决的提交后卸载风险混进来**。
  本卡生命周期保护针对解码/预览，不授权取消已开始的作者数据提交或新造跨工程事务。

## 前提真值门

一句话前提：浏览器解码完成顺序不构成用户选择顺序；当前向导在await后没有身份检查，所以会将旧文件写入项目。

| 维度 | 一手证据与结论 |
|---|---|
| 原版 / primary source | 原版N/A：原版没有作者上传向导。当前主入口`SpriteUploadWizard.tsx:145–173`从File→bitmap→draft；`:175–222`将draft对应切帧结果编码入库，用户选择文件是内容来源，不是“最后完成哪个就导哪个”的接口 |
| 第一阶段 | N/A：不重写一阶段图像解码/渲染；不改变资产锚点/坐标/调色约定。第一阶段没有对应的工程作者选图UI，不能拿旧运行时加载顺序代替新向导交互合同 |
| 当前二阶段成功乱序 | 当前主壳真实pickFile/submit原函数体，选择A再B：完成A→B时实际入库宽2/像素200（B）；完成B→A时宽1/像素100（A）。SHA与gzip/RLE重新解码断言通过，故不是只看setState调用 |
| 当前错误乱序 | B成功后旧A失败，draft仍B但错误被覆盖为A；B失败后旧A成功，draft复活A且真实可提交A，B错误仍在。两者已动态复算，不能误写成“A成功清掉B错误” |
| 当前资源收尾 | `SpriteUploadWizard.tsx:150–156`只在drawImage成功后close；真实回调宿主注入getContext失败或drawImage抛错，close=0；正常成功close=1。只证明未显式释放，不宣称已测浏览器内存泄漏 |
| 当前准入与宿主 | `:266–271`选择器只在submitting禁用，所以两次选图可达；`:461`入库仅看submitting/grid/quantized，选新文件等待期仍保留旧draft（读码，不冒称新增动态证据）。`:467–475`非提交时可取消；`WorldSpriteLibrary.tsx:773–788`条件挂载，`:448–456`切目录会卸载向导 |
| 本任务目标 | 选择序号+向导存活/当前session与assetBase作用域识别当前请求；过期成功/失败不写状态；新选择等待/失败不入库旧内容；已有成功内容的编码/去重/提交互斥不变 |

路径省略`packages/editor/src/ui/`前缀时按表中组件定位，行号为取证基线；后续用符号/Git核对。

### 本轮只读复算

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-glm-upload-prep.mjs
pnpm --filter @type-pal/editor exec vitest run src/ui/SpriteUploadWizard.test.tsx
```

2026-09-18 Codex执行：探针exit0，G-I01/02/03/08反例仍成立，G-I05重复提交互斥/G-I06同SHA复用/G-I07真实字节oracle仍成立；
G-I04继续risk，不升级成已证产品缺陷。既有组件测试1文件2项绿；不证明乱序已经正确。
日志`/tmp/codex-sprite-upload-premise.log`、`/tmp/codex-sprite-upload-existing.log`。没有打开HTTP端口、写工程、运行迁移或浏览器视觉。
GLM贡献原只读材料，Codex独立复跑；本卡后续不能以其材料替代独立实现终审。

### 替代解释与证伪

- 最强替代解释：用户实际再次选择了A、导入管线编码错、或诊断不是生产入口。排除：选择序始终A后B，唯一改变是两个deferred的完成次序；
  抽取生产pick/submit及grid/quantized回调，正常完成序B字节正确，坏序A字节也自洽，错在归属而非编码。
- runtime/命令分类：AddSpriteCommand接到的本来就是旧A，不能在命令层猜应该选B；不修改canonical资源验证来掩盖上游选择错误。
- 原版/第一阶段：不据原版记忆裁决现代作者文件选择，不改变游戏观感。
- 提取/地图/解码：本例使用受控合法bitmap和真实编码/解析，不涉及PAL提取/迁移，也没有证明createImageBitmap自身解码错误。
- audit模型：采纳已纠正的G-I01/02/03/07/08；原G-I04没有真实卸载，不用于推出提交取消政策。新正式回归必须测试真实组件事件，不只复制回调算法。
- 可证伪：如果真实UI在B解码前已禁止第二次选择，或真实入库字节始终来自B，核心前提不成立；实现后过期错误仍覆盖当前状态、
  过期bitmap不close、或只把顺序锁死使用户不能再选B，也不算修复。

### 用户可见行为边界

before→after：选择B后旧A可能晚到覆盖/入库 → 只有B的结果可入库，旧A完成仅释放资源。
代表场景：大图A解码慢，随后选择小图B；B预览/入库后不再跳回A，A迟到错误不覆盖B。
等待和失败期间可保留上一张成功预览，但入库必须禁用直到当前选择成功；取消后可重新打开重选，不自动回退入库旧图。
这恢复“导入所选图片”的正常意图，不重设计布局/命名。**已开始提交后是否允许中断仍为范围外产品问题**，不借本卡替用户决定。

## 上下文锚点

- [AGENTS](../../../../../AGENTS.md)、[CLAUDE](../../../../../CLAUDE.md)、[READ-FIRST](../../../../phase2/READ-FIRST.md)、[工作流](../../../agent-workflow.md)。
- [D-03审计](../../../audits/pre-e2e/editor-workflows.md#d-03--旧图片解码完成后覆盖新选图)、[已接收GLM材料及历轮证据纠正](../../../../testing/glm-pre-e2e-prep-report.md)。
- [编辑器设计系统](../../../../phase2/specs/editor-design-system.md)：只用既有disabled/aria-busy/错误呈现，不改控件形态。
- 既有组件测试只覆盖多帧和submitting互斥，mock编码结果，不能代替真实RLE/字节归属断言。
- 不引入：旧作者版本、PNG作为canonical精灵、根据完成顺序回退来源、不可取消API的伪Abort成功、跨包万能任务队列。

## Draft：最小实现方向

1. 组件内部维护单调选择代次，开始选图即更新当前身份；旧成功/错误在每次await后核当前性。不要仅在setDraft前挡成功而遗漏catch错误。
2. 用明确的选图等待/失败状态阻止submit使用旧draft；UI禁用和submit入口同步ref守卫同时存在，不能仅依赖React下一次渲染。
   第二次选图在解码期间仍可发出；成功后保持原自动ID/label规则（prev优先）和原布局。
3. bitmap一旦取得立即进入try/finally管理，正常、过期、getContext/drawImage/getImageData失败均close一次；
   不强行中断已发出的解码Promise，也不为同一bitmap多次close。
4. 取消选择/卸载/解码期间宿主session或assetBase变化会使旧选择失效；重新打开的新向导不继承旧选择的错误/ready。
   同scope的普通props更新不误废弃选择。作用域变化后旧draft/ready/palette不能冒充新scope可提交数据；
   调色板异步成功/错误仅更新自身有效scope，不能让旧scope catch写新错误。
5. submit已启动后的编码/压缩/hash/dispatch顺序不改，submittingRef保持互斥；不增加全局版本、跨包公共token或修改GLM正在冻结的core命令。

## 验收条件

| ID | 业务合同 |
|---|---|
| SP-01 | 真组件选择A再B，完成A→B/B→A最终预览及实际入库都属于B；正常单次选择正控 |
| SP-02 | B成功+A迟到失败：B状态/错误不被覆盖；B失败+A迟到成功：不复活可提交A，重选C成功后恢复 |
| SP-03 | A已有成功预览，B正在解码：按钮和真实submit入口都不允许把A入库；B失败后同样不偷偷回退，期间仍能重新选图/取消 |
| SP-04 | 解码中取消/卸载/解码scope变化：旧请求不写当前状态或onDone；迟到bitmap仍释放；同scope普通重渲染不误失效 |
| SP-05 | 成功、过期成功、getContext null、drawImage/getImageData失败、解码拒绝逐一核close次数和正确错误归属；拒绝解码无虚构bitmap |
| SP-06 | 正常入库仍实际RLE/gzip/SHA、catalog bytes/hash与存储字节一致；重新解析精确核B的尺寸/像素；同SHA复用与单次历史提交保留 |
| SP-07 | 既有submitting互斥/禁取消、用户ID/label、切帧用途不变；G-I04不擅自裁决，不把其未测提交卸载写成通过 |

- 正式测试先红后绿，使用合法当前fixture；编码/哈希/命令不全部mock成常数。
  至少移除成功当前性、错误当前性、bitmap finally、等待submit守卫的独立负控；实际执行且业务红，原实现正控绿。
- editor定向/相邻/typecheck/Biome；完整check→官方ratchet→受保护单次严格fast由Codex串行执行，不与GLM临时覆盖共享输出。
- Codex最小功能视觉：两张可区分图片连续选/重选/取消，确认控件对齐与可操作、等待禁入库、最终预览正确；不改样式，不把jsdom当视觉。
- 集中编辑器E2E：真实导入B→保存→重开→引用/试玩，作为后续创作链案例；本卡先验证命令/资源字节，未声称已跑整链。

## 推进签字

### build前

- Codex（2026-09-18）：**premise verified / design agree**。直接读取pick/submit/useEffect和父条件挂载/取消入口；复跑真实回调＋编码字节诊断与2项既有组件测试，确认G-I01/02/03/08，保留G-I04风险不裁决。错误根因在向导请求归属；最强反证与范围见上。
- Kimi：**premise verified / design agree（2026-09-18，r1，取证基线 467a5f41；全部证据本人直读/复跑，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **选图乱序直读**：`SpriteUploadWizard.tsx:145-173` pickFile 仅在 submitting 时早退；
    `createImageBitmap` await 后**无任何请求身份检查**即 setDraft/setNewId/setNewLabel，catch 也无身份
    检查即 setErr——旧成功覆盖当前 draft、旧错误覆盖当前错误。本人复跑 probe-glm-upload-prep：
    G-I01 reproduced（选择序恒 A后B；完成序 B→A 时实际入库宽1/像素100=A，字节归属经真实
    SHA/gzip/RLE 解码断言，非仅 setState 观察）。
  - **错误乱序直读+复跑**：G-I02 reproduced（B 成功后旧 A 迟到失败，error 被覆盖为 A 的文案、
    draft 仍 B）；G-I03 reproduced（B 失败后旧 A 迟到成功，draft 复活 A 且真实可提交、B 错误仍在）。
  - **bitmap 释放直读+复跑**：`:150-156` 只在 drawImage 成功后 close；G-I08 reproduced
    （getContext 失败/drawImage 抛错 close=0，成功 close=1）——无 try/finally 属实。
  - **准入与宿主直读**：`:459-461` 入库按钮仅 submitting/!grid/quantized 禁用——B 解码等待期
    旧 A 的 draft+quantized 仍可入库；`:467-475` 非提交可取消、提交中禁取消（既有语义，G-I04
    维持 risk 不裁决）；`WorldSpriteLibrary.tsx:773-788` 条件挂载、`:448-456` 切目录卸载向导。
    既有组件测试 2 项绿但不覆盖乱序（本人复跑）。
  - **设计同意**：单调选择代次+每次 await 后核当前性（catch 也核）正面闭合 G-I01/02/03；
    等待/失败显式状态+UI 禁用与 submit 入口同步 ref 双闸（不靠下一次渲染）闭合等待期入库；
    bitmap try/finally 恰一次 close 不打断在途解码；取消/卸载/session/assetBase 变化失效旧选择、
    同 scope 普通更新不误伤、调色板异步结果同纪律；submitting 互斥与已开始提交语义不变；
    不碰编码格式/AddSpriteCommand/core 命令/UI 形态/GLM 冻结面。SP-01～07 覆盖两序/错误组合/
    等待守卫/scope/bitmap close 次数/真实字节 oracle；四条负控（成功当前性/错误当前性/bitmap
    finally/等待守卫）要求业务红。范围确停在 D-03。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 真实 UI 在 B 解码前已禁止第二次选择或入库
    字节始终来自 B → 前提倒（探针否定）；② 实现后过期错误仍覆盖当前状态或过期 bitmap 未
    close → 当前性/finally 缺位；③ 以锁死选择顺序使用户不能再选 B 充当修复 → 不算修复；
    ④ B 等待/失败期旧 A 仍可入库 → 守卫缺位（SP-03）；⑤ scope 变化后旧 draft 冒充新 scope
    可提交 → 生命周期缺位；⑥ 已开始提交被取消/重复 dispatch → 越出既有语义（SP-07）。
  - 返工项：无。非阻断备注：G-I04 提交后卸载是否允许中断维持范围外产品问题（卡面已列，
    本席背书）；新正式回归须用真实组件事件而非复制回调算法（卡面审计模型注记已列）。
- GLM：**premise verified / design agree（2026-09-18，r1，取证基线 467a5f41、工作树 6284cab8 相对基线仅文档；
  全部锚点/探针本人直读复跑，未读 Kimi 结论。贡献披露：probe-glm-upload-prep.mjs 及 G-I 系列观察为本席
  原始只读材料，prem 历轮纠正（G-I03 提交起始 setErr('') 不等于清错、G-I04 无真实卸载）亦经本席返工落盘；
  本轮为独立重核，不以历史材料自证，本卡实现与正式回归归 Codex）**。
  - **入口直读**：`SpriteUploadWizard.tsx:145-173` pickFile 在 `await createImageBitmap(file)` 后无任何
    选择身份/代次检查——直接 setDraft/setErr；`:266-271` 选择器仅在 submitting 禁用，解码期间二次选图可达
    （G-I01 前提成立）；`:175-181` submit 只核 `submittingRef/draft/quantized`，等待期旧 draft 可入库。
  - **两序与错误组合复跑（本人原探针重跑 exit0，与 Codex 复算口径一致）**：G-I01 完成序 B→A（A 迟到成功）
    提交宽 1/像素 100 = A——**最后完成者胜而非最后选择者胜**，用户选择序恒 A 后 B 唯一变量是完成次序；
    G-I07 真实字节 oracle（sha(catalog)==sha(存储)、gzip MTIME 篡改同长度可解码经同入口被拒）证明编码链
    自洽、错在归属而非编码；G-I02 B 成功后旧 A 迟到失败覆盖错误文案、draft 仍 B；G-I03 B 失败后旧 A 迟到
    成功 **draft 复活为可提交 A 且 A 错误文案仍在**——两个错误组合方向与卡面表述逐点一致，不能误写为
    「A 成功清掉 B 错误」。G-I05/06（submittingRef 互斥/同 SHA 复用）绿，G-I08 成功 close=1/
    getContext 失败与 drawImage 抛错 close=0——`:150-156` 仅成功路径 close，非成功路径句柄未显式释放。
  - **scope/生命周期直读**：`:101-111` loadStandardPalette(assetBase) 带 alive flag 但 `.catch` 在 alive
    检查之外——旧 scope 错误可写入新渲染（D3 第 4 点方向有真实依据）；`WorldSpriteLibrary.tsx:448-456`
    focusResource/切目录 setUploading(false) + `:772-775` 条件挂载 → 解码期间卸载/切 scope 可达；
    既有组件测试 1 文件 2 项绿（多帧+submitting 互斥，mock 编码）——不覆盖归属/释放。
  - **SP-01～07 矩阵审查**：两序归属（SP-01）、错误两组合（SP-02）、等待期禁入库+真 submit 入口
    （SP-03）、取消/卸载/scope 变化+同 scope 重渲染不误废（SP-04）、五路径 close 恰一次（SP-05）、
    真实 RLE/gzip/SHA/重解析字节（SP-06）、submitting 互斥/ID-label/切帧保留+G-I04 不裁决（SP-07）——
    与直读根因和替代解释逐条对应；「负控至少移除成功当前性/错误当前性/bitmap finally/等待 submit 守卫
    四独立针」钉住四条修复面。**非阻断建议**：D3 第 1 点「每次 await 后核当前性」应同时覆盖
    getImageData/toDataURL 两个后续 await 点（探针证明 drawImage 后仍有同步链），实现审查时核对。
  - **设计同意**：单调选择代次+await 后当前性核验（成功与 catch 双侧）、等待/失败态禁 submit（UI 禁用
    与 ref 守卫双保险）、bitmap try/finally 恰一次 close、scope 变化失效+同 scope props 更新不误废、
    submit 顺序/互斥/既有编码去重不变、G-I04 维持范围外 risk——最小方向与根因一一对应，无越界面
    （不改布局/编码/core 命令/提交取消语义）。
  - **可证伪观察**：①若真实 UI 在 B 解码前已禁第二次选择或入库字节始终来自 B → 前提倒（本人复跑否定：
    选择器仅 submitting 禁用）；②实现后过期错误仍覆盖当前状态/过期成功仍写 draft → D1 失败；
    ③过期 bitmap 不 close 或双 close → D3 失败；④等待期 submit 仍能入库旧 draft → D2 失败；
    ⑤同 scope 普通重渲染误废选择或旧 scope 数据冒充新 scope 可提交 → D4 过宽/过窄；⑥把顺序锁死禁止
    再选 B 或新增公共 token/全局版本 → 越界；⑦ G-I04 被悄悄当作已修/已证 → 违反 SP-07。
  - 返工项：无。本席只签设计；实现由 Codex 负责，本席不改 SpriteUploadWizard。
- 非Coding Owner一手反证：Kimi/GLM均已独立完成，见上方锚点与反证；缺签豁免：无；build准入：build allowed（2026-09-18 Codex核三席齐、无counter）。

### done前

- Codex：**accept（2026-09-18，r1，候选a88ab18d对比be1868f3）**。选图成功/catch、主色完成/失败和busy收尾遵守当前作用域/代次；bitmap正常/错误/过期统一finally close。submit精确比对readyDraft，旧回调不能借新选择就绪入库。
  20新＋2旧定向、36相邻、editor typecheck/Biome通过；StrictMode真实组件+blank loader/EditSession及RLE/gzip/SHA全像素oracle，包含复用同asset、真实undo/redo和作者ID/标签保留。
  六针独立内存负控均实际执行并业务红、正常对照绿，产品SHA不变；原只读探针未改，不以其旧结构推断修复后行为。
  Chrome正式精灵库实测A→B重选、坏图禁止入库/仍可取消、取消重开成功、B实际入库128×64并一次撤销；没有点击保存或修改PAL作者文件。1920×960下布局与控件对齐、可达；视觉截图/与确定性宿主验证的分栏见回执，不把普通浏览器重选冒称Promise乱序控制。
  完整check7302、官方ratchet和受保护单次strict fast6814/617均exit0，旧218个editor测试及其它六包基线对象不变，无范围/门槛下调。
  **旧版本兼容审查pass**：无版本/公共接口/资产格式变化，无旧模型fallback；G-I04已开始提交后卸载政策保持范围外，完整保存重开试玩仍归R4。
  可证伪：任一旧成功/错误污染当前选择、旧submit入库、bitmap漏/重复close、同内容多造资源或旧测试身份/门槛退回均撤回accept。
- Kimi：**accept（2026-09-18，r1 独立代码/架构终审，候选 `a88ab18d` 对比 `be1868f3`；设计不重签；未读 GLM 本轮结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  接手 HEAD `ff630f1f` 与 origin/main 一致、工作树干净；候选后产品/脚本/锁文件零漂移。
  - **选择/作用域归属**：`SpriteUploadWizard.tsx` 按 [session, assetBase] 建 selection 作用域
    （active/revision/readyDraft/paletteReady）；useLayoutEffect 退出即失效并重置；pickFile 起始
    `++selection.revision` 同步清 readyDraft；解码 await 后 `!active || revision !==` 即丢弃过期
    成功；catch 仅在当前时写错——G-I01/02/03 结构性闭合。主色异步成功/失败同作用域纪律。
  - **精确 readyDraft 提交守卫**：submit 入口要求 `selection.readyDraft === draft`（对象同一性）
    + paletteReady + active + 非 decoding，DOM 禁用同条件——旧渲染闭包不能借新选择的就绪布尔
    （SP-03 双闸）；decoding 进 aria-busy；cancel 先失效+bump+清 readyDraft 再 onDone。
  - **bitmap 释放**：`let bitmap` 外置 + try/finally `bitmap?.close()` 每路径恰一次；解码拒绝
    无虚构 bitmap；G-I08 闭合。
  - **原提交语义**：submittingRef 互斥/ID/label 规则/编码/hash/AddSpriteCommand diff 中仅守卫
    条件变化；已开始提交不可取消保持（G-I04 范围外）。
  - **本人实跑**：定向 **22/22**（新 20+旧 2）、相邻 **36/36**、editor typecheck exit 0；
    入仓 `sprite-selection-mutants.mjs`：**对照绿 + 6 针全业务红**（success/error 归属、bitmap
    释放、readyDraft 准入、主色错误归属、busy 归属），运行后工作树干净。
  - **质量门交叉核**：check editor 2,481（总 7,302）；strict TOTAL **617 文件/6,814 项**；
    基线 diff 实测 editor 2302→2322（恰 +20），仅 editor 包级 digest 变化、旧 fileEntries
    identity 逐项不变、零移除、零降阈；产品保护代码净增分母如实分栏。
  - **视觉复用**：Codex 三张截图与 A→B/坏图/取消重开/入库/撤销流程记录在案，原生重选不冒称
    Promise 乱序控制（由组件宿主测试+六针承担）；本席不重复浏览器流程。完整保存重开试玩归 R4。
  - **旧版本兼容审查：pass**——无版本/公共接口/资产格式变化，无旧模型 fallback。
  返工项：无。本 accept 不代签、不授权 done。
- GLM：**accept（2026-09-18，r1 独立代码/测试矩阵终审；未读 Kimi 结论；原 G-I 只读探针
  probe-glm-upload-prep.mjs 及历轮纠正为本席贡献——本卡产品实现与 20 项正式回归均为 Codex 工作，
  本轮为独立重核，不做视觉，Chrome 证据仅引用 Codex 回执并标非本人验证）**。
  - **实现直读（a88ab18d 对比 be1868f3，产品仅 SpriteUploadWizard.tsx）**：按 session/assetBase 建
    `selection` 作用域（useMemo）+ 单调 revision；pickFile 入口 `++selection.revision` 并清 readyDraft/
    setDecoding(true)，成功侧 `if (!selection.active || selection.revision !== revision) return` 双检查，
    catch 侧同检查（错误归属）；bitmap 提升到 try 外、**finally `bitmap?.close()` 恰一次**（含过期/
    getContext/drawImage/getImageData/toDataURL 失败路径，成功后过期也 close）；submit 入口精确比较
    `selection.readyDraft !== draft` + `paletteReady` + `selection.active`（旧回调不能借新就绪布尔）；
    useLayoutEffect 作用域退出失效+清 draft/palette/err/decoding；palette 成功与 **catch 双侧**均查
    `selection.active`（修复了设计审查发现的 catch 在 alive 外缺陷）；取消按钮手动 `selection.active=false
    + revision++`；aria-busy 含 decoding。与 D1-D5 设计逐点对应，无越界面。
  - **SP-01～07 逐项核（20 新+2 旧断言面直读）**：SP-01（`last selected bitmap owns preview...` test.each
    A-B/B-A 两序——预览文件名+真实入库均为 B，A 完成不清 B 的 busy、等待期选择器可用）；SP-02
    （:236 旧失败不覆盖 B 成功；:246 最新失败不复活旧成功+重选 C 恢复）；SP-03（:221 **捕获真实 DsButton
    onClick 属性**独立调用旧 submit——非复制 submit 算法、非只 DOM 禁用；encode 未被调用）；
    SP-04（cancel/unmount 释放迟到 bitmap+scope 更换覆盖 pending 与 ready 两态+同 scope 重渲染正控）；
    SP-05（正常/过期/取消/卸载 close 恰一次+getContext null/draw/getImageData/toDataURL 逐项+两种
    解码拒绝无虚构 bitmap）；SP-06（`verifyImport` 真实字节 oracle：gunzip→parseSpriteChunkStrict 核
    尺寸/**全部像素/透明位**+bytes==record.bytes+sha256 一致；同内容两定义共用 asset、catalog/blobs
    不增副本、每 submit 一条历史+连续 undo/redo **整状态** deepEqual）；SP-07（作者 ID/标签经重选保留、
    旧 2 项断言零 diff 本人核过、G-I04 范围外未冒称）。palette 两竞态（旧 scope 拒绝不污染新 scope、
    旧 scope 成功不解除当前等待）在 :309/:372。
  - **本人复跑（2026-09-18，main=ff630f1f）**：定向 **22/22**（20 新+2 旧）、相邻 3 文件 **36/36**、
    editor `tsc --noEmit` rc0、改动文件 Biome 0 error；`node docs/testing/sprite-selection-mutants.mjs`
    **1 对照 exit0 + 6 针全部 exit1 且逐日志核 AssertionError 业务红**（success/error-ownership 各 5 红、
    bitmap-release/busy/palette-error/ready-draft-admission 各 1 红；实际执行见证在最终目录
    sprite-selection-mutants-764hrm）。
  - **门禁与基线对账**：check 7302、ratchet 与受保护单次 strict fast **6814/617** 由 Codex 席位记录；
    本人独立 diff 核 baseline——**六包基线对象逐字不变，editor 恰 +1 测试文件（selection.test.tsx）
    +20 项（2302→2322）、零移除**；产品保护代码分母净增（31 行/29 分支）与测试增量分列不混算
    （回执已声明，非范围缩减）。G-I04 维持范围外，保存→重开→试玩归 R4 集中 E2E 未执行。
  - 可证伪复核：任一旧成功/错误污染当前选择、旧 submit 入库、bitmap 漏/双 close、同内容多造资源、
    旧测试身份移除即撤回——本轮复跑均未出现。无阻断项。
- done准入：**done allowed**（2026-09-18 Codex统一核定）；技术三席accept齐（r1/a88ab18d）、无counter/返工项、无缺签豁免，用户明确验收通过，已推进done并归档。

## 用户验收（已通过；以下保留原最小清单）

2026-09-18用户明确回复“通过”，验收已完成，不再要求重复执行下列清单。

Codex已实测正常重选、坏图拒绝、取消重开、实际入库与撤销；用户可直接明确“免复验，通过”，无需重跑技术测试。
若希望自己看，只需在本地编辑器做以下两步，不必保存或改动现有资源：

1. 资源→精灵库→导入源帧资源，选“默认定格”；先选一张PNG A，再选明显不同的PNG B。
   通过：原图文件名/尺寸和入库预览均为B，不跳回A。ID/标签沿用已填值是原有规则，不要求跟着文件名重置。
2. 取消后重新打开向导，再选B。通过：无上次错误或旧预览残留，可正常预览且“入库”可用；随后取消即可。

不通过：B被旧图覆盖、取消后旧错误复活、成功解码仍不能入库。布局/按钮规格/切帧方式未改，不要求重新验收整个精灵库。

## 交接日志

- 2026-09-18 Codex最终收口：用户明确验收通过后同步94ef2671，核同候选三席accept与代码/测试/基线零漂移，更新done并归档卡片，同步看板/索引/审计现态/覆盖率回执；三席签字原文保留，G-I04/R4后续归属不扩张。本次纯文档收口，运行文档工具测试与检查，不重跑已验证产品流程；无需下一位Agent交接。
- 2026-09-18 Codex核终审：用户通知已签后同步，HEAD/origin均57b4ac5d、工作树干净；核Codex/Kimi/GLM均对r1/a88ab18d签accept，无counter/返工。a88ab18d→HEAD的packages/scripts/projects/data/lock零diff，复用已通过的7302/6814门禁及浏览器证据，不重复跑同一验证。统一更新为“技术终审齐、仅待用户验收”，补最小两步清单；不把AI签字冒充用户手工验收，不代签，不重开设计。
- 2026-09-18 Kimi（r1 终审）：同步 `ff630f1f`、工作树干净后核 `be1868f3 → a88ab18d`。
  直读 selection 作用域/代次/useLayoutEffect 失效、pickFile 过期成功丢弃与 catch 当前性、
  submit 精确 readyDraft 双闸、try/finally close 恰一次、主色作用域；复跑定向 22/22、相邻 36/36、
  typecheck exit 0、入仓 6 针负控全业务红+对照绿；交叉核 check 7,302、strict 617/6,814
  （恰 +20）、旧 identity 零移除。视觉复用 Codex 证据（原生重选不冒称乱序控制）。
  旧版本兼容 pass。签 accept，无返工项；未改产品/他席/状态，未读 GLM 结论。
  Next：Codex 统一核定 done（G-I04 保持范围外、保存重开试玩归 R4）。
- 2026-09-18 GLM：完成 r1 独立代码/测试矩阵终审，done 前席位签 accept（证据锚点见上节）。直读
    SpriteUploadWizard 选择作用域/代次/finally close/精确 readyDraft 入口/palette 双侧 catch；SP-01～07
    对 20 新+2 旧断言面逐项核（两序归属、两错误组合、真实 DsButton 旧回调、pending/ready scope、close
    计数、gunzip 全像素 oracle、同 SHA 复用+整状态 undo/redo、旧 2 项零 diff）。复跑 22/36、tsc/Biome、
    6 针负控逐日志 AssertionError 业务红；独立 diff 核六包基线不变+editor 恰 +1 文件 +20 项。原 G-I 只读
    探针贡献披露；Chrome 视觉仅引用 Codex 回执。未读 Kimi 结论；仅改本席与日志，不改实现/状态/他席。
- 2026-09-18 Codex实现收口：完成a88ab18d（基点be1868f3），只改SpriteUploadWizard、一个新组件测试、隔离负控及官方生成基线；样式/编码/core命令/旧测试/已收口GLM包不动。补StrictMode、两类ready旧scope、旧主色成功、toDataURL失败、同asset复用/整状态undo/redo后20新＋2旧绿，36相邻/tc/Biome通过；六针实际执行业务红。正式浏览器B预览/坏图拒绝/取消重开/入库与一次撤销闭环，不保存PAL。check7302→ratchet→单次protected fast6814/617全绿，写本席accept、转review并同步看板/索引；两席终审提示同时给出，设计不重签。
- 2026-09-18 Codex并行build进度：向导内部按session/assetBase建立选择作用域与代次，成功/catch检查当前性，finally释放bitmap；解码等待/失败的旧draft不能经DOM或旧提交回调入库，palette旧scope错误也隔离。编码/命令/GLM core测试零改动。新建SpriteUploadWizard.selection.test.tsx，经真实组件事件、当前blank项目loader/EditSession和真实RLE/gzip/SHA核产物。
  首批8项在旧树6业务红/2绿（/tmp/sprite-selection-before.log）；扩展后新15项+既有2项共17绿、editor typecheck/Biome通过（/tmp/sprite-selection-directed.log、/tmp/sprite-selection-tsc.log）。初次类型/Hook依赖检查及“React尚未刷新DOM”假设失败已修；提交入口保护改为捕获实际DsButton回调独立验证，不复制submit算法。
  仍在build：单点负控、dev-functional浏览器检查、全仓check/ratchet/严格fast未完成，不能据17绿标review/done。两个产品/测试工作文件尚在Codex本地工作区，未形成提交候选，不改当前官方基线。下一步Codex继续该独立主线，GLM只处理自身残项。
- 2026-09-18 Codex：接收GLM测试返工仍有残项，已单独交回；同时核本卡Kimi/GLM设计均agree，推进独立build。实现钉勘误（不改他席原文）：getImageData/toDataURL在当前源码为同步调用，不为评语新增await；G-I03旧A成功后保留的是B错误，不是A错误。两处措辞不改变已签的当前性/finally方案。先写真组件乱序回归再修向导，不碰GLM core白名单。
- 2026-09-18 Kimi：完成 r1 独立设计审查，签 premise verified + design agree，无返工项。
  直读 pickFile（:145-173 无请求身份检查）、submit（:175-222）、入库按钮准入（:459-461）、
  取消语义（:467-475）、bitmap 仅成功路径 close（:150-156）、WorldSpriteLibrary 条件挂载/卸载；
  复跑 probe-glm-upload-prep（G-I01/02/03/08 反例成立，G-I05/06/07 正控成立，G-I04 维持 risk
  不裁决）与既有 2 项组件测试。六条可证伪观察写入本席；范围确停 D-03，不碰已开始提交的取消
  语义/编码格式/core 命令/UI 形态。未改产品/他席/状态，未读 GLM 结论。Next：三签齐后
  Codex 核定 build 准入并实现；dev-functional 视觉由 Codex。
- 2026-09-18 GLM：完成 r1 独立设计审查，签 premise verified + design agree，无返工项（附一条非阻断
  建议：当前性核验覆盖 getImageData/toDataURL 后续 await 点）。直读 pick/submit/选择器/palette effect/
  条件挂载锚点；重跑本人原探针（G-I01/02/03/08 反例、G-I05/06/07 正控、G-I04 维持 risk）与既有 2 项
  组件测试。原探针与 prem 历轮纠正贡献披露；未读 Kimi 结论。仅改本席与日志，不改产品/他席/状态。
- 2026-09-18 Codex：用户要求GLM返工同时并行推进，先收口Q1接口，再核D-03真入口/已有材料，形成r1有界方案。
  GLM测试分支不合入、不改；本卡独立文件面和门禁，未开始实现。下一步两席可并行设计审查，GLM原返工不因此等待。

## 下一位Agent提示词

无下一位Agent提示词；用户验收已通过，本卡已收口。以下终审提示均已完成，仅保留历史，不再转发或重签。

### Kimi · r1独立实现终审（历史，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-SPRITE-PICK-1，卡 docs/ops/archive/tasks/done/EDITOR-SPRITE-PICK-1-latest-image-selection.md，review/r1；候选a88ab18d51328432f559b41ee6e8f7880379880e，对比be1868f39f672ebe705961f0d551d4584da90818。设计三签有效，不重签。
先同步查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡及docs/testing/sprite-selection.md。独立核selection作用域与代次、success/catch/busy/palette所有权、StrictMode卸载清理、精确readyDraft入口（非只DOM禁用）、bitmap finally，以及已开始提交语义不变。仅一个产品组件，无样式/编码/core/版本/公共接口改动；GLM已收口补测包不得重开。
复跑22定向（20新＋2旧）、36相邻、editor tc/Biome；node docs/testing/sprite-selection-mutants.mjs应1对照绿＋6针实际stdout执行/AssertionError业务红、产品SHA不变。核同SHA复用/真实undo-redo、字节全像素oracle、旧scope和主色两类竞态。交叉核check7302、ratchet/受保护单次strict fast6814/617，旧218个editor测试与其它六包基线对象不变；不把新增保护代码分母当范围缩减。
Codex已做正式Chrome最小功能验证，截图/局限见回执，复用不重复视觉；完整保存重开试玩归R4，G-I04提交后卸载政策保持范围外。独立签本人accept或file:line counter、写本人日志并提交推送；不读/复述GLM终审结论，不改实现/状态/他席，不标done。两席并行，提交前同步保留他席改动，回Codex统一核定。
```

### GLM · r1独立测试/代码终审（历史，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-SPRITE-PICK-1，卡 docs/ops/archive/tasks/done/EDITOR-SPRITE-PICK-1-latest-image-selection.md，review/r1；候选a88ab18d51328432f559b41ee6e8f7880379880e，对比be1868f39f672ebe705961f0d551d4584da90818。设计不重签，原TEST-EDITOR-LOGIC-COVERAGE-1已done不重开。
先同步，读AGENTS/CLAUDE/READ-FIRST、本卡及docs/testing/sprite-selection.md。你贡献过原G-I只读诊断须披露；本卡产品和正式回归由Codex实现。只核代码/矩阵，不操作浏览器、不做截图或视觉判断，不复述Kimi结论。
逐SP-01～07核20新＋2旧测试的真实输入/字节/不变式，尤其两完成序、两错误组合、捕获真实旧submit回调、pending/ready两种scope更换、StrictMode、palette等待/失败、close次数、同SHA复用及整状态undo/redo；既有2测试断言零改。复跑22/36、tc/Biome及node docs/testing/sprite-selection-mutants.mjs（对照绿＋6针唯一替换、实际stdout执行且业务红、产品SHA不变）。核check7302/fast6814/617与20项增量、218旧文件身份、其它六包基线不变；不把头部源码加载标记当实际执行。
G-I04仍范围外、保存重开试玩归R4，视觉只引用Codex回执并标非本人验证。只写本人accept/counter与证据/日志、提交推送；不改实现/状态/他席、不代签不标done，提交前同步保留Kimi并行落盘。
```

### Kimi · 原设计提示（历史，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SPRITE-PICK-1 r1，卡 docs/ops/archive/tasks/done/EDITOR-SPRITE-PICK-1-latest-image-selection.md，draft，产品取证467a5f41，Codex负责实现。
先同步查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、D-03审计及glm-pre-e2e-prep-report的G-I纠正记录。独立读SpriteUploadWizard pick/submit/useEffect与WorldSpriteLibrary条件挂载，复跑旧probe-glm-upload-prep.mjs，核最后选择归属、错误乱序、bitmap释放及现有提交互斥。
审选择代次/解码等待禁旧draft入库/取消卸载scope边界；不改变已开始提交的取消语义、不动编码格式/core命令或UI形态。直接写本人premise verified/design agree或counter，附一手锚点和可证伪观察，提交推送；不读GLM结论、不改产品/他席/状态、不标build/done。Q1已收口，不重复审。
```

### GLM · 原设计提示（历史，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SPRITE-PICK-1 r1，卡 docs/ops/archive/tasks/done/EDITOR-SPRITE-PICK-1-latest-image-selection.md，draft，产品取证467a5f41。
这是Codex独立产品主线，不替代你TEST-EDITOR-LOGIC-COVERAGE-1的R1～R4返工，两者文件不冲突。先读AGENTS/CLAUDE/READ-FIRST、本卡与旧G-I材料，独立核SP-01～07、正常/错误两序、scope、bitmap close、真实编码/哈希/入库oracle；G-I04继续范围外risk，不伪称卸载已验证。
你贡献过原探针，须披露；不做浏览器或视觉，不读Kimi结论。在本人席位签带一手证据的premise verified/design agree或counter及日志并提交推送，不改产品/他席/状态、不标build/done；随后继续原测试返工，不要求旧设计重签。
```
