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
