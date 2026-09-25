# DOC-CURSOR-6 · Codex 独立接收（2026-09-25）

结论：**accept，只接收八组只读事实回执**。Cursor 候选 `f569853b` 不是正式指南修订，更不是产品修复或视觉验收。Codex 对照当前主线的一手源码复核；候选相对 `b95f218a` 只有 `cursor-author-guides-batch.md` 和必要的 `docs/testing/README.md` 导航。后者超出卡面单文件白名单，但只为满足 `check.mjs` 新报告索引要求，作为 Codex 明示接受的导航例外，不扩大其它写入授权。

## 关键独立核验

- B1-3：`BattleFieldPicker.tsx:21-22` 对悬空战场显示 `战场 #N（缺失）`，不是指南的“缺数据”；保存门 `project-diagnostics.ts:823-906` 聚合内容引用校验，二者须分开表述。
- C1-1/2/3：`SharedScriptTab.tsx:181-201,229-244,435-503` 创建时只有名称和稳定 ID，`self` 默认 `none`；目录仅新建，无复制。`SceneScriptWorkspace.tsx:202-212` 给出的抽屉页签是“进场脚本 / 传送出口 / 交互脚本 / 自动行为”，不是两个总称页签。共享正文复用 canonical 编辑器的事实保留。
- C2-2/4：`SharedScriptTab.tsx:384-427` 展示引用列表，没有“扫描调用位置”按钮。`project-diagnostics.ts:823-906` 的保存门经 `script-editor.ts:611-674` 查稳定 ID 缺失等引用问题，但不做 canonical `callScript` 图 DFS；`script-references.ts:110-333,359` 的环检查只处理旧分片投影，当前产品保存调用链未引用 `assertScriptProjectValid`。这是指南错误，同时暴露待单独裁决的产品保护缺口，不能仅删掉禁止环的设计约束当作缺陷修复。
- D1-1：`PreviewCanvas.tsx:431-440`、`App.tsx:1822-1833` 的“引擎试玩” URL 不自动追加 `debug`；`reforge/src/main.ts` 的 DEV 安装门仍要求查询参数。原指南给出带 `&debug` 的 URL 可以作为**手动示例**成立，但若读作按钮自动打开调试面板则误导；后续改文需明确手动追加，不能声称按钮已经具备此行为。
- A1/A2、B2、D2 抽核的当前入口和命令边界与回执方向一致；PAL 背景二进制缺席、未运行的 UI/像素项维持 `blocked-input` / `pending-ui`，不由源码字符串升级为实测通过。

候选及主线均复跑 `node scripts/docs/check.mjs`、`git diff --check` 通过。未跑迁移、覆盖率、E2E 或视觉浏览器，因为本卡只读取证。七处误导文字的窄修另排；其中 C2-4 涉产品 save/compile 保护，先定现行期望再开产品修复。无 Cursor 返工项。
