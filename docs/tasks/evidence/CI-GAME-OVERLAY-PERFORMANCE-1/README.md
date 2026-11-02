# Game 大世界叠层测试性能修复

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 CI-GAME-OVERLAY-PERFORMANCE-1（Game 大世界叠层测试性能修复）的证据回执：Codex 在用户 2026-10-08 授权下完成 `p12-overlays.test.ts` 夹具优化，冻结起点 `91aac75c5`；只改同一测试文件、四个 fullName 不变，不删业务断言，不改产品/配置/超时/ignore/官方基准。

## 证据身份

- 任务身份：CI 性能修复（失败 CI run 37744699839 目标单例 5795ms 超时 → 同代码新 CI run 37774256927 单例 4115ms 通过）；Codex 同 Owner 连续低风险测试小改的自验证，不冒称第三方独立审查。
- 证据链：receipt.json（命令/JSON/raw hash/执行身份）与 counterproof.json（20 项复用严格判据自测、7 项变异、16 次真实执行相位）随目录保全于 quote 链接；本页为正文回执，源 SHA da4cb8b0…f371。

## 来源与输入

- 合法输入：`p12-overlays.test.ts` 现有四个 fullName 的水波/重映射合同（波幅、补帧相位、像素 196/210/218/230、sprite 覆盖次序、输入不变断言）；夹具改为不透明黑底覆盖视口+两个显式标记瓦片（第 8 行 x=0..32 像素条），只保留 (16,8) 一处小孔和确定颜色的西北邻居。
- 环境与调用方：本机 Node 22.23.2、pnpm 10.29.2、Vitest 4.1.7、compile cache 关闭、真实 V8 coverage；真实 `repairTilemapSeams` 接缝修复继续运行并由原像素 oracle 核验「先修接缝再卷动」。

## 断言与业务 oracle

- 业务 oracle：目标普通运行 54.19→16.26ms、coverage 966.67→52.72ms（单次对照而非统计性能保证）；额外一个逻辑帧以 245/212 两个边缘像素判别相位前进；位图不变检查扩大到三份实际输入。
- 反控（7 项变异全检出）：禁逻辑波幅推进/错误推进补帧相位/冻结逻辑相位/跳过水波/跳过场景重映射/跳过有水波时的接缝修复/把接缝修复移到水波之后——后两项专门证明优化未丢原接线/顺序 oracle；每针恰一指定业务 AssertionError，拒收 pending/skip/collection/hook/runtime/global 错误。

## 结果

- 门禁实测：普通/coverage 定向、相邻 44/44、Game 全包 3519/3519、typecheck、7 项有效反控及受保护 fast（起点 91aac75c5：19,597 例、726 源码、整体分支 50132/60209=83.26%）全部通过；收口 docs 零问题、lint 完整 3693 文件 0/0/0、diff 通过；baseline SHA256 c8d9448e…0318 无指标或范围变化不重建。
- 已知边界：新提交 GitHub CI 按实际推送 HEAD 另核，不将本地门冒充托管通过；根因定量为 `repairTilemapSeams` 占 worker 采样 58.32%（稀疏 1×1 瓦片触发全屏最多 16 轮扩散）。

## 限制与复核

- 未执行 runtime/E2E/视觉/coverage 信用升级；产品渲染/公式/UX 不变，临时变异不用于产品实现；若重新启用需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。
- 临时独占 counter worktree 的产品与测试恢复后已清理，只清本次树。

## 历史范围

- CI-GAME-OVERLAY-PERFORMANCE-1 的原始证据回执（2026-10-08 授权时点）；固定源 revision 6855e6945…；本轮 R63 迁移、S18 治理再接入。

## 原始结论

- 夹具优化消除了 coverage/并行放大的接缝扩散成本（目标用例 5795ms 超时根因），四个合同全绿且判别力增强（新增相位推进帧），不删断言、不改产品。

## 当时证据

- receipt.json/counterproof.json 原件、受保护 fast 对照数字、baseline SHA、CI run 链接与 lint/diff 结果在 quote 保全。

## 当前有效性

- historical。单次性能对照不构成统计保证；历史通过不升级为当前 verified。

## 继任文档

- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 原文保全

固定 source revision `6855e6945bb015df4674dc64ad7410f56702ceee`，source SHA `da4cb8b0a8877df8e0dc1d2efcd26c8ff86c534b7ed54bbdb14cefcdfe89f371`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # Game 大世界叠层测试性能修复
>
> Codex在用户2026-10-08授权下完成第一阶段`p12-overlays.test.ts`的测试夹具优化。只改同一测试文件，四个fullName不变，不删业务断言，不改产品、配置、超时、ignore或官方基准。普通/coverage定向、相邻44/44、Game全包3519/3519、typecheck、7项有效反控及受保护fast全部通过；收口docs零问题、lint完整3693文件0/0/0、diff通过。新提交GitHub CI按实际推送HEAD另核，不将本地门冒充托管通过。
>
> ## 已核原因与修改
>
> 冻结起点`91aac75c54c2afa82e7ccb6ee295485b73a14aa7`。此前[失败CI](https://github.com/IllegalCreed/type-pal/actions/runs/37744699839)目标单例5795ms超过默认5000ms；[同代码新CI](https://github.com/IllegalCreed/type-pal/actions/runs/37774256927)单例4115ms、整job24分53秒通过，未撞30分钟总上限。诊断CPU采样中`repairTilemapSeams`占整个worker采样58.32%；稀疏1×1瓦片触发全屏最多16轮扩散，coverage与并行放大成本，不是缺资源或等待IO。
>
> 当前夹具用不透明黑底覆盖视口、两个显式标记瓦片形成第8行x=0..32像素条；只保留(16,8)一处小孔和确定颜色的西北邻居。真实接缝修复仍运行，并由原像素oracle核验“先修接缝再卷动”，不把接缝函数mock掉，也不丢其调用/顺序判别力。
>
> 原波幅、补帧相位、像素196/210/218/230、sprite覆盖次序及输入不变断言全部保留；位图不变检查扩大到三份实际输入。额外一个逻辑帧以245/212两个边缘像素判别相位前进，而非只看到波幅变化。重映射用例复用同一合法夹具；其它两个用例不改。接缝算法自身的扩散、opaque index0和邻居顺序继续由相邻旧测承担，不堆新用例。
>
> ## 实测与原子合同
>
> 本机Node22.23.2、pnpm10.29.2、Vitest4.1.7，compile cache关闭，真实V8 coverage；单次对照而非统计性能保证：目标普通运行54.19→16.26ms，coverage966.67→52.72ms。最终同文件4/4，新增推进帧也在这一个既有水波合同内，不以例数减少证明优化。命令、JSON/raw hash和执行身份见[验证回执](receipt.json)。
>
> 受保护fast以起点91aac75c5比较：19597例通过，726源码，整体分支50132/60209（83.26%），所有指标与范围不变。baseline SHA256仍为`c8d9448eb92414374a8e1efc1fa85df68d24267ab8c8c3869b0e173e05050318`；无指标或范围变化，不重建基准。
>
> ## 反控与恢复
>
> [完整反控原件](counterproof.json)包含20项复用严格判据自测、7项变异、16次真实执行相位：原始绿、逐针红/真正恢复绿和末次绿。每次执行同一文件四个身份的多重集合，拒收pending/skip/collection/hook/runtime/global错误、信号或spawn失败；每针恰一指定业务AssertionError，不按exit/count单独判断。
>
> 变异分别禁止逻辑波幅推进、错误推进补帧相位、冻结逻辑相位、跳过水波、跳过场景重映射、跳过有水波时的接缝修复、把接缝修复移到水波之后。最后两项专门证明优化没有因黑底而丢失原接线/顺序oracle。
>
> JSON内的`rawNativeText`/`jsonNativeText`是原始UTF-8字节文本；解析字符串后可逐字重建SHA256，外层JSON格式化不改变原件。未把原生JSON重排后冒称原hash。临时独占counter worktree的产品与测试恢复后已清理，只清本次树；其它GLM会话和工作树未动。
>
> ## 验收边界
>
> 这是Codex同Owner连续低风险测试小改的自验证，不冒称第三方独立审查。产品渲染/公式/UX不变，不需要新的原版机制或视觉裁决；不把临时变异用于产品实现。没有下一位Agent提示词，Codex负责本次有限收口；三张GLM新卡继续按各自原白名单执行，不追加任务。
>
<!-- original-source-quote:end -->
