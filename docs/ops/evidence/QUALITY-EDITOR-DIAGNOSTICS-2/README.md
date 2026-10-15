# C02 宿主与删除生命周期证据

任务见[QUALITY-EDITOR-DIAGNOSTICS-2](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-2.md)。
当前build；G04原始执行与JSON保存在baseline.raw.gz、baseline-tests.json.gz，元数据baseline.json。
后续逐文件结论、消融、oracle与统一门在本目录更新；不提前声明accept或关闭文件。

G04原十例完整保留：baseline404、仅宿主340、宿主+驱动234、再等待真实删除提交0；每次完整JSON与raw.gz均保留。
实际生产caller DataMode.tsx:693-720；私有cache默认spy透传，只观察当前reader的实际Promise，未替换核心或另造decode。
色表观察来自当前assetResolver.readRoleText；异常由真实preview catch渲染，不用allSettled代替错误oracle。
相邻9文件79通过、535条其它act；不称统一门通过。实际读取范围及未核caller见read-boundaries.json。
三文件列review，0关闭。下一步核G04 oracle/重复，再集中完整门。

检查点ledger首次失败：新增行误写不支持的“待审”状态，已改为工具支持的review；未将失败算通过。
