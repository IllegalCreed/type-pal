# CODE53／58 Dev 装配与生命周期质量

2026-10-25，同一 `codex/code-quality-3y`，基点 `2ccbffd0ecce117a5dad957bef85e9fc3dfe5496`，Codex 单 Owner。五个文件新关闭、队伍专测旧接受刷新；逐文件八维／读域／取舍／已知限制见 [review.json](review.json)。原卡53仍有419行 `event-opcodes.cov85.test.ts` 待审，不从范围删掉；固定77 accept／6 partial不变。58／57及其它未决范围不附带接受。

## 改动与验证

场景页独立拥有observer、generation和缓存，队伍页委托既有inspect／装备入口，共用索引图适配器只负责Canvas转换。根宿主按原顺序调用明确工具段，私有依赖收窄、两个状态键双强转删除；原public入口／类型／DOM／状态操作不变。[还原器](prove-recompose.cjs)逆展开整个picker并比较全部原执行语句、类型、其它函数／全局初始化、出口和外部runtime依赖；模块本地纯状态晚建但仍在首次使用前，没有IO顺序变化。不是仅去注释hash，也不自动证明设计好坏。

10文件106例绿；随后仅改私有类型／注释和补齐新测试Palette，整份执行代码证明承接，其余105例复用、最终合法图像例单独绿，game typecheck最终0。原43身份未删改，新增一条真实Canvas／16RGBA字面oracle。完全不透明变异：旧43绿，最终合法夹具恰一个业务AssertionError；源完整复原。未跑全仓check／官方coverage／protected，baseline未改，无新PR或main合并。

## 失败与原件

[原件包](receipts.json.gz)是JSON/base64无损gzip，成员字节与SHA索引在review。保留完整default reporter stdout／stderr、native JSON、command/cwd/时间/exit、变异／恢复与中间失败。

原party两例只期待live毒记录；换回基点root、保留当前已批准3o依赖仍2红，证实旧oracle漂移。修为完整16槽而非过滤零记录；原party／脚本／HPMP断言和四个身份全部保留。初次alpha针被这两条无关失败污染，撤销信用。新像素夹具猜了id且漏cycles，被类型门拒绝；最终按真实Palette合同补齐后才给反控／恢复信用。`alpha-legal`只是中间文件名，不证明合法。还原器两次逻辑错误与自身1error/7info的静态拒绝都保留，修工具不改产品来迁就它。

## 低成本复验与边界

`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/dev-panel-quality/verify.mjs` 默认只读，核当前源／依赖、全原件字节、真实native身份集合、完整还原和指定反控，不写树／联网／跑测试或coverage。静态门见 [static.json](static.json)。版本漂移按具体claim核对，不能给旧证据整体换SHA。

必要复跑：`pnpm --filter @type-pal/game exec vitest run src/dev/dev-panel.test.ts src/dev/dev-panel.pure.test.ts src/dev/dev-panel.glm-next-wave.test.ts src/dev/dev-panel-party-lifecycle.test.ts src/dev/dev-panel-picker-lifecycle.test.ts src/dev/dev-indexed-image.test.ts --reporter=default`。

本窗是行为保持，未重跑浏览器；旧功能／ownership证据仅按当前还原桥复用。不把缩略图缓存控制当CODE57像素正确。Dev已有的固定P0文案、ID5合成毒标记、旧console计数等限制如实列为非阻断开发工具候选；不冒充真实施毒／普通剧情证据。下一片先核原53声明的事件专测，再续1／57与58实际FileReader边界；3m／42等待真实裁决。
