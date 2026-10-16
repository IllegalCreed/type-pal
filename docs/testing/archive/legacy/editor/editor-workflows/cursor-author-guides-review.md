# DOC-CURSOR-6 · Codex 独立接收（2026-09-25）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 3dc90ad8f6dde5a7ddcafc6b749b61dd53152751；本轮 R78。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- DOC-CURSOR-6 · Codex 独立接收（2026-09-25）：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `cea4d852c9dad2ed934ab471c092ebea907dd96e77cca8cb08aa06c531c0d89d`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # DOC-CURSOR-6 · Codex 独立接收（2026-09-25）
>
> 结论：**accept，只接收八组只读事实回执**。Cursor 候选 `f569853b` 不是正式指南修订，更不是产品修复或视觉验收。Codex 对照当前主线的一手源码复核；候选相对 `b95f218a` 只有 `cursor-author-guides-batch.md` 和必要的 `docs/testing/README.md` 导航。后者超出卡面单文件白名单，但只为满足 `check.mjs` 新报告索引要求，作为 Codex 明示接受的导航例外，不扩大其它写入授权。
>
> ## 关键独立核验
>
> - B1-3：`BattleFieldPicker.tsx:21-22` 对悬空战场显示 `战场 #N（缺失）`，不是指南的“缺数据”；保存门 `project-diagnostics.ts:823-906` 聚合内容引用校验，二者须分开表述。
> - C1-1/2/3：`SharedScriptTab.tsx:181-201,229-244,435-503` 创建时只有名称和稳定 ID，`self` 默认 `none`；目录仅新建，无复制。`SceneScriptWorkspace.tsx:202-212` 给出的抽屉页签是“进场脚本 / 传送出口 / 交互脚本 / 自动行为”，不是两个总称页签。共享正文复用 canonical 编辑器的事实保留。
> - C2-2/4：`SharedScriptTab.tsx:384-427` 展示引用列表，没有“扫描调用位置”按钮。`project-diagnostics.ts:823-906` 的保存门经 `script-editor.ts:611-674` 查稳定 ID 缺失等引用问题，但不做 canonical `callScript` 图 DFS；`script-references.ts:110-333,359` 的环检查只处理旧分片投影，当前产品保存调用链未引用 `assertScriptProjectValid`。这是指南错误，同时暴露待单独裁决的产品保护缺口，不能仅删掉禁止环的设计约束当作缺陷修复。
> - D1-1：`PreviewCanvas.tsx:431-440`、`App.tsx:1822-1833` 的“引擎试玩” URL 不自动追加 `debug`；`reforge/src/main.ts` 的 DEV 安装门仍要求查询参数。原指南给出带 `&debug` 的 URL 可以作为**手动示例**成立，但若读作按钮自动打开调试面板则误导；后续改文需明确手动追加，不能声称按钮已经具备此行为。
> - A1/A2、B2、D2 抽核的当前入口和命令边界与回执方向一致；PAL 背景二进制缺席、未运行的 UI/像素项维持 `blocked-input` / `pending-ui`，不由源码字符串升级为实测通过。
>
> 候选及主线均复跑 `node scripts/docs/check.mjs`、`git diff --check` 通过。未跑迁移、覆盖率、E2E 或视觉浏览器，因为本卡只读取证。七处误导文字的窄修另排；其中 C2-4 涉产品 save/compile 保护，先定现行期望再开产品修复。无 Cursor 返工项。
>
<!-- original-source-quote:end -->
