# 物品作者记录与脚本身份实施记录

对应[EDITOR-ITEM-AUTHORING-1](../ops/archive/tasks/done/EDITOR-ITEM-AUTHORING-1-item-script-identity.md)，r1、done，统一候选451cbbb7，产品冻结1e0388b0。2026-09-21 Codex实现者自验accept（c86ad00f）、GLM独立代码/矩阵accept（b895a367）、Kimi独立实现accept（139c0b04）同候选齐；用户明确授权后由Codex核定done并归档。Coding Owner/功能视觉Codex；GLM参与前期静态取证及独立代码复核，不是本次实现或新增测试作者。

收口核定：接手main工作树干净，候选后产品/脚本/本卡工具零diff，无counter/返工项/缺签豁免；既有门禁和原生功能证据有效。本次仅更新任务/看板/索引及关联文档、运行文档门，不改产品/覆盖率基线，不重跑产品测试。D-06/D-07关闭；TB00/TB01仍按原卡窄counter返工，full/Q1/Q2未跑边界保持，不代表R4或N6b已开门。无下一位Agent提示词，本卡已收口。

## 实现与边界

- 新建/复制/删除通过既有EditorHistoryCoordinator成对更新主会话与canonical item；新增两个SnapshotCommand，不建第三历史。缺协调器、错配会话在写入前拒绝。删除继续使用原DeleteItemCommand的当前引用守卫。
- 复制合并当前普通字段和未保存私有正文后深拷贝，再为新owner投影。缺正文不能被复制流程静默丢弃。
- 内存私有引用固定`__author-item-private-runtime`，id直接保存原始ItemId；共享仍为`__author-script-runtime`+原始ScriptId。构造/识别集中于content的item-script-runtime-ref.ts，reforge转出；UI、projection、内容运行态guard、executor、main同步更新。未知tag/错误owner拒绝，用户ID不拼接/解析。
- ContentBundle引用校验明确消费canonical物品；EditorState另声明交互shell。共享引用按sharedScripts的自有键检查，不读旧chunk/id。移除ItemTab无生产供给的旧分片选择fallback、诊断中的旧投影抑制分支。
- 内容sprite collectors有真实迁移中间态ItemData caller（pal-migration.ts的assertPalBattleSpriteBaseline），单独类型化该读取表面；没有把它误当canonical校验输入，也没有加旧格式fallback。当前PAL publication去掉不必要的items as never。
- content20、SAVE8、作者JSON、私有use槽/基数、投掷能力不改；未迁移、未改PAL或普通存档。

补充普查：content/validate.ts原isItemPrivateRuntimeEffect也是前缀式消费者，原GLM“6站点完整”漏了此处；已经同步更新并加共享同前缀不得获得私有混合权限的回归。属于r1原定全消费链，不变更前提或持久方案。

## 测试与负控制

新增14项：content运行态guard1项；reforge item-script-identity5项；editor item-authoring-workflows6项、ItemTab实际操作2项。旧测试保留业务断言，只适配新的当前内存ref；配对caller census从7更新为10（新增创建/复制/删除）。

- 真实executor→ScriptProjectRuntime分别执行共享/私有setFlag，host只观察已生效标记，不手写执行语义；成功消耗物品、静态定义不变。未知tag/异主在执行前拒绝。
- 正式seed/loader→两会话→私有正文→serialize→真实授权/writer/journal→loader，正文与committed落盘均核。宿主替身仅内存目录及origin登记/凭据存储，**不声称真实浏览器FSA/IDB验收**。
- 三种共享ID（普通/同owner前缀/他owner前缀）诊断、序列化重开与精确悬空ID；复制未保存字段/混合效果/正文；删除undo/redo/同ID重建；双侧失败保留历史/redo；真正缺正文拒绝。
- ItemTab真实React点击新建→use→私有脚本→复制→独立编辑→undo/redo；缺协调器三写入口零写入。
- [五组负控制](item-authoring-mutants.mjs)：2026-09-20，5正常对照exit0+5单点变异exit1，全部精确钉名候选AssertionError。每处替换点唯一、仅Vite load隔离变异、产品hash不变。输出`/tmp/type-pal-item-mutants6.log`，细账目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/item-authoring-mutants-vtohPZ/`。

负控工具开发期未放行的失败：首版标题正则漏describe前缀导致零执行；随后创建用例先解引用产生TypeError，已补业务前置断言；Vitest异步resolves失败在JSON中写成Error，改为结局包后直接业务断言，不放宽判据；诊断测试最初读仅入口问题的projectIssues，已纠正为真正statusIssues并补缺ID反例。这些失败不冒充业务负控通过。

## 功能界面证据（Codex）

[独立只读HTTP宿主](item-authoring-functional.mjs)在6013提供真实buildBlankProject生成的内存工程，使用正式Root/loader/session/表单，不改浏览器全局或真实工程。
2026-09-20浏览器工具实际点击：物品空态→新建item-001→启用use→添加当前物品脚本→添加等待200ms→复制item-001-copy→副本改350ms→切回源仍200ms；状态条无引用诊断，正文可见。截图已由工具回传，不虚构落盘截图路径。
6012最初在内置浏览器到目录选择器后不可操作Codex原生选择框，未绕过该限制。随后改用受支持的Chrome+原生Chrome窗口：创建专用空目录`/tmp/type-pal-item-ui-AagRSx`，选择并仅授权此目录，真实新建空白工程→新建item-001→启用use→添加私有等待200ms→复制item-001-copy→副本改375ms→点击保存。
原生文件`content/items.json`实读两份独立正文200/375ms，`.type-pal/save-state.json`为committed；浏览器显示已保存。**实际reload→最近项目重开**，副本375ms、源200ms均在正文显示，引用诊断无问题、保存按钮禁用。原生保存/重开最小功能验证已补齐，不是6013替身结果；未触用户PAL工程/普通存档，不将本例算full/Q1/Q2。

## 统一门禁

- 第一轮完整check：类型检查暴露新helper的ScriptRef导入模块选错（script.js不导出）；已改为真实定义script-library.js。日志`/tmp/type-pal-item-full-check.log`。
- 第二轮完整check：七包7909项中7907过/2失败，均App.reference-navigation旧私有ref夹具；已更新当前ref，原定位/重复定位断言不改。日志`/tmp/type-pal-item-full-check2.log`。迁移479、内容676、运行时1283等通过，editor2685/2687；不把此轮称完整通过。
- 第三轮完整check全部7909项通过（exit0），日志`/tmp/type-pal-item-full-check3.log`，含原有audit-performance并行轴；lint只有原有warnings/infos，无errors。
- 首次官方ratchet拒绝更新：新content身份构造函数仅在editor/reforge被调用，content本包漏覆盖，导致行/语句/函数微退；基线零改。日志`/tmp/type-pal-item-ratchet.log`。已在原内容运行态guard用例中实际调用公共构造器并独立断言精确tag/id，而非降低阈值。
- 最终第四轮完整check **7909/7909 exit0**（`/tmp/type-pal-item-full-check4.log`）；断言补强后五组工具重跑仍5对照绿/5候选AssertionError红（`/tmp/type-pal-item-mutants-final.log`，明细目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/item-authoring-mutants-XdyzVA/`）。观察者只收集快照，业务比较在回调外，避免产品隔离观察者异常导致假绿。
- 再次官方ratchet **exit0**（`/tmp/type-pal-item-ratchet2.log`）更新基线；随后`TYPE_PAL_COVERAGE_BASE_REF=9e220daa pnpm coverage:fast`**受保护单次严格复验7418/7418 exit0**（`/tmp/type-pal-item-strict.log`），与新基线全部相等，未取多数放行。
- 内容676项/55测试文件，reforge1283/131，editor fast2526/251（完整editor2687/270）。总生产文件631→632只增加content身份helper；共享、提取、迁移、game四包整个基线对象与9e220daa逐对象相等。未改include/exclude/超时/阈值，未跑full/Q1/Q2。
- 全仓行51025/70373（72.51%）、语句56615/80399（70.42%）、函数10741/14910（72.04%）、分支40392/63111（64.00%）；editor行81.11%/分支70.68%，content行86.02%/分支75.73%，reforge行58.07%/分支50.15%。这是产品修复+回归，不归功为纯补测；长期目标尚未达到。
- 改动文件Biome（30既有TS/TSX+3新增TS+2工具）无问题；原前提探针零diff。原生临时工程保留供复核，测试6012/6013服务和测试标签已关闭，原用户6010服务未停。用户已许可丢弃其6010测试态后合主线；后续两席独立实现签字及用户收口授权均已取得，done核定见顶部。
