# CODE57结构、测试、缩略图与地图ownership代码验收

2026-10-25，Codex单Owner，同一codex/code-quality-3y，基点624478c9ff3554d51142214d4d7aef78d67922fb。完整[逐文件八维/版本/限制](review.json)、[源码逆变换](prove-refactor.cjs)与[明确获批行为差异](approved-map-consistency-delta.json)。本窗九项代码范围接受：七文件新关闭，event-system与scene-identity两旧关闭刷新。**CODE57代码接受、CODE3r/53因同一拒绝counter暂停的代码信用恢复；统一集成仍开放。**固定80accept／3partial／0pending，剩余CODE1／3m／42，不扩94–102。

## 质量整改与职责

两旧专测保留3身份：256色与实际tuple修改核restore/black/source隔离；真实400×250 Canvas call-through+RGBA替代不完整ctx。共享clone tuple、共享black tuple、硬编码320×200三反控各旧3绿/新恰1业务红，源与测试精确恢复。旧假ctx初始空font仅是夹具，不再冒认生产合同，业务色彩/坐标/顺序保留。

纯重构740996efb把thumbnail缓存/在途/并发2/Canvas一起移出，DOS序列仅借八个明确资源/端口；root持有GS、挂起、菜单与场景状态。工厂早于注册、无模块时IO。公开出口与全部其它root类型/正文可受限还原，private未用paletteOverride删除有真实caller证据。完整原版DOS/剧情演出未重跑，不把结构验证当听感/美术验收。

用户批准细缝后，先真实血池640边缘像素红、自包含合法GOP→PNG红，再以两层共用coverage和现repair在降采样前修复。修后[实际输出](minimap-seam-after.png)边缘[116,12,8,255]，与事先参考输出字节一致。只对已测map12/76与96/640样本下结论；startup色表、资源、碰撞、存档不变。

## 两项获批地图修复

原main→raw0x99实际JSON500有未处理pageerror，blob500使活tile0消失；[原失败前](map-before-failure.png)／[原失败后](map-after-failure.png)已查看。用户批准后，完整下载才同步发布，失败保留旧资源；core精确记录原拒绝，保持脚本继续/NPC/状态owner。revision阻止旧请求覆盖新请求或已经离开又返回的scene；仅删除这一守卫，恰好两个对应业务断言失败，随后精确恢复。

随后又实际确认：换到map76后工具身份仍12，重访把旧tilemap12与新tiles76混配。用户另批后：成功发布同步当前身份和借用cache对象的mapNum/tilemap；首次scene fetch读取1-based现有override，缓存命中时将改变的override配成完整资源包后发布。没有修改shared cache API、Save格式或剧情脚本。两条正式合同在旧f454源重放恰2业务红，恢复候选后当前7合同绿；这是明确登记的后续旧版本回放，不伪造时序。

[失败保留后的实际画面](map-fixed-after.png)与[修后失败前](map-fixed-before.png)已查看。最终采集等boot覆盖层移除才截图；两轮故障仅HTTP端点替代，核心/codec/主循环/真实Canvas不mock。每条故障准确包含一条平台500与一条应用原错误，**没有未处理拒绝**；不是console空。普通成功/迟到/重访路径error/warning/pageerror均0。

原三项getter绘图测试保留、K04旧2身份+1独立拒绝合同；新thumbnail5例。初始相邻11文件57例、地图相邻8文件391例、最后root3helper及game typecheck均实际通过，按各自源码版本记录。源逆变换显式撤回获批行为差异，完整typed AST核其它正文；它不声称修复本身行为不变。

## 原件、勘误与复验

[无损完整原件](receipts.json.gz)保留命令/cwd/time/exit/signal/spawn、完整stdout/stderr、原生结果、patch、producer与所有浏览器轮次；[静态门回执](static.json)单列。首轮场景重装夹具实际被同scene guard跳过、sceneLoading应为undefined、早期截图仍有boot淡出层、map0资源不存在，均如实留失败且撤相关信用。最终场景离开返回、合法实际地图76/20和boot就绪观察器才获准。工具自身早期失败及未保存的直接终端输出也在review披露。

只读快检：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/bootstrap-quality/verify.mjs`。它核版本、原件、红绿、恢复、获批差异与静态回执，不联网、不写树、不启动测试/coverage。语义结论来自本次实际审查。资源缺失/变化分别报告UNAVAILABLE/STALE，不能反写历史结果。

重跑真实回归需先在此治理树game包启动自有HTTP Vite：`E2E=1 pnpm exec vite --host 127.0.0.1 --port 6005 --strictPort`；再在根运行`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/bootstrap-quality/map-reload.browser.mjs /绝对路径/新的输出目录`。新目录排他创建，7条、所有context/browser关闭；结束关闭自有server。没有Save或主树产物写入，不授完整剧情通过。

全仓check/official coverage/ratchet/protected及一个PR继续等全部pre94解决；本窗不运行或声称这些门通过。风险卡按[当前交付](../../../tasks/GAME-MAP-RELOAD-FAILURE-OWNERSHIP-1.md)读取，旧待批是修前历史。
