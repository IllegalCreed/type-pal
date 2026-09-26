# Codex资源索引与引用补测

[任务卡](../../ops/tasks/TEST-CODEX-CONTENT-RESOURCES-1-indices-and-references.md) ·
[冻结缺口](../coverage-parallel-wave3-evidence.json)。五模块成批补测，不以测试数量冒称新增分支。

## 实施候选（2026-09-26）

Codex实施/自验，产品与旧测试零修改；新增五测试65项、一个JSON快照fixture。

| 组 | 新增文件（content/src） | 项数 | 与旧测试的差异 |
|---|---|---:|---|
| R1 | frame-sequence.resource-boundaries.test.ts | 20 | 原有35帧像素/UTF8 2与3字节/头部与payload轴不复制；补index叶、4字节码点、块/帧非法索引、provider元数据与故障停止 |
| R2 | script-library.resource-boundaries.test.ts | 20 | 原创建/更新/删末项/基本imports不复制；补元数据形状、同chunk兄弟保留、输入别名、1MiB精确边界、实际owner/孤儿/字节hash独立轴 |
| R3 | asset.resource-boundaries.test.ts | 13 | 原kind/bytes/path/角色类型/多域walk不复制；补catalog元数据叶、角色ID、canonical单节点与choreography/递归所有权分工、IO非Error拒绝 |
| R4 | enemy-team-reference.resource-boundaries.test.ts | 2 | 公开导出叶扫描器的重复ID/精确where/同名非tag；当前**无生产调用者**，不冒称编辑器删除保护或可见缺陷 |
| R5 | project-map.resource-boundaries.test.ts | 10 | 原矩阵/所有权冲突/完整往返不复制；补root/refs/名称/placement形状剩余轴与shared content直入口 |

坏JSON边界与canonical合法输入分开；不构造不可达内部状态追分。
TPFS编码器非ASCII元数据、已校验块后的缺前帧/缺块、数GB分配防御，脚本找到owner后缺chunk等仍不强造。
官方缺口156B/64L不是交付承诺，后续以统一实测为准。

验证：首次65定向绿，TC指出两处branch fixture缺cond（旧guard浅检未拒）；已补真实chance条件，
随后content81文件931/931与TC通过。反控首次被严格判据拒绝：Vitest异步toThrow失败标作Error；
改为捕获实际结局、独立比较完整message，未放宽判据。最终[负控工具](mutants.mjs)+[内存加载配置](mutants.config.mjs)
65绿对照+5针（块索引门/删除输入别名/choreography漏边/空敌队误报/地图名称强转）均恰1个候选AssertionError，
8类判据反例每针走同一judge拒绝，产品hash未变。原始输出
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-resource-mutants-MBaE2l`。

统一全仓门与GLM守卫91项合跑，完成后补实际并集；不计另一架构对话或Cursor尚未交付批。
