# CODE3b：SSS/M.MSG成果复审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本篇是 CODE3b「SSS/M.MSG 边界测试」切片的证据索引，归 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md) 全 83 卡复审（起点 8843d459b，main=f98d0ddd8，唯一 codex/code-quality-3y）；原 [CODE-QUALITY-3b-pal-extract-io-boundaries.md](../../../archive/done/CODE-QUALITY-3b-pal-extract-io-boundaries.md) 保持历史 done，不冒充本轮 accept。本片真实目标：只改两份 boundary 测试——sss.boundaries 4→7（两组混合拒绝拆成 5 个独立 chunk 拒绝轴、手列两 EO/两 scene 完整语义与 raw、父 buffer 保护比较）、msg.boundaries 3→4（越界/倒序拆两例并核实际索引和值、输入 ownership 快照）；生产 sss.ts/msg.ts 及资源/规则/基线不动，0 新增关闭。

## 范围与证据

读取边界单列在 [read-boundaries.json](read-boundaries.json)：两 parser（sss.ts 211 行、msg.ts 30 行）、两 boundary、两 raw 测试、gbk/mkf/roundtrip 全文；cli.ts 仅 150–250/884–901，SDL global.h 74–125/237–243、global.c 284–291/392–421、text.c 780–850 为 primary。判别力：[counter-probe.py](counter-probe.py) 14 轮完整四文件，六针（SSS 前保护/后保护、第二 EO/scene 字段、MSG 正文/offsets 输入修改）旧 16 全绿→新各 19 绿 1 指定 AssertionError，恢复 20 绿，原件见 [before-proof.json](before-proof.json)/[after-proof.json](after-proof.json)。身份变化见 [identity-change.json](identity-change.json)（16→20，SSS 4→7、MSG 3→4，4 移除/8 加入如实披露，无退役豁免）。独立 Python struct 全量对照见 [raw-probe.py](raw-probe.py)/[raw-proof.json](raw-proof.json)；另进程核验 [verify.py](verify.py)/[verification.json](verification.json)。

## 发现

真实数字与含义：原盘全量 5077 EO、295 scene、3955 对象 WORD、13514 消息 offset、43503 条指令——独立 Python struct（LE、3SHORT/13WORD/4WORD）与真实 parser 五个 digest 全部一致，消息 offset 从 0 到 M.MSG 完整长度非递减、解析 13513 条；但正文摘要只是观察，不是 SDL native 执行或完整 GBK/fixup oracle。六针 after 各恰 1 红：前/后保护区变异被「非对称 16 字段 EO 逐字段精确」例的父 buffer 比较捕获（期望 238 填充 vs 实得 0 覆盖），第二 EO/scene 字段变异被逐字段精确例捕获，MSG 两 ownership 变异被「四条精确（含空条）」例的输入快照比较捕获。旧测试盲点根因：原 guarded view 排除了保护区却注释称已覆盖；原错误例混合多轴且只查局部字段。

## 结论

本片时点结论：生产两个 parser 字节不变；两 boundary 旧关闭撤回 review、两 raw sanity pending→review，0 新增关闭；机器 3289 inventory/206closed/230review/2853pending，全 83 卡 10partial/73pending/0accept。恢复面：定向相邻 8 文件 42 例（含真实 roundtrip）、完整 extract 72 文件 435、shared 16 文件 126、双方 typecheck、coverage-tools 71 通过，0 stderr 块（本片恢复面零 stderr，与 3/3-annotate 片的 10 块不同）。

## 整改与复核

边界如实：完整 check、official ratchet、protected fast 未新跑（等 editor 诊断稳定窗口），不合 main；后继增量见 [README.md](closeout/README.md)（六文件收口）与 [README.md](raw-tests/README.md)（raw 测试补证 9→2）；当前 raw 文件已按新卡面变更，旧 after 的 SHA 检查应对 Git 3a9 候选，不反写旧原件。静态门 [gates.md](gates.md) 与 [regressions.json](regressions.json) 按实际回执记录；治理页不重开任务、不重跑执行。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 6703B / SHA-256 cdd6917d4151c805a56b757be3f2c8a82fd1574f3a2e1187ea6e0e82acbf2b6e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3b：SSS/M.MSG成果复审

2026-10-21后继模块收口见[当前六文件回执](closeout/README.md)；下方均保留各原切片时点，不沿用旧门诊断。

归[全83卡任务](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，原[3b历史卡](../../../archive/tasks/done/CODE-QUALITY-3b-pal-extract-io-boundaries.md)保持历史done/签字，不冒充本轮accept。起点8843d459b；唯一codex/code-quality-3y，main=f98d0ddd8。本片只改两份boundary测试，生产解析器/资源/格式/公共API/规则/基线不动，0新增关闭。

当前后续成果见[原盘测试补证](raw-tests/README.md)：raw9→2、五有效反控/两oracle转移，extract428零stderr；下方保留边界切片3a9f47043当时原件与结论。当前raw文件已按新卡面变更，旧after的SHA检查应对Git3a9候选，新验收器同时重建该冻结证据，不反写旧原件。

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
```
<!-- incremental-original-source:end -->
