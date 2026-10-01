# ZCode O r4 / Q r5 固定候选预审（2026-10-01）

结论：**O/Q 仍 counter、rework；P 未启动替换槽**。这是固定 Git blob 的源、执行账与
合同预审，不是新整包 test/typecheck、全量业务反控重跑或官方覆盖率结算。
[机器记录](codex-zcode-oq-preflight-20261001.json)保存逐枚复算结果。作者passed/VALID
不能替代独立合法性、排重与最终执行集复核。

## 对象与安全边界

- O测试树 `590dd57ab867519281065c7aadc998b263907ae3`，docs pin
  `894641a41be1d7099abda08c3b170b84007d39f5`；中间
  `c6e2da2622c9ad6432e23d7033dcb4ae2cc8b7a0`是有效对象。两后续提交仅receipt.json。
- Q测试树 `63129473574ac21a082d1c5902b1fddfe62b02d7`，docs pin
  `c05edb4e9fb4b32bf258848e2581a53137288650`；区间仅receipt.json。
  新candidateHead有效，旧Q-R4-PIN对象问题关闭，不重复返工旧错误SHA。
- 两固定树各716/716冻结源一致，O595/Q480路径白名单合规，区间diff零。
  未向活动贡献者树写，不运行有副作用的反控runner，不改main/产品/旧测/官方baseline。
- O442/Q123条directed均报告passed，file×fullName唯一；本轮未与独立新实跑对齐。

## O窄项

O-R2-01七处禁止桥删除，AiBattleView.turn与WorldState.learnedSkills补齐；
ghost真正缺键且精确missing-actor，重复canAct/canCastMagic整例已删。
保留这些代码层闭合项，不重开整包。

1. **O-R4-01合同账仍模板。** 442身份/status对应directed，但400条source/caller/batch
   是`?`，所有442条oldAssertion是“旧测同文件无此fullName/断言…”模板，oracle是
   “精确诊断/结构断言（详见测试体）”。补真实源条件/caller/旧fullName及断言行/合法输入/
   精确业务结果；字段存在、gap-map或换名不能当逐合同证明。
2. **O-R4-02六针最终执行集漂移。** 56/56实际生产原/恢复/rebuilt-mutant hash、
   index/result与原始三态指定业务单红对应，单枚三态身份一致；但O08-CC1/CC2仍16例，
   最终enemy-ai已删除/改名；O10-CC2/CC3/CC4/CC5仍17例，最终RLE已有20例。
   仅在最终测试源重采这六枚，其它50枚保留。没有独立执行全部56业务变异。
3. **O-R4-03最后pin未过格式/账目。** receipt一空格缩进且缺最终换行，与配置Biome
   formatter对照不同；正常格式化，不改规则。README批次表相加593，不是442唯一案例；
   receipt O07/O08/O09/O10仍35/16/58/17，与README45/42/72/23不同。须建立唯一case→batch
   映射生成数量；多轴/重叠统计另标口径。headNote无docs-only尾巴误记撤回，194路径等
   旧门数字留历史，不当最终595路径新验收。source或执行集变动只重采受影响针。

## Q窄项

1. **Q-R5-01新fixture非法强转。** battle-action-error-arms.glm-q.test.ts:352–362
   四次空对象强作BattleStatus、两次不完整数组强作BattleEnemy[]，隐去sleep/paralyzed/
   confused/haste/slow、prevHp及script必填字段。不是联合收窄，零强转宣称不成立。
   用本文件完整state().enemies或完整typed视图，只改合法血量轴，不改产品/旧fixture/配置。
2. **Q-R5-02至少两条重复。** performItem缺entry/count0早退与actions.test.ts:2317–2371
   的“队员use,inventory count=0→不扣+不runScript+console.warn”和“根本没该item entry→
   warn+return”同合同。warn/库存不变/脚本不执行已有断言，换编号、目标或空数组不产生
   新早退合同。删重不计新；主张更强结果需指出新增源条件和真实oracle。
3. **Q-R5-03blocked-input不足。** battle-system.ts:1033–1037实际读取magic/learnedSpells；
   PlayerRole未显式声明这些字段不单独证明typed不可构造：完整角色的结构化扩展可以无
   强转赋入PlayerRoles。先核canonical caller/公开seed合法性，不因旧测双桥就申请产品
   补字段。本轮不自动接受扩展输入，也不批准产品接口变更。captureEnemy误设行可从
   无该公开入口收窄，不强造新机制；全源capture文本并非零命中，有无关闭包/DOM用法。
4. **Q-R5-04最终账。** 44/44 index/meta/实际原恢复hash/rebuilt-mutant/三态身份/单目标
   业务红/恢复绿对应，含新五针；是复算不是44枚全重跑。上述typed/删重变动后重采受影响
   Q08针，未变39枚保留。receipt counterEvidence还写39，game2788旧数却标r5复跑；
   game区间只新增7例文件，需实际最终全包报告锚点和准确计数。Q receipt格式对照一致，
   不将stdin check无write的工具提示当Q诊断。

## 调度

旧P完整标题已在type-pal可恢复归档列表，活动列表仅O/Q；树仍干净，r3完整SHA/证据保留。
归档不等于done，旧确认框阻塞已解除，不能重复要求用户处理。支持AX面板关闭/导航/
快捷键有限尝试未核出新会话，坐标聚焦仍noWindowsAvailable。本轮零消息/零替换P启动，
O/Q当轮工作中/排队状态也未新确认；不继续无限重试或开第四槽。

下一轮恢复受支持连接、先核实际路由/运行/队列：P先修原卡最新judge/恢复/mkdtemp/索引，
再连续P02–P10/F14/F18；O/Q仅实际空闲无同任务排队时直接发最新窄项后续残余。
700/各卡组数/50有效反控/P20流程不缩，合法停线仅停受影响组。
无用户搬运提示词；由Codex heartbeat直接续派。独立accept后串行check→官方ratchet→
受保护strict-fast才决定集成/main/done；本轮未正式测覆盖或宣称85%。

## Q-R5-03 后续一手补核（2026-10-01）

同一固定 Q 测试树，补查声明和真实 caller 后，作者“PlayerRole 未声明 magic、必须补产品
接口后才能测”的 blocked-input 前提被直接推翻：`packages/shared/src/tables.ts:562`
已经是 `magic?: number[]`。上方预审只判断作者理由不足；现在无需假定结构化扩展合法性，
有既有显式 typed 字段和生产公开投影可用。

`core/game-state.ts:569` 的 `rgwMagic` 为公开矩阵，`:1881` 建完整状态，`:1394` hydrate，
`:1577–1670` 的 `projectRuntimeToBattleRoles` 返回完整 PlayerRoles 并写入 `magic`。
`shell/bootstrap.ts:1197–1201` 的 startBattle 使用这一投影；
`core/battle/battle-system.ts:1033–1080` 的 getLearnedSpells/pickAutoMagic 和`:1372`的 Force
caller 消费此数据。候选五个证据文件与冻结逐字一致，hash/精确锚点见机器记录。

合法方式是完整 typed role 的已声明 `magic`，或完整 create/hydrate 后填公开槽并投影；
不采用旧测试双桥，不改产品字段，不把 dev `learnedSpells` fallback 一并放行。
旧 `core/battle/__tests__/battle-system.test.ts:1089–1119` 已证 signed-negative 两回归，
仍须逐源条件/旧断言排重后展开原卡合法余族。Q撤回 `magic` 的 blocked-input 误记，
其它 Q-R5 counter/700目标不变。本次未执行业务测试、未增加通过数或正式覆盖率。

本轮 UI 归档面板已关闭、首页 composer 可聚焦；单行 ASCII 输入后刷新仍空，发送按钮禁用，
因此没有按 Return。零新消息、零替换P启动，O/Q当轮运行/排队仍未证；有限尝试后停止 UI
动作。原P可恢复归档事实保留，不重复请求用户处理旧确认框。新 Q 补充已落卡待直接续派，
不是已发送；不写活动贡献者树或main。
