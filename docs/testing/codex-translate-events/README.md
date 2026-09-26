# Codex 当前脚本翻译六组回归

[任务卡](../../ops/archive/tasks/done/TEST-CODEX-TRANSLATE-EVENTS-1-current-boundaries.md) / [上级](../README.md)

基点 `9fe9ea11`。Owner Codex；真实 current-r13-6b/stable-id 迁移中间表示，不写生成工程。
六组集中实施、统一质量门；已 accept / done。证据与首轮调度错误均保留，不冒充第三方独立审查。

当前 `translateActivationBlock` 只有生产定义、没有现行生产调用方，已从本批排除；
其存留归架构审查，不把历史专属路径当成优先覆盖目标。

Cursor 接收状态核对：2026-09-26 再次 fetch，远端、本地和干净 worktree 仍为已 counter 的
`b6bcc9b4`，未发现新候选；不重复跑旧反证冒充推进。GLM R1–R3 返工独立处理。

## 本批与已有证明去重

测试均在 `packages/migrate/src/translate-events.<组>.test.ts`，实际 JSON 生成计数，合计59。
fixture 只搭 decoded SourceCmd/label 索引与真实 ScriptRegistry，源数据交付前深快照并立即比同一实参；
没有私有反射、产品mock或平行翻译器。注册后的中间体合同不等于最终作者schema守卫合同。

| 组 | 数量 | 本次差异 | 已有证明不冒领 |
|---|---:|---|---|
| motion | 15 | 有符号分数位移、对象/队伍/骑乘速度、相机三态、八条属主缺席诊断、追逐截尾 | 旧0x15姿势/0x65 sprite/0x6E layer矩阵未重做 |
| state | 10 | 多种恢复/装备字段、有序队伍、map resolver消费/无回调默认、状态落穿、触发范围、独立时序单位 | 旧“0x1B apply-all → clean 全队 HP 变化”只测999；本批新增负值与池/装备并存；followers/palette/dither旧矩阵不冒领 |
| branches | 12 | 真实注册目标体、扣款/扣物顺序、只查不扣、空间/生命/装备条件、无目标gap、流控截尾 | 旧“op1=真目标 → 臂 = 内联命令 + 尾 stopScript”是非registry路径；0x79角色六映射不新增 |
| bindings | 8 | 同一callee继承/显式两个owner对照、scene无self、install清空/忽略/注册、advance/reset、auto只消费一次 | 旧“registry callScript 把显式 1-based EventObject owner 反解为稳定实体 id”保留；本批不单借该旧断言记收益 |
| registry | 8 | origin/返回audit两层防别名、root冲突、嵌套跨chunk imports、memo零重遍历、别名溯源、段转移、异常栈收尾 | 上批scene session隔离与默认传播是汇总消费者，未证明上述注册器边界 |
| folds | 6 | 真loadScene私有地址消费、source transition门、前后位置窗口/阻断、stage不跨界、bake/嵌套clone旁路元数据 | 旧“foldBattleConfig:成对合并…”及“finalizeBattleConfig:标记 bake…”不重做，本批重在折叠后的溯源归属 |

mapIdForNum按真实类型始终返回string；默认map命名用“没有回调”的独立输入验证，不塞非法undefined返回。
`registerRoot` 的 body 属注册器正常共享中间体，不虚构深克隆合同；只验证其明确clone的origin和audit返回值。
未加旧profile、orphan activation、历史inline爆炸截断的专属测试。

## 可复跑验证

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate exec vitest run src/translate-events. src/migrate-scenes. src/migrate-assembly. --reporter=json --outputFile=/tmp/codex-translate-adjacent.json
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate run typecheck
env -u NODE_COMPILE_CACHE node docs/testing/codex-translate-events/mutants.mjs
```

Codex结果：相邻190/190，其中旧翻译78、新增59、上批scene53；`migrate-assembly.`未匹配额外文件，
不将其误记为本次单独相邻覆盖（完整check仍会执行全包）。TC exit0；新增九文件Biome修正后零error。
定向初跑45/45、全翻译137/137，未出现业务失败；docs首次因本席索引排序不一致失败，修正后PASS。

六针工具与配置：[runner](mutants.mjs)、[隔离加载](mutants.config.mjs)。依次钉分数位移舍入、装备槽错位、
扣款符号、auto残留、origin别名、fade时长。每针自己的精确file/fullName，唯一加载替换点；6对照exit0、
6针exit1且只有目标AssertionError。判据拒exit2/null、错title、嵌Error/TypeError/timeout，非报错即算红。
输出 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-translate-events-mutants-zSXPuE`。
源hash保持 `translate-events.ts=4d4efd3f27eb81d3537071d480a6b4f0a233fc142349b8107ce1c54ceb2de7f3`。
日志 `/tmp/codex-translate-{initial,directed,adjacent,tc,mutants,check}.log`。

完整check exit0：9,140项，既有lint 62 warnings/6 infos，无error；本批九文件独立Biome零诊断。

官方覆盖首轮出现本席调度错误：ratchet session尚未退出就误启动strict，后者清理共享coverage目录，
导致前者在reforge报 `Something removed the coverage directory` / ENOENT、exit1。
本席终止该strict及其子进程（exit143），没有将二者当有效证据或以多数通过归因产品抖动。
此前baseline仍为9fe9ea11的8589项、SHA256 `91b1ef55d97548c9d5be9000cf29cc41a7f169cf1b73058b274073e88e2444c1`。
保留 `/tmp/codex-translate-ratchet.log` 与 `/tmp/codex-translate-strict.log`，后续改为同一shell的
`ratchet && strict`严格串行，分别输出 `ratchet-serial.log`、`strict-serial.log`；仅两步均exit0才验收。
其它贡献者待返工包不入此次统计。

## 最终验收与官方增量

Codex：**accept / done**，2026-09-26；[机账](evidence.json)。同一shell保证ratchet成功退出后才启动strict，
两步均exit0。最终 strict **8,648项 / 701生产文件**，相对新基线提升0项；保护基点9fe9ea11。

| 指标 | 前 | 后 | 本批 |
|---|---:|---:|---:|
| 全仓分支 | 44,441/63,178 | 44,779/63,178（70.87752065592453%） | +338 |
| 全仓行 | 56,106/70,600 | 56,291/70,600 | +185 |
| 全仓语句 | 62,386/80,643 | 62,586/80,643 | +200 |
| 全仓函数 | 11,514/15,058 | 11,522/15,058 | +8 |
| fast测试 | 8,589 | 8,648 | +59 |

全部分支增量在translate-events：717→1055/1331；行681→866/941，函数70→78/80。
其它六包完整baseline对象逐一全等、各包生产清单和所有分母未变；未改产品、旧测试或统计排除。
baseline SHA256 `ecd2a3ea2972105b2ae35aeba396752fc8fc7017a0436846484c1badad10f969`。
累计目标进度：从43,418增加1,361分支，约+2.15pp；还差1,798分支，母卡仍build。
本卡纯逻辑无需UI复验，不宣称视觉/E2E通过。无下一位Agent提示词，本席继续下一批。
