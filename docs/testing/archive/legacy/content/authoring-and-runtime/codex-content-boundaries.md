# Codex内容六模块边界补测

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 Codex 内容六模块边界补测回执（2026-09-22，基点 20272225、产品仍冻结 57dda7ed；用户要求覆盖率优先一次多补再统计；同 Owner 连续推进不开新签字卡）：六个新测试文件 **77 项**，不改产品/schema/公共接口/公式/旧测试/公共 fixture/GLM 准备稿。

## Scope

- 范围与去重表：actor-condition 19（精确坏形状/毒抗后置错误前 carrier 不变/选择性清除幂等）、project-map 24（放置组本地跨组独占/完整实参不变及深别名/可空组合碰撞）、battle-sprite 14（敌 ABI 空待机/偏移/段间隙/时长/身份拒绝/深隔离）、rewards 6（实例技能表首建与跨级去重/99 级不再成长/缺学习表不建空条目/隐藏经验取整顺序）、runtime-script 4（caller 不得覆盖词表/生命周期 guard/cue 实参转交——断言补强覆盖净增 0 不冒充未执行分支）、scene-index 10（非法形状/工程相对路径/fallback 冲突/防自覆盖）；旧测试基础成功链 46 项零改；六直接目标不在 GLM 第二波 25 模块清单不改 GLM 冻结账。

## Execution and assertions

- **合法性与边界**：地图/战斗形象/seed/奖励角色基线先过现行结构 guard；坏形状 unknown 输入单列；奖励用完整 ActorDef+validateActors+真实 instantiate 不再用空 baseStats 断言合法；奖励公式只测现行合同不改变 N6b 待办；快照比较真正交付受测函数的对象（复用 deepSnapshot 不用另一个自比较助手）；runtime 组直调正式包装器不宣称 cue 完成资源解析
- **同口径统计**：content-boundaries-config 两侧官方 include/排除相同，before 仅排本批六文件；721→798 项均绿生产集合与分母完全相等；六模块覆盖表：battle-sprite 分支 60→70/70（100%）、scene-index 45→51/51（100%）、project-map 行 144→155/157、actor-condition 分支 117→132/137 等（全表在 quote）；整包 +23 行/54 语句/4 函数/66 分支全来自直接目标
- **剩余分支登记**：actor-condition 5 臂（低层防御+空 seed/死亡施毒下轮状态边界）、project-map 10 臂（形状 guard 精确拒绝+isProjectMap 303 未发现消费者先审导出归属）、rewards 2 臂（超 99 钳位/恰 99 合法状态）、runtime-script 6 臂（私有 record 函数不绕模块访问刷计数+未知 kind 末端 throw 不可由普通 JSON 达到）——全部保留分母不加 coverage ignore 分类与后续在表
- **鉴别力**：content-boundaries-mutants：1 个 77 项绿对照+13 单点变异均以精确测试名候选自身 AssertionError 判红（套件错/未捕获异常/超时/普通 Error 内嵌子串不采信）；每针唯一替换点零 skip/todo 六份产品 hash 每跑不变；13 针清单（状态清除取反/重复施毒误报/视觉槽与碰撞格点归属/地图 anchor 别名/段间隙与空待机/满级成长/取整次序/丢 caller 选项/restore 错误接受 ticks/身份忽略路径冲突/规范化污染 input）在 quote
- **统一门**：全仓 check exit0 七包 8,118 项（47 既有 warning/6 info 无 error）；ratchet exit0+BASE_REF=20272225 单次 fast exit0 7,627 项/633 生产文件与 ratchet 逐维相同；相对基点恰 +77 测试身份；content 以外六包基线序列化完全相同；content 行 88.41%/分支 80.31%；全仓行 72.84%/分支 64.51%；旧版本兼容审查 pass 零 fallback 新增；视觉 N/A；E2E/full/Q1/Q2/GLM build 门不借本批关闭；开发无测试失败（一次 apply_patch 行形不匹配修正上下文不涉运行失败）

## Results

- 无下一位提示词；本批由 Codex 连续测试维护收口不要求用户手动重跑；重建命令四条在 quote。

## Evidence

- 证据路径：本回执正文（quote 保全）；对照 config 与负控工具链接在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 六模块边界补测 | 2026-09-22 | 77 项+13 针+三门 | 完成（连续推进） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy content/authoring-and-runtime 的 Codex 六模块补测回执；固定来源与 source SHA 见下方保全节。

## 原始结论

77 项六模块（两目标分支 100%）+13 针+剩余 23 臂逐项分类；三门 exit0（check 8,118/fast 7,627 恰+77）；runtime 四项覆盖净增 0 如实登记。

## 当时证据

去重表、覆盖表、剩余分支表、13 针清单与四条重建命令在 quote 保全。

## 当前有效性

historical。补测按基点 20272225；覆盖数字按当时口径。

## 继任文档

当前结论归官方覆盖账与后续批次。

## 原文保全

固定源 revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `503634713ed409306454de887ba3bc10bc78f8813120485dbb27c6f77ea8e32b`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # Codex内容六模块边界补测
>
> 2026-09-22，Owner：Codex；基点`20272225`，产品仍冻结`57dda7ed`。
> 用户要求覆盖率优先、一次多补再统计。本批为同Owner连续推进的既有合同测试维护：六个新测试文件，
> **77项**，不改产品/schema/公共接口/公式/旧测试/公共fixture/GLM准备稿，未新开实施签字卡。
> 遵循AGENTS、READ-FIRST、Vitest与pnpm技能；覆盖率以仓库Vitest4.1.7显式include为准，不使用旧技能示例的`all`。
>
> ## 范围、现行入口与去重
>
> | 模块 | 现行入口 | 本批差异（不是重报旧主流程） | 新测试数 |
> |---|---|---|---:|
> | actor-condition | `content/src/character.ts:328`入口播种；runtime/author共用命令guard | 精确坏形状/路径、毒抗后置错误前完整carrier不变、选择性清除和无字段幂等、毒cursor保持 | 19 |
> | project-map | `reforge/src/assets.ts:54`与`reforge/src/project-map.ts:455` | 放置组本地/跨组独占，合法非空多组排序、完整实参不变及深别名、可空组合碰撞合同、边界读取 | 24 |
> | battle-sprite | `reforge/src/project-loader.ts:270`、editor commands | 敌人ABI的空待机/偏移/段间隙/时长、记录身份和字段拒绝、返回段对象深隔离 | 14 |
> | rewards | `reforge/src/battle/battle-world-result.ts:20` | 实例技能表首次建立与跨级精确去重、99级扣经验不再成长、缺学习表不建空条目、隐藏经验取整顺序与WORD余数 | 6 |
> | runtime-script | `reforge/src/runtime-script-compiler.ts:71` | caller不得覆盖current词表/生命周期guard、cue实参和嵌套路径转交、auto入口禁切场景、shared显式路径透传 | 4 |
> | scene-index | `editor/src/ui/App.tsx:2803/2824` | 非法形状、工程相对JSON路径、fallback身份与规范化路径冲突、非默认目录index防自覆盖 | 10 |
>
> 旧`actor-condition.test.ts`、`project-map.test.ts`/`.contracts.test.ts`、`battle-sprite.test.ts`/
> `battle-sprite-profile.contracts.test.ts`、`rewards.test.ts`、`runtime-script-lifecycle.test.ts`、`scene-index.test.ts`
> 已覆盖基础成功链，原46项零改。新runtime四项属于**断言补强，覆盖计数净增0**，不冒充四个未执行分支。
> 六个直接目标不在GLM第二波25模块源码清单；本次实测亦无目标外净增，不改GLM冻结账。
>
> 地图、战斗形象、seed/命令和奖励角色的基线先过对应现行结构guard；坏形状用unknown输入单列。
> 这不是完整工程跨表/资源准入证明。runtime组直调正式包装器核选项与校验委托，不宣称cue完成资源解析或运行时投影。
> 地图每个变体从正式guard通过的同一基线构造；空待机/待机偏移反例同步维持后续段连续，避免第二个坏条件掩盖。
> 奖励使用完整ActorDef、validateActors和真实instantiate，不再用空baseStats断言合法。
> 奖励公式只测现行合同（[已核机制](../../../../../phase1/game-mechanics.md#人物主等级升级各属性随机成长)与隐藏经验节），
> 不改变N6b可配置成长的待办，也未重开已签机制。
> 快照比较的都是**真正交付受测函数的对象**；复用既有deepSnapshot但不使用其另一个自比较助手。
>
> ## 同口径整批统计
>
> [对照配置](../../../../domains/content/authoring-and-runtime/tools/content-boundaries-config.mjs)：两侧官方content/fast的全生产include与排除相同；
> before仅额外排除本批六个新文件，after纳入。**721→798项**均绿，生产文件集合及所有维度分母完全相等。
> 报告目录`/tmp/type-pal-content-boundaries-zCRLPP/{before,after}`；不覆盖官方coverage/fast。
> 只在77项、相邻及反控全部完成后统计，没有逐模块反复跑覆盖率。
>
> | 模块 | 行（before→after） | 函数 | 分支 |
> |---|---|---|---|
> | actor-condition | 131→138/140 | 23/23不变 | 117→132/137 |
> | project-map | 144→155/157 | 38→40/41 | 119→149/159 |
> | battle-sprite | 75→77/77 | 13/13不变 | 60→70/70（100%） |
> | rewards | 77→79/79 | 6/6不变 | 36→41/43 |
> | runtime-script | 29/33不变 | 11/12不变 | 31/37不变 |
> | scene-index | 47→48/48 | 9→11/11 | 45→51/51（100%） |
> | content全包 | 4561→4584/5185 | 780→784/831 | 3965→4031/5019 |
>
> 整包增加**23行/54语句/4函数/66分支**，全部来自上述直接目标。
> 尚未执行的分支全部保留分母，不加coverage ignore：
>
> | 剩余 | 分支数 | 分类与后续 |
> |---|---:|---|
> | actor-condition `244/355` | 2 | 低层入口的非法毒id/不可携带状态防御；当前作者guard先拦，不冒称合法作者输入 |
> | actor-condition `313/328/330` | 3 | 空seed/缺席poisons及死亡施毒分支，真实状态可构造，下轮状态边界补测 |
> | project-map `78/103/130/205/246/252/308` | 7 | 其它形状guard的精确拒绝，合法基线可单轴构造；未声称本批穷尽JSON组合 |
> | project-map `303` | 3 | isProjectMap仅定义和reforge再导出，未发现现行消费者；先审导出归属，不加续命用例 |
> | rewards `167/177` | 2 | 隐藏池超99的防御钳位/恰99继续涨属性的合法状态；分别归低层防御与下一批状态测试 |
> | runtime-script `147` | 5 | 未调用的私有record函数；不绕模块访问私有函数刷计数，归后续清理审查 |
> | runtime-script `170` | 1 | checkLifecycleCommand只由四kind筛选后进入，未知kind末端throw不可由普通JSON达到 |
>
> ## 鉴别力与复跑
>
> [负控工具](../../../../domains/content/authoring-and-runtime/tools/content-boundaries-mutants.mjs)为**1个77项绿对照+13个单点变异**，均以精确测试名的
> 候选自身AssertionError判红；套件错/未捕获异常/超时/普通Error内嵌AssertionError不采信。
> 各针唯一替换点，零skip/todo，测试总数与完整标题唯一，六份产品hash每跑保持不变。
>
> 13针：状态清除取反、重复施毒误报改变、视觉槽与碰撞格点各去归属保护、地图anchor别名、
> 敌人施法段间隙与空待机、满级成长、隐藏经验取整次序、runtime丢caller选项、restore错误接受ticks、
> 场景身份忽略路径冲突、规范化时污染真实input。
> 均在Vite load中隔离，不编辑生产源码；最终证据系统临时目录`type-pal-content-boundaries-mutants-hLm4S4/summary.json`。
>
> ```sh
> pnpm --filter @type-pal/content exec vitest run src/actor-condition.boundaries.test.ts src/project-map.boundaries.test.ts src/battle-sprite.boundaries.test.ts src/rewards.boundaries.test.ts src/runtime-script.boundaries.test.ts src/scene-index.boundaries.test.ts
> node docs/testing/domains/content/authoring-and-runtime/tools/content-boundaries-mutants.mjs
> CONTENT_BOUNDARIES_PHASE=before CONTENT_BOUNDARIES_DIR=/tmp/type-pal-content-boundaries-zCRLPP pnpm exec vitest run --config docs/testing/domains/content/authoring-and-runtime/tools/content-boundaries-config.mjs
> CONTENT_BOUNDARIES_PHASE=after CONTENT_BOUNDARIES_DIR=/tmp/type-pal-content-boundaries-zCRLPP pnpm exec vitest run --config docs/testing/domains/content/authoring-and-runtime/tools/content-boundaries-config.mjs
> ```
>
> 重建可更换CONTENT_BOUNDARIES_DIR为自己的临时目录。定向77/77、含相邻123/123、content TC及8个新增代码文件Biome通过。
> 开发过程无测试失败；一次apply_patch因format后的行形不匹配被拒，修正补丁上下文后落盘，不涉及运行失败或跳过门禁。
>
> ## 统一门禁与边界
>
> 串行完成：全仓`pnpm check` exit0，七包**8118项**；47既有warning/6info，无error。
> `pnpm coverage:ratchet` exit0；`TYPE_PAL_COVERAGE_BASE_REF=20272225 pnpm coverage:fast`**单次exit0**，
> fast **7627项/633生产文件**；与ratchet新基线逐维相同（提升0/下降0），没有重跑取多数。
> 日志分别为上述/tmp目录的`check.log`、`ratchet.log`、`strict.log`。
> 相对20272225，fast恰+77测试身份；content以外六包完整baseline对象序列化后完全相同，生产集合及各维分母不变。
>
> content行**88.41%**、语句**86.48%**、函数**94.34%**、分支**80.31%**；
> 全仓行51294/70420（72.84%）、语句56970/80452（70.81%）、函数10770/14914（72.21%）、分支40735/63149（64.51%）。
> 本段为本地实测，不冒充本提交远端CI通过。
> 旧版本兼容审查：pass，本批只测当前对象及明确拒绝，零旧版本转换/兼容fallback新增。
> 视觉验证N/A；E2E、full/Q1/Q2、七套预制资源阻断与GLM build门禁均不借本批关闭。
> 无下一位Agent提示词；本批由Codex完成连续测试维护收口，不要求用户手动重跑。
>
<!-- original-source-quote:end -->
