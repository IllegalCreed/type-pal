# TEST-CODEX-COMMAND-FORMS-1 — 当前命令弹层参数与输入保真

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（DOM合同补测，不改变布局或宣称像素验收）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 +5pp 连续覆盖队列中对现行编辑器命令弹层（CommandForm 聚合参数合同）的纯测试批次历史记录；下述数字与门禁均为原卡时点陈述，本次文档治理未重跑。

## 目标

从公开 CanonicalScriptBodyEditor 双击打开真实命令弹层，为非 CUSTOM_COMMANDS 转交路径补 DOM 合同测试：每个控件完整输出、原实参不变、完成前零提交，验证现行聚合参数合同而不强转作者命令为旧实体。

## 范围

- 范围内：新增 ui/CommandForm.current-{movement,scene,data,identity,dialog}.test.tsx 五组 51 项、ui/__tests__/command-form-current-fixture.ts 与 docs/testing/archive/legacy/batches/codex-command-forms/** 证据；起点 7bd8f064，属[+5pp 连续覆盖队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
- 范围外：产品、旧测试、配置、资产；旧实体指令直接构造；与 Cursor 编辑命令、GLM 内容 guard 重叠的既有证明（按 CUSTOM_COMMANDS 排除旧实体/分支/callScript/learnSkill 等并去重）。

## 前提与证据

现行链 ScriptEditor.tsx:1710-1755 将非 CUSTOM_COMMANDS 转交 CommandForm、:3380-3425 在完成前持有 draft；合法工程经正式 loader，输入作者命令先 guard，实际消费 body 及 context 数据深快照。原版/第一阶段 N/A（只证现行编辑器聚合参数合同）。可证伪反例：旧表单分支已不用或旧测试已有证明。原卡无实现 commit 之外的独立 raw SHA。
- 当前状态：done（历史终态）

## 验收

原卡记录：定向及相邻 91/91；最终夹具+静态门 136/136；首次全仓失败为本席 TSX 夹具被静态门计为产品，等价改为 TS 辅助文件、不改扫描器/旧测试，原失败日志保留在[回执](../../../../testing/archive/legacy/batches/codex-command-forms/README.md)；串行 check 9438→ratchet→保护 7bd8f064 单次 strict 8946 通过；全仓 45477/63178 净增 173B；701 生产文件/各分母/其它六包 baseline 不变。切场景朝向缺陷用原红/隔离 oracle 绿证明、归独立卡不随本批关闭。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡明确无下一位 Agent 提示词：Codex 提交推送并继续下一整批；纯测试批 done 准入满足、母卡继续 build；当前模式无固定三席，本席不冒称独立他席。S14 本页治理只改写泛化封套。

## 历史范围

2026-09-26 Codex build allowed 并同日实施自验 accept；起点 7bd8f064。2026-10-17 R41 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：五组 51 项 DOM 合同按纯测试批收口；发现的切场景朝向缺陷移交 EDITOR-SCENE-FACING-1，不随本批关闭。原卡全文在下方 quote 保全。

## 当时证据

[回执](../../../../testing/archive/legacy/batches/codex-command-forms/README.md)保留首次全仓失败日志与红绿记录；定向/相邻/TC/Biome 与代表单点反控结果为原卡陈述。本页治理未新增任何执行。

## 当前有效性

historical。不把 51 项历史通过当作当前 main 的覆盖结论；CommandForm 合同的现行状态以当前测试与 catalog 为准。

## 继任文档

切场景朝向缺陷见[EDITOR-SCENE-FACING-1](EDITOR-SCENE-FACING-1-clear-override.md)；队列母卡见[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。

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
