# TEST-REFORGE-OPENING-IO-LIFECYCLE-1 — 标题读档IO与缩略图生命周期

Status: build
Owner: GLM（独立对话B，唯一写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: opening-menu / read-io / resource-ownership
Visual Verification Timing: dev-functional（有实际界面缺陷时登记最小复现，由Codex验收；不跑剧情）

## 目标与有限范围

用当前canonical存档和真实菜单入口核标题读档IO、在途返回、重复输入和ImageBitmap所有权，补无重复的正常合同，重新确认D-Q01-1及关联资源反例。不规定用例/反控数量或覆盖率涨幅；本轮没有产品修复授权。

| 轴 | 有限问题与输入 | 必须观察的合同或反例 |
|---|---|---|
| O1 | `listMeta()`在真实读档选择后拒绝 | 外层菜单Promise、未处理拒绝、后续键与rAF所有权；不要只断言一个Promise值 |
| O2 | 合法meta/payload/有效PNG已真实写入store，仅`getThumb()`外部IO拒绝 | 排除旧档/坏fixture解释；核是否由菜单承接拒绝，与O1区分故障位置 |
| O3 | 合法PNG交给`createImageBitmap`，仅真实可失败的解码边界拒绝 | 同上；区分浏览器解码失败与非法内容输入，不mock绘制/业务reducer |
| O4 | 读meta/缩略图在途时重复选择“读取进度”，两次IO逆序结束 | 是否多次读、旧结果覆盖新结果、重复位图泄漏；只做真实键操作，不访问phase/browser私有态 |
| O5 | 读档IO尚未完成，用真实键选新局使菜单返回，再释放旧IO | 晚到结果不能复活已退休菜单/监听/rAF；已创建及晚到位图去向，必要时交红反例 |
| O6 | 已进入load，Escape退回标题，再进入load | 上一批thumbnail所有权是否释放；普通Escape/翻页已有证明，不重复计新 |
| O7 | 正常选非空槽结束或选新局结束 | thumbnails与标题帧/键所有权的收尾；帧/键已证仅引用旧断言，位图释放独立核 |
| O8 | 合法meta而无thumbnail，或一槽有图一槽无图 | 实际选中slot与无图占位是否独立于解码顺序；先对照Q01/H2，不重复普通读档 |

逐轴标existing-proof/new-contract/product-counter/unreachable/blocked，给条件、caller、合法输入、旧file/fullName/断言及oracle。遇到产品缺陷停该轴实现，继续其它合法轴。全清单裁决即交付，不追加系统菜单、存档schema/迁移或剧情工作。

## 路由、冻结与白名单

- 工作树`/private/tmp/type-pal-reforge-opening-io`；分支`codex/glm-reforge-opening-io-r1`。
- 产品基点/冻结`2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d`；从含本卡的派发提交开始，不更新产品基点。候选/回执SHA须核Git对象、docs-only尾巴单列。
- 可写：本卡你的交付块；新`packages/reforge/src/opening-menu.io-lifecycle.test.ts`、专属`packages/reforge/src/__tests__/opening-io-lifecycle/`；专属`docs/ops/evidence/TEST-REFORGE-OPENING-IO-LIFECYCLE-1/`。
- 旧测/共享runtime-shell fixture、`opening-menu.ts/main.ts/save/**`产品、schema、配置、依赖/锁文件、官方baseline、真实工程/档/PAL数据、共享文档全部只读。与对话C无共同写文件；反控在各自mkdtemp树，不修改活动工作树产品。
- **不得修D-Q01-1、选择错误提示/重试UI方案、加公共接口/取消协议。**原[产品卡](REFORGE-OPENING-LOAD-ERROR-1.md)仍draft，本卡是测试与前提取证build，不是save/产品build准入。

## 前提真值与锚点

- 先读[READ-FIRST](../../phase2/READ-FIRST.md)、[测试质量验收](../agent-workflow.md)、产品卡与其原反例历史。不沿用旧SAVE版本fixture，当前`save/types.ts:8`为SAVE11。
- primary：`opening-menu.ts:99-163`的真实enterLoad、void调用与cleanup；`save/store.ts:116-139`的真实IndexedDB读取可拒绝；`main.ts`标题真实runOpeningMenu调用链。
- 替代解释：非法旧档/坏PNG/产品已经修复。用`buildCurrentSavePayload`、真实Memory/IndexedDbSaveStore、`putSlot`、有效PNG和直接源核对证伪；不要把伪Promise“拒绝”当所有浏览器API均合法。
- phase1机制/存档格式修改N/A：本卡不定义新格式、不改UX；现状→目标是取证与缺口测试，无产品行为变化。若拟修产品必须另走完整产品卡与前提/设计准入。
- 完整排重`opening-menu.test.ts`、`opening-menu.flows.test.ts`、`opening-menu.observation.test.ts`、`opening-menu.glm-q.test.ts`、`main.host-lifecycle-1.test.ts`相关标题入口断言。
- 可读复用`src/__tests__/runtime-shell/{dom-host,driver,project}.ts`；现有host记录绘制而非像素真解码，必须披露此限度。缺少真实位图/像素能力时不靠assert强转伪造，使用类型化宿主端口或明确blocked；不修改共享fixture。

| 冻结源 | SHA256 |
|---|---|
| `packages/reforge/src/opening-menu.ts` | `8f3dd8ab719487f82c0c37773f047d5f67500f7f2343c2335725408239012172` |
| `packages/reforge/src/save/store.ts` | `5c65c58e727bb688d602050ec388dbafde67939bea43134e6aa2ff10be4b27f6` |
| `packages/reforge/src/save/types.ts` | `856ba7ac63a7d0a314ac6189b4c2ec9b3e5c8130b03485e700a0ec38566f41bf` |
| `packages/reforge/src/main.ts` | `b7c50edd82faa26bb710dfdb814ea07cff4183bb1729b9738f840707ea303c28` |

## 证据与验收

- 专属README+contract-ledger.tsv逐轴分类，不模板填账；新增合同一个it一个可证伪行为，无新合同允许零新test。输入完整typed，不unknown双桥、ignore、核心业务mock/私有state、新debug后门、扩timeout。
- 绿回归只接真实满足的合同。缺陷用`evidence/.../tools/`的按需隔离repro，在mkdtemp生成临时测试后调用真实产品，保存预期业务AssertionError/未处理拒绝、JSON/raw/退出码/signal/spawn/执行身份；默认suite不能留红、skip或“应当泄漏/未处理拒绝”绿测。隔离复现不是门禁通过。
- 新增绿合同选择最少有判别力的变异，三态完整执行集合相等且非空、单一指定业务红、恢复全绿、源码/测试/变异/恢复hash；拒收pending/todo/skip、collection/runtime/unhandled、signal/spawn失败，判据须有真实拒收自测。不以count或exit代替身份，不变证据不重采凑数。
- IO失败仅放公开存储/浏览器边界；使用临时合成工程/current payload，有效PNG。定向+相邻不按fullName筛选导致skip；保存JSON和stderr。finally处理自己的menu/监听/rAF/bitmap/stub，失败路径也核隔离清理，不全局prune。
- 最终一次`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test`与`typecheck`、根`pnpm lint`完整零error/warning/info、`pnpm check:docs`、`git diff --check`；先跑基点对照，故意红repro与绿门分列。不压制act/console/error。
- 报告D-Q01-1是否仍成立、替代解释及精确调用链；资源问题独立反例独立建议，不代Codex批准修复。全树diff核白名单与冻结；只定位覆盖，不写官方基线。

## 当前模式推进记录

- 2026-10-06 Codex：O1–O8、合法存储拒绝及真实菜单入口已直接核；**build allowed仅限白名单测试与隔离前提诊断**；产品卡仍draft。
- 贡献者交付/自验：pending；Codex独立验收：pending；done准入：blocked。
- 用户产品裁决：本卡N/A；任何错误提示/重试策略另交产品卡。

## 下一位Agent提示词

```text
你是TEST-REFORGE-OPENING-IO-LIFECYCLE-1唯一执行方。仅在/private/tmp/type-pal-reforge-opening-io、codex/glm-reforge-opening-io-r1工作。先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、docs/ops/tasks/TEST-REFORGE-OPENING-IO-LIFECYCLE-1.md和REFORGE-OPENING-LOAD-ERROR-1.md，再核卡内源码与旧断言。只裁决O1-O8，真实current存档/PNG/菜单入口，排重后补少而精的正常合同；D-Q01-1/竞态/位图缺陷交按需隔离真实红反例，不夹修产品、不让默认suite红或skip、不把缺陷写成绿预期。严格执行冻结/白名单/IO边界/三态身份与清理证明，完成门禁、完整SHA提交推送。所有轴有证据即停，只写本卡你的交付块；不合main、不done、不扩围。返回逐轴裁决、候选SHA、正常门禁与故意红反例分列，待Codex验收。
```
