# 2026-09-27 后台补测两包

用户分工：GLM/Cursor继续补测试，Codex暂停主动扩展覆盖率，转E2E方案讨论。
不以+5pp尚差612分支阻塞E2E；贡献者交付仍须独立验收与必要门禁，不能提前计入官方比例。

- [GLM物品六组](../../ops/tasks/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md)：item.ts，冻结221/326B。
- [Cursor地图六组](../../ops/tasks/TEST-CURSOR-MAP-LOGIC-2-selection-stamps.md)：六模块701/827B。
- [冻结目标机账](targets.json)：取a95618fc官方strict LCOV，仅选题，不运行新覆盖。

## 两包共同纪律

先读AGENTS/CLAUDE/phase2 READ-FIRST与本卡；Vitest/pnpm按仓内现行版本与filter命令，
`env -u NODE_COMPILE_CACHE`。不加ignore/skip/fails，不改旧断言、产品、范围/timeout或官方baseline。
每组先核当前入口/旧标题/合法fixture；当前合同不清楚则待证，不为LCOV臆造预期。
新增测试聚焦真实公开函数与业务结果，输入快照必须是实际传入对象；区分纯函数与本来原地修改的API。
代表反控在隔离加载层或隔离副本执行，不临时修改主树源文件；运行前后源hash相同。
判据必须恰exit1、恰目标文件/fullName的候选AssertionError，命中见证唯一；拒绝普通Error混入、
超时、零执行、skip、exit2/null。先一组校验判据再整包连续完成，不逐针等待用户。
数量从最终Vitest JSON生成；失误/环境故障如实记录。发现产品缺陷写隔离诊断，不把缺陷行为改成期望。
贡献者可并行定向，不争用主树/官方coverage/浏览器。交付后Codex复核，通过才统一合并推送与收口。

## GLM提示词

接手TEST-GLM-ITEM-LOGIC-1，卡已build allowed。先同步main、读卡和本目录规则/targets.json，
新建隔离codex/glm-item-logic-r1，不碰主工作树。按I1–I6连续补真实物品公开函数的剩余合同，
只用本卡白名单；合法fixture/旧标题去重/实际输入保真/4–6代表反控。removeOwnedItems是原地API，
不可机械加“不变”断言。只跑卡面定向相邻/content/TC/Biome/docs，不跑全仓coverage。
整包提交推送SHA与真实回执；不合main、不标done；疑似bug独立红诊断交Codex。

## Cursor提示词

接手TEST-CURSOR-MAP-LOGIC-2，卡已build allowed。同步main、读卡/共同规则/targets.json，
新建隔离codex/cursor-map-logic-r2。M1–M6连续实施，只改六新测试/专属fixture和报告。
先去重旧boundaries；真实合法map/template、完整map/clipboard/draft快照、计划结果实际应用后核业务。
4–6代表反控；定向/相邻/TC/Biome/docs，禁止主树、UI、产品和官方coverage。提交推送整包SHA，
不合main、不标done，产品疑点保留独立诊断。Codex独立接收，不需其他AI签字。
