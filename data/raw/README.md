# data/raw —— 原版游戏数据

把目标游戏(1998 年 Win98 版的中文 2D 回合制 RPG)的原版数据文件直接放在这个目录里(不要套子目录)。

`pal-extract` 工具会读取这里的文件,把它们转换成现代资源(输出到 `data/extracted/`)。

## 实际文件清单(已核对,2026-05-23)

当前用的版本是基于该游戏 Win98 版的一份社区集成包。已确认包含:

**MKF 归档(14 个,均为标准格式、偏移表有效、可正常解析)**

| 文件 | 子文件数 | 内容 |
|---|---|---|
| `MAP.MKF` / `GOP.MKF` | 226 / 226 | 瓦片地图 / 地图瓦片集(1:1 对应) |
| `ABC.MKF` / `MGO.MKF` | 154 / 637 | 精灵 |
| `SSS.MKF` | 5 | 脚本字节码 |
| `DATA.MKF` | 15 | 游戏数据表 |
| `PAT.MKF` | 9 | 调色板 |
| `F` / `FBP` / `FIRE` / `RGM`.MKF | 19 / 78 / 55 / 92 | 战斗图像 |
| `RNG.MKF` | 12 | 动画 |
| `BALL.MKF` | 252 | 动画 |
| `SOUNDS.MKF` | 505 | 音效(可能含语音,待 M6 核实) |

**文本**:`M.MSG`(消息)、`WORD.DAT`(词条)。

**音乐**(在 `Musics/` 子目录):

- `001.MID`–`087.MID` —— 86 个 MIDI(缺 029),全套 BGM。运行时用 SpessaSynth 合成,见 `docs/04-decisions.md` 的 D10。
- `TRACK02.ogg`–`TRACK09.ogg` —— 8 个 CD 音轨(Vorbis),网页直接可用。

**视频**:`1.avi`–`6.avi` —— 过场动画(msmpeg4v3 视频 + mp3 音频),用 ffmpeg 转 mp4/webm。

**其他(非提取输入,保留即可)**:

- `1.RPG`–`5.RPG` —— 原版存档槽,可当 `pal-extract` 的校验 / 测试素材。
- `PAL.EXE` `Pal.dll` `PALOLD.DLL` `VB40032.DLL` `*.INI` `LOGO.ICO` `README.txt` —— 原版 Windows 程序与配置,本项目用不到。

> 这一版**没有 RIX 音乐归档**(BGM 是上面的 `.mid`),也**没有独立字库文件**(Win98 版用系统字体,网页版需自备 CJK 字体)。完整核对结论见 `docs/04-decisions.md` 的「数据核对结论」。

## 注意

- 这个目录的内容**不会进 git**(见根目录 `.gitignore`)—— 原版数据版权属于原始权利人。
- 这些文件需要你自己提供。本项目无法、也不会替你下载原版游戏数据。
