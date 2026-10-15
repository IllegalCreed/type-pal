# CODE3b：SSS/M.MSG成果复审

归[全83卡任务](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，原[3b历史卡](../../../archive/tasks/done/CODE-QUALITY-3b-pal-extract-io-boundaries.md)保持历史done/签字，不冒充本轮accept。起点8843d459b；唯一codex/code-quality-3y，main=f98d0ddd8。本片只改两份boundary测试，生产解析器/资源/格式/公共API/规则/基线不动，0新增关闭。

## 原件、caller与逐文件结论

[完整阅读/区间/SHA](read-boundaries.json)单列实际边界。完整原卡范围为两个parser及两个boundary；两真实raw测试和GBK/MKF/roundtrip是相邻读取，包绿不能替代其它文件核验。

| 文件 | 核验、修复及剩余项 |
|---|---|
| io/sss.ts | 全文只读。固定32B EO/8B scene、chunk2偶数/3四倍数/4八倍数拒绝；DataView显式LE与byteOffset/byteLength，3个SHORT有符号，其余WORD无符号。raw、objects、offsets新分配，bytecode沿MKF借用输入视图，不擅自改ownership。无异步状态、全局可变资源或需关闭句柄；同步错误向caller传播。两处raw构造相似但承担不同结构映射，本片未为抽象而改资产管线。空五块/返回视图后续编辑等未以新合同关闭。旧关闭仅保留历史，不新增当前accept。 |
| io/msg.ts | 全文只读。Uint32Array限定offset值域，先验证越界/非递减，再按相邻offset切片，末offset不另产消息；空段保留，合法[0]零消息。调用唯一decodeGbk，原fixup政策不改；输入只读、结果新string数组，无异步或资源所有权。CLI与roundtrip均真实调用，不把合成GBK编码样本冒充原盘或完整文本codec真值。 |
| io/sss.boundaries.test.ts | 原guarded view排除了保护区，旧注释却说已覆盖；现直接调用真实parser并比较整个实际父buffer。两EO、两scene语义/raw全部手列，第二条记录不再只查局部字段；bytecode expected不再复用输入u16Bytes构造器。原两组合错误例拆成5个独立chunk拒绝轴，4→7；是不同结构guard的原子执行，不为覆盖数量增加数据变体。合成数值明确是WORD/SHORT布局向量，不冒充可运行游戏场景。 |
| io/msg.boundaries.test.ts | 对实际调用的bytes/offsets及两父buffer前后快照比较；两视图保持4/8非零偏移且有非零保护区。四条独立字符串、空段、未读尾部与合法单offset保留；纠正“倒序政策未定”的过期注释、末offset标题，越界/倒序拆两例并核实际索引和值，3→4。当前政策来自既有3b实现，未重新选择产品降级行为。 |
| io/sss.test.ts / msg.test.ts | 两文件全文读、未改。前者六项sanity不能代替完整字段；后者三项只有规模、字符串类型、含逍遥，尚无完整文本oracle；类型smoke、重复与raw精度留下一有限片。独立raw探针本轮全量一致，不自动提高这些弱测试质量。两文件pending→review，不能标已验证。 |
| io/mkf.ts / shared/mkf.ts / utils/gbk.ts / roundtrip.ts | 全文读，重导出真实shared MKF，原始布局由共享校验。decodeGbk的NUL/GBK与用户确认的转码残留fixup沿旧边界；本片未证明全部文本的native对等。roundtrip真实解析SSS→消息→disasm/recompile，source只读，不手写业务模型代替caller。 |

primary：SDL global.h95–121/239–243定义EO/scene/指令；global.c289–290/402–415加载SSS；text.c792–850给offsetCount−1与相邻offset长度。真实CLI150–250/末catch是loadFile→parseSss→parseMessages，错误由main拒绝向stderr/exit1传播；未运行CLI清理/写盘，也未声称CLI有事务性。roundtrip真实caller已全文核对。工程笔记22/62/172要求真实函数、原始字节忠实与保留转码残留政策。第二阶段产品不在本片。

## 判别力与原始数据

[counter-probe.py](counter-probe.py)14轮完整四文件、每轮同一执行集合，无name filter/skip/todo/timeout调整。command/cwd/exit/signal、JSON/raw、源与测试/副本/重建hash及finally清理见[before](before-proof.json)/[after](after-proof.json)。六针旧16全部绿，新各19绿1指定AssertionError：SSS前保护/后保护、第二EO/scene语义字段、MSG正文/offsets输入修改。原source和正式测试在每轮保持，恢复20绿、0pending/0stderr；不把普通Error或收集失败计有效反控。

[原生执行身份变化](identity-change.json)来自完整runner JSON，不是另跑vitest list或官方覆盖率。四文件16→20，实际是SSS4→7、MSG3→4，原生4身份移除/8加入明确披露，包括标题纠正。所有原输入/拒绝轴保留，文件没有count减少，不新增退役豁免；现有26项/net60数据、matcher/config/baseline均未改。

[raw-probe.py](raw-probe.py)/[原件](raw-proof.json)用独立Python struct按LE、3SHORT/13WORD及4WORD字段对照真实parser：原盘5077 EO、295 scene、3955对象WORD、13514消息offset及43503条指令全部对应摘要相同；原SSS/M.MSG及实际输入均保持。消息offset从0到M.MSG完整长度、非递减，解析13513条。正文摘要只作观察，**不是**SDL native执行或完整GBK/fixup oracle；没有生成或替换任何资产。

[verify.py](verify.py)/[verification.json](verification.json)由另进程重建14轮源/副本/失败集合和独立struct摘要、恢复与清理，仍是同Codex，不冒充第三方。原两test旧关闭精确撤回review，未以全量raw结构对照关闭生产或相邻文件。

## 回归与交接

[回归原件](regressions.json)：定向相邻8文件42例（含真实roundtrip）、完整extract72/435、shared16/126、双方typecheck、coverage-tools71通过，0stderr块。完整check、official ratchet、protected fast本片未新跑，editor运行时诊断未清，不合main；[静态门](gates.md)按实际回执记录。

当前机器3289 inventory /206closed /230review /2853pending，0新关闭；全83卡10partial/73pending/0accept。下一有限片先收两份raw测试的弱oracle/排重，再继续3d/3g和其它编号卡；94–102/editor原目标继续。高风险机制/资产算法冻结；无下一位Agent提示词，Codex单Agent继续。
