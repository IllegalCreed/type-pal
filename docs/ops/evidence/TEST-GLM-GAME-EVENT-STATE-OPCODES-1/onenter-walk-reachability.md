# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 数据面探针:onEnter 段走位/骑乘 op 可达性(下界)

Status: historical
Last reviewed: 2026-10-15
Owner: Codex（文档治理；原作者与原任务 Owner 保留在历史原文）
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

TEST-GLM-GAME-EVENT-STATE-OPCODES-1 的历史数据面探针。原文未提供执行日期、candidate SHA、命令或 raw 路径；本轮只保存并审查该报告的范围，不补造机器执行身份。

## 来源与输入

原方法和输入范围如下；本次没有重新读取全部提取数据或执行扫描：

method: data/extracted/events/all.json segments[0].commands(43503)+ data/scene/*.json onEnterLabel(L_<n> → 全局 ip);
自 entry 线性扫到首个 end(不跟 goto/跳转)= 可达性**下界**;覆盖 160 个 onEnter 入口。

## 断言与业务 oracle

判据是从各 onEnter entry 顺序扫描到首个 end 的下界。因为不跟 goto/跳转，未见 NPC 需 self 的 op 只表示此线性下界未命中；不能推出 160 入口的完整 CFG 或全库不可达。原文没有独立 dedupe/全跳转 BFS 证明，保持缺失。

## 结果

以下数字与 entry/ip 坐标均为原报告记录，不是本轮重统计：

### NPC 走位/骑乘(需 self) 0x10 0x11 0x3f 0x44 0x7c 0x82 0x97
- 0 处(线性下界扫描未见;未做全跳转 BFS,不声称全库不可达)

### party 走位(无需 self) 0x70 0x7a 0x7b
- 0x70: 6 处,例如 entry/ip [(3545, 3663), (3545, 3664), (17194, 17198), (17828, 17835), (28256, 28350)]
- 0x7a: 5 处,例如 entry/ip [(16048, 16050), (16048, 16053), (16048, 16054), (27775, 27819), (32083, 32094)]
- 0x7b: 10 处,例如 entry/ip [(17194, 17194), (17194, 17195), (22681, 22681), (22681, 22682), (22681, 22683)]

## 限制与复核

需判断完整可达性时，另按真实入口、跳转语义和合法 self 调用域构建完整分析；该 probe 不能单独删除测试合同或宣布覆盖完成。当前任务、source review 与实际运行证据分开读取；source/after SHA 只定位本 Markdown 迁移。
