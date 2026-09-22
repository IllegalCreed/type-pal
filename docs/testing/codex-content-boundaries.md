# Codex内容六模块边界补测

2026-09-22，Owner：Codex；基点`20272225`，产品仍冻结`57dda7ed`。
用户要求覆盖率优先、一次多补再统计。本批为同Owner连续推进的既有合同测试维护：六个新测试文件，
**77项**，不改产品/schema/公共接口/公式/旧测试/公共fixture/GLM准备稿，未新开实施签字卡。
遵循AGENTS、READ-FIRST、Vitest与pnpm技能；覆盖率以仓库Vitest4.1.7显式include为准，不使用旧技能示例的`all`。

## 范围、现行入口与去重

| 模块 | 现行入口 | 本批差异（不是重报旧主流程） | 新测试数 |
|---|---|---|---:|
| actor-condition | `content/src/character.ts:328`入口播种；runtime/author共用命令guard | 精确坏形状/路径、毒抗后置错误前完整carrier不变、选择性清除和无字段幂等、毒cursor保持 | 19 |
| project-map | `reforge/src/assets.ts:54`与`reforge/src/project-map.ts:455` | 放置组本地/跨组独占，合法非空多组排序、完整实参不变及深别名、可空组合碰撞合同、边界读取 | 24 |
| battle-sprite | `reforge/src/project-loader.ts:270`、editor commands | 敌人ABI的空待机/偏移/段间隙/时长、记录身份和字段拒绝、返回段对象深隔离 | 14 |
| rewards | `reforge/src/battle/battle-world-result.ts:20` | 实例技能表首次建立与跨级精确去重、99级扣经验不再成长、缺学习表不建空条目、隐藏经验取整顺序与WORD余数 | 6 |
| runtime-script | `reforge/src/runtime-script-compiler.ts:71` | caller不得覆盖current词表/生命周期guard、cue实参和嵌套路径转交、auto入口禁切场景、shared显式路径透传 | 4 |
| scene-index | `editor/src/ui/App.tsx:2803/2824` | 非法形状、工程相对JSON路径、fallback身份与规范化路径冲突、非默认目录index防自覆盖 | 10 |

旧`actor-condition.test.ts`、`project-map.test.ts`/`.contracts.test.ts`、`battle-sprite.test.ts`/
`battle-sprite-profile.contracts.test.ts`、`rewards.test.ts`、`runtime-script-lifecycle.test.ts`、`scene-index.test.ts`
已覆盖基础成功链，原46项零改。新runtime四项属于**断言补强，覆盖计数净增0**，不冒充四个未执行分支。
六个直接目标不在GLM第二波25模块源码清单；本次实测亦无目标外净增，不改GLM冻结账。

地图、战斗形象、seed/命令和奖励角色的基线先过对应现行结构guard；坏形状用unknown输入单列。
这不是完整工程跨表/资源准入证明。runtime组直调正式包装器核选项与校验委托，不宣称cue完成资源解析或运行时投影。
地图每个变体从正式guard通过的同一基线构造；空待机/待机偏移反例同步维持后续段连续，避免第二个坏条件掩盖。
奖励使用完整ActorDef、validateActors和真实instantiate，不再用空baseStats断言合法。
奖励公式只测现行合同（[已核机制](../phase1/game-mechanics.md#人物主等级升级各属性随机成长)与隐藏经验节），
不改变N6b可配置成长的待办，也未重开已签机制。
快照比较的都是**真正交付受测函数的对象**；复用既有deepSnapshot但不使用其另一个自比较助手。

## 同口径整批统计

[对照配置](codex-content-boundaries.config.mjs)：两侧官方content/fast的全生产include与排除相同；
before仅额外排除本批六个新文件，after纳入。**721→798项**均绿，生产文件集合及所有维度分母完全相等。
报告目录`/tmp/type-pal-content-boundaries-zCRLPP/{before,after}`；不覆盖官方coverage/fast。
只在77项、相邻及反控全部完成后统计，没有逐模块反复跑覆盖率。

| 模块 | 行（before→after） | 函数 | 分支 |
|---|---|---|---|
| actor-condition | 131→138/140 | 23/23不变 | 117→132/137 |
| project-map | 144→155/157 | 38→40/41 | 119→149/159 |
| battle-sprite | 75→77/77 | 13/13不变 | 60→70/70（100%） |
| rewards | 77→79/79 | 6/6不变 | 36→41/43 |
| runtime-script | 29/33不变 | 11/12不变 | 31/37不变 |
| scene-index | 47→48/48 | 9→11/11 | 45→51/51（100%） |
| content全包 | 4561→4584/5185 | 780→784/831 | 3965→4031/5019 |

整包增加**23行/54语句/4函数/66分支**，全部来自上述直接目标。
尚未执行的分支全部保留分母，不加coverage ignore：

| 剩余 | 分支数 | 分类与后续 |
|---|---:|---|
| actor-condition `244/355` | 2 | 低层入口的非法毒id/不可携带状态防御；当前作者guard先拦，不冒称合法作者输入 |
| actor-condition `313/328/330` | 3 | 空seed/缺席poisons及死亡施毒分支，真实状态可构造，下轮状态边界补测 |
| project-map `78/103/130/205/246/252/308` | 7 | 其它形状guard的精确拒绝，合法基线可单轴构造；未声称本批穷尽JSON组合 |
| project-map `303` | 3 | isProjectMap仅定义和reforge再导出，未发现现行消费者；先审导出归属，不加续命用例 |
| rewards `167/177` | 2 | 隐藏池超99的防御钳位/恰99继续涨属性的合法状态；分别归低层防御与下一批状态测试 |
| runtime-script `147` | 5 | 未调用的私有record函数；不绕模块访问私有函数刷计数，归后续清理审查 |
| runtime-script `170` | 1 | checkLifecycleCommand只由四kind筛选后进入，未知kind末端throw不可由普通JSON达到 |

## 鉴别力与复跑

[负控工具](codex-content-boundaries-mutants.mjs)为**1个77项绿对照+13个单点变异**，均以精确测试名的
候选自身AssertionError判红；套件错/未捕获异常/超时/普通Error内嵌AssertionError不采信。
各针唯一替换点，零skip/todo，测试总数与完整标题唯一，六份产品hash每跑保持不变。

13针：状态清除取反、重复施毒误报改变、视觉槽与碰撞格点各去归属保护、地图anchor别名、
敌人施法段间隙与空待机、满级成长、隐藏经验取整次序、runtime丢caller选项、restore错误接受ticks、
场景身份忽略路径冲突、规范化时污染真实input。
均在Vite load中隔离，不编辑生产源码；最终证据系统临时目录`type-pal-content-boundaries-mutants-hLm4S4/summary.json`。

```sh
pnpm --filter @type-pal/content exec vitest run src/actor-condition.boundaries.test.ts src/project-map.boundaries.test.ts src/battle-sprite.boundaries.test.ts src/rewards.boundaries.test.ts src/runtime-script.boundaries.test.ts src/scene-index.boundaries.test.ts
node docs/testing/codex-content-boundaries-mutants.mjs
CONTENT_BOUNDARIES_PHASE=before CONTENT_BOUNDARIES_DIR=/tmp/type-pal-content-boundaries-zCRLPP pnpm exec vitest run --config docs/testing/codex-content-boundaries.config.mjs
CONTENT_BOUNDARIES_PHASE=after CONTENT_BOUNDARIES_DIR=/tmp/type-pal-content-boundaries-zCRLPP pnpm exec vitest run --config docs/testing/codex-content-boundaries.config.mjs
```

重建可更换CONTENT_BOUNDARIES_DIR为自己的临时目录。定向77/77、含相邻123/123、content TC及8个新增代码文件Biome通过。
开发过程无测试失败；一次apply_patch因format后的行形不匹配被拒，修正补丁上下文后落盘，不涉及运行失败或跳过门禁。

## 统一门禁与边界

串行完成：全仓`pnpm check` exit0，七包**8118项**；47既有warning/6info，无error。
`pnpm coverage:ratchet` exit0；`TYPE_PAL_COVERAGE_BASE_REF=20272225 pnpm coverage:fast`**单次exit0**，
fast **7627项/633生产文件**；与ratchet新基线逐维相同（提升0/下降0），没有重跑取多数。
日志分别为上述/tmp目录的`check.log`、`ratchet.log`、`strict.log`。
相对20272225，fast恰+77测试身份；content以外六包完整baseline对象序列化后完全相同，生产集合及各维分母不变。

content行**88.41%**、语句**86.48%**、函数**94.34%**、分支**80.31%**；
全仓行51294/70420（72.84%）、语句56970/80452（70.81%）、函数10770/14914（72.21%）、分支40735/63149（64.51%）。
本段为本地实测，不冒充本提交远端CI通过。
旧版本兼容审查：pass，本批只测当前对象及明确拒绝，零旧版本转换/兼容fallback新增。
视觉验证N/A；E2E、full/Q1/Q2、七套预制资源阻断与GLM build门禁均不借本批关闭。
无下一位Agent提示词；本批由Codex完成连续测试维护收口，不要求用户手动重跑。
