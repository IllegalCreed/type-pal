# TEST-CODEX-FRAME-EDITOR-1 — 当前帧动画编辑五组工作流

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `cddbd73c682e3264e5d981ba84affab894986be4` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `cddbd73c682e3264e5d981ba84affab894986be4`；本轮为 2026-10-17 R43。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `e1e123e395bc148fa95e44c31daaeb4c41f6ad85af4ad6239cc18344c92c9e28`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-CODEX-FRAME-EDITOR-1 — 当前帧动画编辑五组工作流
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（真实DOM与RGBA交付合同；宿主几何是显式夹具，不宣称浏览器布局验收）
>
> ## 当前验收结论（2026-09-28）
>
> Codex按用户恢复和业务缺陷修复授权完成六文件33项回归，包含原五组及异步归属修复。
> 真实帧编辑功能原已存在，本次修复旧异步操作跨源写回、保存丢新名称、忙时草稿丢失及坏帧无提示/未处理异常。
> 新测与相邻19文件90/90；十绿对照+十针均以钉名业务AssertionError检出。
> 修复后完整check10,176、官方ratchet与保护e8710f87的单次strict-fast9,715/730生产文件串行通过；
> editor TC零诊断、全仓lint2,391文件error/warning/info全零，文档与差异检查通过。
> FrameAnimationEditor B266/324、L432/445、F105/109；全仓B47,637/63,361=75.18%。
> 本次产品修复新增38分支分母，覆盖分子净增148，不冒充纯补测收益。无格式/资产/旧测试变更。
> Codex独立核定review→done，证据及前后红绿见[最终回执](../../../../testing/archive/legacy/batches/codex-frame-editor/README.md)。
> 不需另席或用户手工复审；无下一位Agent提示词。布局像素/剧情/音轨/full/Q1/Q2为本卡范围外。
>
> ## 历史准入与暂停记录
>
> 2026-09-28最新用户授权：完成编辑器测试分支。Codex恢复本卡 build，沿用五组范围，
> 补齐实际组件工作流、代表反控及统一质量门后合入main、推送并清理分支；以下暂停记录为历史。
>
> 同日用户补充授权：测试发现的业务错误/不合理实现一并修复。Codex已在当前产品上直接复现：
> 异步量化切源后将新资源2帧覆写为旧资源3帧；保存最后hash等待中切源/卸载后仍新增会话历史；
> 保存中编辑控件仍可继续修改草稿；坏TPFS payload引发三个未处理缩略图拒绝，空Error.message又隐去提示。
> 红日志`/tmp/codex-frame-editor-business-red.log`：5项所有权业务断言红+1项解码提示红/3未处理异常。
> 根因锚点为FrameAnimationEditor的importImages/quantizeFrames/save异步尾部及FrameThumbnail读取，
> 真实入口为CutsceneTab:359-375/969-977的切换与“放弃并继续”。目标：放弃后的结果零写回、
> 当前操作期间锁定草稿写操作，损坏帧显式提示且可切源恢复。原版/第一阶段N/A，TPFS格式和资源命令不变；
> 最强替代解释“父层禁止切换”已被上述父层入口及实际切源反例推翻。将本组件、
> `FrameAnimationEditor.async-ownership.test.tsx`加入本卡白名单，Codex继续单一实现Owner。
> 追加真实反例：保存压缩期间通过当前UpdateAssetLabelCommand改名，保存闭包的旧record会把新名称覆盖。
> `/tmp/codex-frame-editor-label-red.log`精确名称断言红；保存改从当前reader读取同revision最新record，
> 保留期间独立元数据编辑及撤销边界。
>
> 2026-09-27用户优先级调整：本批暂停实施。已有未完成测试/fixture留在主工作树，不提交正式测试、
> 不计覆盖、不删除；Codex转[E2E讨论](../../../tasks/E2E-R4-1-route-and-checkpoint-foundation.md)。
> 当时Status保留build表示未完成；暂停现已由2026-09-28恢复授权替代。
>
> 2026-09-28用户要求清理未跟踪文件后，Codex核两份帧编辑 WIP 的真实用途与相互依赖：
> `FrameAnimationEditor.loading.test.tsx` 五项定向绿，editor typecheck 与两文件 Biome 均零诊断。
> 已将测试及 `ui/__tests__/frame-editor-fixture.ts` 保存于独立分支
> `codex/frame-editor-wip` 的 `45421fdf`（已推远端），主工作树不再残留未跟踪副本。
> 这只是可恢复的中途检查点；其余四组、代表反控及统一质量/覆盖率门未完成，
> 该时点未合main、未计官方fast、未标done；后续已从该分支取回并完成本页顶部验收。
>
> 2026-09-26 Codex build allowed，基点26479604，属于[持续覆盖队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
> 现行消费者CutsceneTab.tsx:713-721渲染FrameAnimationEditor；目标FrameAnimationEditor.tsx。
> 当前官方目标B120/286、L238/412、F58/103。不是把未渲染旧入口转成覆盖。
> 原版/第一阶段N/A：这是新编辑器的数据编辑合同，不裁决剧情表现、玩法或资源格式。
> 最强替代解释为重做已有codec/draft纯函数或reorder三例；本批只从真实组件事件证实际接线和产物，
> 旧重排/虚拟窗口/忙时拖拽保留existing-proof，不作为新增；底层纯函数不复制旧断言。
>
> ## 五组与边界
>
> 1. 正式TPFS载入、元数据、像素交付、失败/换源/卸载生命周期。
> 2. 数值与选帧、复制/删除、本地撤销重做、未保存输入保真。
> 3. 实际播放器定时推进、逐帧时长、循环/暂停/终点与卸载清理。
> 4. 缩放/平移键盘与指针接线，显式几何宿主；不冒称物理布局或截图验收。
> 5. 保存/量化经真实worker降级纯核、UpsertAssetCommand/EditSession、正式TPFS重新解码逐字节核验及错误恢复。
>
> 新增ui/FrameAnimationEditor.{loading,editing,playback,viewport,save,async-ownership}.test.tsx、
> ui/__tests__/frame-editor-fixture.ts、docs/testing/archive/legacy/batches/codex-frame-editor/**；产品仅改本卡已证
> FrameAnimationEditor.tsx异步归属与错误处理，旧测试/其它产品/配置/资产不改。
> 完整合法空白工程经正式loader，TPFS由正式编码器构建，真实reader与EditSession；
> 宿主替身仅补JSDOM的Canvas/ResizeObserver/几何/指针端口，不能mock核心reader/codec/command。
> 实际消费输入深快照，真实session仅保存时改变；异常留可复验红诊断、不修改预期固化bug。
> 整批定向/相邻/TC/Biome及代表单点反控后，统一串行check→ratchet→保护基点单次strict。
> 不等待贡献者，不改其文件；无下一位Agent提示词，Codex独立实施与收口。
<!-- original-source-quote:end -->
