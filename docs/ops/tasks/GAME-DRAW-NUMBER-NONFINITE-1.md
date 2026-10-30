# GAME-DRAW-NUMBER-NONFINITE-1 — 非有限数字阻塞绘制

Status: done
Phase: phase1
Capability: CODE3k / numeric presentation boundary
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（本人复核，不冒充第三方）
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: Codex
Branch: codex/code-quality-3y

## 目标与范围

只处理drawNumber收到非有限number时的非终止；候选策略为跳过该数字，正常绘制其它内容。限定draw-number.ts及其专测/真实caller回归。不改变V1数据合同、存档值、属性成长、战斗公式或原盘脚本。关联[pre94父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary | SDLPal数字输入为UINT，无Infinity域；百分比buff为WORD数据运算 | reference/sdlpal/ui.c:640–732、script.c:1406–1430 |
| 第一阶段 | V1接受有限base；100%临时加成的乘法可溢出；状态页传effective值进入非终止长度循环 | core/save/v1.ts:39–76、v1-shape.ts:10–11；battle-opcodes.ts:853–905；present/menu/draw-player-status.ts:380–430；draw-number.ts:76–81 |
| 当前二阶段 | N/A，Reforge不使用本函数 | 当前生产caller census |
| 目标 | 非有限数字跳过，渲染正常返回；有限输入布局保持 | 用户2026-10-24批准跳过异常数字；两正式业务红→绿已保存 |

反证与替代解释：旧探针直接注入rgEquipmentEffect会被读档重算消除，不能作为生产证据。本次只改合法JSON中的有限runtime武术base，执行normalizePlayerRolesRuntime、真实updateAllEquipments、真实startBattle、真实runScript，采用当前提取原盘all.json[43028..43031]四条指令。base=100正常返回、effective200；base=Number.MAX_VALUE仍通过导入且重算后保留，Extra/effective为Infinity，真实drawPlayerStatus由VM250ms看门狗中断。普通剧情能否生成此量级属性未知；未运行真实浏览器读档，也不宣称完整玩家路线。若实际bootstrap另有限制该base，或原盘脚本片段不成立，应撤回相应可达性结论。

## 上下文与依据

- AGENTS、CLAUDE、长期八维质量规范；engineering-notes第一阶段真值分层与真实函数定位。
- bootstrap.ts:1653–1723的读档恢复顺序；本次probe重用其相关纯状态/装备步骤，不复刻整个读档UI。
- 用户既有裁决保留TS属性持续增长，不能借此把属性重新限制为WORD。
- 完整探针、原始stdout/stderr与当前primary指纹暂存type-pal-pre94-draw-number-0riz5i6k，随父卡本窗证据封存。

## 验收条件

- 八维逐项、有限布局旧合同、非有限终止及后续内容像素合同；反例须业务断言失败，VM仅作同步非终止隔离，不放宽Vitest超时。
- 默认只读复验核候选/原件/真实失败身份；相关切片齐备才集中check、official coverage、protected与零诊断静态门。
- 视觉：不要求用户评估正常游戏形态；异常路径与普通剧情可达性区分记录。

## 当前模式推进记录

Codex单Owner，隔离树quality-3y-closeout，基点f5457a14cba4583072ee4a83302aca0d77daf15a。缺陷前提verified于上述有限probe范围，2026-10-24本会话用户答复call_edfe7d7f551d4841b9fae30c955bcae2：“批准跳过异常数字（推荐）”；只受批非有限数字跳过，Codex build allowed。父卡获准的纯blit提取/合法测试补强可独立继续。

## Draft: 设计与风险

候选仅在drawNumber入口判断Number.isFinite(num)，非有限时return；不扩展到负数/小数/槽数策略。不能声称SDLPal有同一guard；这是TS数值域的失败隔离。上游buff数值精度/溢出、V1上界是独立问题，不在本卡重写。

## Build 与自测

正式nonfinite-red-valid四例中两业务AssertionError（直接正Infinity／真实状态页）先于guard。guard后17数字专测全绿；首轮写文件cwd错误的no-files原件保留、不授红例信用。相邻/统一门按父窗收尾。

## Review 与用户验收

Codex有限范围accept/done allowed。2026-10-24 CODE3k数字质量收口：2新关闭（draw-number与新nonfinite专测），5身份槽位专测刷新接受，原8例/共享叶及其它五primitive复用指纹证据。固定67accept/16partial/0pending；3411tracked/420closed/99review/2892pending。定向13→17、相邻16文件77例；完整check20576包例+700工具例、七包typecheck；唯一官方采集20147例/777源与同报告ratchet/strict protected通过，硬静态及运行0/0/0。纯blit复用与用户批准异常数值guard分提交，保存原红/反控/门禁失败原件，不扩94–102。 普通剧情自然可达性仍未知，未宣称完整浏览器读档或视觉路线验收。

## 交接日志

- 2026-10-24 Codex：用户批准后先正式两业务红，再guard及17绿；相邻与统一门零诊断。2026-10-24 CODE3k数字质量收口：2新关闭（draw-number与新nonfinite专测），5身份槽位专测刷新接受，原8例/共享叶及其它五primitive复用指纹证据。固定67accept/16partial/0pending；3411tracked/420closed/99review/2892pending。定向13→17、相邻16文件77例；完整check20576包例+700工具例、七包typecheck；唯一官方采集20147例/777源与同报告ratchet/strict protected通过，硬静态及运行0/0/0。纯blit复用与用户批准异常数值guard分提交，保存原红/反控/门禁失败原件，不扩94–102。 远端CI/合并状态按后继Git回执核，不以本地done冒称已发布。

- 2026-10-24 Codex：有限JSON base→装备重算→原盘buff片段→真实状态页，正常控制与非终止探针已留。下一步用户裁决显示失败策略。

## 下一位 Agent 提示词

本卡有限收口。仅从其余16张pre94 partial核Owner与最新main，不扩94–102。

2026-10-24封存补核：纠正原SDLPal注释链接的一级目录错误，完整源码仅该URL字节不同；不重跑本地全仓/覆盖率，原冻结与失败证据保留，同报告protected及最终静态/远端CI另记。关闭数不变。
