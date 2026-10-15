# CODE3b 原盘测试：从sanity到可判别的固定oracle

归[全83卡复审任务](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，起点3a9f47043；唯一codex/code-quality-3y，origin/main=f98d0ddd8。本片只改io/sss.test.ts与io/msg.test.ts，生产解析器/资源/格式/API/规则/基线不动；两文件仍review，0新增关闭。

## 逐文件与一手依据

[全文与既有全文同SHA](read-boundaries.json)记录当前两文件、生产/相邻caller边界；原卡/SDL直接范围沿[上一片](../README.md)，不把执行过的相邻文件算全文语义验收。

| 文件 | 修复、oracle与限度 |
|---|---|
| io/sss.test.ts | 六项sanity同一次解析原盘，只核非空/倍数/首raw长度。现合为一个当前原盘完整结构合同：固定输入SHA，5077 EO全部16个语义字段+16raw槽、295scene的4字段/raw、3955 WORD、13514 offset及43503条完整指令各有独立冻结摘要。数据由Python struct从原始字节直接读出，不用被测TS自算expected；比较实际输入前后hash。原非空、8B、raw16合同由精确数量和全字段摘要蕴含，不留弱重复。 |
| io/msg.test.ts | 原3例只有>1000、typeof字符串、some逍遥。现一个实际parseSss→parseMessages合同，精确13513条与13514offset、固定两原件SHA；手列0/1/100/6757/13512五文本，保留$10/~30标记、ASCII冒号与∶、全角空格/波浪。expected来自原始DWORD区间/hex和Python严格GBK；无PUA/无NUL的五固定原条，不添加动态filter/skip/exclude。实际正文、SSS和传入offsets调用前后守恒。13513蕴含旧规模，ID1精确逍遥、ID100精确文本承接旧抽查；类型smoke不单独计运行时贡献。全正文/fixup/native正确性仍未知，不关闭整文件。 |
| 生产/相邻边界测试 | 沿上一片全文相同SHA，只读。两boundary继续保留合成bit-pattern、非零view/保护区与7个独立拒绝轴；raw校验当前整份真实数据保真，两者不是仅换数字的重复样本。重复的两行private SHA接线就地，无共享可变状态，不为此耦合PNG/资产helper或新建万能validator。 |

[oracles.py](oracles.py)/[独立原件](oracles.json)不import TS：SSS按SDL global.h95–121/239–243的3SHORT/13WORD、4WORD和指令字节解析；MSG从raw chunk3 u32 LE读相邻offset，原文hex及精确start/end全部公开。原盘直接数据是primary，不声称执行了SDL C或pal.exe。固定输入为本仓库当前Win95原件，不把这些尺寸/文字推广到所有PAL方言。

## 判别力与精简

[counter-probe.py](counter-probe.py)16轮完整四文件，command/cwd/exit/signal、原生JSON/raw、file×fullName集合、源/正式测试/副本/重建SHA与finally清理见[before](before-proof.json)/[after](after-proof.json)。无name filter、skip/todo、timeout放宽或核心mock。

- 五个新缺口：只保留前两EO状态、真实指令尾丢失、真实文本首/中/末错值，旧四文件20全绿，新各12绿1指定AssertionError。故障限定真实大输入，不把合成边界也改坏后用多红充针。
- 原有oracle转移另列：真实字节码清空、全部逍遥改名，旧/新各恰一业务AssertionError；两条1→1保留不计五枚旧绿新红。
- 恢复13通过、0pending/0stderr。两parser字节不变，实际原盘未写入；临时同目录模块/copy精确清除。

[执行身份变化](identity-change.json)来自原生完整runner JSON，不伪称另跑vitest list：raw SSS6→1、MSG3→1，9移除/2加入；两boundary身份不变，四文件20→13。实际读取当前官方testSelection，两文件原先就是full-only；HEAD/main/旧3y三冻结baseline均无两文件条目，旧测试字节也逐一一致。因此不新增退役豁免；原26项/net60、matcher/config/baseline字节保持。精简按强oracle承接，不为保数量堆弱测试。

## 版本证据与当前验证

[verify.py](verify.py)/[verification.json](verification.json)独立进程重算raw struct和五原文，重建16轮源/副本/指定失败集合与恢复。上一片的after原件固定为Git候选3a9f47043，重建其7轮after源/测试/原生回执；不能在当前已精简raw上运行旧“当前文件必须等于旧after SHA”的检查后把正常版本漂移冒充缺陷，也不改写旧原件。旧六针是3a9当时事实，不宣称在新集合仍各一红。此处仍是同Codex另进程，不冒充第三方。

[回归](regressions.json)：8文件35定向相邻（含真实roundtrip）、完整extract72/428、shared16/126、双方typecheck及coverage-tools71通过，0stderr块；不是逐文件或全仓统一验收。[静态门](gates.md)另记docs/ledger/diff与lint-zero。完整check、official ratchet、protected fast本片未新跑，editor诊断未收口，不合main。

账本3289 inventory /206closed /230review /2853pending不变，0新关闭；全83卡仍10partial/73pending/0accept。MSG正文其余13508条与fixup全量oracle、SSS未定边界继续review；下一片CODE3d PNG输入成果，再续3g和94–102/editor。无下一位Agent提示词，单Agent继续。

阶段合并优先级：本原盘片提交后先回QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1的C10阻塞，争取统一零诊断窗口与阶段合并，再续83卡队列中的3d/3g。范围仍含全部83卡及94–102/editor，未核项不变更为accept。
