# 九批收窄返工独立接收（2026-09-20，Codex）

当前结论：**八批代码接收通过并逐批集成，待统一质量门后签accept；TB03仅余PNG宿主尺寸合同counter**。
旧[二轮报告](glm-nine-rework-review.md)及[首轮报告](glm-nine-intake-review.md)仅为历史，不把其counter重复套到本轮。
三席设计不重签；GLM为测试贡献者，不算独立第三方自证。未代签、未标done；TB00/TB01另排、Mimosa不参与。

| 批次 | 指定源候选 | 定向 | 原对照+负控 | 自有文件Biome | 本轮 |
|---|---|---:|---:|---|---|
| TB02 | ea276956 | 24 | 3+8 | 0 | 集成6088d9d2 |
| TB03 | 001dc9e1 | 39 | 3+8 | 0 | counter，未集成 |
| TB04 | 69d62dc2 | 19 | 3+8 | 0 | 集成c9dfe9c4 |
| TB05 | 00801036 | 24 | 3+9 | 0 | 集成018cb224 |
| TB06 | d2667b25 | 18 | 3+8 | 0 | 集成0f74db1d |
| TB07 | 10cc9d4d | 21 | 3+7 | 0 | 集成4fd249bc |
| TB08 | bda77494 | 17 | 3+8 | 0 | 集成28bd5524 |
| TB09 | ca4c0768 | 25 | 3+8 | 0 | 集成5a574507 |
| TB10 | 3d798f7c | 23 | 3+9 | 0 | 集成ba3d5ad4 |

合计67新测试文件/210项，九工具27正控+73针、涉及包10次typecheck均通过；各候选运行前后SHA/工作树不变。
逐批核新增测试/fixture白名单（TB07含已准入hooks-session），既有产品/旧测试、projects/data、覆盖率脚本/基线零修改。
集成采用逐批限定路径应用，新增代码/工具与各源候选逐字一致，保留主线共享文档与他批状态，不把独立分支整树覆盖到main。
暂接收八批60文件/171项；TB03的7文件39项和fixture/工具未混入主线。

## 已关闭残项

- C0：独立抽取九份工具的真实运行块，精确title、唯一命中、实际failed、非空failureMessages和逐首行业务错误齐；
  后缀冒名与重复同名均拒绝，原普通Error内嵌AssertionError/超时/未执行拒绝保持。自测AST执行同块，无第二个宽松谓词。
- C1：最终完整自有TS/JSON/MJS/MTS白名单Biome均exit0；计数210/27+73与实际树一致。
  audit-performance并行超时的错误豁免归因已撤回；仍必须跑合并后的同口径完整check，不取隔离多数通过代验。
- TB06：实际传入map与clipboard在拒绝、成功overwrite后比较完整深快照；混合有效/无效目标同样覆盖。
- TB07：先两笔编辑再undo建立非空redo，缺target拒绝后重放hook-b，再两次undo恢复双变体及initial。
  独立三针（状态污染/清redo/整图metadata污染）全部被候选自身AssertionError检出；对照全绿。
- TB03：CRC/zlib/完整PNG二进制合法性和真实SHA已关闭，**不重开**；下方只核合法文件是否属于声称的320×200成功场景。
- 旧版本兼容审查：pass；本包只新增现行合同测试，无产品兼容分支。已撤排除轴不重新引入。

## TB03唯一counter：PNG合法不等于Canvas宿主输出合法

源码：候选的 packages/editor/src/core/image-import.stages.test.ts:160 的toBlob固定返回pngPayload(2)/(3)，
:249起成功场景传入320×200背景；pngPayload的IHDR恰2×1/3×1，与生产canvas.width/height及返回的width/height不一致。
不是要求浏览器截图或扩建PNG解码器；编码宿主窄替身仍须遵守自己的尺寸合同。

独立执行同一候选helper+真实prepareAuthoredImage，实际得到：源图320×200、返回宽高320×200、主PNG2×1、preview3×1。
此前见证只核CRC/IDAT，且仍取旧参数24/32；其“valid”只说明二进制合法，不能证明实际成功产物匹配。
新[可重建见证](import-codec-png-host-review.mjs)：

~~~sh
node docs/testing/import-codec-png-host-review.mjs /Users/zhangxu/illegal/type-pal-glm-import-codec
~~~

只在隔离加载删除image-import.ts的canvas.width/height两行：候选5/5仍绿，独立Canvas尺寸oracle由业务AssertionError变红（MISSED）；
对照含两个oracle共7/7绿。产品与候选hash前后不变，无真实工程IO/视觉行为。
最小返工：让toBlob按**实际Canvas尺寸**编码合法PNG，核同一对象实际宽高/输出IHDR与准备结果一致；
主图/preview需要不同摘要时改合法像素而非改尺寸。原真实SHA/全字节断言保留，更新独立摘要常量。
成功正控先过这条宿主合同；删画布尺寸的坏实现须由候选自己的业务断言检出。
不改产品、不碰已隔离的编码失败close缺陷、不重开其余族、不为固定见证保留重复helper。

## 质量门与证据

逐批日志：/tmp/codex-nine-final.wb8m3g/；[机器账](glm-nine-final-evidence.json)。
原残项见证：codex-nine-residual-8ry3VM；PNG宿主见证：codex-png-host-ySshQJ，完整绝对路径见机账。
八批统一check→官方ratchet→受保护单次strict-fast正在排队；未完成前不签最终accept，不把210定向冒称全仓通过。

## 下一位Agent提示词（GLM：仅TB03返工）

~~~text
在 /Users/zhangxu/illegal/type-pal 按 docs/testing/glm-nine-final-review.md 只返工TB03，卡 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md 为rework，源001dc9e1，生产e58834f6，设计不重签。
先同步当前main文档到原独立分支并读AGENTS/CLAUDE/READ-FIRST、本报告、原工作包及交付清单。C0/C1、PNG二进制合法性、SHA和其他已关闭项不重开。
唯一残项：320×200成功路径的toBlob不能给2×1/3×1；按实际canvas尺寸返回合法PNG，核尺寸和产物，主图/preview差异用像素而非尺寸；保留真实摘要/完整字节断言。
复跑 node docs/testing/import-codec-png-host-review.mjs <候选worktree>，删canvas尺寸两行须由候选业务断言检出；若helper结构调整给出真实入口，Codex适配见证，不复制假宿主迁就工具。
不改产品/旧测试/基线/原探针，编码失败close仍归Codex；定向39/原3+8/tc/最终完整白名单Biome与回执从树复跑。本人落卡提交推送，不代签、不标done；其余八批不返工，统一门禁由Codex负责。
~~~
