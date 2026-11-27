# REFORGE-RUNTIME-COMPILER-ENTRY-1 — 退役仅旧专测使用的命令编译出口

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-27
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

退役 Reforge 包入口的 `compileRuntimeCommands`。命令派发的必要测试改用运行时实际调用的命令根和输入守卫。

## 范围

删除一个由 Reforge `index.ts` 转出的公开函数。调整三个原专测的引用及旧注释和共享夹具。可执行命令根、步骤编译、共享脚本解析及基础编译继续由现行出口提供。

## 前提与证据

`ScriptProjectRuntime.runCommands` 调用 `compileRuntimeCommandRoot`，场景和实体方案调用 `compileRuntimeScriptFlow`。投影与编译专测整理后，仓内还剩三个实际测试调用。基点的第四处已随原编译专测迁入正式命令根，去向见父卡证据。两份派发专测经正式命令根编译，负向守卫测试直接向现行守卫传入未验证输入。

## 验收

正式入口的原用例身份、派发参数、取消和错误断言须保留。类型检查及相邻测试零诊断。按自然状态保持两份旧派发测试的整文件组织审核，进度随[当前治理窗口](QUALITY-REFORGE-SCENE-OWNERSHIP-1.md)。

## 状态与交接

2026-11-27 用户批准删除旧导出。Codex build allowed，承担隔离治理树里这一编译函数和三个测试调用的单一写入。

已移除定义。三个调用文件的 19 个原生测试身份逐项对账，9 个相邻套件 101 项全部通过。Reforge 与 Editor 类型检查均无诊断；同一证据包保留实际出口检查、命令、原件和后继身份。集中门随父卡收尾。

仓内引用已迁到正式编译和守卫入口。三个旧调用文件的测试身份去向和父卡集中门均已验收，任务收口。见[集中收尾](QUALITY-REFORGE-SCENE-OWNERSHIP-1.md#集中收尾)。
