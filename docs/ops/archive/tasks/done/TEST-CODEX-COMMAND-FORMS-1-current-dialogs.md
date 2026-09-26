# TEST-CODEX-COMMAND-FORMS-1 — 当前命令弹层参数与输入保真

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（DOM合同补测，不改变布局或宣称像素验收）

## 准入

2026-09-26 Codex build allowed，起点7bd8f064，属于[连续覆盖队列](../../../tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
现行链ScriptEditor.tsx:1710-1755将非CUSTOM_COMMANDS转交CommandForm；:3380-3425在完成前持有draft。
本批从公开CanonicalScriptBodyEditor双击打开真实弹层，不强转作者命令为旧Command，不直接构造旧实体指令。
原版/第一阶段N/A：只证现行编辑器聚合参数合同，无玩法或展示变更。
最强反例是旧表单分支已不用或旧测试已有证明；按CUSTOM_COMMANDS排除旧实体/分支/callScript/learnSkill等，
去重现有CommandForm.current-characterization、ScriptEditor.test与makeLoadScene纯函数测试。

## 范围与验收

白名单新增ui/CommandForm.current-{movement,scene,data,identity,dialog}.test.tsx及
ui/__tests__/command-form-current-fixture.ts、docs/testing/codex-command-forms/**；不改产品/旧测试/配置/资产。
合法工程经正式loader；输入作者命令先guard，实际消费body及context数据深快照；
每个控件检查完整输出、原实参不变、完成前零提交。与Cursor编辑命令/GLM内容guard不重叠。
整批定向/相邻/TC/Biome与代表单点反控后，串行全仓check→ratchet→保护起点strict。
实际缺陷保留隔离红诊断，不改预期凑绿；公共产品修复不借补测授权自动扩张。

## 实施与收口

2026-09-26 Codex实施自验accept：五组51新增，定向及相邻91/91；最终夹具+静态门136/136，
editor TC、五正控+五反控、Biome全部通过。首次全仓失败为本席TSX夹具被静态门计为产品，
已等价改为TS辅助文件；不改扫描器/旧测试，原失败日志保留在[回执](../../../../testing/codex-command-forms/README.md)。
之后串行check9438→ratchet→保护7bd8f064的单次strict8946通过；全仓45477/63178，净增173B。
701生产文件/所有分母/其它六包baseline对象不变。产品/旧测试/配置/资产零改。
切场景朝向保持缺陷已用原红/隔离oracle绿证明，归[独立卡](../../../tasks/EDITOR-SCENE-FACING-1-clear-override.md)，
不随本批关闭。当前模式无固定三席，本席不冒称独立他席；纯测试批done准入满足，母卡继续build。
无下一位Agent提示词，Codex提交推送并继续下一整批。
