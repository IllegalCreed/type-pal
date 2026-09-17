# EDITOR-SPRITE-PICK-1 - 精灵上传选图异步归属

Status: draft
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
用户要求GLM测试返工期间Codex并行推进；本卡只完成只读取证/方案，尚未修改产品或正式测试。
与[编辑器补测返工](TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md)分离：不修改其八文件/fixture/诊断/回执，
不改commands/reference目标产品；GLM无须等本卡才能修自己的测试。

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

- [AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[工作流](../agent-workflow.md)。
- [D-03审计](../audits/pre-e2e/editor-workflows.md#d-03--旧图片解码完成后覆盖新选图)、[已接收GLM材料及历轮证据纠正](../../testing/glm-pre-e2e-prep-report.md)。
- [编辑器设计系统](../../phase2/specs/editor-design-system.md)：只用既有disabled/aria-busy/错误呈现，不改控件形态。
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
- Kimi：premise pending / design pending；独立核入口、请求/生命周期/submit边界，不复述GLM。
- GLM：premise pending / design pending；独立核合法fixture/两序/错误组合/真实字节oracle与非视觉矩阵，披露原材料贡献，不复述Kimi。
- 非Coding Owner一手反证：pending；缺签豁免：无；build准入：blocked，签齐前不修改产品或正式测试。

### done前

- Codex：pending；Kimi：pending；GLM：pending。done准入：blocked。

## 交接日志

- 2026-09-18 Codex：用户要求GLM返工同时并行推进，先收口Q1接口，再核D-03真入口/已有材料，形成r1有界方案。
  GLM测试分支不合入、不改；本卡独立文件面和门禁，未开始实现。下一步两席可并行设计审查，GLM原返工不因此等待。

## 下一位Agent提示词

### Kimi

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SPRITE-PICK-1 r1，卡 docs/ops/tasks/EDITOR-SPRITE-PICK-1-latest-image-selection.md，draft，产品取证467a5f41，Codex负责实现。
先同步查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、D-03审计及glm-pre-e2e-prep-report的G-I纠正记录。独立读SpriteUploadWizard pick/submit/useEffect与WorldSpriteLibrary条件挂载，复跑旧probe-glm-upload-prep.mjs，核最后选择归属、错误乱序、bitmap释放及现有提交互斥。
审选择代次/解码等待禁旧draft入库/取消卸载scope边界；不改变已开始提交的取消语义、不动编码格式/core命令或UI形态。直接写本人premise verified/design agree或counter，附一手锚点和可证伪观察，提交推送；不读GLM结论、不改产品/他席/状态、不标build/done。Q1已收口，不重复审。
```

### GLM

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SPRITE-PICK-1 r1，卡 docs/ops/tasks/EDITOR-SPRITE-PICK-1-latest-image-selection.md，draft，产品取证467a5f41。
这是Codex独立产品主线，不替代你TEST-EDITOR-LOGIC-COVERAGE-1的R1～R4返工，两者文件不冲突。先读AGENTS/CLAUDE/READ-FIRST、本卡与旧G-I材料，独立核SP-01～07、正常/错误两序、scope、bitmap close、真实编码/哈希/入库oracle；G-I04继续范围外risk，不伪称卸载已验证。
你贡献过原探针，须披露；不做浏览器或视觉，不读Kimi结论。在本人席位签带一手证据的premise verified/design agree或counter及日志并提交推送，不改产品/他席/状态、不标build/done；随后继续原测试返工，不要求旧设计重签。
```
