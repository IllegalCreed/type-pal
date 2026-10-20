# C3 补证声明矩阵与执行原件(2026-10-20 返工采集)

本目录是 73-78 shell 切片的 C3 补证入口:[`manifest.json`](manifest.json) 索引全部原生原件(命令/cwd/时间/exit/stdout/stderr/JSON)。

本目录按 Codex C3 裁定补齐执行证据。所有新采集均为**本次返工的原生原件**(完整命令/cwd/时间/exit/stdout/stderr/JSON,见 [`manifest.json`](manifest.json) 索引);历史运行的缺口按事实标注"未保存/作者自报",不补造为旧原件。

## 本次原生证明(native,原件在本目录)

| 捕获 | 结果 | 原件 |
|---|---|---|
| audio 基线 | 20/20 passed,exit 0,stderr 0 字符 | `audio-baseline-20.raw.txt` + `.json` |
| 变异①删 DM29 分支(`if (inBattle && battleIntroActive) return 0`) | exit 1,**恰 1 失败**,身份=`pickMusicTrack DM29:入场揭场未完 → 0 静默;非战斗不受 intro 标志影响` | `mut-dm29-branch-removed.patch` + `audio-mut-dm29.*` |
| 变异②仅 setMusicEnabled 补播点硬编码 true | exit 1,**恰 1 失败**,身份=`L47 补播还原真实 loop:非循环 track 经 setMusicEnabled 开关后仍以 loop=false 重播` | `mut-loop-enabled-site-only.patch` + `audio-mut-loop-enabled-only.*` |
| 变异③仅 setMusicBackend 注入补播点硬编码 true | exit 1,**恰 1 失败**,身份=`L47 setMusicBackend 注入补播也用记录的 loop=false` | `mut-loop-backend-site-only.patch` + `audio-mut-loop-backend-only.*` |
| 恢复后复跑 | 20/20 passed,exit 0,stderr 0 字符;audio.ts blob 与候选 89800a1c1 逐字节一致 | `audio-recovery-20.*` + `final-tree-state.raw.txt` |
| biome check packages/game/src/shell/input.ts(C2 改动文件) | exit 0,0 error/0 warning/0 info,stderr 0 | `static-biome-input-ts.raw.txt` |
| tsc --noEmit(packages/game,C2 改动后) | exit 0,stdout/stderr 0 字符 | `static-tsc-game.raw.txt` |

失败运行的 stderr 非零(515–712 字符)是 vitest 对指定业务断言失败的输出本身,非环境污染;两次绿运行的 stderr 恒 0 字符。每枚变异均精确单点位(.patch 逐行可核),三枚恢复经 `git diff --quiet` 断言通过,终态树状态原件在 `final-tree-state.raw.txt`。

## 复合反控重分类

原 `../mutation-loop-hardcoded-true.json`(两补播点同时硬编码 true → 2 红)保留为**复合观察**,不再主张两枚独立单红信用;独立单红信用由上方变异②③分立承担(各恰 1 指定业务 AssertionError)。原 `../mutation-dm29-branch-removed.json` 的历史 console/exit 数据**未保存**(当时仅存 JSON reporter 输出,exit=1 为作者自报);其身份与计数现由本次新重放(变异①)完整承接。

## 历史声明的事实边界(不作旧原件补造)

- 五份 `directed-final.json`(45 文件/345 passed):JSON 原生证明测试计数与通过/失败身份;当时的 exit 0 与"零 stderr"声明为**作者自报**(控制台观察过,完整 stdout/stderr 原件未保存)。本轮不重跑 345 例;audio 域的零诊断现由本目录基线/恢复两份原生原件支持。
- 原审查期间的 typecheck/biome/check:docs 绿灯:作者自报,原件未保存;C2 改动后的当前状态由本目录两份静态原件支持,check:docs 以本返工提交前实跑为准(见返工提交说明)。
- 原审查期间的变异恢复(`git checkout` 后 diff 干净):作者自报;本次三枚恢复为原生断言。
