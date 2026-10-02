# O/Q NEXT2 Codex 独立原始证据

[审核与一次合并提示词](../codex-oq-next2-review-20261002.md)、[机器审核](../codex-oq-next2-review-20261002.json)、[运行/源与支持文件 hash 清单](manifest.json)、[O09 真实解压复现](o09-probe.json)。
[Q返工独立G/B合法输入2/2](../codex-q-next2-r1-input-preflight-20261002.json)另保留真实命令与输出 `q-input-preflight.run.json.raw.txt`；只运行公开函数，未变异产品、不计有效针或新例。

每个实际执行的 `NAME.json.raw.txt` 是原始 Vitest JSON 字节，`NAME.run.json.raw.txt` 保留命令、cwd、exit/signal/spawn、完整 stdout/stderr 与执行前完整源码快照。清单中的 SHA256 对应原字节，不是格式化报告 hash。
机器审核中每针标清正控实际复用的最近恢复报告；它是同一固定源/测试/fixture/config 的真实运行，不冒称另外启动一遍。

## 有效代表控制（两波各四）

O：SHORT-LATER（04）、ABORT-NO-LATER-READ（06）、DECODE-OWNERSHIP（10）、SECOND-COMPRESSOR-FAILURE（07）。每相完整 84 身份，exit 0/1/0，指定唯一 AssertionError、恢复/重建变异 hash 一致。
Q：EXACT-FIRST（01）、NEAREST-TIE（03）、TARGET-ALIAS（09）、RAGGED-GRID（11）。每相完整 48 身份，同判据通过。
精确变异 from/to/section、三态原始报告、全部 hash、目标错误全文见机器审核及 manifest；不执行作者反控工具。

## 不计有效针的诊断尝试

O width/cancel 两次为真实业务红，但 reporter 首部是 Error 而非本卡严格要求的 AssertionError，不计有效针，不改写原文。
首次 decoder subarray 还影响旧 Buffer/Uint8Array 类型比较，双红不计；改为真实 Uint8Array view 后仅 O10 红，才计代表控制。
invalid-block 读前守卫变异击中 O12 和四条更强旧证，共五红不计针；据旧完整 matcher 裁定 O12 existing-proof。

O preio 三态只声明选中 01/02，真实提前 frame0 读取仍 2/2 绿，其余十叶确为未选中，不伪写 passed；这是断言漏检诊断而非有效红控制。
Q 分别移除 dg²、db²、output 容量 min 项，各 48/48 仍绿；分别按 G/B oracle 漏检、平台 view cross-check 裁决，不冒作 valid-red。
O09 最终冻结源上忠实复现提交内 fake compressor，parse 两块成功但真 inflate 两块均失败；这是 fixture/oracle 问题，不是产品缺陷。

全包原件：`o-full.json.raw.txt` 1441/1441；`q-full.json.raw.txt` 2164/2164。Q 原 stderr 有 jsdom HTMLMediaElement pause 未实现提示，原样保留，不声称 console 零。
Q 副本只读复制相同 canvas@3.2.3 的构建产物到自己的忽略依赖目录；未写产品/真实工程/数据，也未走剧情或浏览器。
型检/完整静态零/docs/716 冻结与 Owner 范围原输出见对应 run 文件。完整 helpers/原日志另保留 `/private/tmp/codex-oq-next2-review.ydLzy0`，只退休本轮三棵独占副本。
