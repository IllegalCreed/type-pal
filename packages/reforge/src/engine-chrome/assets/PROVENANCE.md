# Reforge engine chrome provenance

These files are engine-owned defaults. They are bundled by Vite and are not copied into a
project asset catalog.

## GNU Unifont Japanese 15.1.05

- Runtime source: `data/raw/unifont-cn.bdf`
- Upstream artifact: `unifont_jp-15.1.05.bdf.gz`
- Upstream URL: `https://unifoundry.com/pub/unifont/unifont-15.1.05/font-builds/unifont_jp-15.1.05.bdf.gz`
- SHA-256 of the decompressed BDF: `1ab843ec8d2540a702974044f9a4a3acb8bb91bb9dfc1ec10605c7ce813f02bd`
- Copyright: see the BDF `COPYRIGHT` property.
- License: GNU Unifont fonts are dual-licensed under SIL Open Font License 1.1 or GPL-2.0-or-later
  with the GNU font embedding exception. Verbatim upstream texts are bundled as
  `licenses/OFL-1.1.txt` and `licenses/COPYING`.

## PAL-derived default chrome

- `title.png`: palette-0 RGBA bake of extracted FBP 2. Source SHA-256
  `e8838803075d417c6e400b39195314076b608f0b446b805aaaa3e8573d67c501`; output SHA-256
  `fbb076141f96317ec7c57c71c0149956272fd136f502d70e5582b9b1412cd63a`.
- `dialog-icons-raw.json`: extracted DATA chunk 12 JSON with a canonical trailing newline. SHA-256
  `1fff713c4acc0b88c7cfe32c0cb20e5a28fb20b2aa6a67882aa8bacb2a64e7f9`.
- `ui/**/*.png`: 85 frozen slots, 48,629 bytes. They are generated from extracted UI/item indexed
  sprites plus palette 0 by `packages/migrate/scripts/bake-assets.mts`, except the two authored
  status seeds below. Aggregate SHA-256 over sorted `file-hash + relative-path` lines:
  `5e5315f85945b35e9df2ae3a205d0d6fcd4faaa524c12082b6ba91ff55888485`.
- Palette 0 source SHA-256: `c07d1ae9d6dede23379aeda7cfc04ee37663abb7b8cb9069a6e3d00d9f6cfca9`.
- Historical equipment reserve slots are regenerated as follows (`chunk: input -> output`):
  - weapon `056`: `f15d2a3c4969f3d4f1dca1582b3b380ee22761954e1a4ce48362c3d5c8df0900` -> `929fa055dc1d96ff01c86e1095929101549506992519477c526c17779d94388c`
  - head `176`: `f38af7574fd0bd98377cdc672332caebef59708c93fd28ec494d2d5fb40a7b2c` -> `5a4f44090e341493307ecae03ca11267869cda7fad9b290f6cfeef9f08ca9696`
  - body `078`: `cdd6fb6a858e1e02ac4b2db73997e0c814e44c8e489097b1139e6149f5be3281` -> `aec11ca69e9f3fe21b8a087c45d495f168f531c1f913d0265b2fbb5b46d0ce31`
  - feet `097`: `d603fb0aace08971af72bacd7573502812fb1b12aecaca019fcad8aff152c90d` -> `172fa2a2bc491517b1f780c11d6a867104eaaf8542088a13d71c13eaed439f15`
  - accessory `224`: `867c1ab19d0bf2eacade6d90f0ae51057671987b16f1363be465a49053545c45` -> `e453af933090fc1e273936b87583919aea41b085ec184280f2446901d33a029a`
  - amulet `095`: `43989abfa4c767e966712e28478bac0b3afad52e0f742ead7e0a989e9be39bb6` -> `ab06ceee84a7550079fd623f6735bd5867b1927455abeca05285ae5c8e86ffe0`
- `ui/status/bg.png`: authored AI-assisted status background first committed as
  `status-bg-pal0-clean-320x200` in commit `0416bd80`; SHA-256
  `345e53a445569f2addb8528c6e99cd1301342117543639fa35e58ce2db27ede2`.
- `ui/status/slot.png`: authored equipment-slot seed first committed in commit `0416bd80`; SHA-256
  `0fe3ab3527c3d7018c0fd84e50931b9c0d6983b8df915414c0f2dc5294285bd2`.

The PAL-derived defaults remain subject to the project's R8 replacement work. This provenance
record documents reproducibility and ownership boundaries; it does not grant new rights to the
original game artwork.
