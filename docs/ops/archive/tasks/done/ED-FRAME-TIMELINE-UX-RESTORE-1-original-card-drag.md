# ED-FRAME-TIMELINE-UX-RESTORE-1 - 帧动画原始卡片拖拽形态恢复

Status: done
Phase: phase2
Capability: Editor frame-animation authoring UX（不改变内容schema/capability-map）
Coding Owner: Codex
Reviewer: User（Kimi + GLM由用户明确豁免）
Risk: 高（撤回一项正式reorder adoption并新增有界native-drag例外；用户明确豁免本卡外部签字）
Supersedes: `ED-ACTION-GROUP-ADOPTION-2`
Co-closes: `ED-FRAME-TIMELINE-VIRTUALIZATION-1`
Target Design-System Version: `2.22.0`（用户批准的有界例外，不提升为公共可复用合同）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是帧动画时间线恢复原始形态的历史功能卡（2026-09-01 用户"改回原来的，现在太丑了"）：以 c799cb35^ 一手代码为准恢复 72×76 帧卡/78px 步距/86px track/仅挂载可见帧/整卡 native drag（无 grip 无移动按钮），同时保留稳定 frame.id/多选/anchor/draft history/唯一保存命令；supersede ADOPTION-2 并 co-close VIRTUALIZATION-1 债。

## 目标

恢复用户认可的旧视觉与交互而不丢当前改进：不得只隐藏新控件留 102×122 空壳，不改资源格式/播放/导入/选择/保存流程。

## 范围

- 范围内：FrameThumbnail 恢复单一 DsPressable.fa-frame（draggable/选择/可见帧 canvas/帧号）；移除该面 DsReorderCollection/useDsReorderKeys；显式 allowlist 记录用户批准的 native card reorder 例外。
- 范围外：设计系统公共合同变更；资源 codec/schema；410 帧全挂 DOM 债的另案处理。

## 前提与证据

四向矩阵以 git show c799cb35^ 为旧形态一手证据；"只删按钮即可"替代解释不成立（卡尺寸/步距/track/全量 DOM 正是为公共 rail 扩大，只删按钮既非原始形态也不关 410 帧债）。
- 当前状态：done（历史终态）

## 验收

原卡按用户裁决收口（实现与验收细节见卡内与设计系统 registry 的例外登记）。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

该例外不提升为公共可复用合同（Target Design-System Version 限定）。本页治理不重开。

## 历史范围

2026-09-01 用户裁决、实现与收口；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：原始卡片拖拽形态恢复经用户裁决收口，native-drag 有界例外登记于 2.22.0。原卡全文在下方 quote 保全。

## 当时证据

c799cb35^ 旧形态代码、editor.css:8244-8287、真实 route 矩形记录。本页治理未新增执行。

## 当前有效性

historical。时间线现行形态以当前编辑器代码为准。

## 继任文档

被替代卡 cancelled/ED-ACTION-GROUP-ADOPTION-2 与 cancelled/ED-FRAME-TIMELINE-VIRTUALIZATION-1。

## 原文保全

固定源 revision `a56963e9482fa2f8648b13e2729bef67a13c477f`，source SHA `a621a4a3f6137615d6c5d41f081604e0204e1e44f1cec6c7365f28eab8cd9c02`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # ED-FRAME-TIMELINE-UX-RESTORE-1 - 帧动画原始卡片拖拽形态恢复
>
> Status: done
> Phase: phase2
> Capability: Editor frame-animation authoring UX（不改变内容schema/capability-map）
> Coding Owner: Codex
> Reviewer: User（Kimi + GLM由用户明确豁免）
> Risk: 高（撤回一项正式reorder adoption并新增有界native-drag例外；用户明确豁免本卡外部签字）
> Supersedes: `ED-ACTION-GROUP-ADOPTION-2`
> Co-closes: `ED-FRAME-TIMELINE-VIRTUALIZATION-1`
> Target Design-System Version: `2.22.0`（用户批准的有界例外，不提升为公共可复用合同）
>
> ## 用户裁决
>
> 2026-09-01 用户明确：“帧动画时间线改回原来的，现在太丑了。”本卡中的“原来”以
> `c799cb35^` 一手代码为准：72×76帧卡、78px步距、86px track、只挂载可见帧、整张帧卡同时承担选择与
> native drag；没有独立grip，也没有左右移动按钮。
>
> ## 目标
>
> 恢复上述原始视觉与交互，同时保留当前已经改进的稳定`frame.id`、多选集合、selection anchor、
> FrameAnimationDraftHistory及唯一保存命令。不得只隐藏新控件而保留102×122空壳，也不得顺手改变资源格式、
> 播放、导入、选择或保存流程。
>
> ## 前提真值门
>
> ### 四向矩阵
>
> | 维度 | 结论 | 一手证据 |
> |---|---|---|
> | 原版 / primary source | N/A：二阶段作者工具，不涉及游戏原版。 | `READ-FIRST.md:8-20` |
> | 第一阶段 | N/A：一阶段无当前帧动画作者器。 | `CLAUDE.md:5-12` |
> | 用户认可的旧形态 | 72×76卡、stride78、track86、visible window、整卡draggable、无grip/箭头。 | `git show c799cb35^:packages/editor/src/ui/FrameAnimationEditor.tsx`；同commit parent的`editor.css:8244-8287` |
> | 当前形态 | `c799cb35` 改为102×122卡、stride108、全部frame DOM、公共overlay grip与两枚move button；1280×720下动作只露约6px。 | `FrameAnimationEditor.tsx:82,138-159,616-626,875-950`；`editor.css:7886-8081`；真实route矩形记录 |
> | 本任务目标 | 恢复旧形态；保留当前稳定identity/selection/history；用显式allowlist记录用户批准的native card reorder例外。 | 本卡设计/验收；用户裁决已批准 |
>
> ### 替代解释与可证伪
>
> - 最强替代解释：“只删左右按钮和grip即可”。不成立：当前卡尺寸、步距、track与全量DOM正是为公共rail扩大的；
>   只删按钮仍不是用户要求的原始形态，也不会关闭410帧全挂DOM债。
> - 可推翻观察：若`c799cb35^`并非72×76/78/86/visible/native drag，或用户明确只要求删按钮而保留大卡，
>   则本前提失效。目前两者均不成立。
>
> ## 设计方案
>
> 1. `FrameThumbnail`恢复为单一`DsPressable.fa-frame`：自身带`style.left`、`draggable`、选择pressed、
>    可见帧canvas与帧号；删除`.fa-frame-position/.fa-frame-select/.fa-frame-placeholder/.fa-frame-actions`
>    及两枚move button。
> 2. 移除该面的`DsReorderCollection/DsReorderItem/useDsReorderKeys`；以有界`dragFrameId`记录当前可见来源，
>    drop时重新按稳定frame.id查fromIndex，再调用`moveDraftFrame`并提交恰一条本地draft history。
> 3. drop后用当前`frameSelectionAfterReorder`按来源frame.id重算selected ids、active index和anchor；不退回
>    旧代码仅按显示index选中的身份弱化。
> 4. 渲染从`draft.frames.map + placeholder`恢复为旧精确窗口：
>    `start=max(0,floor(scrollLeft/78)-3)`、`end=min(total,ceil((scrollLeft+clientWidth)/78)+3)`，只对
>    `[start,end)`挂DOM。通用上界为`ceil(clientWidth/78)+7`（非78倍数滚动会比+6多1），410帧不得全挂。
> 5. CSS恢复`.fa-track=86px`、`.fa-frame=72×76`、两轨56/16、canvas64×54；`TIMELINE_ITEM_WIDTH=78`；
>    保留现有shell126/118，因为86px track在当前95/87px timeline内可见。
> 6. reorder registry移除`frame-animation` family/adoption，冻结
>    **17 families / 28 adoptions / 31 data paths / 19 interaction owner files**。
> 7. `reorder-allowlist.json` v1新增唯一`native-draggable-reorder`例外（总计12 entries / 8 rule kinds），
>    owner指向本卡；`draggable={!busy}`、DataTransfer move payload、稳定frame.id/local history、删除条件与
>    stale/重复/未登记负例齐。该pointer-only/touch/keyboard偏离是用户批准的有界例外，不是推荐pattern，
>    不升DS版本。
> 8. action-group registry删除帧候选及两枚raw move，冻结
>    **10 groups / 44 moves / 20 adopted / 24 raw / 12 candidates（1 equivalent +11 deferred +0 N/A）**。
> 9. 同版更新DS-C.2a census为“10组/20 adopted；其余24枚/12 candidates”；更新DS-C.4d为
>    **17 families / 28 adoptions /31 paths /19 owner files**，并明确本面是用户批准、evidence-bound的
>    `native-draggable-reorder`例外；boundary必须拒绝例外扩散和旧census回流。
>
> ## 验收条件
>
> - 视觉：真实`frame-animation.pal.000`在1280/900/720与窗口高720/600/480，帧卡72×76、stride78、
>   track86；无`.ds-reorder-handle`、无move button、无`.fa-frame-actions`；首/中/末完整可见且横滚正常。
> - 交互：点击选择、Shift范围、Cmd/Ctrl增减选择不变；dragStart写真实DataTransfer move payload；
>   从可见帧拖到可见目标恰一条draft history；同项drop、dragEnd/cancel零history并清source ref；busy时不可拖；
>   undo/redo恢复frame.id顺序与selection/anchor；EditSession dispatch/historyVersion仍0；Safari/Firefox
>   DataTransfer至少以兼容fixture验证。
> - 性能：1/3/64/410帧逐档，在78倍数与非对齐scrollLeft都按精确start/end公式挂载，通用上界
>   `ceil(clientWidth/78)+7`；滚动后回收旧卡并载入新卡，canvas只为可见卡解码。
> - a11y：每张帧卡仍是有`第N帧`名称和pressed状态的native button；用户批准本面不提供额外grip/移动按钮，
>   因而不具公共reorder的键盘/touch排序路径；该风险必须明示，并由唯一allowlist与任务卡约束，不扩散到其它面。
> - 门禁：reorder17/28/31/19、action-group10/44/20/24/12精确；allowlist唯一新例外；DS-C.2a/C.4d
>   census与例外边界同步；其它28 reorder adoptions及12 action candidates生产零diff；旧102/122/108/132、
>   frame action wrapper与全量map回流必红。
> - 测试：frame draft + FrameAnimationEditor drag/selection/undo、reorder/action-group adoption与boundary、
>   typecheck、design-system gate；受影响包全量一次。真实200%无法触发时诚实记录。
>
> ## 实现与验证证据
>
> - 实现：`FrameAnimationEditor.tsx`恢复单一`DsPressable.fa-frame`整卡native drag，按稳定`frame.id`
>   生成/校验DataTransfer payload并在drop时重新定位；删除公共reorder wrapper、grip、左右移动按钮及旧
>   placeholder/action壳；保留selection/history/save owner。
> - 几何与窗口：`TIMELINE_ITEM_WIDTH=78`、`.fa-track=86px`、`.fa-frame=72×76`；渲染改为精确
>   `[visibleStart,visibleEnd)`。410帧测试在600px timeline首屏挂11卡，非对齐滚动挂15卡，仅解码0..21，
>   未全量挂载/解码。
> - 失败路径：同项、空/损坏payload、错asset、错frameId、外部drop、dragEnd后迟到drop与busy均零draft
>   history；busy时`draggable=false`且dragover不宣告可投放；合法drop恰一条本地history，undo/redo按稳定
>   identity对称，`EditSession.dispatch/historyVersion`保持0。
> - 治理：reorder冻结17/28/31/19；action-group冻结10/44/20/24/12；allowlist为12 entries / 8 rules，
>   仅追加本卡`native-draggable-reorder`。脚本复算证明其余28项reorder、其余12项action candidate及原11条
>   allowlist逐项零diff；text-overflow registry同步帧号新selector。
> - 自动化：
>   - `audit:design-system`：91 files，2个evidence-bound exceptions，通过；
>   - 聚焦：7 files / 105 tests，通过；`typecheck`通过；
>   - editor全量首次并发仅`text-overflow`门禁超过30s（同项聚焦已通过）；随后
>     `vitest run --passWithNoTests --maxWorkers=1`为184 files / 1523 tests全绿；Vite production build通过。
>   - repo全量`pnpm lint`仍被本卡范围外的既存content格式/回调规则等320项阻塞；本卡未顺手修改。当前
>     `FrameAnimationEditor`剩余的preview-stage a11y与effect依赖4项同样为既存债，不属于本次时间线恢复。
> - 真实页面：`frame-animation.pal.000`在1280×720、900×600、720×480分别挂14/9/7卡；三档均实测
>   72×76、stride78、track86、`draggable=true`、grip=0、action wrapper=0。720窄档滚到中段挂第28..37帧，
>   滚到末端挂第58..64帧，末帧右边界438px小于timeline右边界444px，完整可见。浏览器未提供Firefox/
>   Safari原生DnD环境，DataTransfer兼容性由同一Map-backed fixture覆盖，未冒充跨浏览器实拖。
>
> ## 推进签字
>
> ### 进入 build 前
>
> - Codex:
>   - premise: **verified（2026-09-01）**——直接对比`c799cb35^`、当前生产diff/registry与真实页面，确认
>     原始形态、越界新增按钮和当前裁切/全量DOM均来自该提交。
>   - design: **agree（2026-09-01）**——恢复旧视觉/visible/native drag，同时保留当前稳定identity与
>     selection/history；以单一显式例外收口，不伪装成公共推荐pattern。
> - Kimi: **waived（2026-09-01，用户明确豁免本还原任务三签）**
> - GLM: **waived（2026-09-01，用户明确豁免本还原任务三签）**
> - 用户裁决: **approved（2026-09-01，恢复原来的帧时间线）**
> - 缺签豁免: **approved（2026-09-01）**——用户明确“帧时间线恢复任务别再麻烦Kimi和GLM三签；
>   不是新内容，只是还原”。豁免本卡build前与done前三方外部签字，Codex仍须完整自测并交用户验收。
> - build准入: **allowed（用户缺签豁免 + Codex premise/design + 用户恢复裁决齐；Codex开工）**
>
> ### 进入 done 前
>
> - Codex: **accept（2026-09-01）**——实现、失败路径、410帧窗口、治理门禁、typecheck、editor全量1523项
>   与真实PAL三档几何/首中末横滚均复核通过；无schema/save/capability变化。
> - Kimi: **waived（用户批准本卡done前审查豁免）**
> - GLM: **waived（用户批准本卡done前审查豁免）**
> - 用户验收: **accept（2026-09-01，“验收通过”）**
> - done准入: **allowed（Codex自验 + 用户验收齐；Kimi/GLM由用户明确豁免）**
>
> ## 交接日志
>
> - 2026-09-01 User: 真实页面验收通过；本卡转done并收口，无后续Agent交接。
> - 2026-09-01 Codex: 恢复72×76/78/86整卡native drag与visible-only window；移除grip/move，保留稳定
>   identity/selection/local history。门禁、105聚焦、1523全量与三档真实页面通过；转review，仅待用户验收。
> - 2026-09-01 User + Codex: 用户明确豁免本还原任务Kimi/GLM三签；卡转build，Codex为唯一Coding Owner。
>   Next: 完整还原、自测并转review，只交用户验收。
> - 2026-09-01 Codex: 用户指出帧时间线不应新增独立grip/move，核历史确认move button为Codex越界推演；
>   ADOPTION-2取消，改开本恢复卡。未修改实现。Next: Kimi/GLM独立设计审签。
>
> ## 下一位 Agent 提示词
>
> ```text
> 无下一位 Agent 提示词；用户已豁免本还原任务Kimi/GLM三签，由Codex实现、自测后等待用户验收。
> ```
<!-- original-source-quote:end -->
