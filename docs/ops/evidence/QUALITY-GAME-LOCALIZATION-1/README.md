# Language resources and display contracts

Status: current
Owner: Codex
Last reviewed: 2026-11-01
Template: evidence-receipt-v1 / 1.0.0

## 目的

在同一 `codex/code-quality-94-102` 分支，从 main `4f318eb9864eed65021c75bee6ae43286ffea07f` 接续十二个 pending 主体。main 两项 CI 已成功，job 124613696719 / 124613696766 原始日志无实际诊断、annotations 均空。Owner 核对与本批准入见[任务卡](../../tasks/QUALITY-GAME-LOCALIZATION-1.md)。

## 范围

语言资源合同/加载、偏好/静态壳、布局/菜单描述、消息组/播放四片合为一批；复杂度以跨帧/IP、借用表和监听生命周期为主，没有为了凑百文件扩大范围。十二原 pending 加两个接收同职责用例的既有 closed 主测，形成二十一个当前输出（十九可新增关闭、两项重新核验）；不把重命名文件数量冒称原始审核数量。

## 执行与证据

- [逐文件八维与保留取舍](review.json)：全文主体、caller、生命周期、命名拆合、问题和限制。
- [冻结输入、当前输出、caller 指纹和测试去向](proof.json)：54 个原运行身份全部有去向；新增10项针对布局flag/资源更换、消息所有权、静态壳卸载和中文描述路径的合同。七个产品文件的去注释 TypeScript AST 相同。
- [声明、import、hook 与测试闭包](dependency-closures.json.gz)：复用既有 analyzer，语法相同不代替 fixture/生命周期判断。
- [完整原始材料](raw.json.gz)：stdout/stderr、原生 JSON、命令/退出、反控补丁、环境异常和 main CI；以原始字节/hash保存，不裁剪通过用例输出。
- [集中门结果](gates.json)：如实区分首次失败与恢复、覆盖率采集与同报告保护核算；发布由 PR 另记。

`presentation` 的 WORD/布局/说明/装备合同归各自消费者；`shell-surfaces` 的加载、统计授权和地图名分开；消息组模块测试与真实跨帧播放、纯换行、战斗偷取显示分层。地图名三个重复英文断言由原主测已存在的 known/fallback 例承接，全域英文成员与英文回切中文断言保留。原播放的长度断言加强为完整 Command 前后不变，label 字面断言保留。

语言状态夹具只管理自己的单个偏好 key、有效语言和 HTML lang；表、节点和订阅由各测试自行释放。加载页 finally 在移除节点后实际发布语言变化，让进度监听按生产合同退订，不依赖后续用例。无产品行为、公共接口、存档或资源格式修改，也不授浏览器/全剧情/E2E信用。

## 判别力与过程偏差

旧全角空格用例只查空白区域，真实描述 renderer 完全不绘制仍通过。本批保留该断言并核两侧字形正像素；同一 no-op 反控旧选中1绿、新选中恰1个业务 AssertionError（0 对 60），其它未选用例明确 skipped、不计执行信用。源恢复 SHA 相同，随后当前135 game 定向/相邻与33 extraction 相邻均通过，stderr 空；CLI help stdout 是功能输出，未静音。

首轮格式工具报告两个尚未接上新增用例的 unused imports；完成用例后归零。证据生成草稿有一次括号语法错误，修正后重建，未授失败草稿证明信用。原件均保留。

首次官方采集在两个原 CLI 用例上超时。系统电源记录显示 10:01:00 合盖睡眠667秒，与两例约665秒的异常耗时吻合；唤醒后23项定向回查通过，原失败例约1秒内完成。没有修改 timeout/规则/选择，失败轮不记通过；后续完整恢复20205例全绿，随后严格比例比较因新增夹具被现有选择计入分母而拒绝；仅按既有用户授权精确重算game三项受影响计数，函数/其它六包floor保持，见[重算](coverage-recount.json)。同报告原版runner尾段/guard/writer复用，ratchet/protected均exit0，未再采集。

## 复验与失效

在仓库根执行 `node docs/ops/evidence/QUALITY-GAME-LOCALIZATION-1/verify.mjs`。默认只读，检查原始Git输入、当前源码/依赖、完整身份与原件；产品AST比较含相等、尾字段不同及漏调用负自检。集中门未完成时明确失败，不据材料存在自动接受。

脚本只证明版本/映射/原件一致，八维设计判断在 review 中。源、caller、Command/SLF/控制符、字体宽度、语言订阅或存档承接变化时重核受影响claim；无需按日历反复通读或重跑全仓。其它 pending 未触及，下一候选为同一功能的 SLF/语言包生产端，须另核 Owner 与当前状态。

## 本地收口结果

全仓check七包20554例、工具套件和typecheck通过，lint error/warning/info均0；首个check停在新增保护账未同步census的95≠94，修为精确95/378后重跑通过，原件保留。复验脚本在门未完成时实际拒绝过，未把准备态当通过。最终静态文件门与机器账另记录于gates。

3466 tracked /846closed /0review /2620pending；19新关闭当前路径，2既有消费者补核，解决12个原pending主体。其它文件不因全包通过升格；七产品无执行改变。本地验收完成，远端提交/CI/合并依实际PR回执，不预写成功。
