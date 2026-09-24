# Reforge菜单/物品宿主拆分 · A1

2026-09-24，基点09429b6c，实现dbe55b55。[任务卡](../ops/archive/tasks/done/ARCH-REFORGE-MENU-1-session-controller.md)已done，
用户明确批准本批由Codex独立实施、自验收口，Kimi/GLM缺签豁免仅本卡，不冒充第三方审查。

## 改变与不变

- main.ts 7153→6798行，15个菜单/物品可变局部状态由两个明确所有者承接；bootGame仍6394行，后续A2/A3继续拆。
- `menu/menu-session.ts`：菜单树、面板、光标记忆、系统与存档浏览UI、物品执行前后的菜单恢复。
  `input`只做路由，分别交保存/仙术/装备/物品/状态/系统/hub小方法（最大85行）；只读view供原renderer使用。
- `menu/item-use-session.ts`：pending与AbortController，取消后仍占槽直到原操作真正settle，避免新旧操作共用信号。
- main只连接有限端口：实时世界read/replace、物品世界执行器、音效/结果框、保存请求、音频偏好、退出标题。
  控制器不接收整个project、地图、渲染器、runner或saveStore。没有新增跨包barrel出口、依赖或万能上下文。
- 保存事务/错误三态/归一化/原子恢复/工程隔离、帧循环优先级、绘制函数与坐标、游戏公式、SAVE8/content20均不改。
  本批不是“main已全部拆完”，也不是第一阶段已重构完成。

## 不漂移证据

1. 原H3/H5/H7/H8等40项真实宿主菜单/保存/装备/物品/场景/战斗回归通过，原业务断言没有改。
2. 新增直接单元27项：菜单24、物品操作所有权3；另新增1条菜单真实存储接线回归，合计28项。
   新宿主例经真实键盘存m01、核payload/meta/thumb、真实施法改变world、坏档拒绝保持菜单、修复载荷再读取成功关闭菜单。
   透明观察真实store的write/read两种完成事件，先等任一IO再断言必须write，避免错接成read只能靠timeout变红。
   合法Actor/Item/Skill先过现行guard，纯效果使用真实content执行器。
   存档调用链20项只把环境中的`itemUseAbort:null`换为真实`new ItemUseSession()`并加import；其余断言逐字不变。
3. [冻结源码等价工具](menu-session-parity.mjs)读取Git中的09429b6c原菜单局部状态、input和dispatchItemUse函数，
   与新控制器在相同合法数据/IO端口上执行155组确定性输入、3798步，逐步比较完整UI视图、世界、音频偏好及写槽/读槽/提示/音效/退出请求。
   不把旧实现复制回产品作fallback；只生成/tmp测试。破坏新光标记忆的单点反控被同一oracle检出。
4. [隔离负控](menu-session-refactor-mutants.mjs)：55项正控+10单点候选自身AssertionError。
   覆盖main输入接线、装备写回、物品跨场景关闭、abort、互斥、读失败提示、关闭态吞键、迟到浏览刷新，
   另两针验证菜单write误接load、rejected误关菜单；不混入原save核心算法变异。
   精确file/fullName、exit1、实际加载marker、2正/12反例判据自测；635个生产文件hash前后不变。
5. 控制器直接测试不需要DOM、canvas、项目启动或存储实例；真实宿主回归仍保留，不用小单测替换业务闭环。
6. 对doLoad/doSave/restorePayload/normalizeStoredPayload/prepareSceneSwitch等17个敏感函数提取原函数源码并比较hash，
   与09429b6c全部逐字节相同；具体列表和hash见[机账](menu-session-refactor-evidence.json)。

历史`codex-runtime-shell*-mutants.mjs`的main定位针保留原文，可在各自冻结提交复建；本次搬动部分目标后，
不能直接拿历史针跑新main再误判为产品退化。新工具覆盖迁移后的入口，不改旧审计探针或其结论。

## 最小浏览器验证

Chrome原生页，6051当前PAL工程，`?scene=s135&skip-startup=1&give=267`；`give`只用于当前页内存，未F5、未写/读用户存档。
本会话CUA截图逐项检查：

- Escape打开原主菜单；装备列表土灵珠5件，进入确认、取消、再确认交换后土灵珠4件/护腕回包。
- 使用土灵珠出现作者脚本“无任何效果”对话；确认后返回使用列表，数量仍4，输入恢复。
- 系统音乐开关选关后Escape取消，回主菜单；重开仍高亮“开”，没有提交偏好变更。
- 临时验证页已关闭；未做剧情E2E、Q1/Q2或逐像素前后对照，不宣称这些完成。

遇到的既有输入问题单列：6050 demo地图`projects/demo/content/maps/map-056.json`仍为version2，
正式guard只收当前version4，初次验证在启动期明确拒绝；该文件相对09429b6c零diff。
已归[架构/输入后续](../ops/audits/architecture-debt.md)，未为验收加兼容fallback或直接手改地图。
当前仅证明demo数据版本不匹配，尚未归因为迁移器缺陷。
另外，s135调试直达画面的人物位于黑区；本卡不改场景落点，不把菜单验证当作默认落点已修或全场景可玩证明。

## 失败与纠正

- 首次全reforge1497中8条存档AST链因缺新取消依赖而ReferenceError；仅适配真实ItemUseSession注入，20原断言通过。
- 新单元初次1红：重新打开物品菜单时测试漏走“使用”子项，改真实导航后47/47通过（含原链20）。
- 负控初版把正常断言栈中的`runWithTimeout`误认超时，工具正确拒绝接收；判据改成独立timeout词边界，
  增加真实该栈正控，保留所有真正timeout/混错/exit2/null/错标题拒绝，8针重跑全部业务红。
- 初次apply_patch因旧注释末字不匹配而拒绝，未产生部分第二补丁；按实际源范围重做，未使用stash或强制恢复。
- 中间完整check8439 exit0（Reforge166文件1524项）、ratchet7948/635 exit0；自审随后补了上述1条存储接线，
  发现原H5只走F5/F9，不能独自证明新菜单write/load端口。当前树将重新统一check/ratchet/strict，
  不把中间基线当最终验收；产品代码在此补例期间未改。47 warnings/6 infos为既有项。
- 等价脚本第一次步骤数提取依赖stdout，但JSON reporter隐藏console输出，得到null；没有将其当作有效计数。
  已改成受控/tmp指标文件并验证整数/下界，保留155序列及大于3750步的测试断言，重跑通过。

## 最终统一门禁与统计

实现dbe55b55：**check8440、官方ratchet与保护09429b6c的单次严格fast7949/635均exit0**。
Node22.23.2，严格跑在CI=true/FORCE_COLOR=1并注入NODE_COMPILE_CACHE的环境下，子进程沿用隔离helper；
前后baseline SHA-256均为`68ce963c6811c2229e751fe55a608ec61120eed5e0394b981bfe927a88c29150`。
日志`/tmp/type-pal-menu-refactor-{check-final,ratchet-final,strict}.log`。最终27直接单元+1真实菜单存储链，
Reforge167文件1525项；55正控/10针及等价工具的控制/漂移负控另列，不混入正式项数。

| 口径 | 行 | 分支 |
|---|---:|---:|
| 全仓fast | 54536/70480（77.38%） | 42814/63173（67.77%） |
| Reforge | 11323/14659（77.24%） | 7412/11383（65.11%） |
| MenuSession | 260/261（99.62%） | 257/280（91.79%） |
| ItemUseSession | 13/13（100%） | 4/4（100%） |

另六包完整基线对象不变；原633生产文件全保留、新增两控制模块=635。分母增加60行/64语句/29函数/22分支，
这不是同分母纯补测。main单文件覆盖率48.42%→47.39%是已测菜单代码移出后的组成变化，不能单看此值判回退。
按main+两新模块组合：覆盖行1627/3360→1764/3420，覆盖分支825/2427→927/2449；其余130个Reforge源码无回退。
逐文件before由之前已验证full+wave2增量重建并核包汇总精确等于09429b6c基线，不另外重复跑一轮旧树coverage。
新模块函数均100%；全仓长期90%/85%仍未达到，full/E2E/Q1/Q2未重跑。

## 复建命令

```bash
pnpm --filter @type-pal/reforge exec vitest run src/menu/menu-session.test.ts src/menu/item-use-session.test.ts src/save/restore-preflight.chain.test.ts
node docs/testing/menu-session-parity.mjs
node docs/testing/menu-session-refactor-mutants.mjs
```

冻结原源码要求本地Git中存在09429b6c；工具只读它，不checkout主树或创建旧产品兼容路径。
日志前缀`/tmp/type-pal-menu-refactor-`，完整记录见机账。
无下一位Agent提示词，本批已按用户授权由Codex独立验收收口；不代签、不外推下一批豁免。
