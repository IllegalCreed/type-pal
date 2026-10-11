# 三个 GLM 有限测试包独立验收

Codex，2026-10-11。集成基点 `89133ca0fe5d7db6c9dcd54dd9bbcf17b9b09f1e`；产品和旧测试零修改。本页裁决覆盖贡献候选，不把 2026-10-08 回执当作当前版本验收。最终本地质量门见[集成门回执](codex-integration-gates.json)；合并与托管 CI 收口另核推送 HEAD。

## 接收版本

| 包 | 测试候选 | 已核 docs-only 回执 HEAD |
|---|---|---|
| 炼蛊 | `9e9fab94c5bb3a5186cf962054fe5fa46dadb564` | `a8d155df40d2f2e1a15369ffb1933879c3b40c51` |
| 脚本交互 | `21ea2436102d1c210cf26685633849dc07c6a1ee` | `72fb55ce8952a709498d1fa2343a1b8426bcfbda` |
| 工程加载 | `b0a45880919cd1ac03d8dc41c6724bee5b1516ed` | `c48b4a4bdfabcd17c5e90fad34eebafffcfc99ab` |

脚本候选 receiptHead 占位符不算有效锚点；上表由 Git 实际对象与 `testCandidate..receiptHead` 文件范围复核得到。贡献 JSON/raw 原样保留，不回填历史事实。

## 逐合同裁决

- 炼蛊保留 B2/B4/B6/B7/B8/B9 六个合同。B1/B3 保持 existing-proof，直接核 `ItemAlchemyTab.test.tsx` 的真实索引状态、owner/复合配方守卫、旧奖励缺引用断言；一般成功、数量、重排和 undo 不复制。
- B5 撤回：真实 `App.tsx:2309` 挂 `ConnectedDataMode`，后者 `ConnectedEditorPages.tsx:176` 订阅 `snapshot.state` 并于 `:210` 传 `state.items`；原 fixture 刻意关闭这层订阅，把长期过期 props 当业务窗口。普通浏览器事件间该窗口未获真实 caller 证明。核心最新 state 拒绝已由 `item-alchemy.boundaries.test.ts` 证明，不能用假父级拿 UI 信用。
- B7 补强：`validate.ts:1282` 明确拒绝 consuming 工具作为自身材料，原夹具违反 schema。现用 unknown 内容域可出现的未解析外部材料引用，所有播种先过 `validateAuthorItems`；只有 owner 时无可选材料，公开添加同一材料 ID 后恢复闭合并真实追加。只保留 UI 合同，移除同例中直接调用 pure helper 的异层断言；有效针直接反证公开按钮禁用。没有把损坏引用称作可保存工程。
- B9 只保留实际有在途草稿的版本推进合同；删掉没有草稿的 surface 默认值断言。B10 撤回：真实 `App.tsx` 总是提供 onOpenItem，缺回调的假 caller 不计产品信用；成功身份已有旧测，拒绝恢复依赖已撤回的 B5，尾部 catch-all 守卫仍不可达。
- 脚本保留 A2、A4 两臂、A5、A6、A7、A8 七个合同。直接核 `ScriptEditor.test.tsx` 中 revision 定位、同值引用定位保留和嵌套重排成功，以及 `SharedScriptTab` 的 void/throw 提交协议；不把 FlowEditor 的 boolean 协议搬来。A6 不再点击 DsDialog 遮挡的底层删除按钮，只核实际行操作被拒后保留选择/正文及重试。RAF、scrollIntoView descriptor、React act global、root/DOM 和 spies 恢复。
- 加载保留 C2/C3/C4/C6/C7/C8/C9/C10；入口与惰性场景、actor 与 poison 缺边、地图乱序与整批拒绝、缺表与非空保真分别执行，共十四个合同。C1 existing-proof，直接核 `project-loader.test.ts` 和 current-boundaries 的 startup/indexed path/旧 projection 拒绝；C5 typed 敌脚本条件宿主不可达，不造多余字段绕 schema。
- 加载 fixture 改为 SAVE12；原九条在当前 main 全被版本门拦截，原绿不能复用。C2 绿臂登记红臂同一 mapId，原先加载无关 s001 不算同构正对照。C9 经真实 FileSource 完成日志证明 a/c 已完成、b 尚未完成再放行，消除只观察读取启动就称乱序完成的弱证据；不强转或手工替换 LoadedCurrentProject 的业务字段。
- C10 ambiences 和敌表顶层键宽松仅保留原候选 product-counter，不在测试接收中夹修产品，也不固化宽松输入为绿色合同。

## 当前重放

[固定源与针配置](codex-needles.json)钉当前产品/测试 SHA；[独立重放入口](codex-replay.mjs)只变异一次性树，不改产品或历史回执：

```sh
node docs/ops/evidence/TEST-CONTRACT-BATCH-20261008/codex-replay.mjs build/ci/glm-boundaries-replay-new
```

输出目录必须全新且位于 ignored build。三个执行集使用同一严格判据：file×fullName 多重集合、进程/计数/suite/native JSON 与完整 default reporter 联判；每针全新树且本包全部新文件恰一指定业务 AssertionError，hook/uncaught/pending/skip/普通 Error 不收。原始绿、还原绿、末次首针重放和每树清理都落原件与 hash。判据有合成反例和真实纯红、hook 污染、异步 uncaught 探针，不静音 console。

反控已完成：新执行集 6/7/14，共二十七个合同；有效针 6/7/15，共二十八针。判据自证、三种真实污染探针、真正恢复绿和三包首针重放均通过。完整 native reporter 字节以 `.json.raw` 保存，未重格式化原件；入口为[验收汇总](codex-originals/acceptance.json)，分包回执见[炼蛊](codex-originals/alchemy/receipt.json)、[脚本](codex-originals/script/receipt.json)、[加载](codex-originals/loader/receipt.json)。锚点调试产生的失败包仅留 ignored build，不算 acceptance。炼蛊 B7 完成 UI 合同精简后已重采全包六针与所有相位；脚本和加载最终执行集未再变化，保留其已通过原件。

当前本地门日志在 `build/ci/glm-boundaries-20261011/`。最终 fast 结果为 19,789 条测试、729 个源码文件，四项总覆盖率均不回退；基准只升不降。七包首轮 native 全仓通过后，B7 最后精简触发 editor 全包重新采集；其它六包仅在 1,813 个输入文件、native 覆盖字节和执行身份 digest 全一致后复用首轮原件。托管 CI 将按新 HEAD 完整采集七包，不把本地复用当托管通过。旧 E2E acceptance、headed receipt 和原工作树十三份未提交 JSON 不参与本次测试包验收，也不重录或改写。

无下一位 Agent 提示词，Codex 继续集成收口。
