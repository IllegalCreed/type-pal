# TEST-GLM-LARGE-WAVE-4 · B 批回执（编辑器会话、索引与派生状态）

- 候选 SHA（r1 本批完整提交）：`1af7883b48cc14c9a5cc002c69948560581290fa`；
  R2 返工完整候选：`031b3e479e18bf1add1d5b559716172cfb7c031f`；R3 窄返工候选：本次推送提交（完整 SHA 见推送输出与最终回执）。
- 逐条 file/fullName/status：[batch-b-directed.json](batch-b-directed.json)（3/3 passed）
- 新增文件：`packages/editor/src/ui/use-editor-project-session.glm-large-wave.test.ts`
  （B04 hook 专测；R2 改名 `.tsx`→`.ts` 与源扩展名一致，JSX 改 createElement）+ B 视觉宿主 `browser-host/{host-b.tsx,index-b.html,vite.config.b.mts,drive-b.mjs}`。
- 门禁：editor `tsc --noEmit` 0 诊断；新增文件 Biome error/warning/info 全零；
  `node scripts/docs/check.mjs` PASS；`git diff --check` 干净。

## 每组处置（旧测去重结论）

| 组 | 源文件 | 处置 | 依据 |
|---|---|---|---|
| B01 | core/script-editor.ts | existing-proof | `core/script-editor.test.ts` 27 例密集覆盖：ScriptId 闭包校验、behavior 方案原子重排/重命名改写、cursor-handoff 与 battle-loss 引用改写、状态机 locator/转移、item-private 脚本生命周期、共享脚本元数据/嵌套命令、Hook 变体稳定 id、页选择注册表——本卡候选轴（locator 有序身份、body 分支、共享脚本 body 更新与 undo/redo）均已有直接断言 |
| B01 | ui/ScriptTree.tsx | existing-proof | `ScriptTree.test.ts`（摘要/富文本/稳定引用/reorder intent）、`ScriptTree.workflow-coverage.test.tsx`（空段插入、两臂交互、多段回调、缺席态、入场呈现）、`ScriptTree.coverage-batch(-2)`（指令摘要全 kind）；组件交互面已证，无新增可证轴 |
| B02 | core/project-reference.ts | existing-proof | `project-reference.test.ts` 10 例：tuple key 无冲突、intern 稳定性、compact locator 全变体 round-trip、复合实体边归属、删除 impact block/warn/scope 语义（A↔B 排除） |
| B02 | core/project-reference-adapters.ts | existing-proof | `project-reference-adapters.test.ts` 22 例逐 domain 覆盖（scene/shop/battle/ambience/item/actor/sprite/enemy/stamp/asset），且 A 批 SharedScriptTab/DataMode 测试已间接消费 `collectCurrentProjectReferenceIndex`/`sharedScriptReferenceEdges` |
| B03 | core/edit-session.ts | existing-proof | `edit-session.test.ts` 20 例：不可变 dispatch、undo/redo/分支清空、noop 零历史、脏标记、地图 revision 失效与异步按需加载竞态（含旧路径在途结果不满足新路径、失败重试、LRU 淘汰与 pin）；组合命令经「原子地图 patch 一次 dispatch/undo/redo」证到 |
| B03 | core/editor-derived-store.ts | existing-proof | `editor-derived-store.test.ts` 12 例：增量 patch、过期结果合并与 fail-closed、stale/current 失败重启、last-known 保留、按 revision 派生状态、stop 取消、canonical 记录级发布——current/stale/failed 三态全证 |
| B04 | ui/use-editor-project-session.ts | **新增 3 测试** | hook 此前无行为测试（app-session-ownership 只证 shell 构造）。新增：初始绑定目录的 local 身份/干净脏态/getLocalDirectory；rename 经真实 `RenameProjectCommand` 改显示名不改 manifest.id；rename 原名 no-op 不入历史 |
| B04 | core/project-io.ts | existing-proof | `project-io.test.ts` 5 例（投影/序列化/入口保留/SceneIndex 双向）+ author-save-journal.test 51 例以同环境覆盖 serialize/write/recover 全链 |
| B05 | core/author-save-journal.ts | existing-proof | `author-save-journal.test.ts` 51 例：全量 staging 先于写入、失败不落盘可清理、首存授权、外来变更不写入、清理失败非致命、恢复语义（receipt/pending marker/沙箱标记）、fake/expired capability 拒写、未 await commit 保持授权——prepare/commit/recover 精确文件序与失败保真已证 |
| B05 | core/project-diagnostics.ts | existing-proof | `project-diagnostics.test.ts` 24 例：统一扫描器 revision 去重、canonical 投影排除、迁移诊断跳转、入口不变式、资源缺失/类型错误定位、未知 manifest 字段、音效引用 walker、缓存失效边界 |
| B06 | core/playback.ts | existing-proof | `playback.test.ts` 10 例 + playback.{controls,entities,effects,motion,presentation,queries,stepping}.test 分域覆盖：scratch 状态提交、入场预览到对话、失败报告、黑幕事务（hold/reveal/停止清理/切场景收尾/不匹配 token 恢复/abort 不选臂/callScript 不改库） |
| B06 | core/tileset-references.ts | existing-proof | `tileset-references.test.ts` 9 例：精确 id/path 扫描不 hydrate、fail-closed 拒绝部分覆盖、旧路径在途丢弃、in-session 编辑优先、与 hydrate 共享读取、删除/重做的当前批次复核 |

## 登记为不可达/未证

- useEditorProjectSession 的 `save()` 全链（pickDir/首存授权/写盘/恢复）在本测试宿主
  （内存 FSA + IDB 替身）下会触发一个空消息错误（疑似 `editor/battle-simulator.json` 移除
  路径在空白种子盘上的 NotFoundError），未在 hook 层证到 committed 结果；保存语义由
  author-save-journal.test 51 例（同环境）与 project-io.test 承担。登记未证，不把错误表现钉为合同。
- `requestLeave`/`continueLeave` 的 leave-guard 决策态：`ProjectLeaveGuard.connect/decide`
  交互属 UI 层弹窗流，本卡不测（guard 快照语义由其消费方测试覆盖）。

## 业务反控（共用 judge，2 枚全 VALID）

| 针 | fullName | 结果 |
|---|---|---|
| rename 断言改错 | B04 编辑器项目会话 hook > rename 经一次真实命令改显示名，不改文件夹身份 | 恰 exit1、AssertionError、唯一失败、产品 hash 不变 |
| hasDirectory 断言取反 | B04 编辑器项目会话 hook > 初始绑定目录时报告 local 身份与干净脏态 | 同上 |

## 隔离功能视觉（端口 6087，1 条）

证据 JSON：[browser-host/evidence-browser-b.json](browser-host/evidence-browser-b.json)；console 错误 0。

| 条 | 截图 | SHA256 | 视口 | 步骤→预期→实际 |
|---|---|---|---|---|
| B1 会话选择→修改→undo | B1-script-session-initial-1440x900.png | 1045d525de000785b5406ac01eb3e1d5fcddc1fface96d6a33d488af095d5c00 | 1440×900 | 真实 ScriptEditSession + 正文编辑器挂载，setVar count=2 → 与预期一致 |
| | B1-script-session-edited-1440x900.png | a15f428dc2a0eb2e1bba8254e66e5ef5b5402b0fc5487a3e482c39d9438a7e2f | 1440×900 | 双击树行打开属性表单，值 2→9 完成 → 正文 value=9、历史版本 1、树行显示「变量 count = 9」→ 全部一致（已看图） |
| | B1-script-session-undone-1000x720.png | 42d57b9c3659511c3ad8159e65310ec87710a17d0810a0236a035a15afdc2de5 | 1000×720 | 撤销 → value=2（版本 2）；重做 → value=9 → 实测一致 |

URL `http://127.0.0.1:6087/index-b.html`；直挂范围声明：真实 ScriptEditSession +
CanonicalScriptBodyEditor，不含 App 壳/保存/预览。

## 未证项汇总

- 上述「不可达/未证」2 条；B01/B02/B03/B05/B06 按 existing-proof 处置（依据见表）。

> R2（返工，候选 `031b3e479e18bf1add1d5b559716172cfb7c031f`）：本文件改名 `.ts`（与源扩展名一致，JSX 改 createElement）；B1/B2 针按 R2 严格判据重跑 VALID；
> hook 侧强转清零，保存链未证项维持原状（见上文登记）。
> R3（窄返工）：B1/B2 针改用完整失败名精确相等重跑 VALID；判据所有 INVALID/异常路径先清理
> 临时针再退出，selftest 逐例断言无 `.needle-tmp` 遗留。
