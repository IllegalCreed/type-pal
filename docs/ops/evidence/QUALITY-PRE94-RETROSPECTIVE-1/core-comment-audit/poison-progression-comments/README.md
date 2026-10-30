# pre94毒/升级：源码注释与测试判别力返工

Status: recorded
Owner: Codex（单Agent；作者修复/反控，不冒充第三方）
Date: 2026-10-18
Base: `27358f9d9e3ab65d777b7864fcc936638ed9373a`
Branch: `codex/code-quality-3y`

## 证据身份与范围

id: QUALITY-PRE94-RETROSPECTIVE-1 / poison-progression-comments；schemaVersion:1；status:recorded。当前准入和交接见[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，机制停止线见[毒槽卡](../../../../tasks/GAME-PLAYER-POISON-SLOT-COMPACTION-1.md)。[逐文件读边界](read-boundaries.json)只证明实际列出的完整/部分阅读；不把相邻测试绿、SHA相同或“没有any”当整文件通过。

## 实际读取与primary/caller

全文核两源/两直接测试、dependency-ownership、H工厂、rng与Vitest配置。两源的真实生产入口为settlement先写回runtime再升级、event/battle opcode施毒/解毒、卸Wear清装备毒、battle-finalization战后阈值3清毒与bootstrap注入毒表。公开出口仍由event-system/battle-system导出。原C实际核PAL_BattleWon、PAL_PlayerLevelUp/STAT_LIMIT、AddMagic、玩家毒增删查和Wear分支；不是完整SDLPal或原版游戏实跑。

注释修正：CureByKind真实global.c1520–1564；AddPoison范围1459–1517；Wear明确TS不压缩/全16槽、C遇首空槽并前移；CureByLevel不许伪称无条件跳过level99。升级MAX_LEVELS源为palcommon.h82；STAT_LIMIT2393–2401，LevelUp到真实EOF2409；PAL_BattleWon保存余数与LevelUp自身清零分开。本项目mulberry32与SDL LCG不同，只核范围/顺序而非同seed同序。两生产实现removeComments JS输出字节与基点相同，原始/当前源及编译producer保留。

## 测试合法性、oracle与反控

levelup投影例的as any as PlayerRole缺失头像/精灵/音效等必填字段；改复用现有完整typed makeHRole，静态roles显式PlayerRoles类型，保持原有数值oracle。原例未startBattle，只调公开投影，标题勘误并保存[test-title映射](test-title-mapping.json)，不为维持身份保留虚假闭环声明；未编辑baseline/退役payload，官方身份门留大窗口。

H02五例分别核越界等级防御、隐藏无999 cap、Health→Magic两池、无主升级不回满、主升级隐藏涨点后回满；不冒称七池全序或正常生产会生成level120。多池dwExp应100非200。最后一例实际主6抽+隐藏2抽，旧七值的recordingRng回退1遮住次数；现明确八值并断言完整范围序列。该断言与同次主/隐藏升级后的回满合同配对，不拆重复smoke。

同一额外一抽变异先使旧五例5绿，新五例4绿1指定业务AssertionError；没有过滤、skip/pending或collection/runtime替身红，两个完整原生Vitest JSON/raw、command/cwd/exit/signal/source/spec/mutant hash及finally恢复SHA见control-old/current。恢复后改动两测仍5+11=16条，另11条跨入口所有权回归，共27定向；结算/装备/opcode三个相邻文件16条只计回归。完整输出无stderr/act/环境/unhandled诊断。没有新增删除测试、降低断言或修改runner；其余五池次序、原盘表复算与全部极端输入仍未接受。

## 发现、限制与后续

毒去重的TS全槽扫描与C首空槽前缀不是同一合同，CureKind可留孔洞，现只源码记录并回写已有draft卡。dependency-ownership的slot1低毒断言保护当前TS稀疏ownership，不能证明SDL压缩等价；该测试/产品保持。装备/原盘catalog/毒tick与save因果仍待，不改压缩/去重策略、状态键或schema/upgrader。

升级源与两直接测试旧整文件关闭信用转review，poison保持review，0新增closed；旧3x“无弱断言/夹具全合法/完整开战链”撤回，旧报告字节另存，旧207绿不推广。新账本以ledger.json为准，83卡仍50partial/33pending/0accept。完成四组注释，剩余六组和两UI差异优先，94–102/editor随后。

## 验证与交接

当前命令/退出码/完整未裁剪raw/hash见gates.json及配对附件。game typecheck通过；125文档工具测试与修后零issue消费者组合满足本片文档门，全仓lint5178文件0/0/0、ledger和diff检查通过；初次失败不改写为成功，当前组合范围以gates为准。全仓check、official coverage ratchet、protected fast按用户成本纪律未运行；无新产品行为或界面、资源生成、schema/save/public接口改动。未合main，不宣布统一门或专项完成。无下一位Agent提示词，Codex单Agent继续上述明确范围。

读边界producer首次预检拒绝了equipment-state请求尾395超过实际EOF391，尚未写出该boundary；现记录实际370–391并单列requestedRanges370–395，无EOF外信用。初版producer保留，不把预检失败当业务反控；当前全部SHA/行数/区间在提交前复核。

完整pnpm check:docs首次125工具测试全通过，随后text consumer因父目录漏导航1issue退出，后续consumer尚未运行；已补父README链接，按docs-current只重放全部consumer，未重复未变的125工具测试。初次exit1原件不覆盖，也不冒称那次pnpm脚本exit0。一次性producer只保存本片来源，复现应在基点隔离副本执行，不在已写回当前树盲目重跑。

文档第二次consumer回放docs-current因poison源码注释SHA产生2个配对绑定诊断；只维护phase1-dependency-ownership这一entry和report/evidence的sourceRef/history，保留其它17对象、status/lastVerified/reviewBy、历史candidate/versions/runtimeExecution。generated九视图无diff，原D1 SCC/token/三针/浏览器均未复跑；当前11例仅有限回归。最后docs-final全部text/model/testing/phase-lore/content消费者exit0、0issue，与首次已绿125工具测试组合满足文档门；未把两次exit1改写为0。metadata verifier核原件/源SHA/实际范围、测试集、catalog窄diff与历史ledger字节均一致。

当前全仓lint5178文件为0error/0warning/0info；账本工具实测3315 /275closed /66review /2974pending；metadata核验不把机器PASS当语义验收。完整统一check/ratchet/protected尚未执行，保持review、不合main。
