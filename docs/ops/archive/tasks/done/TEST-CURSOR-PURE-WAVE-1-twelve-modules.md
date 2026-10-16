# TEST-CURSOR-PURE-WAVE-1 — 三包十二模块纯逻辑回归

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
- primary source：固定 source revision `d85568172d5530903547770a30c2dab6a2a3dc3a` 与原卡全文。
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
- 原始日期、版本、阶段：源文档固定于 `d85568172d5530903547770a30c2dab6a2a3dc3a`；本轮为 2026-10-17 R44。
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
固定源 revision `d85568172d5530903547770a30c2dab6a2a3dc3a`，source SHA `8e3909d71f8e4e6dd5909ad6e3a9eb19fc39a6590ea1d6dda1daa1e211e03ee9`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-CURSOR-PURE-WAVE-1 — 三包十二模块纯逻辑回归
>
> Status: done
> Owner: Cursor
> Reviewer / Integration Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（纯数据与状态合同；不作视觉验收）
> Production Base: `19b0101ced90fe39acadfa27f9890604753be25b`
> Suggested Branch: `codex/cursor-pure-wave-r1`
>
> ## 目标与准入
>
> 用户要求给 Cursor 一批足量工作。Codex 已核定 **build allowed**：A/B/C 三包各四个生产模块，
> Cursor 在独立工作树连续完成，三个批次分别提交，整包一次性交 Codex 复核。
> 只补当前公开入口上仍有业务价值的确定性回归，产品行为/API/schema/资源字节不改。
> 旧 fast LCOV 的 252 个未命中分支臂仅是选题池，不承诺全部可达或固定覆盖收益；
> 先看旧测试的真实断言，已证即登记 existing-proof，不复制用例凑数字。
>
> [工作包与十二源文件冻结](../../../../testing/archive/legacy/batches/cursor-pure-wave/README.md)给出精确路径、SHA-256、
> 旧套件和业务轴。当前 main 的目标源码已逐文件读到可用公开入口；三包与
> `TEST-GLM-STATE-COMMANDS-1` 的 16 个生产目标交集为零。
>
> ## 三包
>
> | 包 | 包名 | 四个目标 | 要核的合同 |
> |---|---|---|---|
> | A | content | `frame-sequence.ts`、`script-library.ts`、`stamp.ts`、`item.ts` | 合法最小输入经生产编码/校验，边界/失败路径与旁对象保真；先去重现有 content 合同测试 |
> | B | reforge | `dither-transition.ts`、`screen-fx.ts`、`project-map.ts`、`script-chunk-store.ts` | 确定性步进、网格/缓存身份和失败收尾；不用截图来代替状态断言 |
> | C | editor core | `item-references.ts`、`battle-data-references.ts`、`asset-diagnostics.ts`、`stamp-ownership.ts` | 真实合法项目/地图的引用收集与归属；结果按稳定身份和非目标条目逐项比较 |
>
> 本卡的纯测试任务不重新决定原版机制、二阶段视觉或资源文件格式。前提 N/A 的理由是
> 不改变任何玩家可见行为、生产实现或数据格式；涉及可疑现行行为只在批目录隔离诊断，
> 由 Codex 判定修复归属，不能改测试预期将真实缺陷写成正确合同。
>
> 最强反例：旧测试已证该臂、伪造非法 fixture 穿过中间纯函数但在正式保存门前会被拒、
> 只比较实现自身输出或浅快照、提早 mock 掉真正要测的公开函数。
> 每一组测试须以有效正控或守卫自证、同一输入的故障反控与精准非目标断言回应。
>
> ## 所有权和白名单
>
> 只允许：
>
> 1. 十二个目标各自最多新增一个 `*.cursor-boundaries.test.ts`，置于被测源文件同目录。
>    无独立增益时不建新文件，在回执给现有精确测试标题和防重理由。
> 2. 需要共用合法 fixture 时，各包最多一个：`packages/content/src/cursor-pure-fixtures.ts`、
>    `packages/reforge/src/cursor-pure-fixtures.ts`、
>    `packages/editor/src/core/__tests__/cursor-pure-fixtures.ts`。
> 3. `docs/testing/archive/legacy/batches/cursor-pure-wave/{a,b,c,tools}/**`：各批四行账、实际命令/结果、
>    可重建负控和最终树回执。Cursor 可追加本卡自己的交付块，不改 Codex 的准入/验收结论。
>
> 生产源、旧测试、配置、基线、资产、当前 E2E、GLM 十六模块、暂停中的帧编辑 WIP
> 均零触碰。单一 Coding Owner 是 Cursor；此包不操作用户浏览器或当前工程写盘。
>
> ## 交付与验证
>
> - 每批四行：当前公开入口、合法输入/guard、旧测试精确标题、新增测试精确标题或
>   existing-proof/guarded/unreachable/pending、差异断言、反控、命令与 exit。
>   不要求每组强行添例；合同不明则停该组归因，继续其他独立组。
> - 每包选择两处可达单点坏实现作为负控，总计六针。绿正控真实调用目标；坏实现令
>   本包新增测试自身恰一条业务 `AssertionError` 红，核精确文件/fullName、执行命中、
>   原生产源 hash 不变。拒普通错误、timeout、skip/expected-fail 和零执行。
> - 真实输入在调用前深快照，调用后立即比较同一对象；输出核完整业务结果和非空旁对象。
>   A 的二进制从合法生产编码链来；C 的正例项目经当前正式保存门，防御输入另列。
>   不从一个空数组、伪 catalog 或 `as unknown as` 植入所谓合法项目。
> - 每包定向与必要相邻、所属包 typecheck、全部改动文件 Biome 0 error/warning/info；
>   三包末各包全测一次并 `check:docs`。Node agent 进程清除 `NODE_COMPILE_CACHE`。
>   Cursor 不运行或修改全仓 `check`、官方 ratchet、严格 fast；Codex 接收后串行统一执行。
> - 把真实失败/修复、测试数和 SHA 按最终提交树回填。作者自验不替代 Codex 独立复核；
>   不合 main，不标 done，不动本卡状态/看板/任务索引。
>
> ## 上下文锚点与交接
>
> - 开工先读 [`AGENTS.md`](../../../../../AGENTS.md)、[`CLAUDE.md`](../../../../../CLAUDE.md)、
>   [`READ-FIRST`](../../../../phase2/READ-FIRST.md) 与
>   [工作包](../../../../testing/archive/legacy/batches/cursor-pure-wave/README.md)。当前协作模式是贡献者实现、Codex验收，
>   不等待三贤人固定签字。
> - A 类来源：上述四个 content 源文件及同目录既有 `.test.ts`；
>   B 类来源：上述四个 reforge 源文件及旧测；
>   C 类来源：上述四个 editor 源文件、`core/project-diagnostics.ts:823` 保存门、
>   `core/seed.ts:71` 正式空白项目与当前地图/引用 fixture。
> - `TEST-GLM-STATE-COMMANDS-1` 正处 rework，尤其其合法 fixture 的反证在
>   [独立复核](../../../../testing/archive/legacy/batches/glm-state-commands/codex-intake-review.md)。
>   别从它的候选分支复制 fixture 或读成当前 main 产品合同。
> - Codex 复核通过后才合入推送与清理隔离工作树；卡继续 build，done 准入未开放。
>
> ## 当前模式推进记录
>
> - 2026-09-27 Codex：核 12 目标源 hash、旧套件存在、GLM目标零重叠与任务边界；
>   `build allowed`。Cursor 独立分支与实施待交付；Codex 验收 pending。
> - 用户产品裁决 N/A：本包不改变用户可感知行为。
>
> ## Codex 首轮独立接收（2026-09-27）
>
> 候选 `codex/cursor-pure-wave-r1@fd870c877fd2a0ac373e8d0991376e1d6dd654d8`
> 暂签 **counter / rework**，三项直接反证见
> [接收记录](../../../../testing/archive/legacy/batches/cursor-pure-wave/codex-intake-review.md)。八个新增测试定向 4/2/2
> 均绿，抽验 A01/C01 两针为确切业务红，十二目标产品源 hash 与冻结表一致；但
> A01 的 identity 压缩产物不是正式可解码帧序列，A02 的作者脚本错桶被当前完整校验拒绝且
> `getScriptBody` 无生产调用者，B04 的作者脚本落在非派生分片且声明 bytes 与实际不符。
> 这些不是要修改产品以迁就测试；请 Cursor 在自己的分支修正正控和归属，之后交 Codex 复审。
> 本卡不合 main、不标 done，统一全仓/官方覆盖门待接收后执行。
>
> ## Codex 返工接收与收口（2026-09-27）
>
> 候选 `bd8876e40c964c7cb0b270ec20ae6fc16eab1229` 独立复核为 **accept**，
> R1–R3 均闭合，直接证据见 [最终接收](../../../../testing/archive/legacy/batches/cursor-pure-wave/codex-final-review.md)。
> 最终为7项新测试（A3/B2/C2），A02 非法错桶/无当前消费者已撤回，不以其凑覆盖。
> Codex 在隔离集成树复跑定向7/7、三包 typecheck 0、11文件 Biome 0、六针确切业务红；
> 完整 `pnpm check` 9,966项/lint2,309文件零问题，官方 ratchet 与基于 `c442dcb7`
> 的受保护单次 strict-fast 均 exit0。fast 9,505项、730源码文件，分支
> 46,615/63,323；相对接收前46,610/63,321为+5已覆盖臂/+2统计臂。
> 两个测试辅助模块位于卡面允许的 `src/cursor-pure-fixtures.ts`，因此进入官方
> 源码清单，已作为范围变化披露，不冒称全部变化来自生产目标。产品源/旧测试/配置零改。
> 本卡由当前协作模式下的 Codex 独立验收收口；Cursor 是测试贡献者，其自验不作为独立证明。
<!-- original-source-quote:end -->
