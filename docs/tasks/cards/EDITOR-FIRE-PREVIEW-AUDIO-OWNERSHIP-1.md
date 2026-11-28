# EDITOR-FIRE-PREVIEW-AUDIO-OWNERSHIP-1 — 法术预览的声音归属

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

核清技能和物品编辑中的法术预览何时持有声音，以及页面退出和换选如何结束这次请求。

## 范围

`SkillAnimationEditor` 的真实 FIRE 预览调用、Editor 音效所有权以及必要的合法 RLE 与 WAV 专测。正式战斗动画与技能内容的现行合同由各自入口持有。

## 前提与证据

用登记到同一 catalog 的 gzip RLE 与 PCM16 WAV 进入现行编辑组件。播放后离开组件，原音频端口仍 running，停止和关闭均为 0。另一例已等待 WAV 读取进入，再切到静音配置；放行旧读取后，新配置的按钮自行切到“暂停”。两个业务断言失败，各自的执行身份归[逐文件窗口](QUALITY-EDITOR-COMBAT-SPRITE-PREVIEWS-1.md)。

## 验收

确认取舍后从已保存的正式反例起步，观察真正入场、暂停、切换和释放。相邻的音效选择器、正常画帧、资源读取错误与帧率切换按各自业务断言复验。

## 状态与交接

2026-11-28 用户批准技能和物品入口在暂停、离开或切换时结束声音，并丢弃已失效请求的结果。Codex build allowed。

同一选择只保有一个播放请求。正式红例在独立 AudioContext 端口通过；Chrome 用 PAL 技能 296 与物品 66 验证原生播放、暂停和换选释放。门控旧 WAV 等待后换到新技能，旧请求完成未启动声音，新页面未收到旧错误。归档中的 `browser-fire-final` 保存动作、观察与环境诊断。
