# ARCH-REGRESSION-LAB-GLM-1 · Codex 五轮独立接收

2026-09-25；候选 `b403efd375cddce284b6968de8075c4e72953c33`。结论：**counter，十二组仍不能按原工作包完整合同转正**。本轮相对四轮候选 `494f9b5d` 没有修改任何候选测试或 fixture；仅改执行 JSON、机账、回执、verify，并合入 Codex 授权的 main。下表承认局部可用的证据，不把 32 个绿测试说成十二组完成。

## 独立复跑通过的窄事实

- 工作树干净且 tip 等于远端。`86e928b5..a3ceaf05` 的 `packages/ scripts/` 原冻结 diff 为空；最近主线合入点 `8217c7ad..b403efd3` 的 GLM 增量只有实验目录四文件，`packages/ scripts/` 为空。原 `a2415868..HEAD` 的白名单命令含 Codex 授权主线变更，不能当 GLM 本轮越界，也不能报告为全空。
- `npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/candidates.vitest.mts`：9 文件 32/32 绿；重新生成 `/tmp/codex-glm-r5-candidates.json` 后用 `tools/verify.mjs` 对账显示 `PASS`、32 passed、39 条。`tools/red-control.mjs` 显示 detected（exit1、一项执行/失败、业务 AssertionError、注入命中、产品 hash 不变）。
- 六张 `/tmp/type-pal-glm-regression-lab/` 截图存在，逐张重算完整 SHA-256 与 `results.json` 精确相等。本人目视抽查 V01-02/V02-01/V03-01/V04-01：角色姓名界面、720px 角色页、无效 object URL 后角色页及角色页上的“视图”菜单可见；图片本身不能证明六类表单、三工作区分隔条、异步恢复或精灵媒体矩阵。
- 将本次 `red-control` 产生的 `.tmp-red-*` 从实验目录移至 `/tmp` 后，实验目录 Biome exit0（有两条非阻断 optional-chain warning）、`node scripts/docs/check.mjs` PASS、`git diff --check 8217c7ad..HEAD` PASS。**反控脚本仍在 `configs/` 下创建且不清理临时目录**（`red-control.mjs:32,73-89,127`），直接接着跑目录 Biome 会因生成文件失败；此前同类环境污染问题未收口。

## 仍阻断接收的证据矛盾

1. `results.json` 的 G04-02 与 G04-04 都引用同一个 `g04-script-draft.test.tsx:69` 的完整标题；`G04-04` 真用例位于该文件 `:113-125`，只断言新 body 变为两行，没有提交旧草稿后的业务结果。`verify.mjs:82-101` 用 passed 标题集合做存在性检查，不核 ID→file/fullName **一对一**，因此同一绿测试被计两次仍 PASS。`results.json` 39 条不能冒充 39 条独立执行证据。
2. 人类回执 `receipt.md:16,20,24,36-37,45,53` 仍写 G04 三项、G08 四项、V04 reproduced-defect、V04 因该“缺陷”进不了页面、候选 36 项以及旧的 `verify.mjs a3ceaf05` 命令；本轮实际 G04 四条账但仅四个测试、G08 三项、V04 预期 beforeunload、32 项。机账 `results.json:808,829` 也保留旧“36 项”和已撤回的 V04 reproduced-defect 文字，与其结构化状态相冲突。不能只信顶层 39/37/1/1 小计。
3. `verify.mjs:27-35` 对缺命令参数默认使用入仓执行 JSON，虽可用新鲜 JSON 复验，但不再证明**本次**执行；`:47-55` 把 `a2415868..HEAD` 的生产 diff 降为 INFO，未用最近授权合入点硬核 GLM 自身白名单；`:91-101,121-131` 不核唯一映射、执行总数、命令 cwd/exit，也未给之前要求的错标题/零执行/普通 Error/超时判据自测。`PASS` 目前只证明若干标题在该 JSON 中曾通过。
4. 业务用例本轮零改，四轮审查中已经定位的完整合同缺口仍在。直接复读确认：`g03-app-lifecycle.test.tsx:198-213` 的 Cmd+S 只发键并断言旧会话改名抛错，未观察保存 IO；`g05-playback-scope.test.tsx:58-73` 新源启动后立即 stop；`g07-core-boundaries.test.ts:19-24,36-43` 没实际调用 event-system map consumer 或 battle opcode；`g08-conversion-isolation.test.ts:49-71` 回调不见证调用，所谓异常输入只登记 gap 不抛。V02 截图是角色页而非三工作区；V03 是无效 objectId 而非读取失败三态。

## 十二组去向

| 组 | 可保留的窄证据 | 完整组合同裁决 |
|---|---|---|
| G01 | 瓦片笔划正常/三类取消与取消后存活 | counter：选区拖动仍以通知计数替代完整状态；平移 view 结果未证。 |
| G02 | 换会话/换地图后两张瓦片图未被迟到 up 写入 | counter：G02-03 只查通知/DOM，不核新会话选区业务状态。 |
| G03 | App 挂载/重挂载的项目名接线 | counter：Cmd+S 未见真实保存 IO，derivedStore/试玩 owner 范围未证。 |
| G04 | 弹层确认与关闭的局部行为 | counter：旧草稿外部替换后确认/undo 结果未证；G04-04 机账错引 G04-02。 |
| G05 | 单个 Playback 的 stop、停止后 tick 冻结 | counter：新源立即 stop 和手动 `onUi=undefined` 不等于工作区换源/卸载。 |
| G06 | enemy→author 的简单叶与错误 path | counter：未证 author→enemy 的合法 typed 嵌套调用；`g06-validation-crosscalls.test.ts:16-17,32,48` 仍以 `as unknown as`/`as never` 绕过 fixture 类型。 |
| G07 | 背包实例隔离、装备写入与 getter | counter：`getCurrentMapNum` 是 scene-system 直接函数，未调用 event-system 消费者；装备未进入 battle opcode。 |
| G08 | 同输入重复转换与输入保真 | counter：sound 回调未执行，非法操作码只产 gap 非异常，所称回调/异常隔离未证。 |
| V01 | 角色姓名一组截图与局部键盘结果 | counter：物品/技能/敌队/战场/模拟器及焦点矩阵未证。 |
| V02 | 720px 角色页面截图；旧 PanelResizeHandle 用例仅为 existing-proof | counter：场景/地图/非空脚本工作区、真实拖拽和缩放矩阵未证。 |
| V03 | 无效 objectId 深链回退页面可见 | counter：受控读取失败、重试、A/B 迟到与恢复均未证。 |
| V04 | 脏页 beforeunload 为预期保护；合法精灵字节缺席属环境阻断 | counter：媒体 fit/缩放/替换与引用刷新未执行；回执仍误写产品缺陷。 |

**处理界限**：本卡仍 `draft`，不合候选、不计官方覆盖率、不标 done。下一轮先纠正机账/回执/核验器的真假对应，再将未达完整合同的条目降成窄证据或补真实业务链；不得靠改标题/改小计取代测试。GLM 是贡献者，不作为自己的独立终审；Kimi 本队列豁免。
