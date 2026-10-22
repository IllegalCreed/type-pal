# 第一阶段英文文本输入

英文使用用户提供的 SDLPal Win v3.3（Nostaljaded，2019-08-31）补丁中的
`win_files/m_eng.slf`。将文件放在本目录下相同路径，正常运行 `pnpm extract`；
也可运行 `pnpm --filter @type-pal/pal-extract extract --english-slf /绝对路径/m_eng.slf`。

支持的 SLF SHA256 为
`81c4bed62f48ccf30bcd50ae9afc766352c06e0b52b782a9d64d7517af86ef73`。
其它版本须先核对白组、词条和修订前值，不能直接绕过指纹检查。

未提供输入时正常构建中文版，并生成 `lookup/languages.json` 的 `zh-CN` 列表；
提供有效输入时额外生成 `lookup/en.json` 并公开 `en`。显式指定不存在或不匹配的输入会报错，
在语言预检通过前不会删除上次提取的产物。`--faithful` 是仅供原盘审计的中文路径。

英文只替换展示文本：共同的原盘解码和已核准玩法纠错不变，不读取补丁的 SSS、M.MSG、
WORD.DAT、字体、配置或可执行文件。语言包的 `source.scriptSha256` 指共同纠错后的
8 字节指令流，而非整个原始 SSS.MKF；`messageSha256` 指原始 M.MSG 字节。

项目补译和修订在 `packages/pal-extract/src/localization/`：183 个法术/敌人名、
20 组漏译内容以及开场第 0 组剧情恢复。补丁把开场喊逍遥改为署名，项目将剧情复原，
署名应在游戏的致谢中保留。每项修订检查原文前值，D16 两组英文合行只映射共同消息区间，
不删除中文版属性说明或改变脚本指令。

原补丁署名：Xire 与其他原译者（v2.5）、Nostaljaded（v3.0–3.3）、
chamine（PalDialogs Tool）、Pantamorph 与资源保存者；SDLPal 的 Unicode/国际化支持另有原团队贡献。
这些署名来自用户提供的 `readme.txt`，不表示本项目已核实第三方译文的再许可范围。
该说明未给出翻译文本的明确开源许可证；SLF 中 SDLPal 的 GPL 致谢不能视为翻译文本许可证。
本仓库不提交第三方补丁全文、EXE 或二进制资源；本目录下的补丁原件应保持本地未跟踪。
