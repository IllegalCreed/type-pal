# ARCH-F2-CURSOR-BATCH-1 · Codex 首轮独立接收

2026-09-26；候选`d0684e78`，起点`8bf40b90`。**整包counter，转rework；机械搬移事实接收，不要求24组重做。**
用户免手工验证，由Codex接收。未合候选、不更新官方覆盖率、不标done；作者自验不是独立证明。

## 已核事实（后续不重开）

- 90个改动路径在editor命令/设计系统及交付证据目录；其它包、CSS、资产、锁文件、生产审计规则和官方coverage配置/基线零改。证据子目录为卡面要求的JSON/复跑工具，不按新产品范围处理。
- `commands.ts`原139个顶层声明逐token对照全部保持，旧119出口无缺无增；包括未搬移正文一并比较。
- `controls.tsx`原78个声明中77个逐token相同，唯一`draftSource`只补显式`: string`返回类型，函数体相同。没有发现这批搬移引入的行为代码漂移。
- 新增32个生产模块，独立遍历47个可达editor运行期模块，未见新模块回引commands/controls旧barrel。类型擦除后核import/export，不拿文字grep当运行期图。
- overflow登记的语义diff只有11条producer的source/component；selector、policy等其它字段全部保持。静态测试更新只改真实生产路径与显式新owner，旧断言未被删弱。
- 定向先跑31文件341项，随后补world-variable-references的3项，合计回执32文件344项；recipes/reorder另57/57。editor typecheck exit0，docs/diff通过。
- 本席在独立工作树安装真实workspace链接，补只读资产链接后，完整editor check **313文件/2813项exit0**。原“Denied ID”不再存在；不视为产品缺陷。首轮本席`--ignore-scripts`安装缺canvas native build而主动终止（143），链接同版本已编译产物并验证真实getContext后重跑通过；不是重试挑绿或改测试。

## R1：正控fixture与C07证明范围

直接抽取候选实际factory，交给现行生产守卫，结果：

| 文件/入口 | 直接结果 |
|---|---|
| `core/command-contract.test.ts:15` enemyState | `validateEnemies`拒绝`enemies[0]: 缺键 "name"`；stats还使用hp/attack等非当前EnemyDef字段，强转掩盖类型不符 |
| `core/skill-commands.test.ts:12` state | `validateSkills`拒绝`skills.skills[0]: 缺键 "animation"` |
| `core/asset-label-command.test.ts:8` state | `validateAssetCatalog`拒绝authored资源位于`assets/hero.png`而非`assets/authored/` |

返工只需使新增正控使用当前typed数据，先过对应正式守卫再进命令；不必给元数据label测试发明整条图片解码流程。不要依赖`as unknown as EditorState`掩盖这些真实域对象错误。

`ambience-commands.test.ts:45-59`标题宣称blocks in-use delete，实际仅手工new错误对象检查文案，随后零引用删除成功。独立单点移除`ambience-commands.ts:104`的引用阻断：新用例仍绿；同输入配置中的旧`commands.test.ts:1866`测试 **“DeleteAmbience:脚本显式引用、昼夜隐式引用和运行态引用均阻断且不改源”**确实业务红。完整对照两项绿；破坏后新绿/旧红，产品hash不变。

因此**不要求重复造新守卫测试**：收窄新标题/回执，将已有真实守卫测试与其单点反控列为C07证据。其它组也把文案/标签/静态属性针与关键guard/undo/交互针分开；卡要求的后者可用精确已有证据，不可由“24针”总数代替。

## R2：负控判据仍能错误接受

`module-mutants.mjs:315-322`取任何一行包含AssertionError，再仅比较leaf title：

- 将实际`failures`函数、assertion声明和ok表达式原样抽出执行，`Error: ordinary failure\ncaused by AssertionError: quoted text`被判`true`。
- 错误文件`/wrong-file.test.ts`、错误fullName但相同leaf title的失败，也被判`true`。
- `:294`仅用basename匹配源，未钉绝对路径；没有实际变异命中标记。`:268`正控只查exit0/零失败，不核目标执行数；`-t`既未转义也未锚定。

抽跑原c07负控确为对照绿/文案变异AssertionError红，但这只证明错误文案，不证明删除门。不能据此把其余24项作者账当本席独立通过。

返工：同一个运行判据核绝对测试文件+精确fullName+预期执行数，正控必须实际执行；变异源绝对路径且唯一替换点、具名命中标记；失败必须恰exit1，逐failureMessage拒绝普通Error/混错/超时，不能只搜子串。加入走真实判据的自测（上述双反例、0执行、exit2/null、未命中、混错/超时）；脚本临时文件放系统临时目录，保留实际JSON/日志路径供复核。修后重跑24针并如实分类。

## R3：出口与机械收口

- controls旧出口50→57，真实新增是 **2个runtime值**（`:7` draftSource/useDsDraftController）+ **5个类型**（`:6/:16/:23/:38`）；不是回执写的7个类型，其中DsFieldControlProps/DsFieldHelp本来已公开。新下层之间可以导出所需内部协议，但旧barrel不需要扩大公开面。请移除不必要的这7个新增旧barrel出口，保留原50个和实际下层依赖；若有真实现有消费者必须从旧barrel导入，给确切调用点再核。
- 最终树Biome不是全绿：`module-mutants.mjs`和`text-overflow-adoption.json`各1个formatter error。无需改变JSON语义或规则，格式化并复核完整改动集合即可。工具字符串插值是变异文本，不能按lint建议改成真实插值；warning与formatter error分列。
- 上述窄修后同步24行账/出口数字/证据类型/最终命令。整包已经能在正确环境跑完整editor check；不再把完整验证转交用户。

## 复现与后续

[本席见证工具](cursor-architecture-review-witnesses.mjs)及[机账](cursor-architecture-batch-review-evidence.json)：

```bash
node --import tsx docs/testing/cursor-architecture-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-codex-cursor-review
```

工具只读候选源码，产品变异在隔离Vite load视图；临时JSON/日志路径随输出。fixture提取和判据锚冻结于r1，候选重构其工厂/判据后由Codex适配，不要求Cursor为了旧探针保留错误结构。

本轮不跑官方ratchet/strict，不碰6010/用户页面。隔离浏览器最小功能验证由Codex在窄修接收后完成；这是验收排期，非要求用户补验。Cursor只改上述剩余点，已核机械搬移不重做，三贤人固定签字仍暂停。
