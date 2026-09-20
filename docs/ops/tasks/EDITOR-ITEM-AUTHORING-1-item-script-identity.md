# EDITOR-ITEM-AUTHORING-1 - 物品作者记录与脚本引用身份

Status: review
Phase: phase2
Capability: D-06/D-07修复（既有物品/脚本能力，不新增能力格）
Coding Owner: Codex
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/editor-item-authoring-r1

Revision: r1 / 2026-09-20设计，2026-09-21进入review。统一实现候选`451cbbb7dc8fe1e563fbe9c6537ac4c91df5dc68`，对比产品冻结`1e0388b0d65b03c7dcec25d145215d0f22966825`；设计不重签。
用户要求Codex推进剩余物品/脚本缺陷，并给GLM可并行工作。已完成的模拟器不重开；TB00/TB01测试包独立接收。
本卡触作者保存边界与跨包运行态引用，**三席设计签字前不改产品/正式测试**，不以“继续”推定免签。
2026-09-20 Codex已核三席同r1/冻结1e0388b0：本席a1f21718、Kimi 6939a1ac、GLM 4d4e9a5d均premise verified/design agree，允许Codex在独立worktree实施。

### build准入与取证口径校注（Codex）

两席完整原文已合并保留（fa8b1e77），无需重签；本席核定前产品相对冻结零diff，非Owner独立一手证据条件满足。
GLM报告只提供静态源码证据，**不将其reproduced-static算动态复现**。其“全量6站点”不作为完整调用点计数：
除表中位置，ItemTab.tsx:866/932/999还有识别/解析/删除路径；ItemUseEffectEditor.tsx:1192–1193才是待添加私有引用的probe构造，
:878仅为不参与脚本分流的reorderScope，必须保留。以上均在原r1的“编辑器识别/删除/构造”消费域内，非新方案或新能力。
实施按完整源码普查更新，不能只按报告的单个行号修。也不采用“PAL源物品无脚本”的泛化：本席当次主树生成快照234项中
20项含私有脚本、共享runScript为0；该统计不当冻结数据真值，根因证明仍依赖无PAL字节的合法seed。
此处纠正清单粒度/证据表述，不改变已共同核实的缺陷、修复层、身份方案和r1验收条件；不代改GLM原签。

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

## r1已签方案

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
- Kimi：**premise verified / design agree（2026-09-20，r1，冻结1e0388b0；全部锚点本人直读/探针本人复跑，未读 GLM 结论）**。
  - **D-06 两会话生命周期直读**：`ItemTab.tsx:1073-1083` 创建/复制仅向主会话 dispatch
    `AddItemCommand`，脚本会话无登记；`script-editor.ts:2026` `AddItemPrivateScriptCommand`
    在 canonical `state.items` 找不到即抛「物品不存在」。探针复现：item-001 立即添加失败、
    真实 serialize→loader 重开后正控成功；失败时两会话快照不变。
  - **D-07 前缀误认直读**：`script-editor-projection.ts:95-106` 按 `item:${itemId}:` 前缀猜私有；
    `main.ts:5393` 按 `startsWith('item:')` 分流 runItemPrivateScript；`item-use-executor.ts:46-51`
    精确串匹配 `item:${itemId}:use`。合法共享 ID 无保留前缀约束（`author-script-core.ts:1122`
    仅 nonEmptyString），故 `item:collision-item:use` 过 loader 后被保存门当私有、运行时被误路由——
    探针三点（collision-item/other/普通 shared）均复现，runtime 见证如实标注仅 host 路由。
  - **保存校验误读 chunk/id 直读**：`validate-refs.ts:1565-1572` 对 runScript 读
    `effect.script.chunk/.id`，而 canonical 作者效果按 `author-item-core.ts:12` 携纯 ScriptId
    字符串——`shared/plain` 报「共享脚本 "undefined" 不在脚本库」，探针复现。
  - **复制同族直读/复跑**：复制只在主会话加 shell，canonical 仅有源记录；保存报
    `item:private-source:use` 不在脚本库。确属同一生命周期，不能只修新建按钮。
  - **设计同意**：① 成对记录复用既有 Coordinator（D-01 原子配对，不建第三 undo），无协调器的
    生产写入口先显式拒绝，caller census 归 GLM G1——方向正确；② 身份由独立固定 chunk tag
    承载、id 存原始 ItemId，不解析用户 ID、不加保留前缀、不加持久化字段——内存投影不改格式
    有直读依据：`mergeCurrentItemShell:132-134` 保存合并把共享 ref 还原为纯字符串，证明
    runtime ref 仅内存态，content20/SAVE8/作者 JSON 不动；③ 引用校验按调用域消费正确表面、
    不塞假 scriptChunks，旧分片分支须 G3 证明无真实 caller 才退役，不借本卡批量删旧工具；
    ④ 缺私有 body/坏引用/外部冲突保护不降低，未知 tag/错误 owner fail-closed；
    ⑤ 验收矩阵要求真实 executor→runtime 业务结果，不以 spy 路由闭环——正确补足当前证据边界。
  - **可证伪观察**（任一成立即收窄或 counter）：① G1 发现无协调器生产写入口且实现静默跳过
    而非显式拒绝；② G3 证明旧 chunk/id 分支仍有真实当前 caller 而方案硬删；③ 新 tag 被要求
    写入持久 JSON 或改动 content20/SAVE8/作者格式（卡 :89 约定停 draft）；④ 复制正文不从当前
    合并作者态取（含未保存编辑）而取磁盘/旧 canonical；⑤ 实施验收仍只断言 host 路由 spy、
    无真实 executor→runtime 业务结果；⑥ shared 与 private 同文本（物品 X 引用共享 `item:X:use`）
    仍混淆；⑦ 删除重建同 ID 接回旧私有 body。
  - 返工项：无。边界声明：运行时现有证据仅 host 路由见证，实施后的真实 executor/runtime
    结果测试是终审闭环的必要条件，不在本签豁免。
- GLM：**premise verified / design agree（2026-09-20，冻结 1e0388b0；全部锚点本人直读一手源码，未读 Codex 探针输出/Kimi 结论；G1～G5 取证见 [item-authoring-glm-audit.md](../../testing/item-authoring-glm-audit.md)）**。
  - **前提四向本人复证（静态一手）**：① D-06——`ItemTab.tsx:1072-1084` 新建/复制仅 `session.dispatch(AddItemCommand)` 主会话，`script-editor.ts:2022-2023` AddItemPrivateScriptCommand 要求 canonical item 存在否则 `物品不存在`；② D-07 碰撞——`script-editor-projection.ts:95-106`/`ItemTab.tsx:1139-1143`/`ItemUseEffectEditor.tsx:883-886` 三处 `startsWith('item:<id>:')` 猜私有，`main.ts:5393-5395` `startsWith('item:')`+`split(':')` 路由，`item-use-executor.ts:46-55` 全等判定；`author-script-core.ts:1122` 共享 ID 仅 nonEmptyString **无保留前缀**，loader 合法接受 `item:*`；③ 第三根因——`App.tsx:2154` 保存走 merge（`mergeCurrentItemShell:131-133` 把共享 ref 转纯字符串）→`assertProjectSaveValid`→`validate-refs.ts:1565-1572` 读 `effect.script.chunk/.id`（字符串上均 undefined）→「共享脚本 "undefined"」；④ 复制——`cloneItemForAuthoring`（item-authoring.ts:37-43）structuredClone 保源私有 ref，副本投影/保存/runtime 三面全部错向。
  - **G3 供给普查**：scriptChunks 生产侧恒 `{}`（project-io.ts:84 默认、open-local.ts:90；无真实 chunk 装配器）——item-runScript 旧 chunk/id 分支无当前生产 caller，方案 3「退役旧表面、按 ScriptId 对 sharedScripts 核验」有据；诊断域（project-diagnostics.ts:676-692）同样喂字符串形态，静态推断实时诊断亦报 undefined（未动态跑，列为实施回归项）。
  - **design agree**：方案 1 与本人 census 一致（生产 caller 唯 ItemTab 三入口+私有脚本配对，P01-P20 已证 Coordinator 协议）；方案 2 显式 chunk tag+id=ItemId 把区分维度从 id 前缀移到 chunk，本人 sweep 的前缀猜身份全量 6 站点与方案声称的同步更新面**逐一对上无遗漏**，canonical 持久形态不变；方案 4 保留缺私有 body fail-closed（script-editor-projection.ts:213-220）与引用阻断守卫。
  - **可证伪观察**：① 若存在喂真实 scriptChunks 的当前生产 caller 或第 7 个前缀猜身份站点→方案 2/3 覆盖面破产（本人 sweep 为空）；② 若诊断域实测不报 undefined→本人 G3 静态推断错，须改判；③ 实施后 `item:<id>:use` 形共享 ID 在 UI/投影/runtime/executor 四面仍被当私有→方案 2 无效。
  - 非阻断备注（报告已列）：冒号 ItemId 纳入验收矩阵显式用例；复制后 runtime 路由到源私有脚本的语义串用建议入负控；诊断/保存两处报错面同时钉回归。
- 非Coding Owner独立primary-source反证：**已满足**。Kimi `6939a1ac`独立直读并复跑当前探针；GLM `4d4e9a5d`给出独立静态一手锚点。两席原文均保留，统计口径校注见Codex后续核定，不把静态读取计为动态复现。
- build准入：**build allowed（Codex，2026-09-20）**；三席同r1齐，独立primary-source证据成立，无counter、无缺签豁免。计数/静态证据校注见顶部，不以概括性站点表代替全域实施。

### done前

- Codex：**accept（实现者自验，2026-09-21，同候选451cbbb7）**。配对创建/复制/删除复用现有原子历史；固定tag+原始owner无前缀解析；canonical共享校验与当前运行态guard同步，content20/SAVE8/作者JSON不变。完整check7909项exit0、五对照+五业务负控exit0、官方ratchet与以9e220daa保护的单次strict-fast7418项exit0；未改include/exclude/超时/阈值。首次失败、范围变化及旧测试适配完整披露于[实施记录](../../testing/item-authoring-implementation.md)。实际浏览器新建后即时编写、复制独立编辑；Chrome原生选择专用临时目录→保存committed→reload/最近项目重开，源200ms/副本375ms均核，原生保存验证完成。GLM仅此前静态取证贡献，非本次实现或自验独立证明。原前提探针零改；full/Q1/Q2未跑。本席不代签，不标done。
- Kimi：pending（独立实现审查，候选451cbbb7）。
- GLM：**accept（2026-09-21，独立代码/矩阵复核，候选 451cbbb7 对比 1e0388b0；未读 Kimi 本轮结论，未做视觉）**。
  本席独立复跑与直读证据：
  - **五组负控本席复跑 rc=0**：`item-authoring-mutants.mjs` 5 对照 PASS + 5 针（missing-canonical-create/
    copied-source-owner/shared-prefix-misroute/shared-chunk-validation/missing-body-save-guard）全部 exit1
    钉名候选 AssertionError；产品 hash 前后不变。五针正中本人 r1 审计的 D-06/复制串用/D-07 误路由/校验错面/
    缺正文保真。
  - **前缀猜身份全清（最终树 sweep）**：`startsWith('item:'`/`split(':')`/`item:${…}` 模板在
    editor/reforge/content/migrate 生产源零命中——本人 r1 审计的 6 站点+Codex 补查的 content
    validate.ts 第 7 站全部改为 chunk-tag 判定（`item-script-runtime-ref.ts` 固定 tag+原始 ItemId；
    validate.ts isItemPrivateRuntimeEffect 改 `isRuntimeItemPrivateScriptRef`+owner 全等）。
  - **配对实现直读**：`script-editor.ts` 新增 AddItemDefinitionCommand/DeleteItemDefinitionCommand；
    ItemTab 新建/复制/删除均 `assertSessions`+coordinator 配对派发、缺协调器零写入；删除保留
    ItemInUseError 引用守卫；复制 `mergeCurrentItemShell(source, canonical, true)` 取未保存正文且
    缺 body 显式拒绝、`projectItemsView` 生成副本 shell ref。
  - **fail-closed 直读**：投影 owner 不符 throw（`私有脚本 owner 不符`）、未知 chunk throw、
    runtime `runWorldItemScript` 对当前物品 owner 全等（副本串用不再静默跑源脚本而是执行前拒绝）。
  - **G3 修复直读**：`ContentBundle.items` 收紧为 AuthorItemCore/AuthorItemData；item-runScript 按
    `Object.hasOwn(sharedScripts, effect.script)` 核验、报错带**原 ID**；旧 chunk/id 分支退役；
    sprite collector 独立类型化保留迁移瞬态 ItemData 真实 caller。
  - **14 新测试逐一对上（1+5+6+2）**：identity 5 项含参数化「异 owner/未知 tag 执行前拒绝」与
    「同文本共享/私有永不混同」「冒号+非 ASCII ItemId 字节保真」；executor 用例先过
    `validateAuthorItems` 正式 guard，真实 projectItemsView/buildWorld/ScriptProjectRuntime/
    executeWorldItemUse 链，断言**业务可观察**（正确旗标置位、另一旗标 undefined、物品消耗、
    静态定义深等不变）；workflows 6 项观察者断言在**回调外**（快照收集后比较）、真实
    authorize/write/save-state committed/loader 重开、三种共享 ID（plain/同前缀/他前缀）诊断零报+
    序列化重开、缺 ID 在保存与诊断**两处**均 verbatim 报原 ID——本人 r1 三条非阻断备注（冒号入矩阵/
    复制 runtime 串用入负控/两处报错面同钉）全部落实。
  - **旧测试适配**：仅 ref 形态换新 tag+ItemId、配对 caller census 7→10，业务断言未删。
  - **定向复跑全绿**：content 140、reforge 26（identity 5+executor+view）、editor 63
    （workflows 6+ItemTab 28+P01-P20+投影两件）。
  - 统一 check7909/ratchet/受保护 strict7418 为 Codex 证据，本席不复述为自验。原生保存视觉归 Codex。
  - 本人 r1 可证伪观察逐条落空（无第 8 站点、诊断已报原 ID、同文本不再误判）。无 counter。
- done准入：**尚未满足**（等待 Kimi 独立实现审查与用户验收）；r1设计签字不代替done前签字。

## 下一位Agent提示词

### GLM（实现矩阵复核，与Kimi并行）

```text
在 /Users/zhangxu/illegal/type-pal 复核 EDITOR-ITEM-AUTHORING-1，任务卡 docs/ops/tasks/EDITOR-ITEM-AUTHORING-1-item-script-identity.md，review/r1，统一候选451cbbb7（对比1e0388b0），设计不重签。先同步main并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/item-authoring-implementation.md及最新交接。
独立读实现，不复述Kimi结论：核14新增测试、原断言保留与ref适配；重点新建/复制/删除两会话、未保存混合效果/正文、失败保留redo、共享普通/同前缀/他前缀ID、实际executor→runtime、诊断与真实writer/loader。你的旧“完整6站点”已被Codex补查（含content validate.ts），按最终树重核，不沿用旧计数。真实fixture/被消费对象/原子观察者断言在回调外/负控鉴别力都要查。
复跑 node docs/testing/item-authoring-mutants.mjs（5对照绿+5精确候选AssertionError红）及相关定向；统一check7909、ratchet、受保护单次strict7418由Codex已跑，不并发重跑全仓覆盖率。只做代码/文本，不操作浏览器；原生保存视觉证据见实施记录。
只在卡内本人done前席位与本人交接日志写accept或带file:line/反例的counter，提交推送；落盘前同步保留并行他席改动。不得改产品/正式测试/基线/他席/状态，不代签、不标done；TB00/TB01仍按各自窄counter另行返工，不在本卡偷偷集成。
```

### Kimi（独立实现审查，与GLM并行）

```text
在 /Users/zhangxu/illegal/type-pal 独立审 EDITOR-ITEM-AUTHORING-1，任务卡 docs/ops/tasks/EDITOR-ITEM-AUTHORING-1-item-script-identity.md，review/r1，统一候选451cbbb7（对比1e0388b0），设计不重签。先同步main并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/item-authoring-implementation.md及最新交接，不读或复述GLM本轮结论。
重点压力测试：成对创建/复制/删除的通知/失败/undo/redo；复制从当前字段+未保存正文取值；共享和私有用显式tag，不解析用户ID；错误owner/未知tag/缺正文fail-closed；ContentBundle与EditorState的不同内存表面；迁移sprite collector真实中间态caller未被误删；main仍走原detached/取消协议。核作者JSON/content20/SAVE8/投掷边界不变，真实executor→runtime业务旗标与原生目录保存重开证据。
可复跑 node docs/testing/item-authoring-mutants.mjs（5对照+5业务红）与定向测试；原item-authoring-premise.mjs只证修复前现状、零改，不应在新树期待通过。Codex统一check7909/ratchet/受保护单次strict7418已过，不并发争用全仓覆盖率；不重复已有视觉流程。
在本人done前席位与本人交接日志签accept或带file:line/最小反例counter并提交推送；落盘前同步保留GLM并行改动。不得改产品/正式测试/基线/他席/状态，不代签、不标done；两席齐后由Codex核阶段门。
```

## 交接日志

- 2026-09-21 GLM：完成 451cbbb7 独立代码/矩阵复核并签 done 前 accept（证据见本席签字）：
  五组负控复跑 5+5 全绿（产品 hash 不变）；最终树 sweep 证实前缀猜身份 7 站点全清（本人
  r1 的 6 站+Codex 补查第 7 站均改 chunk-tag）；配对命令/复制保真/fail-closed/校验表面修复
  逐一直读；14 新测试逐项对上（executor 业务可观察断言、观察者回调外、真实 writer/loader、
  三种共享 ID+verbatim 报错）；定向 content 140/reforge 26/editor 63 复跑绿。本人 r1 三条
  非阻断备注全部落实、可证伪观察逐条落空。未读 Kimi 本轮结论、未做视觉、未改产品/测试/
  基线/状态，不代签、不标 done。

- 2026-09-21 Codex：候选451cbbb7已实施并统一验证，转review。完整check7909；官方ratchet只升不降；保护9e220daa的单次strict7418与新基线完全一致。原生Chrome专用目录保存/重开闭环，截图由工具回传。用户明确6010未保存模拟器配置只是测试数据、可丢弃并合入；不把该许可扩张为真实工程清理授权。独立实施worktree完成后统一合主线；两席并行终审提示词已更新。本席实现者accept，不代签、不done；TB00/TB01待接收不随本卡消失。

- 2026-09-20 Codex：已核Kimi `6939a1ac`同r1/冻结1e0388b0的独立前提与设计签，非Owner一手证据要求已满足；GLM待回，build门仍关闭。并行接收350da702/ccc67dcc后仅留旧测试包的窄残项，见各卡当前counter；不影响本卡设计，也不修改本卡生产面。

- 2026-09-20 Kimi（r1 独立前提/设计压力测试）：签 premise verified / design agree，无返工项。
  直读 D-06 两会话（ItemTab.tsx:1073-1083 仅主会话 AddItemCommand、script-editor.ts:2026
  缺 canonical 即抛）、D-07 前缀三处（projection:95-106 猜私有、main.ts:5393 startsWith 分流、
  item-use-executor.ts:46-51 串匹配）与 chunk/id 误读（validate-refs.ts:1565-1572 对纯字符串
  作者 ID 取 .chunk/.id）；复跑 item-authoring-premise.mjs 五点全复现（含复制同族与重开正控）。
  设计核：成对记录复用 Coordinator 原子配对；身份由独立 chunk tag 承载、id 存原始 ItemId，
  不碰持久格式（merge:132-134 证明 runtime ref 仅内存态）；引用校验按调用域消费正确表面，
  旧分片分支待 G3 caller 证明再退役；缺正文 fail-closed 不松。七条可证伪观察入席。
  运行时证据仅 host 路由，实施后真实 executor/runtime 结果测试为终审必要条件。
  未读 GLM 结论，未改产品/正式测试/他席/状态，不标 build/done。
  Next：三席齐后 Codex 核 build 准入。
- 2026-09-20 GLM：在独立分支/worktree（codex/glm-item-authoring-audit）完成 G1～G5 只读取证
  并签 r1 premise verified / design agree（证据与可证伪观察见本席签字与
  [item-authoring-glm-audit.md](../../testing/item-authoring-glm-audit.md)）：生产 caller 普查唯一
  ItemTab；前缀猜身份全量 6 站点；validateReferences 三生产输入全喂错形态且 scriptChunks 生产
  恒空；复制/碰撞/冒号矩阵逐条落地；旧测试按 P01-P20/TB07 复制/投影测试去重。只写白名单
  报告+README 索引+本席签字与日志，未改产品/正式测试/基线，未运行探针（静态一手源码），
  未读 Kimi 结论，不代签、不标 build/done。非阻断备注三条已落报告。

- 2026-09-20 Codex：按用户要求继续；在独立worktree完成当前内存前提探针，发现D-07普通共享引用也因旧分片式校验失败，复制私有脚本亦未注册/重投影。原假定正控与工具问题均据实修正；未改生产/正式测试/基线。GLM做G1～G5只读包，Kimi并行审设计；签齐前不实施。
