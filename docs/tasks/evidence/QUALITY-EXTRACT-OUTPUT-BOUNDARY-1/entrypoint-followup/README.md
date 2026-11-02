# 提取输出与链接入口补审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计主题(任务卡 [QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md](../../../cards/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)):用户2026-10-18独立复查发现的三项入口缺陷——视频转码绕过已批准的共享输出拒绝、CLI绝对路径含目录链接组件时main静默跳过、raw被caller检查的失实注释——按既有'拒绝共享输出'裁决做有限修复。基点298136f19,分支codex/code-quality-3y,单Owner Codex;白名单三实现(cli 911→919行、视频132→136行、helper 25行)加新测试191行。

## 范围与证据

[read-boundaries.json](read-boundaries.json) 载7项全读(三实现/新测试/旧边界测试/package.json/tsconfig.json各带SHA与source快照);[before-sources.json](before-sources.json) 成对冻结旧实现与新测试原字节。primary为Node22 fs realpathSync/lstatSync,与当前Node22.23.2真实链接IO互核。先红后修:[red.json](red.json)(旧三实现运行新测试加原guard单测,2文件8例,5绿/3业务AssertionError——两例真实显示六mp4由other-owner变成converted,第三例静默exit0与预期1不符,非收集/权限/环境失败);[module.json](module.json)(修复后7文件41绿=5新直接+36相邻);[typecheck.json](typecheck.json) 零诊断;[native-archives.json](native-archives.json) 两轮原生JSON档案(5/3与41/0),临时native件归档后删除;[gates.json](gates.json) 列最终静态门与notRun清单。

## 发现

用户三项均成立:旧视频入口能经data或extracted链接覆盖六mp4;旧CLI绝对路径带目录链接静默exit0;raw确无声明中的独立caller检查。修复:视频guard在ffmpeg/输出IO前直接复用现有lstat不清理,只认证已批准两个节点;argv经realpathSync识别main,import无副作用、实际目录链接子进程加载同一真实模块;注释如实限定raw为输入、不属输出守卫。未改转码参数、生成物、资源格式、argv/force接口、游戏API或schema/save;ffmpeg替身只代外部编码器,路径/守卫/进程退出仍运行产品代码,不声称真实编码质量。文档作者首次消费者执行时gates.json尚未生成,出现1条缺附件错误,原件docs-consumers-before-gates保留;补齐附件后重放五消费者(docs-consumers.json),receipt-label-repair.json记录仅改回执标签绑定、raw字节未变。空数组/exit0/全绿不外推为零诊断或产品通过。

## 结论

治理结果=证据保全完整、先红后修链可独立复验;不产生新执行结果。0新增closed;3319 tracked/251 closed/103 review/2965 pending;CLI rework、视频/helper review、新测试review维持,83卡55partial/28pending/0accept。全仓check、官方coverage ratchet、protected fast依用户要求留大任务收尾,本片未跑,不合main;有限修正不等于整卡/整仓accept。

## 整改与复核

未重跑任何命令。既有dataRoot缺失/非ENOENT/默认参数独立oracle及视频外部失败路径、内部文件链接/并发换链仍待核。推送后回pre94其它未核范围,94-102/editor后置。历史结论保持原时点;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3800B / SHA-256 4b4b8b9ec9c02297b7bb8105e4ccc0f2a1ad35d52fc077431170feb38964d85f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 提取输出与链接入口补审

Status: recorded
Owner: Codex（单Agent）
Date: 2026-10-18
Branch: `codex/code-quality-3y`
Base: `298136f19c9b5acb51867a5d96275fe5438c06a7`

## 准入与读域

[原卡](../../../tasks/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)保留既有“拒绝共享输出”用户批准与本轮明确修复指令。白名单三实现cli911→919、视频132→136、helper25行，加新测试191行；[全部读界/SHA](read-boundaries.json)、[旧实现与新测试原字节](before-sources.json)成对冻结。真实caller是根pnpm extract与包extract:videos，旧prepareOutputRoot单测及包脚本/类型亦全文；其它相邻只实跑，不授全文验收。

primary为[Node22 fs realpath/lstat](https://nodejs.org/docs/latest-v22.x/api/fs.html#fsrealpathsyncpath-options)，与当前Node22.23.2真实链接IO相互核验。第一阶段工具所有权修复，无SDLPal游戏机制或第二阶段设计变化。未调用真实仓库提取、未写主树/原盘/生成物。

## 问题与最小实现

视频旧路径会经data或data/extracted链接写入另一树，既有根提取守卫未接入这个caller。现在main先调用共享assertOwnedOutputRoot，再允许ffmpeg或输出IO；guard不创建/删除，未复制判定。只认证已批准两个节点，内部video/mp4链接及并发换链未授防护信用。正常转码参数、mtime/非零增量判定保持。

CLI旧resolve仅词法比较，真实绝对目录链接入口与import.meta.url不等，main未执行却exit0；现在realpathSync(argv[1])。实际目录链接子进程加载同一真实模块，缺SSS时正常进入main并exit1；不同真实入口import不执行main。未增加argv/force接口。helper只纠正“raw由caller另检”的假注释，raw仍是输入，不新加raw限制。

## 先红后修与测试质量

[red](red.json)在旧三实现运行新测试加原guard单测：2文件8例，5绿/3业务AssertionError。两个失败真实显示六mp4由other-owner变成converted；第三为静默0与预期1，非收集/权限/环境失败。新5合同只有两节点穿透、正常增量兼容、绝对链接入口、import无副作用；不重复旧main清理/格式/十二全局hook合同。

[最终模块](module.json)7文件41绿=5新直接+36相邻；原CLI正常、错误退出、资产/字体/全局hook均保留。[typecheck](typecheck.json)零诊断。[原生JSON档案](native-archives.json)和未裁剪merged raw/gzip含命令/cwd/时间/exit/signal/hash；临时native文件校验归档后删除。所有进程等待退出并由afterEach删除自有临时根，node_modules仅链接本治理树只读依赖。ffmpeg替身是真实外部可执行文件，只代编码，路径/守卫/进程和文件IO仍运行产品代码；不声称真实编码质量。两轮输入相同，新测试字节未改，先红不是后补伪造。

## 当前结论与下一步

[最终门](gates.json)列实际静态结果；五真实文档消费者重放，未改125工具测试沿用原37e2cd7c9原件，不宣称新跑全check:docs。0新增closed；3319 tracked/251 closed/103 review/2965 pending。CLI rework、视频/helper review，新测试review，83卡55partial/28pending/0accept保持。既有dataRoot缺失/非ENOENT/默认参数独立oracle及视频外部失败路径仍待核。

全仓check、官方coverage ratchet、protected fast依用户要求留大任务收尾，本片未跑，不合main。视频输出与链接入口缺陷已有限修正，不等于整卡/整仓accept。推送后回pre94其它未核范围，94–102/editor后置。

文档作者首次消费者执行时gates.json尚未生成，出现1条缺附件错误；原件docs-consumers-before-gates保留。补齐附件后重放五消费者，最终结果单列，不把草稿失败抹成通过。
```
<!-- incremental-original-source:end -->
