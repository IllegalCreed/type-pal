# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 数据面探针:onEnter 段走位/骑乘 op 可达性(下界)

method: data/extracted/events/all.json segments[0].commands(43503)+ data/scene/*.json onEnterLabel(L_<n> → 全局 ip);
自 entry 线性扫到首个 end(不跟 goto/跳转)= 可达性**下界**;覆盖 160 个 onEnter 入口。

## NPC 走位/骑乘(需 self) 0x10 0x11 0x3f 0x44 0x7c 0x82 0x97
- 0 处(线性下界扫描未见;未做全跳转 BFS,不声称全库不可达)

## party 走位(无需 self) 0x70 0x7a 0x7b
- 0x70: 6 处,例如 entry/ip [(3545, 3663), (3545, 3664), (17194, 17198), (17828, 17835), (28256, 28350)]
- 0x7a: 5 处,例如 entry/ip [(16048, 16050), (16048, 16053), (16048, 16054), (27775, 27819), (32083, 32094)]
- 0x7b: 10 处,例如 entry/ip [(17194, 17194), (17194, 17195), (22681, 22681), (22681, 22682), (22681, 22683)]
