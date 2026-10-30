# 批48:reforge 中件扫尾 24 文件（零整改批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围：`sprite-anim.ts`(93)、`screen-wave.ts`(85)、`screen-fx.ts`(100)、`fade-driver.ts`(118)、`dither-transition.ts`(293)、`quantize.ts`(82)、`menu-state.ts`(90)、`equip-menu-state.ts`(96)、`magic-menu-state.ts`(217)、`use-menu-state.ts`(122)、`system-menu-state.ts`(117)、`frame-animation-player.ts`(245)、`frame-animation-presentation.ts`(76)、`cutscene-controller.ts`(129)、`video-player.ts`(132)、`opening-menu.ts`(215)、`shop-trial.ts`(133)、`item-use-executor.ts`(247)、`entity-lifecycle-command.ts`(95)、`battle-trial-session.ts`(65)、`battle-trial-config.ts`(217)、`battle-trial-prepare.ts`(233)、`battle-trial-assets.ts`(301)、`battle-trial-host.ts`(312)。全文读毕。八维审查（A–H）全部通过,零源码改动、零 diff。

## 逐件结论（要点）

- **sprite-anim**:布局数据化帧下标单一真源;3 帧步序 [0,1,0,2]/animFrameIndex static 整带平推语义带 2026-07-05 全场动画冻结事故锚;settleWalkAnimation 相位归整 (step&2)^2。
- **screen-wave / screen-fx**:两处 32 相位偏移表独立实现(screen-wave b=68 版为 0x71 世界屏波、screen-fx b=68 版为战斗 PAL_ApplyWave——同源 scene.c 推导,分属世界/战斗两装配管线,注释各带层序铁律锚:波只卷背景、震屏最后)。time-based 纯派生零计数器(DM32 判据结构性消除)。
- **fade-driver**:SupersedingFadeDriver 新请求从当前亮度连续接管;valueOwner 保留最后呈现值;cancelOwned 防旧事务取消新演出。
- **dither-transition**:72 步错相溶解色系换入模型(非 alpha crossfade);逻辑点阵像素共享 visits 防 4× 块内噪点;plan 预计算 + 输出独立性守卫;controller cancelOwned 同款 owner 语义。
- **quantize**:最近邻色距 + 同色缓存;alpha<128 透明;图集等距切片行优先。
- **menu-state 族 5 件**:纯逻辑状态机;equip swap 留面板续换(旧件选中,uigame.c:2016-2019);magic 三相位含 MP 门/applyToAll 直放连放/死人不可选;use 单体连用留 pick-target、混合 item-private 链分段提交由 executor 承接;system switch 落定即关(原版同款)。
- **frame-animation-player**:TPFS 随机读取器(容器/block Promise 先入缓存防并发重复解码;LRU 64 帧);播放默认不可跳过(原版剧情 RNG 不读输入),skipKeys 显式 opt-in;scriptWorkIO/scriptWorkWait 双等待通道与异步意图取消全贯穿。
- **frame-animation-presentation**:五模式状态机(playing/buffered/held/dialogue/idle);未收到当前帧的 finish 不留残帧。
- **cutscene-controller**:busy = intent 在途 ∪ runner 活跃;waitPassive 不计呈现占用(防常驻 auto 冻结明雷/生命周期拍)注释动机完整;K5 资源分域不全局 supersede。
- **video-player**:零裁量照一阶段 avi-player;跳过键 stopImmediatePropagation 防泄漏 +500ms 缓冲(aviplay.c:741);autoplay 拒绝 overlay 兜底;不抛错防编排卡死。
- **opening-menu**:坐标公式 uigame.c:107-108 逐字复刻(4 全宽字退化 x=125);cleanup 清像素防入场视频关闭后露旧菜单;选定键捕获相防泄漏。
- **shop-trial / battle-trial 族**:一次性真 UI/真 BattleSession 宿主,不碰存档与世界启动;trial 字节快照 seal 后禁新 IO、catalog 逐文件 bytes/sha256 双核;revision 前后三重校验(save token/战斗数据 hash/再读工程);AudioContext 两段所有权(先 sfx 后 bgm,构造抛错不泄漏);stopAudio 双赋值有注释动机。
- **item-use-executor**:混合 item-private 效果链分段提交(纯段 resolveWorldItemUse consuming:false + replaceWorld 边界 + 脚本段);外部效果失败/取消不提交消耗;assertNever 兜底。
- **entity-lifecycle-command**:四叶命令窄边界;引用闭包写入前检查;只有显式 restore 产生帧复位通知;world 适配 structuredClone 不半写。

## 登记移交（无新增）
本批无新清理候选。

## 验证
- 定向测试:47 个测试文件 337/337、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。
