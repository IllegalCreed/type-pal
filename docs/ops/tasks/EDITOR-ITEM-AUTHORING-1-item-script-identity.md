# EDITOR-ITEM-AUTHORING-1 - 物品作者记录与脚本引用身份

Status: draft
Phase: phase2
Capability: D-06/D-07修复（既有物品/脚本能力，不新增能力格）
Coding Owner: Codex
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/editor-item-authoring-r1

Revision: r1 / 2026-09-20。前提与候选设计阶段；产品冻结`1e0388b0d65b03c7dcec25d145215d0f22966825`。
用户要求Codex推进剩余物品/脚本缺陷，并给GLM可并行工作。已完成的模拟器不重开；TB00/TB01测试包独立接收。
本卡触作者保存边界与跨包运行态引用，**三席设计签字前不改产品/正式测试**，不以“继续”推定免签。

## 目标与范围

新建物品无需保存重开即可创建私有脚本；复制后的私有正文属于副本，删除/撤销/重建无孤儿串用。
所有当前合法共享ScriptId（包括`item:`前缀）均保持共享身份，编辑、引用检查、保存重开和使用时不误认私有脚本。

- 范围内：物品创建/复制/删除两会话记录；共享/私有引用的当前内存投影与识别；保存引用校验；对应原子历史与实际使用入口回归。
- 不改content20/SAVE8、作者JSON格式、脚本命令/作用域规则、私有脚本基数（每物品仅use一条）、投掷脚本能力。
- 不清洗/重生成PAL，不改原始资产/普通存档，不发明ScriptId保留前缀，不重建分片索引，不实现N6b或完整E2E。
- 无新UI形态：沿用现有创建/复制/私有脚本编辑入口，只修语义闭环。引用结构编辑仍经过既有命令/守卫。

## 前提真值门

一句话：当前合法的物品作者数据，在会话注册、共享/私有投影或通用引用校验之间被错误分类，导致立即编辑失败或无法保存/误分流。

| 维度 | 直接证据与结论 |
| --- | --- |
| 原版/primary source | 原版不定义现代作者工程合同；primary为当前TS类型/守卫。content/author-item-core.ts:6–24 私有id仅use、共享为ScriptId字符串；author-script-core.ts:1122只要求共享ID非空，没有item:保留前缀 |
| 第一阶段 | N/A：game无这套作者双会话/项目保存/私有脚本创建界面；不拿PAL原版数值或槽位作为编辑器身份规则 |
| 当前二阶段 | ItemTab.tsx:1073–1083创建/复制只AddItemCommand；script-editor.ts:2026要求canonical item存在；projection.ts:95–106根据字符串前缀猜私有；main.ts:5393根据item:前缀分流；validate-refs.ts:1565–1572仍从effect.script.chunk/id读旧分片 |
| 本任务目标 | 当前合法的作者定义和明确身份不因投影变质；两会话生命周期原子；共享/私有可区分且保存守卫继续拒绝真正缺正文/悬空引用 |

### 当前树动态证据

[只读前提探针](../../testing/item-authoring-premise.mjs)：真实buildBlankProject→正式loader→实际ItemTab创建/添加/复制回调（AST原样执行）→真实两Session/Coordinator→merge/serialize；全文件在内存，不写作者目录。

1. **D-06**：创建item-001后主会话1项、脚本会话0项；立即添加私有脚本报`物品不存在 item-001`；失败两会话快照不变。
   同一文件集经真实serialize→loader重开后再添加成功，再序列化/重开成功。不是脚本体非法、资源缺失或存储权限问题。
2. **D-07前缀碰撞**：合法共享ID`item:collision-item:use`已过loader，保存merge却报“私有脚本use正文缺失”；原作者输入不变。
3. **D-07同链额外根因**：普通合法共享ID`shared/plain`也被保存门拒绝，错误为`共享脚本 "undefined" 不在脚本库`。
   不是全部问题都能靠换私有前缀解决：assertProjectSaveValid向validateReferences传canonical字符串，而后者按chunk/id取值。
4. **运行时路由见证**：从main的dispatchItemUse提取原host.runScript回调；普通ID路由shared，两个合法item:前缀ID被路由private。
   这里只记录host方法选择，**没有声称跑了完整游戏/真实脚本体**；实施验收必须补实际executor+runtime业务效果。
5. **复制同族反例**：真实duplicateItem复制带私有脚本物品后canonical仅有源记录，副本带源runtime ref；保存报共享脚本不存在。
   新发现归同一物品作者生命周期，不能只修新建按钮而遗漏复制；删除重建的详细边界仍须由矩阵核对，不把尚未运行的路径写成已复现。

初次探针把可选save-state缺席误当断言错误、把.ts当TSX解析，均为本席工具问题，已修成NotFoundError与按扩展名解析。
普通共享ID原以为是完整保存正控，实测失败后已纠正为第三项独立根因；空白/无脚本物品和私有脚本重开正控成立。
探针断言的是修复前现状，不能加入正式正确性门禁；实施时转为正确行为回归。

### 替代解释与可证伪观察

- 若现行guard已禁止该ScriptId，则前缀反例撤回；本次正式loader已接受，不能靠增加保留字绕过。
- 若真实createItem已经登记canonical，则D-06撤回；本次执行原回调后两会话数量不同，重开后正控成功。
- 若问题仅为审计fixture/旧模型输入，则应修探针；本次使用当前seed与正式loader，非旧分片工程，不用as unknown绕guard。
- 若validateReferences仍有真正需要运行态ScriptRef的当前生产caller，须明确分清作者/运行态入口，不草率删有效当前合同；GLM必须独立核调用表。
- runtime/命令分类：已发现真实前缀误判；原版理解：N/A；提取/迁移/资源解码：零PAL字节当前seed亦复现，根因不在迁移；测试模型：正式loader+真实回调/会话，运行时仅路由见证的边界已披露。
- before→after：新建/复制可立即编辑和保存；合法共享引用不会误认私有。修复既有合同，不主动改变产品意图。

## 上下文锚点

- AGENTS/CLAUDE及[READ-FIRST](../../phase2/READ-FIRST.md)：current-only、稳定ID、前提门、唯一Coding Owner；不新增历史格式兼容。
- [D-06/D-07审计](../audits/pre-e2e/editor-workflows.md#对照已有问题与未覆盖范围)。
- [D-01全局历史](../archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md)：复用原子配对，不新建第三套undo，不破坏失败保全。
- [ED-5J私有脚本入口](../archive/tasks/done/ED-5J-item-private-script-create.md)：历史设计中的旧版本字样不恢复；现行合同仍每物品use一条、正文由脚本会话持有。
- 现行代码：ItemTab.tsx:1073/1080/1086/1114；commands.ts:2046/2087；script-editor.ts:2007；script-editor-projection.ts:95/109/199；reforge/runtime-project-view.ts:47/280；item-use-executor.ts:46；main.ts:5369/5393；content/validate-refs.ts:78/1565；editor/project-diagnostics.ts:677/838/915；migrate/pal-current-publication.ts:338/361。
- 回归：item-authoring/ItemTab/script-editor-projection/editor-history-coordinator/project-diagnostics；runtime-project-view/item-use-executor；content validate-refs/validate-author-items；当前PAL发布校验相邻测试。

## r1候选方案（供独立设计审查，未实施）

1. **作者记录成对存在**：新建、复制、删除通过既有Coordinator同时维护普通字段投影与canonical item。
   复制从当前合并作者态取正文，深拷贝私有body到新ItemId后再生成主会话投影；共享引用仍复用同一ScriptId。
   删除保持当前引用守卫，原子去掉两侧记录；undo/redo恢复原顺序/正文/选择，不以保存重开补登记。
   无脚本会话或协调器的生产入口应在任何写入前明确拒绝，不能默默退回半状态；测试/独立组件调用者的有效合同先由caller census确认。
2. **内存引用显式区分来源**：保留共享投影`{chunk:'__author-script-runtime', id: ScriptId}`；私有投影使用独立固定tag
   （候选`__author-item-private-runtime`），`id`直接保存ItemId，use槽由现行私有类型唯一确定。
   专用构造/判定/取owner helper是唯一入口；不拼接/拆分用户ID，不按startsWith猜身份，不加新持久化字段。
   projector、编辑器私有行识别/合并/删除、world item executor和实际main host同时更新；未知tag/错误owner拒绝，真正缺私有body仍fail-closed。
3. **引用校验消费正确表面**：canonical物品的共享引用按稳定ScriptId在sharedScripts核验；私有body按既有typed collector扫描。
   三个生产调用域（编辑器实时诊断、编辑器保存、PAL publication）逐一对齐，不往保存输入塞假scriptChunks。
   本域没有真实caller的旧分片分支/fixture应退役或改成当前合同；不借此批量删除与本卡无关的旧工具。
4. **原子边界保持**：保存前同一当前视图验证→serialize→真实writer/loader重开；不降低任何缺正文/坏引用/外部冲突保护。

若审查发现独立tag与现有当前consumer冲突、要求变更持久格式或新产品选择，签counter并停在draft，不能直接实施替代方案。

## 验收矩阵

| 族 | 必须证明 |
| --- | --- |
| 创建 | 空工程新建→启用use→私有脚本→编辑正文→立即保存/重开；不要求先重开 |
| 复制 | 无脚本/共享/私有/私有混合效果；副本正确owner与完整body，改副本不改源；复制后原子undo/redo |
| 删除重建 | 当前引用阻断不变；删除两侧干净；撤销/重做原序；重用相同ID不接回旧私有body；失败零提交/零历史变化 |
| 身份 | 普通shared、同item前缀、其它item前缀、包含冒号/非ASCII的合法ID；shared与private恰好同文本也不混淆；真实缺正文仍拒绝 |
| 实际调用 | 真实world-item executor→实际脚本runtime产生不同可观察业务结果；不能只断言spy路由或toast |
| 引用/保存 | 实时诊断、共享引用导航/删除守卫、serialize和真实writer/loader；缺共享ID准确报原ID，不是undefined；输入深快照保真 |
| 异步/历史 | 原子通知看不到半态；撤销/重做/跨页/取消不串记录；沿用既有D-01/A-03协议 |
| 视觉 | Codex最小功能验证新建→脚本编辑、复制→独立正文、保存重开；不要求GLM/Kimi操作浏览器 |

负控制最小集合：去canonical登记、复制仍用源ref、把共享item:误分流、保存按旧chunk读取、去掉缺私有body拒绝；每针用同输入正控与候选自身业务断言红。
完整check/官方ratchet/单次受保护strict由Codex集成后串行跑；本阶段不更新基线。
R4登记：空白工程创建物品及私有/共享脚本→保存→重开→使用，核作者正文、业务效果及历史；与正式全量E2E分开。

## GLM并行只读包（可立即执行，不占测试实施槽）

冻结产品1e0388b0；独立分支`codex/glm-item-authoring-audit`/worktree，不在主工作树切分支，不恢复stash。
先独立读取一手代码，不复述Codex探针结论或Kimi审查。任务是证伪前提/补齐影响面，不是再开一个覆盖率实现包。

- G1：列全部物品创建/复制/删除生产调用者、两个会话/历史/选择/引用/dirty所有权；区分真正caller与test-only。
- G2：追共享/私有引用在loader→projector→UI→diagnostics→serialize→runtime使用链中的每种当前表面；找出全部前缀/分片猜身份处。
- G3：核validateReferences的三个生产输入，证实哪些仍需要运行态Ref、哪些只应消费canonical；不因字段存在/旧测试通过就声称有caller。
- G4：合法输入矩阵：新建/复制/删除重建/undo/redo、共享同前缀、冒号ItemId、同名私有与共享、混合效果、缺正文/坏共享；每条给入口、守卫与反例条件。
- G5：旧测试去重，列精确标题与缺口；尤其D-01失败保全、已done的TB07复制测试与待接收TB00投影测试，保留贡献归属，不重复计数。

落盘白名单：新`docs/testing/item-authoring-glm-audit.md`（含本席证据与只读命令/结果），可附同目录`probe-glm-item-authoring.mjs`；README索引一行；本卡GLM签字及GLM本人日志。
可以在/tmp重建探针，不改产品/正式测试/原Codex工具/基线/其它卡状态；不做浏览器/截图/视觉，不写真实工程，不跑迁移重生成。
按每条reproduced/covered/risk/N/A据实分类，未跑只能静态证据；若方案不成立给最小counter，不以补丁修掉反例。
完成后对r1分别签带直接锚点的premise verified/design agree或counter并提交推送；不代签、不标build/done。

## 推进签字

### build前（r1，冻结1e0388b0）

- Codex：**premise verified / design agree（2026-09-20）**。本人直读上述当前guard/实际caller，探针现树复现D-06、D-07两层保存失败、复制失败与main误分流；四向与可证伪条件见上。private只use、共享不保留前缀、current-only与原子历史不变。这是候选方案签，不授权缺两席时实施。
- Kimi：pending。
- GLM：**premise verified / design agree（2026-09-20，冻结 1e0388b0；全部锚点本人直读一手源码，未读 Codex 探针输出/Kimi 结论；G1～G5 取证见 [item-authoring-glm-audit.md](../../testing/item-authoring-glm-audit.md)）**。
  - **前提四向本人复证（静态一手）**：① D-06——`ItemTab.tsx:1072-1084` 新建/复制仅 `session.dispatch(AddItemCommand)` 主会话，`script-editor.ts:2022-2023` AddItemPrivateScriptCommand 要求 canonical item 存在否则 `物品不存在`；② D-07 碰撞——`script-editor-projection.ts:95-106`/`ItemTab.tsx:1139-1143`/`ItemUseEffectEditor.tsx:883-886` 三处 `startsWith('item:<id>:')` 猜私有，`main.ts:5393-5395` `startsWith('item:')`+`split(':')` 路由，`item-use-executor.ts:46-55` 全等判定；`author-script-core.ts:1122` 共享 ID 仅 nonEmptyString **无保留前缀**，loader 合法接受 `item:*`；③ 第三根因——`App.tsx:2154` 保存走 merge（`mergeCurrentItemShell:131-133` 把共享 ref 转纯字符串）→`assertProjectSaveValid`→`validate-refs.ts:1565-1572` 读 `effect.script.chunk/.id`（字符串上均 undefined）→「共享脚本 "undefined"」；④ 复制——`cloneItemForAuthoring`（item-authoring.ts:37-43）structuredClone 保源私有 ref，副本投影/保存/runtime 三面全部错向。
  - **G3 供给普查**：scriptChunks 生产侧恒 `{}`（project-io.ts:84 默认、open-local.ts:90；无真实 chunk 装配器）——item-runScript 旧 chunk/id 分支无当前生产 caller，方案 3「退役旧表面、按 ScriptId 对 sharedScripts 核验」有据；诊断域（project-diagnostics.ts:676-692）同样喂字符串形态，静态推断实时诊断亦报 undefined（未动态跑，列为实施回归项）。
  - **design agree**：方案 1 与本人 census 一致（生产 caller 唯 ItemTab 三入口+私有脚本配对，P01-P20 已证 Coordinator 协议）；方案 2 显式 chunk tag+id=ItemId 把区分维度从 id 前缀移到 chunk，本人 sweep 的前缀猜身份全量 6 站点与方案声称的同步更新面**逐一对上无遗漏**，canonical 持久形态不变；方案 4 保留缺私有 body fail-closed（script-editor-projection.ts:213-220）与引用阻断守卫。
  - **可证伪观察**：① 若存在喂真实 scriptChunks 的当前生产 caller 或第 7 个前缀猜身份站点→方案 2/3 覆盖面破产（本人 sweep 为空）；② 若诊断域实测不报 undefined→本人 G3 静态推断错，须改判；③ 实施后 `item:<id>:use` 形共享 ID 在 UI/投影/runtime/executor 四面仍被当私有→方案 2 无效。
  - 非阻断备注（报告已列）：冒号 ItemId 纳入验收矩阵显式用例；复制后 runtime 路由到源私有脚本的语义串用建议入负控；诊断/保存两处报错面同时钉回归。
- 非Coding Owner独立primary-source反证：GLM 本席已给（上方源码锚点+可推翻观察）。
- build准入：关闭，留draft；无缺签豁免。

### done前

- Codex / Kimi / GLM：pending；尚未实施，不标done。

## 下一位Agent提示词

### GLM（独立取证包＋r1设计审查）

```text
在 /Users/zhangxu/illegal/type-pal 接 EDITOR-ITEM-AUTHORING-1，卡 docs/ops/tasks/EDITOR-ITEM-AUTHORING-1-item-script-identity.md，draft/r1，冻结1e0388b0。
先读AGENTS/CLAUDE/READ-FIRST、本卡及D-06/D-07原审计。按卡中G1～G5执行独立只读调用链/合法性/矩阵与去重审查，先读一手源码，不复述Codex探针或Kimi结论；可以反证本卡前提。新建/复制、合法共享ID保存、runtime身份分流都要覆盖，不能只换前缀或造分片保绿。
在独立codex/glm-item-authoring-audit分支/worktree做，白名单仅卡内列出的报告/可选探针、README索引一行、本人签字与日志；不改产品/正式测试/基线，不跑迁移、不操作浏览器、不切主工作树分支、不恢复stash。取证不是覆盖率贡献，也不开放build。
完成后对本卡r1分别签premise verified/design agree或带最小反例counter，落本人区并提交推送，不代签他席、不改状态、不标build/done。既有两包350da702/ccc67dcc交Codex独立接收，不重复返工已交内容；发现未满足原counter才按原卡补正。
```

### Kimi（并行独立前提/设计压力测试）

```text
在 /Users/zhangxu/illegal/type-pal 独立审 EDITOR-ITEM-AUTHORING-1，卡 docs/ops/tasks/EDITOR-ITEM-AUTHORING-1-item-script-identity.md，draft/r1，冻结1e0388b0。
先读AGENTS/CLAUDE/READ-FIRST、本卡、D-06/D-07审计和D-01/ED-5J历史约束；独立读取当前原始类型/guard/caller，不读或复述GLM结论。
重点证伪两会话创建/复制/删除生命周期、合法共享ScriptId被私有前缀误判、通用引用校验仍读chunk/id；核r1固定内部来源tag+原始ItemId的方案不改content20/SAVE8、不靠保留前缀/假分片兼容、不放松缺正文保护，覆盖实际runtime而非只修编辑器。核复用Coordinator原子性及完整输入/副本保真。
可运行只读item-authoring-premise.mjs；运行时现有证据仅host路由，实施后必须补真实executor/runtime结果。输出本席premise verified/design agree或带file:line/可证伪观察counter，直接写卡内本人席位和日志提交推送。不得改实现/正式测试/他席/状态、不得开始build或标done；同步保留并行他席改动，视觉归Codex。
```

## 交接日志

- 2026-09-20 GLM：在独立分支/worktree（codex/glm-item-authoring-audit）完成 G1～G5 只读取证
  并签 r1 premise verified / design agree（证据与可证伪观察见本席签字与
  [item-authoring-glm-audit.md](../../testing/item-authoring-glm-audit.md)）：生产 caller 普查唯一
  ItemTab；前缀猜身份全量 6 站点；validateReferences 三生产输入全喂错形态且 scriptChunks 生产
  恒空；复制/碰撞/冒号矩阵逐条落地；旧测试按 P01-P20/TB07 复制/投影测试去重。只写白名单
  报告+README 索引+本席签字与日志，未改产品/正式测试/基线，未运行探针（静态一手源码），
  未读 Kimi 结论，不代签、不标 build/done。非阻断备注三条已落报告。

- 2026-09-20 Codex：按用户要求继续；在独立worktree完成当前内存前提探针，发现D-07普通共享引用也因旧分片式校验失败，复制私有脚本亦未注册/重投影。原假定正控与工具问题均据实修正；未改生产/正式测试/基线。GLM做G1～G5只读包，Kimi并行审设计；签齐前不实施。
