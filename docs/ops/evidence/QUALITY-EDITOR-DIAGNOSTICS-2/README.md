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

## 精度与排重（当前候选，完整门待续）

- G04-03：合法未保存snapshot含真实上游字节，先证blob存在，再走UI删除；替代原初始就不存在的虚弱断言。
- G04-07：同长度磁盘损坏仅为IO边界反例；精确sha错误、原state身份与preview错误均核，未混成合法业务输入。
- G04-02：取消确认仅一次且state原引用；G04-05：补齐undo的catalog恢复并继承磁盘blob SHA/目录/解码oracle。
- G04-04并入G04-05，10→9；没有删除独立pending-blob、取消、失败、引用readiness、双删除历史或定义/资产两步轴。
- final-oracle-*：两个产品mutant使旧oracle各绿，新oracle各恰一指定AssertionError；恢复9/9、0skip、0诊断。
  原件/执行集合/命令/cwd/源与test SHA/精确清理见oracle-final-proof.json；独立重建见oracle-rebuild.json。
  oracle-proof.json是精简前十例快照，保留历史；不当最终九例恢复证据。
- retirement-proof.json已与官方旧baseline的10例身份摘要匹配；只增精确metadata，判据/拒绝测试不变。

逐例合同：01入口互斥；02取消不变；03初始pending blob删除与宿主焦点；05磁盘undo→真实解码→redo；
06 stale索引禁用及恢复；07 IO错误拒绝/零污染；08双删除双undo顺序；09定义/资产两步undo；10真实内容引用阻止删除及引用计数。
04/05均为authored无用途磁盘源；3/4帧在删除/undo命令不分支，04所有业务oracle已进入05。
相邻G05-04只删除定义，未删资产；G05-06替换字节，G05-09追加收紧，均非本片磁盘删除历史。
主BattleSpriteLibrary测试已读fail-closed/live provider段；registry已读pending真实caller。其余全库排重仍未知，不写“没有任何重复”。
