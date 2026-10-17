# 统一资源预缓存进度 + 可玩门 + 进入解锁 — Design Spec

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把 phase1 历史设计接入 `design-spec-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 当前问题：历史设计稿讨论资源预缓存进度、可玩门和进入解锁，但原稿不能证明当前实现状态。
- 目标结果：保全该设计的流程、约束和验收意图，并把当前事实交给继任实现与测试证据。

## 真值与约束

- 原版/primary source：原始设计稿全文 quote；相关 phase1 资源与运行时来源需按日期重新核验。
- 当前阶段证据：本页是 2026-06-14 的历史材料；本次只做正文治理和来源可追溯性检查。
- 不可违反的约束：历史状态不得升格为当前完成；不得把静态治理当作 runtime/E2E/视觉/coverage 证据。
- 未知与冲突：当前预缓存实现、部署表现和真实入口仍需继任文档、代码和执行证据确认。

## 方案

- 数据/流程/接口：保留原设计的预缓存进度、可玩门和入口解锁关系，并以 archive overlay 标记历史边界。
- 选择理由：设计语义属于规范和取舍记录，使用 `design-spec-v1` 比计划状态模板更能保留决策结构。
- 明确不做：本次不修改产品实现、不重写原始 quote、不授任何执行信用。

## 边界与风险

- 风险：历史设计可能与当前实现或部署行为漂移。
- 可证伪观察：当前代码、运行时日志或 E2E 结果与本页设计约束不一致时，本页必须保留为历史并由新证据裁决。
- 迁移/兼容/法律边界：只迁移文档表达和证据账本；不引入旧实现兼容层。

## 验收

- 可执行验证：source/after SHA、原文 quote inverse、模板章节、registry/review/routing/catalog 一致性。
- 业务 oracle：历史设计的目标和约束可追溯，当前实现结论必须来自继任 primary source。
- 复核 Owner 与截止条件：Codex 独立复核；静态门通过且历史边界、来源哈希和继任入口齐全后接收本候选。

## 目标与时间范围

- 历史目标：Design of unified precache progress/playable gate and acceptance.
- 日期：2026-06-14；source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `0b4d47ebd7d6c349f106f2843667c4a23e9f6fe8357665314eddbd84d5975e99`。

## 里程碑

- 原始章节：背景 / 动机；设计；整体流程(时序)；进度条三态(单一组件, 三个形态)；进度数据源:Service Worker 统一；让"可玩点"尽快到达；可玩门 + 进入解锁；兜底(SW 不可用 / 老浏览器 / 注册失败)。
- Task、checkbox、命令和 self-review 只保留为历史证据。

## 当前状态

- historical；统一资源预缓存进度 + 可玩门 + 进入解锁 — Design Spec：这是 design-spec，当前文档状态为 historical。全文 82 行、13 个标题；摘要/首段为「> 2026-06-14。增强 [2026-06-13-offline-precache-sw.md](2026-06-13-offline-precache-sw.md)(已实现并上线)。」。属于历史/归档材料，不能单独证明当前实现。

## 阻塞与决策

- 正文信号 80:- 76k 小文件请求数大,未来可把 world 图块打包成少量归档降请求数(改资源管线 + loader)。
- 停止线：do not promote historical claims to current truth without a current source or user decision

## 下一步

- 后继入口：Current precache gate implementation.。
- 若重新执行须新 task card、当前 source/oracle 和独立验收。

## 历史范围

- phase1 archive plan/audit；日期：2026-06-14；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `0b4d47ebd7d6c349f106f2843667c4a23e9f6fe8357665314eddbd84d5975e99`。

## 原始结论

- 统一资源预缓存进度 + 可玩门 + 进入解锁 — Design Spec：这是 design-spec，当前文档状态为 historical。全文 82 行、13 个标题；摘要/首段为「> 2026-06-14。增强 [2026-06-13-offline-precache-sw.md](2026-06-13-offline-precache-sw.md)(已实现并上线)。」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 标题锚点：1:统一资源预缓存进度 + 可玩门 + 进入解锁 — Design Spec; 6:背景 / 动机; 21:设计; 23:整体流程(时序); 35:进度条三态(单一组件, 三个形态); 40:进度数据源:Service Worker 统一; 45:让"可玩点"尽快到达; 49:可玩门 + 进入解锁；原始正文、代码、表格、状态词在 quote 保全。

## 当前有效性

historical。do not promote historical claims to current truth without a current source or user decision
- 历史冲突/未决：
- 正文信号 80:- 76k 小文件请求数大,未来可把 world 图块打包成少量归档降请求数(改资源管线 + loader)。

## 继任文档

- Current precache gate implementation.。
- 当前事实由继任规范、代码和新的 review 决定。

## 原文保全

固定源 SHA `0b4d47ebd7d6c349f106f2843667c4a23e9f6fe8357665314eddbd84d5975e99`；quote 中用 `␠` 表示原始行尾空格、`⇥` 表示原始行尾 tab；逆向解码后得到相同 bytes。
<!-- original-source-quote:start -->
> # 统一资源预缓存进度 + 可玩门 + 进入解锁 — Design Spec
>
> > 2026-06-14。增强 [2026-06-13-offline-precache-sw.md](2026-06-13-offline-precache-sw.md)(已实现并上线)。
> > 本文是**设计稿(spec)**,不是实现计划;经用户确认后转 writing-plans 生成 task 级实现计划。
>
> ## 背景 / 动机
>
> 已上线的离线预缓存把两件事做成了**两段割裂**的进度:
> - **boot 必要资源加载**:`boot-loading.ts` 覆盖层(index.html 内联 `#boot-loading`),包 `window.fetch` 计数,分母是冷启动 ~3200 个请求;加载到最低资源后 bootstrap **自动**起主循环进游戏。
> - **进游戏后 SW 全量预缓存**:`precache-ui.ts` 右上角 widget,分母是全部资源;在 `bootstrap().then()`(boot 门后)才触发。
>
> 用户要把它们合成**一条统一进度条 + 一个显式"可玩门"**:
>
> 1. 进度条**从页面打开起**就以**全部资源**(实际传输 ~336MB,= `asset-manifest.json.totalBytes`)为分母;
> 2. 进度条上一道**虚线**标在"最低可玩"位置;
> 3. 下载越过虚线 → 出现 **「进入游戏」按钮**,并**常驻可点**;
> 4. 用户**自行决定何时点**:越过虚线立即进(后台继续下载)/ **一直等到进度条 100%(全部资源缓存完)再进** —— 后者服务**竞速玩家**:进游戏后全程零网络请求、绝无网速造成的卡顿;
> 5. 点「进入游戏」= 一次用户手势,**同时解锁视频 + 音频自动播放** —— 开场 trademark/splash 视频直接播,不再弹"点击屏幕开始"要二次 click;
> 6. 进游戏后,进度条**变半透明、缩到右上角**,继续跑到 100% 后淡出。
>
> ## 设计
>
> ### 整体流程(时序)
> ```
> 页面打开
>  → main.ts 最早注册 SW + 显示「加载页」(大进度条, 分母=全部 336MB, 含虚线)
>  → SW 接管(skipWaiting+claim) → 立即全速预缓存全部资源 + 持续上报"已缓存字节"
>  → bootstrap 加载必要资源(fetch 走 SW, cache-first, 计入同一进度)
>  → 必要资源就绪(越过虚线)→ 加载页冒出「▶ 进入游戏」按钮(常驻)
>  → 进度条继续涨;用户可立即点, 也可等到 100% 再点(竞速)
>  → 点「进入游戏」: 解锁 audio + video → 开场视频直接播 → 起主循环进游戏
>  → 进度条转半透明缩右上角, 继续到 100% 后淡出
> ```
>
> ### 进度条三态(单一组件, 三个形态)
> - **态1 加载页**:页面一打开即可见(升级 index.html 内联 `#boot-loading` 覆盖层)。大进度条 + 文本"已缓存 x/336MB (N%)" + 进度条上一道**虚线**标可玩点。虚线位置 = 必要资源预估占比(一个常量,可玩前即显示,让用户预期"还差多少到可玩");真实"可玩"以 bootstrap 就绪信号为准触发按钮——预估有 ±误差时按钮可能在虚线前后少许出现,不影响功能。
> - **态2 可玩**:必要资源就绪 → 加载页上出现「▶ 进入游戏」按钮;进度条继续涨,按钮常驻。
> - **态3 游戏内**:点进入 → 覆盖层转成右上角**半透明小进度条**(复用现已上线的 widget 视觉),继续到 100% 后淡出。
>
> ### 进度数据源:Service Worker 统一
> - 进度 = `SW 已缓存字节 / manifest.totalBytes`,**单一来源**,从启动到 100% 一条线。
> - SW 注册从"进游戏后"**提前到页面最早**;预缓存触发也随之提前。
> - boot 必要资源的 fetch 也经 SW(cache-first),自然计入同一进度,无需第二套计数。
>
> ### 让"可玩点"尽快到达
> - bootstrap 必要资源走前台 fetch(SW cache-first,miss 立即拉)。
> - 可玩前,SW 全量预缓存**适当让路**(降低并发 / 延迟到必要资源发起后启动),避免和必要资源抢带宽拖慢可玩点;**可玩后(用户已进游戏)预缓存全速**。
>
> ### 可玩门 + 进入解锁
> - 可玩判定 = bootstrap 必要资源就绪(现有 boot 门那个点,`soundfontSettled` 之后)。bootstrap 通知 UI 出按钮,**不再自动进游戏**。
> - 「进入游戏」click handler:① `audio.resume()`;② 预热 `video.play()`(一次 muted 播放)解锁本 session 的视频 autoplay → 之后开场 AVI 的 `play()` 不再被浏览器拒。
> - bootstrap 控制流:`soundfontSettled` 后**暂停等用户点**(await 一个 promise,由按钮 click resolve)→ 解锁音视频 → 继续 `showTrademarkAndSplash` + `startRafLoop`;原 `finishBootLoading`(淡出移除覆盖层)改为"覆盖层 → 右上角半透明"的转换。
>
> ### 兜底(SW 不可用 / 老浏览器 / 注册失败)
> 退化为现状:`boot-loading` 的最低资源进度 + 自动进游戏,无统一全量进度、无预缓存(各 loader 按需 fetch)。"进入游戏"门在 SW 不可用时可直接跳过(自动进)。**绝不比现状差**。
>
> ## 决策(已与用户确认)
> - **进度数值**:显示百分比 + "已缓存 x/336MB"(实际传输字节;500MB 是磁盘占用含小文件块对齐,不用作显示分母)。
> - **可玩前预缓存让路**:优先尽快可玩,可玩后全速。
> - **首次访问**:SW 接管前最早几个请求可能不计入,进度初期从非 0 起跳;沿用现有"单调不回退 + 预估垫底"兜底,不让条回退。
>
> ## 影响文件(均在已上线代码基础上重构)
> - `packages/game/src/main.ts` — SW 最早注册 + 进度 UI 初始化 + 可玩门接线。
> - `packages/game/public/sw.js` — 早注册即预缓存;可玩前让路(降并发/延迟);进度上报含 boot 段。
> - `packages/game/src/shell/precache-client.ts` — 早注册 + 可玩信号 + 进入回调 + 进度转发(扩展现有)。
> - `packages/game/src/shell/precache-ui.ts` — 改造成三态进度组件(加载页大条+虚线+按钮 → 右上角半透明)。
> - `packages/game/src/shell/bootstrap.ts` — 拆出"可玩门"(await 用户进入)+ 进入时解锁音视频 + `finishBootLoading` 语义改为转右上角。
> - `packages/game/src/shell/boot-loading.ts` / `index.html` — 进度骨架调整(SW 进度取代 fetch 计数;加虚线/按钮容器),保留 SW 不可用时的 fallback。
>
> ## 验收标准
> - 一条进度条从 0 → 虚线(可玩)→ 100%,数据源单一、不回退。
> - 越过虚线出现「进入游戏」按钮并常驻可点。
> - 点「进入游戏」后开场 trademark/splash 视频**直接播放**,不再弹"点击屏幕开始"。
> - 进游戏后进度条转右上角半透明,继续到 100% 后淡出。
> - **竞速路径**:等进度条到 100% 再点进入 → 游戏内任意切场景/过场/BGM **零网络请求**(SW cache 全命中)。
> - SW 不可用时退化为现状,可正常进游戏。
> - dev/e2e(`import.meta.env.PROD=false`)下整套行为 gate 掉(同已上线版),不挂 SW、不显示门。
>
> ## 已知后续(非本设计)
> - 76k 小文件请求数大,未来可把 world 图块打包成少量归档降请求数(改资源管线 + loader)。
> - 移动端/计费网络可加"暂停预缓存"开关。
<!-- original-source-quote:end -->
