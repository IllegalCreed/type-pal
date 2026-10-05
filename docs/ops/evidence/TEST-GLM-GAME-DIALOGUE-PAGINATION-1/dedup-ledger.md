# TEST-GLM-GAME-DIALOGUE-PAGINATION-1 排重账(GLM r1)

排重域:`event-system.ts` 公开分页/推进 caller(tickEventSystem 的 dialogBox 相位机;
`present/dialog-box.ts` 为其状态机实体)的旧测——`event-dialogue-pagination.test.ts`(家族)、
`event-system.test.ts`、`event-system.cov85.test.ts`、`event-system.glm-event-contracts.test.ts`、
`dialog-box*.test.ts`(单元层直调,caller 不同仅作证据参考)、narration/wait-key 各 describe、
已归档 Game 卡(TEST-GLM-GAME-EVENT-CONTRACTS-1 / TEST-COVERAGE85-GLM-GAME-1 /
TEST-GLM-GAME-TURN-BOUNDARIES-1)与全量 fullName grep(hex/中文轴名双查)。

## 新增合同(6,全部未证轴;源锚 / caller / 输入 / oracle)

| # | fullName(节选) | 源锚 | 公开 caller | 输入 | oracle | 排重结论 |
|---|---|---|---|---|---|---|
| C1 | DM18 翻页等键吞任意键 | event-system.ts:1708-1715(text.c:1433) | tickEventSystem + InputSnapshot | 4 短行 + 第 5 行;page-key 相位按 Cancel/Down | 非 Confirm 键同样 page-advance:第 5 行独占新页(shown 空、重新 typing、ip 保留重入) | 旧测翻页释放全用 Confirm(2262/2911/家族 run());narration 任意键(3653)是另一分支;等键键集 tick 层无证 |
| C2 | 末页边界:恰 4 行遇 end 只等段末键 | event-system.ts:1879-1890(script.c:3475) | 同上 | 7 行(4+3)+ end;只在 page-key 按 Confirm | page-key 恰 1 次(第 4 行后);段末= waiting-end-key(非 page-key)、残页 3 行、Confirm 关闭回 explore、历史全 7 行 | cov85:577 证 end 二分但为手搭 dialogBox、无按键、无 journey;366 仅单行;恰 4 行边界与残页旅程无证 |
| C3 | DM18 反向:typing 中 Cancel/Up 不跳字 | event-system.ts:1712-1714(text.c:1602) | 同上 | 24 字长行 typing 中按 Cancel/Up | 相位仍 typing、charsRevealed<len、userSkip falsy、ip 不动 | 跳字负向键集 tick 层无证(Bug2:508 只按 Confirm);0x84 wait-key 的方向键负向(1588)是另一 opcode |
| C4 | DM18 跳字键集:Menu ≡ Confirm | event-system.ts:1712-1714(text.c:1602) | 同上 | 24 字长行 typing 中按 Menu | 瞬显(charsRevealed=len)+ userSkip=true + 同 tick 连锁 ip 到 end + waiting=dialog | kKeyMenu 成员 tick 层无证(Bug2 只证 Confirm 成员);单元层 confirmDialog 无键集概念 |
| C5 | 空页位:$00 段中空行占一页行位 | event-system.ts:2017-2040(text.c:1745-1746) | 同上 | 真行 + `$00` + 3 真行 | 空行入 shownLines 占第 2 行位 → 翻页边界提前到第 4 真行;空行不入 dialogHistory;翻页后新页计数从 0 重计 | DM20/21(1281)只证 $00 为**首行**(start 分支 + 瞬显);段中 append 分支 + 空行计入页容量 + 历史排除无证 |
| C6 | L2 跳字连锁停在翻页边界 + 新页复位 | event-system.ts:2053-2058 / dialog-box.ts:594-595(text.c:1447/1607) | 同上 | 8 长行;第 1 行 typing 中按一次 Confirm | 连锁瞬显 1-4 行后停在 page-key(ip=4 未消费、userSkip 仍 true);翻页后 userSkip=false、第 5 行 charsRevealed 从 0 重新逐字并真实推进 | Bug2(508)单行连锁停**段末**键;家族 fast 变体每 tick 按 Confirm,不复原停键中态与新页逐字中态;单元层 227 直调 confirmDialog 证复位,非 tick 链路 |

## 登记未证但不新增(同 caller/同 oracle,按「少而精」登记)

- **Confirm 释放段末键 → 关闭回 explore**:event-system.test.ts:366-381(单行)与 Bug2:508
  (连锁终点断言)已证;C2 只补边界/残页/键集轴,不重复包装关闭本体。
- **`~` 收尾全程不等键(count=0 自动推进)**:event-system.test.ts:386-418(梦境三句真序列)+
  cov85:577(count=0 直接清)已证。
- **pendingStyle / dialogBoxKept / 0x05 擦立绘 / portraitLayout 解耦**:event-system.test.ts
  577-617 / 619-655 / 2894-2953 已证,本卡不碰。
- **跨页续行/三样式连续翻页/分页边界接续副作用一次**:家族 event-dialogue-pagination.test.ts
  三组已证(001 真实文本/10 行 3 页/0x05-0x8E 接续),不重复。
- **narration(item-box)1.4s 自动消失 + 任意键**:event-system.test.ts:3636-3678 已证
  (与 DM18 对话分支不同源行)。
- **0x84 wait-key 键集(Confirm/Menu/Cancel 解除、方向不解除)**:event-system.test.ts
  1566-1596 已证(另一 opcode)。
- **confirmDialog 四态/shouldWaitPageKey/userSkip `~` 复位/wall-clock 打字/Bug3 尾停顿**:
  dialog-box.test.ts 单元层直调全覆盖;tick 层对应旅程由 366/386/508/家族覆盖,不再叠包装。

## 观察登记(不测、不判、不改产品)

- **连续 ≥4 个空行 + 第 5 真行的极端链存在计数分歧**:`$00` 纯控制行在同 tick 连锁 append,
  末空行停留在 `typing` 相位;`shouldWaitPageKey`(dialog-box.ts:422-428)只计 `line-done`
  current,第 4 空行不计入 → 第 5 真行不触发翻页(5 行同页)。sdlpal 真值(text.c:1649-1658
  `nCurrentDialogLine > 3`)会翻页。真实提取数据中 `$00` 均为段首单行(死亡脚本 41078/41081),
  该形状不可达;本卡按前提真值纪律不把分歧行为钉成合同,留待产品侧裁决,如需修复另开卡。
