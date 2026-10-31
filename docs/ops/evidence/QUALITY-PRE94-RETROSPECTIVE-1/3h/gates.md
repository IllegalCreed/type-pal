# CODE3h PNG 切片质量门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是CODE3h切片质量门MD回执，原件为下方逐字节保全的固定main源（986B，SHA 8bbe18f82da3）；机器字段以[静态原件](static-gates.json)与首轮[静态回执](initial-static-gates.json)为准。

## 来源与输入

正式四测试正常9例通过；两个缺口各旧10绿/新8绿1指定AssertionError（palette index1→0改写、cause身份替换），错误上下文与close转移的诊断单列（4红→1红、2红→4红含P10三轴），完整原件见before/after-proof。相邻game17文件107例、extract4文件16例、coverage工具74例通过，0失败/跳过/运行时诊断；game typecheck与四文件Biome通过；局部真实png.ts V8覆盖（statements20/20等）保持，只是局部对照非官方门。

## 断言与业务 oracle

最终docs（1375 Markdown/7507链接/444卡）、lint-zero（4538文件0/0/0）、ledger（3289/203closed/245review/2841pending）与diff-check以静态原件为准；原始输出按门名保存raw.gz。

## 结果

全仓check、官方ratchet、protected fast本片未新跑，editor全包诊断仍未清；不合main、0新增关闭。全83卡13partial/70pending/0整卡accept，统一门不得由局部绿替代。

## 限制与复核

首轮静态回执中证据重建通过、docs因父README漏掉3h子目录直链exit1（'子目录未进入导航'），后续静态门当轮未执行；补父导航后重新运行完整静态检查，不改写首次失败。未重跑任何命令。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 986B / SHA-256 8bbe18f82da3f18278a9e2b9f17eab4f358168cd71a6cc57876804bbd7b548b9；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3h PNG 切片质量门

正式四测试正常9例通过，两个缺口各旧10绿/新8绿1指定AssertionError；错误上下文/close转移诊断单列，完整原件见before/after-proof。相邻game17文件107例、extract4文件16例，coverage工具74例通过，0失败/跳过/运行时诊断；game typecheck和四文件Biome通过。局部真实png.ts V8覆盖保持，只是局部对照。

最终docs、lint-zero、ledger与diff-check以[静态原件](static-gates.json)为准；原始输出按门名保存raw.gz。全仓check、官方ratchet、protected fast本片未新跑，editor全包诊断仍未清；不合main、0新增关闭。全83卡13partial/70pending/0整卡accept，统一门不得由局部绿替代。

首轮[静态回执](initial-static-gates.json)中证据重建通过，docs因父README漏掉3h子目录直链exit1，后续静态门未执行；对应initial-docs.raw.gz保留。补父导航后重新运行完整静态检查，不改写首次失败。
```
<!-- incremental-original-source:end -->
