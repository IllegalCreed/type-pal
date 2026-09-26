# A3-c 活动场景与镜头状态归属

Owner：Codex；冻结51048353；所属[连续治理卡](../ops/tasks/ARCH-CONTINUATION-1-remaining-queue.md)。
当前开发验证通过，统一全仓门待执行；不是A3整体done，不冒充独立第三方审查。

## 边界与实现

- ActiveScene拥有当前scene/map/tiles/palette/renderer/wave缓存/room/bounds/精灵映射/原始实体标志与页动作。
  它只接收已准备产物，不做IO、world或存档写入、不引入await。主壳继续负责合法性复核、精灵prune、
  世界/队伍/脚本的同步提交与音乐触发；不把整宿主Context传给新类。
- WorldCamera拥有稳定position对象、相对offset和pan waiter，读取live player/bounds；跟随不抹偏移，
  pre-abort不打断旧任务、替换兑现旧任务、中途abort保留部分位移、reset清offset但不提前更新像素位置。
- main6260→6148行。两个模块合计219行，不以总行数下降作验收。包公共出口、SAVE8/content20、
  UI、游戏公式和资产格式零改；没有旧兼容实现留在生产。
- 主壳已有reloadMap不重算bounds；本次原样保持采样时机，不把它宣称为新规则或借重构修复。
  `actions.replaceScene`可能同步触发cue，因此依旧先发布新资源、再发cue、最后更新room/bounds。

## 回归、调用链与对照

17新例：ActiveScene6、WorldCamera11。场景fixture经正式loader/当前guard，再由真实ScenePreparer准备，
新单元不伪装SFX/Canvas端口为实物渲染。最小cue用例验证实际sprite并经真实binding解析，测试的是同步观察顺序。
已有四条save/async/checkpoint链75项：仅从闭包散字段适配实际ActiveScene；canonical runtime definition和
projected SceneDef明确分开；原业务断言/内置负控不弱化。开发首跑暴露37个AST fixture绑定失败，适配后全闭合。
新增单测开发中两处map builder误从content导入/漏tileset参数已修正，未改生产合同或放宽类型。

[冻结对照](active-scene-parity.mjs)直接从Git提取前一Reforge宿主（不是第一阶段对拍）：
77函数仅反向归一化activeScene读属性后token全等；commitSceneSwitch/advanceMoves/stopAutoRunners
展开明确迁移块后再对账，共80个受保护函数；镜头64组确定性序列/2560步比较位置、偏移和Promise结果。
旧正文只在临时诊断执行，不进入产品/正式测试选择或官方新增计数。

[七针反控](active-scene-mutants.mjs)：baseline清空、wave失效、action播种、pan取整、相对偏移、reset采样、
pre-abort保护均由候选自身AssertionError检出。17正控；精确绝对file/fullName/exit1/唯一load注入见证、
全生产hash保持；真实判据2正/12反自测。源文件不改，不接受timeout或混合环境错。

开发证据：Reforge175文件/1627项、TC/Biome、production build均通过；大chunk既有提示保留。
- `/tmp/codex-active-scene-reforge-check.log`
- `/tmp/codex-active-scene-chain-final.json`（75/75）
- `/tmp/codex-active-scene-build.log`
- `/tmp/codex-active-scene-mutants.log`及临时`type-pal-active-scene-mutants-ars2gq/summary.json`
- 临时`type-pal-active-scene-parity-t0pbWY/summary.json`（80/64/2560）

## 最小功能核验

Codex独立6052 PAL宿主（仅自有ignored资产链接），浏览器直接启动s135(42,17)，调试正式指令
`scene s134 40,9`后state刷新确认s134/40,9/tick643、新实体列表；实际场景/队长画面显示，Esc菜单可开闭，
error/warn为空。未读写正常存档、未改6010或用户工程；临时页关闭。截图是本次工具会话内联证据，不入仓。
本次未声称浏览器验证所有镜头取消分支或剧情观感；这些分别由上面序列/负控与后续集中E2E覆盖。

## 统一门与后续

check→ratchet→保护51048353的单次strict待执行。分母保留旧main及所有源文件，两新模块纳入，不减范围。
A3仍有移动/绘制职责待迁；B1/B2/B3/C1/D2/E1/F1继续归Codex，F2剩余九组委派Cursor；GLM六组纯守卫测试另卡。
全局E2E/full/Q1/Q2与历史独立缺陷不随本段关闭。旧版本兼容审查：pass，无新增fallback/upgrader/双版本。
