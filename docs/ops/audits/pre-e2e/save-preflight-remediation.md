# B-04 修复回执：当前存档预检与恢复失败隔离

状态：**SAVE-PREFLIGHT-1 已 done（2026-09-06，用户明确授权收口）**。
终审候选 `2c39b1af`；整卡代码比较基线 `5f9f92ba`；收口接手 HEAD `c0d16e42`。
[完整任务卡与三席证据](../../archive/tasks/done/SAVE-PREFLIGHT-1-current-save-restore-preflight.md)已归档，r1 设计不重签。
Codex/Kimi 为独立审查 accept，GLM 为实现者自测 accept；无代签、无缺签豁免。

## 已完成

- 当前 SAVE8 已知载荷结构先校验，再进入 normalize/恢复准备；损坏快照在停止旧脚本、替换世界/场景前拒绝。
- 稀疏数组、非法持久状态、portrait=null 等反例已拒绝；分数坐标、HP=0、显式静音与合法可选缺席仍通过。
- 读取/归一化/场景准备三阶段失败提示归最新请求；F9、菜单、boot 入口错误收口，保留 AbortError 取消协议。
- 新结构错误显示固定短文案“存档损坏，无法读取”；生产 BDF 测得 144px，200px 提示区内完整可见，
  详细字段路径留在 Error.message / console.warn，不靠截掉诊断信息满足像素限制。
- 正式测试包含真实 main.ts AST 调用链、normalize 阶段内挂起与只删除 isCurrent 一行的突变负控制，
  不是结构矩阵的副本。原两份缺陷探针零改动，修复后不再满足其旧缺陷假设；正确行为由正式回归证明。

## 验证与证据边界

以下为候选审查时实际完成的验证，不冒称在本次文档收口重新执行：

| 检查 | 最终结果 |
|---|---|
| save 定向 | 6 文件 / 88 项；其中结构矩阵 50、真实恢复链 20 |
| 相邻生命周期/切场景 | 3 文件 / 22 项 |
| Reforge typecheck | 通过 |
| 完整 check | 539 测试文件 / 6,246 项通过；lint 0 error，50 warnings / 11 infos 既有 |
| 单次严格 fast coverage | 609 个生产文件 / 5,761 项；精确基线通过，未降门槛、未缩范围 |
| 结构 guard 覆盖率 | lines 117/117；statements 136/136；functions 38/38；branches 46/51 |
| 开发期最小功能 | 隔离测试工程与独立浏览器存储：坏档拒绝后可走，好档恢复；短提示完整，pageerror=0 |

Codex 全量日志：`/tmp/type-pal-save-final-check.MFLtVx/check.log`、
`/tmp/type-pal-save-final-coverage.rKsL65/coverage.log`；像素/独立突变与最小截图记录在
`/tmp/type-pal-save-final-review.oSt0mR/`；前轮移动/合法恢复在 `/tmp/type-pal-save-rework-review.kUy0T7/`。
这些是当时本机临时证据，不保证长期留存；持久审查结果见归档卡与 Git，不向仓库添加调试截图垃圾。

本次收口重新核对候选至 HEAD 的 packages/ scripts/ 零 diff，以及整卡原探针零 diff。
文档工具测试 20/20 通过，文档检查 397 Markdown / 1,776 本地链接 / 138 任务零问题，`git diff --check` 通过；
归档前后 r1 设计/三席终审签字逐段一致，隔离卡仅重定向归档链接。
未重跑 full coverage；fast 的增加不能冒充 PAL/browser/E2E 覆盖。没有对用户真实数据库做损坏试验，
没有承诺任意提交后异常回滚，也没有穷举一切未知字段。

## 后续事项

| 事项 | 去向与约束 |
|---|---|
| 合法 checkpoint → 行走/脚本 → 坏 checkpoint 拒绝 → 合法恢复 | [R4/Q1 集中 E2E 登记](../../../testing/e2e.md#已登记的存档恢复回归save-preflight-1)，Owner Codex，待跑；剧情观感不逐卡重复 |
| editor coverage 少 1 条语句/分支 | [TEST-COVERAGE-DETERMINISM-1](../../archive/tasks/done/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md)已由独立受控帧回归闭环并三签收口；其他回退仍须逐文件定位，不按多数通过放行 |
| 非结构 codec 错误长提示 | Kimi 非阻断观察，作为后续缺陷记录保留，尚未实现；不扩大本卡 R4 新 guard 的范围 |
| 工程/工作区存档隔离 | [SAVE-ISOLATION-1](../../tasks/SAVE-ISOLATION-1-project-workspace-save-scope.md)r2 已经独立三签准入并实现，自验证通过、待两席终审；不由本卡签字授权实现 |

非结构错误跟进锚点：`packages/reforge/src/main.ts:5783` 的普通 Error.message 分支、`:5722` 的准备失败
提示，及 `:6175` 的 x=120 固定绘制；`packages/reforge/src/save/current-codec.ts:27` 等既有错误含路径。
收口判断：需要后续处理，但不是本卡新增回归；在后续错误反馈小修中核全调用域，以生产字体像素测量验证
短反馈完整、详细诊断可查、旧请求不覆盖新提示。不得只按字符数断言，也不以“修长文案”为由改存档校验语义。
Kimi 对 read/prepare 用例的第二条观察肯定现有测试配置，不需另开修复任务。

原 A–E 审计报告继续作为原基线历史；本回执只关闭 B-04，不宣称其余审计缺陷、N6b 或完整 E2E 已完成。
