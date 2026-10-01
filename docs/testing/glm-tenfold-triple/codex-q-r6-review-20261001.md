# TEST-GLM-WAVE-Q-1 r6 独立复核（2026-10-01）

结论：**Q-R5-01～04 关闭；整卡仍 counter / rework**。本轮代码、实际执行及六枚更新针成立，
但逐合同账仍不准确、原700例/50组/50有效反控未完成，不批准整族缩围、不合main、不标done。
[机器证据](codex-q-r6-review-20261001.json)区分45枚存档复算与6枚独立业务重放。

## 固定对象与门禁

- 测试候选 `c4e55436117970a66cecb339cfb61593d1874209`；本地/远端 pin
  `2ebf42b84f6092947e1d35c6ac56901607eb1430`，区间确仅receipt.json两字段。
- 派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`；冻结
  `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`不变。716/716源匹配、Q323源、490白名单路径、ownerOverlap=0。
- 在独立detached临时树离线frozen-lockfile安装依赖，串行真实全包：Reforge **2150**、
  game **2800**、pal-extract **360**，总 **5310** 全绿；三个typecheck零诊断。
- `pnpm lint`完整报告 **2950文件，0 error / 0 warning / 0 info**；docs 815 Markdown /
  4277本地链接 / 245卡、0问题；区间diff及verifier通过。
- 初始无资产game诊断不是通过门：dev-panel收集缺enemy-teams.json、旧资源组skip。
  随后只向临时树复制主树gitignored `data/raw`、`data/extracted`，重跑得到上述2800全绿。
  没有运行extract/migrate，没有写真实数据、贡献者树、产品、旧测或配置。
- 全包新测17文件/128条file×fullName×status，与directed逐条相同、无缺/多/非passed。
  contracts身份亦128条对应；**执行身份匹配不等于128条均已被证明是未重复合同**。

## 已关闭项（不重复返工）

1. **Q-R5-01**：`battle-action-error-arms.glm-q.test.ts:307–317` slot补齐BattleEnemy所有必填字段；
   status五必填计数、prevHp及三script均有真实值，两个数组直接typed声明，无强转/缺字段。
2. **Q-R5-02**：performItem缺entry/count0两例及import删除，最终directed/contracts无该两身份，
   旧 `core/battle/__tests__/actions.test.ts:2317–2371`保留对应合同；未把throw-item不同入口一并删除。
3. **Q-R5-03**：新七例`:339–410`真实create/hydrate后填公开rgwMagic并project，不补字段、
   不用私有态/双桥、不测learnedSpells；完整32槽保序/零槽的投影断言与六个pickAutoMagic条件分别成立。
   已直接对照旧battle-system`:1089–1119`两signed-negative断言及game-state/dev-panel投影测试，
   未复制signed-negative。这里接受这七个具体轴，不据此推导整个学习法术族已闭合。
4. **Q-R5-04**：45枚index/meta/实际original-restored/rebuilt-mutant SHA256、三态执行多重集合、
   退出码及指定业务单红全对应最终树；RC3除名；旧39枚index及专属证据与r5逐字未变。
   对RC1/2/4/5/6/7另外独立实际重放：共享原态12/12，每枚变异12执行/11绿/恰一指定AssertionError、
   exit1；恢复源hash后逐枚重跑12/12、exit0。不是冒称独立重跑全部45业务变异。
   旧八枚Vitest rejects/throw断言序列化为Error前缀，原文保留；不是新的环境红。

浏览器11截图hash均相符、10流程证据及driver与r5未变，沿用既有复核，不重复跑菜单流程。
F1恢复主张仍withdrawn；不宣称console全零或新浏览器实跑。D-Q01-1继续独立产品draft。

## 剩余 counter 与续做

### Q-R6-01 — 新魔法合同仍套错账

`wave-Q/contracts.json` C104–C110对应上述七例，却仍把source写成performMagic/item/throw-item/
selectAutoTargetFrom；caller是旧state直构模板，oldAssertion与classification也仍是库存/扫描族，
oracle为“详见测试体”的泛称。没有pickAutoMagic、hydrate/project源条件或对应旧断言锚。
补逐例source条件/生产caller/合法输入/旧完整fullName与断言行/精确结果；其它未证模板同样按原卡续账。
不能用JSON身份128匹配代替合同合法性与排重，不批准128或整族自动缩围。

### Q-R6-02 — 最终/历史账未分清

README缺口段仍44/50；ledger当前8b行仍旧七例与已删performItem，结论/README下一批还要求
captureEnemy全族，与10b的N/A误设行关闭矛盾。保留历史r4/r5事实，另设明确r6当前结论：
128执行/45针，已删两例不再计入，capture误设行不再续派，剩余至少572例/5针及50组完整账未闭合。
receipt.results仍r5/2946扫描，shortfall.account的标题也过时；最终r6门需对应实际报告，
历史不改成r6“已复跑”，Codex新结果与作者旧结果分列。后续新增按新的最终树更新。

### Q-R6-03 — RC7业务有效，但因果/primary标签错误

`reference/sdlpal/uibattle.c:763–766`明确是ultimate move极限技筛除门，测试`:384`“特殊免耗位”
不是一手语义。RC7 meta.axis/index/.axis写“应改选baseDamage高的297”，实际两法术baseDamage
均为30、range=0；1→2解禁296后，strict `power > maxPower`使同威力保留先遇到的296，
因此断言真实得到 **expected296 to be297**。不能写成“更高威力297”的变异理由。
只纠正标题/合同/轴说明，不改产品或合法输入去迎合错说明，不重判这枚业务反控无效。
若改测试标题/源，按最终文件只重采本文件六针并同步JSON/fullName/hash/patch；未变旧39枚保留。

当前规模不是完成条件。继续原卡已批准Q07/Q08合法typed生命周期余族、正向空槽复用/行动相位
逐条件排重，以及Q10合成图像/解码公共CLI；先核实际冻结缺口，不把上述方向当未重复证明。
机制新真值/剧情/缺合法输入/冻结漂移仅停受影响组。CLI只mkdtemp合成工程，不跑真实主工程生成。
未运行全仓check/official ratchet/protected strict-fast或正式覆盖结算；它们仍留在整卡独立accept后的串行集成门。

## 下一位 GLM Q 提示词（用户手动转发）

```text
继续 TEST-GLM-WAVE-Q-1，唯一Owner、原树 /Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal，分支 codex/glm-wave-q-runtime-residual-r1。钉r6测试c4e55436117970a66cecb339cfb61593d1874209、pin2ebf42b84f6092947e1d35c6ac56901607eb1430；派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变。当前counter/rework，不合main、不done。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md 最新r6段、所链codex-q-r6-review-20261001.md/json、共同协议与阶段纪律。Q-R5-01～04均关闭：完整slot、删除两库存重复、七例公开magic投影、六针重采/旧39保留不重开；独立全包2150/2800/360、typecheck×3、lint2950完整0/0/0、docs/diff/verifier已通过。
先修Q-R6-01～03：C104～110逐例写真实pickAutoMagic及hydrate/project条件、生产caller、合法输入、旧完整fullName+断言行、精确oracle，清理其它未证模板；README/ledger当前段统一128/45，删除已退役capture误设行续派与已删performItem计数，历史单独保留；receipt更新最终报告/真实标题，不把r5日志改称r6。costMP1是一手极限技门，不是免耗位；RC7两法术baseDamage同为30/range0，1→2后同威力保留先遇到296，应写真实因果，不改产品或数据迁就旧错说明。测试标题/源改变后，只真实重采该文件六针，更新最终directed/contracts/index/meta/三态JSON/raw/退出码/执行集合/hash/patch，未变旧39枚保留。
随后连续原卡合法Q07/Q08 typed生命周期/行动相位/正向空槽余族及Q10 mkdtemp合成公共CLI批次，不再停在小修等待派话；逐源未命中条件、caller、合法输入、旧断言、业务oracle排重，不换名换数字凑数。700例/50组/50有效反控/10实际非剧情流程目标保留，当前至少572例/5针与完整组账未完；不足逐项举证交Codex，不自行整族缩围。每批定向+相邻+typecheck，阶段提交推送后继续下一合法批。
只原Q新测/专属fixture/wave-Q证据可写；main/产品/旧测/配置/官方baseline/共享文档/O/P/真实数据/E2E只读。禁止unsafe桥/ignore/扩timeout/业务核心mock/私有态/降规则，不走PAL剧情或世界后门。D-Q01-1仍独立产品draft不夹修。新真值/缺陷/无合法输入/冻结漂移只停受影响组，其它合法组继续。最后按最终树串行三包全测/typecheck、完整lint0/0/0、docs/diff/verifier，推送真实完整SHA及docs-only pin说明；official ratchet/protected fast/main/done/清树仅Codex。
```
