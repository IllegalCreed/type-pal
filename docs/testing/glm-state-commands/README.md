# GLM 菜单与编辑命令：四批十六组

[完成卡](../../ops/archive/tasks/done/TEST-GLM-STATE-COMMANDS-1-sixteen-leaf-modules.md) /
[冻结账](targets.freeze.json) / [交付清单](../glm-delivery-checklist.md) /
[上批已接收证据](../item-logic-integration.md)。

本包已由 Codex [独立接收与统一集成](codex-integration.md)并核定 done；
[首轮反证](codex-intake-review.md)按历史事实保留，R1–R4 已逐项闭合。

生产冻结1bc7df91，官方fast9295/728。16个目标共277未命中臂/43行，**仅选题，不等于277臂都能或都该补**。
实施顺序为[A菜单](a/README.md)→[B战斗数据编辑](b/README.md)→[C资源命令](c/README.md)→[D工程定义](d/README.md)，四包均已接收。
共用[负控与交付工具入口](tools/README.md)，无需改父目录导航。
工作量通过更多独立模块扩大，不靠同一函数堆参数。没有固定新增用例数/覆盖百分比指标。

## A：菜单状态（4组，43个未命中臂）

| ID | 文件（reforge/src） | 必核方向与边界 |
|---|---|---|
| A01 | magic-menu-state.ts | 优先castOutdoorSkill真实调用：healMp、显式/档位解毒、复活、无效果、MP门、多目标与非目标保真。menu state/世界原地变化分别按合同；定义表不变。旧E4只测Confirm，不冒充施放。旧基础cast测试已有者不复制 |
| A02 | system-menu-state.ts | 从open/confirm/switch构造阶段；空列表/阶段门/否与开关收尾的剩余合同。SYSTEM_ITEMS不得改空骗到open的防御臂；旧四方向/默认音量矩阵已证 |
| A03 | equip-menu-state.ts | 不同phase的确认/返回/应用，缺selected/目标与真实换装结果、旧装备续换。只补菜单层，content物品包已证的交换细节不重领 |
| A04 | use-menu-state.ts | 真实useConfirm/useApply请求、错误phase/空表、finishUseExecution失败保持与成功耗尽/留菜单。不要手造任意request替代已存在公开入口 |

禁止借本批改菜单UX。玩家合法队伍1–3人；不存在角色/坏cursor/空队伍只能按调用域明确列防御输入，不能当合法开局。
`magicConfirmSpell`会原地改菜单，`castOutdoorSkill`会原地改world；分别核精确差值/旁队员及skill/poison表保真。
数值依据当前公开合同和已有测试；有机制争议先读相关game-mechanics/harvest并列pending，不自行拍板或套旧引擎内部状态。

## B：战斗数据编辑命令（4组，56个未命中臂）

| ID | 文件（editor/src/core） | 必核方向与边界 |
|---|---|---|
| B01 | skill-commands.ts | 新增/修改/删除的缺席、首次捕获、undo原索引、重占用、实际patch/旁技能；可选键删除与还原，不删除schema必填字段冒充合法补丁 |
| B02 | poison-commands.ts | 合法poison/tick/关系字段；首次捕获/undo、缺席表、旁毒与深嵌套输入；真实引用拒删，不重新测试毒战斗公式 |
| B03 | enemy-team-commands.ts | 稳定teamId、五槽/null洞、整表与单队更新、原索引、旁队伍；>5槽若guard拒绝，只列防御轴，不能声称合法队伍 |
| B04 | enemy-commands.ts | 真实EnemyDef及hook/choreography结构；apply/invert前后完整状态、目标缺席、旁敌人、构造参数不被写入、引用拒删/解除后删除 |

所有删除provider必须用真实当前引用索引，不mock成恒空。已存在的barrel身份/scaffold默认值测试不算本批新增业务合同。

## C：资源与人物命令（4组，118个未命中臂）

| ID | 文件（editor/src/core） | 必核方向与边界 |
|---|---|---|
| C01 | actor-commands.ts | 人物add/copy/update/detach/删除与battler切换；名称/资源/援护引用的未证单轴、合法对照；不重复旧五条residual，仅换字符串不算新合同 |
| C02 | sprite-commands.ts | 同步定义/资产命令：消费者集合漂移、证明过期、缩帧修复快照、未使用资源删除；完整sprites/catalog/blobs与旁记录、invert回滚 |
| C03 | battle-sprite-commands.ts | 合法player/enemy profile、真实帧数、共享消费者、缩帧修复、前后字节与三表一致；不重复旧重复id/错误profile四例 |
| C04 | tileset-commands.ts | 记录路径归属、定义/AssetId、真实MapReferenceBatch与替换proof、共享旧路径保留/删除、undo；不重复旧AddTileset共享资产和名称空白例 |

从buildBlankProject取得正式可用基线；二进制尺寸/bytes/sha与真实编码产物一致，不能把任意几字节宣称合法gzip/RLE。
若构造换帧输入，先经现有解码/帧数需求函数自证，再通过守卫；证明字段从同一具名输入/消费者快照导出。
缩帧只验证已有同步事务合同，不修改编解码器、不做Canvas/文件系统/实际PAL资产写盘，不扩成资源管线修复。

## D：工程定义命令（4组，60个未命中臂）

| ID | 文件（editor/src/core） | 必核方向与边界 |
|---|---|---|
| D01 | shop-commands.ts | nextShopId边界、货单update/copy/delete、首次manifest登记与undo、旁商店/原索引；引用拒删与解除后正控 |
| D02 | ambience-commands.ts | 合法tint/定义更新，重复/缺席、首轮旧值、删后ID重占用、非目标氛围；真实脚本引用路径 |
| D03 | battle-field-commands.ts | 当前定义/稳定数值ID、manifest与表原子登记、可选字段清除、复制/删除/完整undo；已F2拆分身份与默认表happy path不重复 |
| D04 | world-variable-commands.ts | 当前registry守卫、同值no-op、不同kind/name/description/initial、真实脚本引用/解除、删除undo碰撞；不新增系统全局槽或旧版本fallback |

构造器并非统一“立即复制全部参数”。只在代码/消费合同明确承诺时验证构造期快照；
其余至少保护真正传入的对象不被函数写坏。不要把无法从当前调用方到达的between-ctor-and-apply竞态当业务Bug。
Command对象自己的old/added缓存允许改变；apply/invert不得污染传入EditorState。合法no-op允许返回原引用。
缺省表与显式空表的语义须核现行构造器/序列化合同，不凭偏好发明undefined与[]强等或自动修复政策。

## 去重、断言与反控

每批4行ledger（A01…D04），每行写：当前公开入口/守卫、选中差异合同、旧文件+精确fullName、
新文件+精确fullName或existing-proof/guarded/unreachable/pending、理由/调用域、相关反控、命令/exit。
冻结账existingReferences是导出名字的词法匹配，可能漏别名/消费者；必须再查barrel测试、生命周期测试与调用方，不能当完整去重结论。
不强求逐277臂结案；只对声称新增/已有证明的合同负责。无法定预期、被上游挡住或已证就如实分类，继续下一组。

每批2–3个代表负控（总8–12）：原实现同输入正控绿，隔离单点坏实现仅钉名候选业务AssertionError红。
必须恰exit1、真实执行命中、绝对file/fullName匹配；拒绝普通Error混错/timeout/零执行/skip/exit2/null。
共用一个严判据和一套反例自测（不得四份渐渐变松）；可复用已接收mutants判据逻辑，不复制产品算法。
优先选错误扣费、错误undo、输入污染、引用放行、共享资产误删；选择具体针前先证明能到达，不用无鉴别力删死代码充数。

每条输入保护：具名实际对象/数组/ArrayBuffer，调用前独立深快照，调用后立即比较；不同分支不要拍外层同名对象。
涉及返回新态，核完整业务结果及非空旁对象；不能只用toBeDefined/length>=0/返回自身快照。
已知当前实现违背明确业务合同时，放批目录diagnostics隔离红，并写正常正控/最小反例；不能skip/fails或改错误预期洗绿。

## 白名单、交付与工作树

只允许冻结账16个newTest、任务卡四个fixture、a/b/c/d与tools子目录；根README/冻结账和共享状态由Codex维护。
先读任务卡；生产/旧测试/配置/资产/基线全部零改。不动E2E与主目录三份WIP。
独立分支`codex/glm-state-commands-r1`；Codex给出的工作树为入口，不在主目录切分支。

每批局部验证：`env -u NODE_COMPILE_CACHE pnpm --filter <包> exec vitest run <本批四文件及相邻>`，
同包typecheck、全部新增测试/fixture/工具/JSON的Biome完整JSON零诊断、docs/diff。
四批全做完才各跑一次editor与reforge全包；若缺忽略资源，只从主检出读取/复制原始/提取/生成资产到本检出，
不要执行extract/migrate改主资产，不把环境失败当业务通过。全仓check/ratchet/strict留Codex一次统一执行。

四批分别提交推送（每批一个或少数原子提交），不逐组等回复；整包最后交完整SHA。
回执从最终树与新鲜JSON生成，含实际命令/exit/逐文件计数/fullName；不能凭记忆写“已修”。
提交流程末再用git show HEAD核所有强声明，源hash与冻结账一致；若Codex后续改了目标模块，停该组标漂移并继续其余组，不覆盖新代码。
作者自验不是独立终审；Codex验收后统一合入推送并清理。本包不提前计覆盖，不标done、不找Kimi。
