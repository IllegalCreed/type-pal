# TEST-CODEX-COMMAND-FORMS-1 — 当前命令弹层参数与输入保真

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
- primary source：固定 source revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229` 与原卡全文。
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
- 原始日期、版本、阶段：源文档固定于 `b9901f97a3a09359cbeaed9dde126e6f44b7f229`；本轮为 2026-10-17 R41。
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
固定源 revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229`，source SHA `50e044a0c92713dd1908aeb9e34b7e081ee8ca74c3370cf789cd2a0e6c57cb5c`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-CODEX-COMMAND-FORMS-1 — 当前命令弹层参数与输入保真
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（DOM合同补测，不改变布局或宣称像素验收）
>
> ## 准入
>
> 2026-09-26 Codex build allowed，起点7bd8f064，属于[连续覆盖队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
> 现行链ScriptEditor.tsx:1710-1755将非CUSTOM_COMMANDS转交CommandForm；:3380-3425在完成前持有draft。
> 本批从公开CanonicalScriptBodyEditor双击打开真实弹层，不强转作者命令为旧Command，不直接构造旧实体指令。
> 原版/第一阶段N/A：只证现行编辑器聚合参数合同，无玩法或展示变更。
> 最强反例是旧表单分支已不用或旧测试已有证明；按CUSTOM_COMMANDS排除旧实体/分支/callScript/learnSkill等，
> 去重现有CommandForm.current-characterization、ScriptEditor.test与makeLoadScene纯函数测试。
>
> ## 范围与验收
>
> 白名单新增ui/CommandForm.current-{movement,scene,data,identity,dialog}.test.tsx及
> ui/__tests__/command-form-current-fixture.ts、docs/testing/archive/legacy/batches/codex-command-forms/**；不改产品/旧测试/配置/资产。
> 合法工程经正式loader；输入作者命令先guard，实际消费body及context数据深快照；
> 每个控件检查完整输出、原实参不变、完成前零提交。与Cursor编辑命令/GLM内容guard不重叠。
> 整批定向/相邻/TC/Biome与代表单点反控后，串行全仓check→ratchet→保护起点strict。
> 实际缺陷保留隔离红诊断，不改预期凑绿；公共产品修复不借补测授权自动扩张。
>
> ## 实施与收口
>
> 2026-09-26 Codex实施自验accept：五组51新增，定向及相邻91/91；最终夹具+静态门136/136，
> editor TC、五正控+五反控、Biome全部通过。首次全仓失败为本席TSX夹具被静态门计为产品，
> 已等价改为TS辅助文件；不改扫描器/旧测试，原失败日志保留在[回执](../../../../testing/archive/legacy/batches/codex-command-forms/README.md)。
> 之后串行check9438→ratchet→保护7bd8f064的单次strict8946通过；全仓45477/63178，净增173B。
> 701生产文件/所有分母/其它六包baseline对象不变。产品/旧测试/配置/资产零改。
> 切场景朝向保持缺陷已用原红/隔离oracle绿证明，归[独立卡](EDITOR-SCENE-FACING-1-clear-override.md)，
> 不随本批关闭。当前模式无固定三席，本席不冒称独立他席；纯测试批done准入满足，母卡继续build。
> 无下一位Agent提示词，Codex提交推送并继续下一整批。
<!-- original-source-quote:end -->
