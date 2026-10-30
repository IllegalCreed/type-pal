# CODE53 画面补证与 CODE58 质量返工

任务：[pre94父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。基点7f9f42b6c，同一codex/code-quality-3y，Codex单Owner。固定77 accept／6 partial／0 pending不变；本片只新增关闭tools-panel-style.ts，不把既有七个状态/inspect关闭重复计数。

[逐文件A–H、版本桥与限制](review.json)复用five-cards七份全文证据、58夹具及前片1332行完整读取；本次只核实际差异与旧停止线。status澄清中英布局和运行态ownership；tools静态样式独立，保留原出口、收窄三个私有依赖、用BattleStatus删除两处双强转。没有实现行为、公开接口、存档或生成物变化。完整执行代码重建与状态非import TS相等证明见[只读证明](prove-refactor.cjs)；import声明仅格式重排，同bindings、三个本地化模块无加载时IO/注册。

## 真实功能画面

已有DEV skip-intro/dev-party启动与__game探针明确安排合法fixture，真实Chrome/资源/键盘/菜单/绘制；不是普通剧情、正式读档或001–006 E2E。

- [runtime0](runtime-zero.png)：[4,1]阿奴HP/MP为0，静态基线非0，显示0。
- [首槽](duplicate-first-slot.png)／[末槽](duplicate-third-slot.png)：公开玩家0x29及真实毒入口把HP200→188，毒552写首槽。[4,5,4]按两次方向键，两个阿奴页面只差毒名行262像素，行外0差异，cursor2不重复首槽毒。
- [换队](after-party-reset.png)：正式event tick执行0x75，队伍[1,2]、旧毒552清除。战斗整轮毒tick复用旧真实startBattle/defend/0x1B证据，本次不声称浏览器战斗重跑。

最终浏览器无error/warning/pageerror/requestfailed；**57条DEV跳过脚本debug和4条log完整披露，不是空console或统一运行零诊断**。首轮getImageData导致一条Chrome性能提示；改为离线PNG读像素后重取，未改产品或屏蔽console。英文包本地缺失，尝试切换超时，英文画面未通过；未重提取资源来绕过前提。浏览器/自有5329服务已清理，用户树与存档未写。

## 测试和停止线

快捷键原一个用例加强为六分区内“键→说明”对应，不新增用例。W/F对调反控：旧16绿，新15绿/恰1业务AssertionError；恢复后集中**16文件125例全绿**，stderr空，game typecheck无诊断。原始/native、反控补丁、完整producer和失败轮次在[完整原件](receipts.json.gz)，[静态门](static.json)独立记录；不拿旧统一门认证本候选。

[导出失败新卡](../../../tasks/GAME-TOOLS-SAVE-IO-ERROR-FEEDBACK-1.md)：真实Save.loadSlot可拒绝，现工具导出未catch；合法IO端口拒绝探针得到缺少错误提示的AssertionError和未处理拒绝。产品尚未改，等用户裁决。FileReader错误仅待核，未冒称缺陷或已修。

53/58仍partial：53的功能画面/旧毒停止项已解决，GameState/Dev整文件质量边界不能由这组状态文件顺带关闭；58结构与专测增强接受，导出错误/Dev广域仍review。下一片直接补GS/Dev的真实八维缺口，复用原全文和当前差异；1/3m/42/57仍各守边界。全仓check/官方coverage/protected和一个PR继续等剩余pre94全部解决，94–102不扩展。

只读快检：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/status-tools-closeout/verify.mjs`。默认不联网、不写树、不启动浏览器/测试/coverage；指纹相符只认证指定证据适用性，不能自动证明设计质量。旧包原本的STALE不盲目重钉。
