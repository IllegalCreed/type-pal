# Codex r3窄复核：1410916e

2026-09-25；内容1c6c6d91、formatter f20a88a6、登记49054552、最终tip1410916e。
**仍counter，但C2主要源码更正、C3总账/hash指针和C4最终JSON格式门已通过。仅保留下表点名的正文/表格/复算残项。**
保持draft，不开build、不标done；不要求重拍截图、重跑产品测试或开展新研究。
[独立机账](codex-r3-evidence.json)；r1/r2全部反证文件原样保留。

## 本轮通过项

- 对1e4e3382的GLM增量仅11个白名单文档/机账；packages/scripts对b11d4bc9零diff，旧Codex六文件零改。
- 38唯一ID，**21covered/12risk/5N/A**；八包行数6/5/5/5/4/5/4/4相加38，与JSON一致。
  分类是取证口径，不把covered解释成此次执行了产品测试。
- 22个受审源码完整hash、17图完整hash均与本席r2机账相同，保留已核事实；没有重新运行浏览器。
- App29state/16ref/15effect+1layout的真实绑定清单已经落入正文，四个不存在的state已明确撤回；
  P5正确702分项、P6七处自递归、PanelResizeHandle现有键盘/拖拽/终结用例引用在更正正文或机账中已确认。
- P3-001正式条目已收窄为canonical名称集合，不用该测试证明旧50分派映射；虚构hash指针已清理为真实summary附录引用。
- `pnpm exec biome check docs/testing/glm-architecture-support/evidence.json`在**1410916e exit0**；
  f20a88a6→49054552的JSON语义仅finalSha改变，1410916e只改summary勘误措辞，没有再次破坏JSON。
- 原交付check:docs exit0。产品/正式测试未变，39/39旧独立定向结果继续沿用；不重做全仓或统计并集。

## 仅余三组定点counter

### R3-1：正文残留的结论与已确认口径仍相反

| 锚点（1410916e） | 直接问题 | 完成条件 |
|---|---|---|
| `v1-forms.md:32–33` | 仍标V1-a11y risk及“请产品确认意图”，与同文顶部撤回、机账V1-002相反 | 两行改成已经确认的正常合同/历史观察；不重新请求产品裁决 |
| `p5-phase1-core.md:75–84` | 表内仍331/102/158/39/30/36/7=703，下一段才写正确702；又称“避免与331条重复” | 直接改表为326/110/158/37/28/36/7，旧错误只留清楚标识的历史勘误 |
| `p5-phase1-core.md:21–35/:68/:89–90` | 图仍不画已核回边，仍用“环A残余5条/其余4条”的旧范围；顶部已说7节点15边 | 用已核15边清单更新图/表，或明确图只是有意列出的子集且不再据此声称完整环边界。无需再做SCC研究 |
| `p6-conversion-validation.md:33–35` | 仍由“无fs”推出全部纯函数/写盘唯一点，正是上轮要求撤回的扩大结论 | 采用已核的四模块无fs事实；移除未经输入变异/全IO调用域审查的扩大结论 |

### R3-2：P4/V1条目定义还没与机账对齐，P4新增表有一处阶段错锚

- `p4-battle-session.md:63–65`的**P4-002=risk/分散ui赋值**；JSON和summary同ID已是
  **covered/preparing门归属**。这是不同事实，不只是状态单词。按最终ID定义统一正文；若保留旧结构建议，
  明确它不是该条，别混用同ID。
- `v1-forms.md:49–55`仍V1-003=a11y、V1-005=六图；JSON是V1-002合并a11y/合同、V1-003=六图，且没有005。
  直接重写这一段为与机账相同的四条；无需新增截图。
- P4共享状态小表已补，入口级范围说明可接受；但`:74`把**终态分支**`battle-session.ts:1220–1224`
  写为performAction。真正performAction动画消费在`:1565–1573`；前者不清scriptAnimation。
  将pump的1077–1081、终态的1220–1224和performAction的1565–1573分清，不能把不同清理语义并成一条。

### R3-3：两条已点名的复制命令仍不可照抄（JSON格式门本身已闭）

- `summary.md:88`用`0e751efe..HEAD`并要求白名单外为空；这包含本席1e4e3382对任务卡的合法修改，
  实测会输出任务卡路径。此次GLM增量应固定为`1e4e3382..1410916e`或各自更新后的GLM起止SHA。
- `summary.md:91–92`的cd会留在packages/editor，下一行根相对的JSON路径不存在；注释“在仓库根执行”
  不会切换目录。用子shell、pnpm --filter，或显式cd回根。`:89`输出注释也应更新成21/12/5。

以上均为旧C1/C3/命令残项或新表的直接错锚，不重开已通过的App、取消链、命名门、SCC真值、图面证据或格式门。
不要再只加一段“已更正”，本次必须改掉表内对应行。没有产品修复授权，也不是新增产品bug。

## 交付与验证边界

本席只增加自己的r3报告/机账、自己的任务席位和机械索引。GLM正文/机账、r1/r2反证、正式测试/产品/基线未改。
检查日志：`/tmp/codex-arch-r3-biome.log`、`/tmp/codex-arch-r3-docs-initial.log`；
独立只读对账输出`/tmp/codex-arch-r3-verify.json`（本轮机账已归档关键结果）。Kimi本队列豁免。
本席新增机账Biome和最终check:docs均exit0（20工具测试、0issues；`/tmp/codex-arch-r3-docs-final.log`）。

## 下一位Agent提示词（GLM）

```text
在 /Users/zhangxu/illegal/type-pal-glm-architecture 同步codex/glm-architecture-support-r1，
读ARCH-SUPPORT-GLM-1任务卡和docs/testing/glm-architecture-support/codex-r3-review.md。
1410916e仅余R3-1～R3-3：改掉被逐行点名的V1/P5/P6旧表述，统一P4-002及V1编号/含义，
纠正P4表中终态与performAction动画清理锚点，修两条复制命令及输出注释。
App等源码真值、22hash/17图、JSON格式门已通过，不重做，不添加新的泛化结论。
只改本人白名单材料，保留Codex全部反证/席位；不改产品/测试/配置/基线/卡状态，不标done、不代签。
在最终登记树复验JSON Biome、docs及逐ID一致性后交Codex。无Kimi提示词。
```
