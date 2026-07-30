# OPS-GA4 - 同意后启用独立 GA4 页面浏览

Status: done
Owner: Codex
Reviewer: Kimi / GLM
Phase: ops
Capability: production analytics

## 目标

- 将 `pal.illegalscreed.cn` 接入 Owner 已创建的 Type Pal 独立 GA4 property。
- 采用 basic consent：未选择或拒绝时不加载 Google script，同意后只发送标准 `page_view`。
- 保持游戏启动、资源预缓存、离线能力、输入、存档和画布渲染完全不依赖 Analytics。

## 范围

- 公开 Measurement ID：`G-9Q2XJV7NJ6`，不是凭据；禁止读取或提交 Google 账号 token、Cookie、Keychain 或浏览器凭据。
- `packages/game` 新增纯函数/控制器、测试和轻量同意 UI，并从 `packages/game/src/main.ts` 接线。
- 页面位置只允许 pathname 与校验后的 `utm_source` / `utm_medium` / `utm_campaign` / `utm_content`；不得发送任意 query/hash。
- 不发送按键、游戏进度、战斗、存档、角色、设备性能、错误详情或其他自定义事件。
- GA4 后台 Enhanced Measurement 已关闭；本卡不改后台 property、stream 或账号权限。
- 不改 schema、save、migration、asset pipeline、公共游戏机制或 capability-map。

## 上下文锚点

- 根协议与阶段门禁：`AGENTS.md`、`docs/ops/agent-workflow.md`。
- 当前看板与并行任务：`docs/ops/board.md`；不得夹带或干扰 N3-1、C8、ED-5I。
- 浏览器入口：`packages/game/src/main.ts`。
- 静态壳与启动覆盖层：`packages/game/index.html`。
- 包门禁：`packages/game/package.json`、根 `package.json`。
- 生产部署：`scripts/deploy.sh`、`scripts/nginx-type-pal.conf`。
- 当前分支已有 83 个未推提交；本卡不得替用户推送、覆盖或夹带。

## 设计草案

1. `analytics-consent.ts` 保存 `unset | granted | denied`，storage 异常失败关闭。
2. `google-analytics.ts` 接受注入的 window/document/page source，负责 production gate、Measurement ID 校验、脚本单例、URL 清洗、pathname 去重和撤回停发。
3. `analytics-consent-ui.ts` 使用普通 DOM 构建像素风轻量提示，层级避开 `#boot-loading`；无同意时不得影响“进入游戏”按钮。
4. `main.ts` 在游戏 bootstrap 之前安装可选控制器，但任何异常全部吞掉并保持现有启动路径。
5. 隐私政策由个人站统一覆盖并增加 Type Pal 范围；游戏页提供可重新打开的隐私设置和政策链接。

## 验证

- 红灯：实现文件不存在时，新增 consent/controller/UI 测试失败。
- 绿灯：
  - 非生产、非法 ID、unset、denied 均无 script/dataLayer。
  - granted 只加载一次并发送当前 pathname。
  - 任意 query/hash、游戏参数和自由文本不进入 payload。
  - pathname 导航去重；撤回后后续零发送。
  - localStorage 不可用时 UI 保持可操作且统计失败关闭。
- 包门禁：`pnpm --filter @type-pal/game check`、`pnpm --filter @type-pal/game build`。
- 根门禁：`pnpm check`。
- 真浏览器：开发环境无 Google 请求；生产预览拦截 Google script 请求，核对同意前 0、同意后 1，且游戏正常进入。
- 部署前必须精确暂存本卡文件，不得使用 `git add -A`，不得夹带现有未跟踪审计文档。

## 推进签字

- build 准入: Codex agree（2026-07-30，方案可实现且可完全隔离于游戏语义） | Kimi agree（2026-07-30，架构与 UX 设计审查通过：consent 三态失败关闭、bootstrap 全吞异常隔离、#boot-loading 层级与进入游戏不受影响、URL 清洗白名单、测试矩阵覆盖非生产/非法 ID/unset/denied/单例/去重/撤回/localStorage 失败关闭；附 P1-P4 钉，见交接） | GLM agree（2026-07-30，覆盖/隐私/测试矩阵审查通过，附 G1-G2 风险钉，见交接） | 用户豁免 N/A | 结论 **build 准入开放**（三签齐）
- done 准入: Codex **accept**（2026-07-30，`packages/game` 123 文件 / 2303 用例、
  production build 与部署前范围复核全绿；根 `pnpm check` 的 6 个失败均来自第二阶段
  `packages/reforge` contentVersion 10 与旧 fixture 9 的并行中间态，用户明确裁决与本卡
  第一阶段上线无关、不构成阻塞） | Kimi **accept**（2026-07-30，
  实现架构与 UX 审查通过：P1-P4/G1-G2 全部落实；URL 清洗丢弃游戏参数、UTM 白名单+token
  校验、脚本单例、anonymize_ip、ga-disable 撤回零发送、DNT/GPC 默认 denied、UI 不吞键
  不遮挡、bootstrap 异常全吞零依赖；一手复跑 game 123 文件/2303 用例全绿） | GLM **accept**（2026-07-30，
  实现/隐私/测试矩阵/文档一手复核通过，见交接；根门禁 reforge 阻塞经核实为 R13-5 content9→10 并行中间态，与本卡无关） |
  用户豁免 N/A | 结论 **done allowed**（三方 accept 齐，跨阶段门禁裁决已记录）

## 交接

- 2026-07-30 Kimi: 完成架构与 UX 设计审查，签 **agree**。独立核对：consent 三态与
  localStorage 失败关闭模型成立；`google-analytics.ts` 的 production gate、ID 校验、脚本
  单例、pathname 去重与撤回停发方向正确；UI 避开 `#boot-loading`（index.html:14-57 实测
  覆盖层与 enter 按钮结构）且不阻塞「进入游戏」；bootstrap 前安装但异常全吞，游戏启动/
  预缓存/离线/输入/存档/画布与 Analytics 零依赖成立。风险钉（验收核对，不阻塞）：
  **P1** URL 清洗必须显式丢弃游戏自用参数（scene/pos/facing/give 等 dev 深链），只放行
  pathname + 四个 utm_* 白名单，测试钉"游戏参数不进 payload"；**P2** 提示框层级与键盘
  焦点不得吞掉首次键盘输入（本游戏全键盘操作）或遮挡 enter 按钮；**P3** SPA 无真实导航，
  不为凑数据虚构路由事件，保持一次性标准 page_view；**P4** nginx 若缓存 index.html，
  consent 更新须确认缓存策略不产生新旧混发，部署精确暂存本卡文件。未修改实现文件。
  Next: GLM 覆盖与隐私测试矩阵签字；两签或用户豁免后 Codex 进入 build。
- 2026-07-30 GLM: 完成覆盖/隐私/测试矩阵设计审查，签 **agree**，附 G1-G2 风险钉。一手核对
  （非任务卡文本复述）：
  - **现状核实**：`main.ts:15` 已有 `isProd = import.meta.env.PROD === true`，production gate
    基础已存在，analytics 控制器可直接复用；`index.html` 82 行纯壳，`#boot-loading`
    z-index:10 全屏覆盖 + `#boot-loading-enter-btn` 默认 hidden，consent UI 避让约束（层级 >
    10 或独立层、不挡 enter 按钮）结构上成立；`packages/game/src/` 下**零**现有 analytics
    代码（greenfield，无遗留隔离风险）；`scripts/deploy.sh` 仅 SSH key 引用（部署通道）无
    GA 凭据，`scripts/nginx-type-pal.conf` 无 analytics 配置（纯静态服务）——任务卡「不提交
    Google 账号 token/Cookie/Keychain」约束成立。
  - **覆盖矩阵**：consent 三态（unset/granted/denied）+ storage 失败关闭 + 非生产/非法 ID
    红灯 + URL 白名单 + 单例 + 去重 + 撤回零发送 + localStorage 不可用 —— 测试矩阵 line 45-53
    覆盖完整，红灯/绿灯/包门禁/真浏览器四层验证齐。
  - **隐私边界**：只发标准 page_view，禁止按键/进度/战斗/存档/角色/设备/错误自定义事件；
    只 pathname + utm_* 白名单，禁自由 query/hash —— 与 Kimi P1（丢弃 scene/pos/facing/give
    游戏参数）一致，方向正确。

  **G1 风险钉（与 Kimi P3 互补，非 blocker）**：SPA 无真实导航，page_view 语义须钉死为
  **首次加载一次**。任务卡「pathname 导航去重」措辞可能被实现成「SPA 场景切换也发 page_view」。
  按「只发标准 page_view、不发自定义事件」约束，场景切换不算 page_view（canvas 单页无 URL
  变化）。实现时须确认：consent granted 后只发 1 次 page_view（当前 pathname），不为场景
  切换/战斗/菜单触发额外发送。Kimi P3 已覆盖「不虚构路由事件」，本钉补充「去重测试须显式
  覆盖 SPA 内多场景只发 1 次」。

  **G2 风险钉（隐私最佳实践，非 blocker）**：测试矩阵未提 Do Not Track（DNT）/
  globalPrivacyControl 浏览器信号。basic consent banner 法律上已覆盖，但主流隐私实践建议
  尊重 `navigator.doNotTrack === '1'` / `globalPrivacyControl === true` 时默认 denied。不阻塞
  准入，建议实现时作为 denied 的优先输入（DNT on → consent UI 仍显示但默认选 denied）。

  未修改实现文件；仅更新本卡 GLM 签字与交接。三签齐（Codex/Kimi/GLM），**build 准入开放**。
  Next: Codex 进入 build；done 准入仍需三方 implementation accept。

## 实施记录

- 2026-07-30 Codex: 三方 build 签字齐全后进入 `build`；先新增四组测试并确认实现文件不存在时
  4 个 suite 红灯，再开始补 `packages/game/src/analytics/` 与 `main.ts` 的最小实现。实施范围
  仅限第一阶段 `packages/game`，不触碰 `packages/reforge`、`packages/editor`、
  `packages/content` 或当前工作树中的第二阶段并行改动。
- 2026-07-30 Codex: 第一阶段实现完成并进入 `review`。新增 consent 三态与 DNT/GPC 默认
  denied、失败关闭存储、像素风底部 UI、production-only GA4 控制器、pathname + 四字段
  UTM 清洗、脚本单例、同路径去重和撤回停发；`main.ts` 只做可选安装，异常全吞，未订阅
  场景、菜单、战斗或其他游戏语义。
- 2026-07-30 Codex 验证:
  - 红灯：4 个 suite 因实现模块不存在失败；绿灯：4 文件 / 14 用例通过。
  - `pnpm --filter @type-pal/game check`：123 文件 / 2303 用例全绿；typecheck 通过。
  - `pnpm --filter @type-pal/game build`：production build 通过。
  - 真浏览器 dev：同意面板可见，Google script=0、Google 网络资源=0。
  - 真浏览器 production preview：同意前与明确拒绝后 Google script/网络资源均为 0；
    consent UI 不遮挡“进入游戏”，点击后 loading 退出且第一阶段 canvas 游戏继续运行。
  - 为避免向真实 property 制造测试 page_view，真浏览器未点击“允许”；允许后的脚本单例、
    当前页一次发送、URL 清洗与撤回停发由注入式 L3 测试覆盖。当前浏览器控制面未提供
    request interception，因此该项留给 review 补验或接受现有分层证据。
  - 根 `pnpm check` 两次均越过 `packages/game` 作用域后失败：第一次是并行
    `packages/content` 测试中间态，第二次是 `packages/reforge` 的 `callScript` /
    `actorTemplateId` / battle command 类型错误；均属于第二阶段并行工作，本卡未修改。
- 2026-07-30 Codex: 个人站中英文隐私政策提交 `6e9670f` 已增加
  `pal.illegalscreed.cn`、独立 property、仅页面浏览、游戏存档/输入/战斗不进入 Analytics
  的准确边界；3176 页 VitePress 构建、sitemap 与增量 rsync 已完成。自有域
  `/privacy`、`/zh/privacy` 均返回 200，真浏览器确认中文页包含 Type Pal 和“三个独立的
  Google Analytics 4 属性”。
- 2026-07-30 GLM done 准入审查：完成实现/隐私/测试矩阵/文档一手复核，签 **accept**。
  非任务卡文本复述，逐文件逐测试核对：
  - **google-analytics.ts（137 行）**：`sanitizePageViewUrl`（:47-57）白名单实现 —— 只取
    pathname + 4 个 `utm_*`，`new URL(pathname, origin)` 重建丢弃所有其他 query/hash，
    是白名单不是黑名单（**P1 落实**）；脚本单例 `querySelector('script[data-ga4-measurement-id]')`
    （:81）防重复加载；同 path 去重 `if (pagePath === lastPath) return`（:103，**G1 落实**）；
    撤回停发 `denied → lastPath=undefined + [ga-disable-${id}]=true`（:117-127）；失败关闭
    try/catch 全吞（:112-114）；`send_page_view:false` + 手动 `event page_view`（:93-106）
    禁 GA4 自动；`anonymize_ip:true`（:94）。
  - **analytics-consent.ts（90 行）**：三态 `unset|granted|denied`；`hasPrivacySignal`（:45-47）
    DNT=`'1'` / GPC=`true` → `resolveInitialAnalyticsConsent` 默认 `denied`（:49-56，**G2 落实**）；
    `getBrowserConsentStorage` localStorage catch→undefined、`writeAnalyticsConsent` `if(!storage)
    return false`（**storage 失败关闭**）。
  - **analytics-consent-ui.ts（124 行）**：底部 `bottom:16px` + `z-index:19`（高于 boot-loading
    的 10 但不全屏覆盖，不遮 enter 按钮，**P2 落实**）；纯 click 事件无键盘监听（**不吞键**）；
    unset 显示面板 / granted|denied 收成右下角「隐私设置」（:116-117）；DNT 时文案「已默认关闭」。
  - **install-analytics.ts（57 行）**：装配层，Measurement ID `G-9Q2XJV7NJ6` 硬编码与任务卡一致。
  - **main.ts:11-15**：`installTypePalAnalytics({enabled:isProd})` 包在 try/catch，异常全吞，
    在 canvas 检测/bootstrap 之前但任何失败不影响后续启动（**P4 bootstrap 零依赖落实**）。
  - **测试一手复跑**：analytics 4 文件 / 14 用例全绿（1.15s）；关键断言精确 —— P1 测试
    （google-analytics.test.ts:96-104）输入 `?scene=75&pos=1,2&facing=3&give=999#battle` 断言
    输出只保留 lowercase utm_*；G1/P3 测试（:107-117）场景事件不计页、同 path 去重、撤回停发
    断言只 2 个 page_view；G2 测试（install-analytics:27-35 + consent:47-54）DNT/GPC 默认 denied。
  - **包门禁**：`pnpm --filter @type-pal/game check` = 123 文件 / 2303 用例全绿（22.05s）。
  - **根门禁阻塞核实**：`pnpm check` 失败全部在 `packages/reforge`（loader-v5「canonical loader
    只接受 contentVersion 10」+ loader-v5.pal 5 fail），是 R13-5 敌人脚本 content9→10 升级的
    并行中间态，**与本卡零关联**；game 包作用域全绿。

  Codex 实现忠实落地了 build 准入的全部风险钉（P1-P4 / G1-G2），隐私边界严格（白名单 URL 清洗、
  无自定义事件、DNT/GPC 尊重、失败关闭、bootstrap 零依赖），测试矩阵精确覆盖反例。根门禁的
  reforge 阻塞不应卡住本卡 done —— 本卡只动 `packages/game`，该包全绿。

  未修改实现文件；仅更新本卡 GLM done 准入签字与交接。
- 2026-07-30 Kimi done 准入审查：实现架构与 UX 一手复核，签 **accept**。独立核对：
  - **P1 落实**：`sanitizePageViewUrl`（google-analytics.ts:47-57）以 pathname 重建 URL、只
    回写 4 个 `utm_*`（token 另有 pattern+64 长度双校验），游戏的 scene/pos/facing/give 与
    任意 hash 结构性不可达 payload；定向测试（google-analytics.test.ts:96-104）以
    `?scene=75&pos=1,2&facing=3&give=999#battle` 钉死。
  - **P2 落实**：panel `bottom:16px` + z-index 19（高于 boot-loading 的 10 但非全屏），
    纯 click 无键盘监听不吞键；production preview 实测不遮「进入游戏」。
  - **P3/G1 落实**：仅 consent granted 时发一次 page_view，`send_page_view:false` 禁 GA4
    自动收集、手动事件 `pagePath===lastPath` 去重；install 未订阅任何页面/场景事件，
    main.ts 对游戏语义零订阅——SPA 内多场景不会触发额外发送。
  - **G2 落实**：`resolveInitialAnalyticsConsent`（analytics-consent.ts:49-56）在无存储
    选择时 DNT=`'1'`/GPC=`true` → 默认 denied；UI 同步显示「已默认关闭」文案。
  - **隔离与失败关闭**：main.ts:11-15 try/catch 全吞且在 canvas/bootstrap 之前；storage
    失败关闭；`anonymize_ip:true`；撤回 `ga-disable-${id}=true` + lastPath 重置，后续零发送。
  - **复跑**：`pnpm --filter @type-pal/game check` 一手实测 123 文件 / **2303 用例全绿**
    （exit 0）。根 `pnpm check` 的 reforge 类型错误经 GLM 核实为 R13-5 content9→10 并行
    中间态，与本卡零关联，认可不作本卡阻塞。
  - 记录项（非反例）：analytics/ 5 个实现文件与 main.ts 改动目前 untracked/unstaged，
    提交时按卡内纪律精确暂存本卡文件、不用 `git add -A`；P4（nginx 对 index.html 的缓存
    策略）属部署时核对项，留部署前确认。
  未修改实现文件。三方 accept 齐前不得标记 done、提交或部署；Codex 终验后收口。
- 2026-07-30 用户范围裁决：`packages/reforge` 属第二阶段新引擎，与本卡更新的第一阶段
  `packages/game` 无关；已知 6 个 contentVersion 10 / fixture 9 失败不阻塞 OPS-GA4
  提交和第一阶段生产部署。
- 2026-07-30 Codex 终验：复跑 `pnpm --filter @type-pal/game check`，123 个测试文件 /
  2303 个用例全绿；`pnpm --filter @type-pal/game build` 成功。根 `pnpm check` 的
  `packages/game`、`shared`、`content` 均通过，唯一失败仍是上述第二阶段 reforge
  中间态。按用户范围裁决签 **accept**，任务转 `done`，精确提交本卡、analytics 八个
  文件与 `main.ts`，不夹带第二阶段工作树。
- 2026-07-30 Codex 生产部署：使用 `./scripts/deploy.sh app --skip-check` 只部署第一阶段
  应用壳，未同步 extracted、未部署第二阶段。`https://pal.illegalscreed.cn/`、
  `/sw.js`、`/extracted/asset-manifest.json` 均返回 200；线上
  `/assets/index-BZsZsNfF.js` 与本地构建 SHA-256 一致。HTML 不直载 Google script，
  bundle 包含独立 Measurement ID 与隐私设置 UI；入口经 CDN 返回
  `Cache-Control: no-cache`、`Age: 0`。未点击生产“允许”，没有制造测试 page_view。

## 下一位 Agent 提示词

### 收口结论

无下一位 Agent 提示词；三方 done accept 已齐，等待生产部署与用户验收。

### 给 Kimi（OPS-GA4 实现架构与 UX done 审查）——已于 2026-07-30 执行，签 accept（保留备查，勿再执行）

```text
接手任务: OPS-GA4 同意后启用独立 GA4 页面浏览（done 准入审查）
任务卡: docs/ops/tasks/OPS-GA4-consent-pageviews.md
当前状态: review / done blocked；Codex=pending（终验）、GLM=accept（2026-07-30）、Kimi=pending
你的角色: Kimi 实现架构与 UX done 审查（runtime 隔离 / UI 层级 / 接线安全 / 真浏览器证据）
先读: AGENTS.md、本任务卡（含 GLM done 审查交接）、packages/game/src/analytics/（4 文件）、
  packages/game/src/main.ts:1-15、packages/game/index.html
已完成: 4 文件/14 定向用例、game 包 123 文件/2303 用例、production build、dev+preview
  拒绝路径真浏览器验证；GLM 已逐文件+逐测试核对 P1-P4/G1-G2 全部落实
已知: 根 pnpm check 的 reforge 失败经 GLM 核实是 R13-5 content9→10 并行中间态，与本卡无关；
  game 包作用域全绿
请你做: 独立核对 bootstrap 零依赖（main.ts:11-15 try/catch）、UI 不吞键/不遮 enter、
  script 单例、production-only gate、真浏览器拒绝路径证据；把 accept 或 counter 写回
  done 准入 Kimi 行与交接日志
不要做: 不得修改实现，不得接触凭据，不得真实发送 GA4 测试事件，不得夹带第二阶段任务
输出要求: accept 或 counter；Codex 终验 + Kimi accept 后方可标记 done
```

### 给 Codex（OPS-GA4 终验；Kimi accept 后）

Kimi accept 后，Codex 作为 Owner 做最终终验（确认 game 包绿 + 根门禁 reforge 阻塞解除后
全绿），然后三方 accept 齐 + 根 `pnpm check` 全绿后标记 done。标记 done 前不得提交或部署。
```
