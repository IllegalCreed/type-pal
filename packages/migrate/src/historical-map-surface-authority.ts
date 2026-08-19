import { validateProjectMap } from '@type-pal/content'
import {
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

/**
 * Current ProjectMap v4 hashes paired with the exact pre-v4 hashes carried by the published
 * B2/C1 transition surfaces. This is validation-only authority: it never parses or upgrades an
 * old payload, and it is only used while rewinding the current baseline for historical seal proof.
 */
const PUBLISHED_PRE_V4_MAP_HASHES = {
  'content/maps/map-001.json': [
    '774428d9b9c981b90579d09dfd7d20ff20d6a57919c0dc03f014ced027f2ffd6',
    'ec543a5a075744a66fb9da0431b1d7101fac1474861f1f18126e69329f0fd28b',
  ],
  'content/maps/map-002.json': [
    '79a427dfe3210ec8e68f87050616c7cc4f4afec73d9d222715c72c6c84e9ba42',
    '4410bfef77b63027984dd456f939fb191f44bb9888ac9cc7fd45205bb151c0de',
  ],
  'content/maps/map-003.json': [
    '91c524087f832503daaeb77a986cfb651cdcfbd22eace26478a8c1b83619c77f',
    'e67833ab3153c9e426993bfa4b854ca06be7dc22f0c5595acbbb1f015c4b3d1a',
  ],
  'content/maps/map-004.json': [
    'e6792d8c18a8c97be97db0f9eeb70ccfb7bee7b232e6b937cb931bcb6e028386',
    'e09022ef12c9661e32f52400f8ff840647ee89e47cc04d32a2b018244c27e429',
  ],
  'content/maps/map-005.json': [
    '5994bf13ebdf7cc6e86e6575d388e4e4d7d0edc02d2dd3e50c88e9655025f350',
    '2b57505aac8094ef204e5bd7ce1948251a5cbece2b97bc931d5cbfaf9efe3792',
  ],
  'content/maps/map-006.json': [
    '3a0c6280058fdb0ed3bbdc0ec66ea90d810ead81c3a28b92cafae30a87a85f7a',
    '19a34dba51608a95e098a4dd6f77db26b643a8b6dd7ffe2dc5fa191c8ffc93ce',
  ],
  'content/maps/map-007.json': [
    '10bca06bc97640836d12a68fffa26095ccf346845b8b2b57bbea88affce95fc2',
    'f7e5f3899ac6cd799f2e34848436441ba23a65910fc902d281ee0c19039ca96a',
  ],
  'content/maps/map-008.json': [
    '6a05a7e06884e302c032b8c903730a2ce00725b8e028564d6e63ee0de7b1515c',
    '3589fcf05ce05f7cbacaf28541df69c5854c66fdb2e1361319b6ec3922eafcf7',
  ],
  'content/maps/map-009.json': [
    '7e956e4010abf1dc7d8289ea440d74a05d4d1c6e8da51a6f5e0429f263799b07',
    '5c06309895c03f7fb94cb72ef120b86e4acebb5bea4537de7ff74e84c81675fb',
  ],
  'content/maps/map-010.json': [
    '37acf7a86568413ce3b483bb00176866bfcc4dbda9ca81ff53a23c91f68bb5aa',
    '28bc4122b29f52adbb5f9745618df1a7190cca0cc586a292054f9176aa3558d3',
  ],
  'content/maps/map-011.json': [
    'c24dafc0e8c380fd6b720def553d834bf07848c69a9d34b9fe50579253b5370d',
    '27f531e26a42accecd3ac4b4fd333ee74ac3c1d00143589e322fcf1c25f52a38',
  ],
  'content/maps/map-012.json': [
    '3dce87f9b56122ab755bb02bee2f76e6216f5ceead289b1a1e90270dc4cb9678',
    'd55f2bcf36988e00e7a9448500800d5d0a2533a66bda607251580a8806506732',
  ],
  'content/maps/map-013.json': [
    '2af7d601cd759395ecea6e836ada36829d4ce576a28e36fec8187f903949fd79',
    '22d274b87c1403f2811638460031d5ed418f99cb3f2beb1be0794b0fe711eabd',
  ],
  'content/maps/map-014.json': [
    '26451b2ac00044fbe6b73eb1111dbe90a53953e6a8ccd26ef6548f2fa4e3e790',
    'c8f07096eaa79306a68fd3b1db87fde3db9e2a8e059de986a1a84da85a376ff8',
  ],
  'content/maps/map-015.json': [
    '1c10ef1eafbcda470419f5c42475ea1792ab975237c4f361c8fdf4014d3ce2d3',
    '36520c26de32a49980dde71c19be54383c771b2d3909bfb77af4029ab6e472f3',
  ],
  'content/maps/map-016.json': [
    '7f46841b0f3c53214b5eb934a12c783fbb92815fb0ab3c0a063ae626603d6ab6',
    '149612b79452fe9f0fe6bc035823404631c20ccf0f80fb24aa4bcbe2d7136686',
  ],
  'content/maps/map-017.json': [
    'f1e903abfe739f87e8ae73dfb34c94659beea107e1ac0bdfeb5722ce7e38f33f',
    'f7cd8fec86f26f004388765a5fee70f63af119185c1cf4fa5d391c2efe2c241f',
  ],
  'content/maps/map-018.json': [
    'fe9e31708fb8c10bfb4183ec03e97a2a5f4efe33d8ea49f4d168d863d6d184a8',
    'ed6ef99841e59afe690edae16d290e68bc8ea858316e380eed5cf774d7210912',
  ],
  'content/maps/map-019.json': [
    'da13b5f444609233c392a9652731e91cd30a8dc091e2640d47efb43e46c3d4b1',
    '51888443b8068a9fc0e6fac6460a2f4b87d1743b6d86d732b630c09353df01a7',
  ],
  'content/maps/map-020.json': [
    'bf807f6a647b7cb83cbc0cbd3f38696785a5a2ebf30537c5e65fe170aaefbf78',
    '4377a53f9b3774fcc10b0e5c0f385c030ed3a755863d4990999d0c595bdf595b',
  ],
  'content/maps/map-021.json': [
    '20f967eddc00dda7ee04bbed176fe0a33e1f6abca3ae0ccdb6b694af0e20bcf0',
    '38d9c7ee2831b25ea8ede6a44cd552d61d82f64951abcc27040b7a10bfaca703',
  ],
  'content/maps/map-022.json': [
    'aea0dd43ba754bc33d733593dd33166c2c0404c65d7b64232ab355222f6ffc49',
    '3d4afc9e7f7e5ad9b4f0243bc618b0fb6254b3a3ed8d89955ae4256c8d795f2d',
  ],
  'content/maps/map-023.json': [
    '448cd53d364a29c998857095593f998f29c4b61c56a7174df6942d25f5e35ef9',
    'c6ea43879c236543acdc0713d200642683e232fb50b2c7db5eb44b83911566b5',
  ],
  'content/maps/map-024.json': [
    '612e4b435598f87a6d73097e72fe9e2bd5d89c6de7dbec470fb8750b049d1623',
    '18add9621a95cdb63378d339e82262f6f5bd825cc9381e51c689884cc264556e',
  ],
  'content/maps/map-025.json': [
    'b556f0f7fc4d9d4b099479ccd88825a0e841a2ad53328d701dc4f0fcf5bd5f72',
    '92450b9794b9fed15cc69b93205c08098c5939482633c4fc3c2b23c7a9da65ca',
  ],
  'content/maps/map-026.json': [
    '891f59ad366af8fdbfdb5d92a9c86ad593700a694460000d95e07238a3aa4b42',
    'c433aa86c4f5e0188a8a20743f6745bc20064350a72c429a050891a368164730',
  ],
  'content/maps/map-027.json': [
    'e7c154e79841c528c35e8af4b5c2864f296ae73a2fe17aef827100b219c65db2',
    '3430e53b49e4163b4e3ed0e7859be42bc7cb2235ddbde8260c58a15b88e5918f',
  ],
  'content/maps/map-028.json': [
    '726935a79d655f27b49b73b49a3acbc89b3b5819259bf88a5b4bb587cb7913dd',
    '95095e2b2583f3f87eb13f20aa88256cf99a395c441414033b8a852e73c6e2a9',
  ],
  'content/maps/map-029.json': [
    '60f2fa76fc0954e43a8284e5bebe3177160e4d98901be8ea3d92e4e4625410a7',
    'a83d63fa276339e2d2e187fa4adf16b04251aaa69b3ed75c2b89e57e7ba9f079',
  ],
  'content/maps/map-030.json': [
    '1d583b08bde5873b0e31d18a0b77979a0c34be0643837efbf2da4c46d0e15bb4',
    'f9ac6cb0c3e3e074242d51ac90d305c398addea22803e38bbcc67680c1a824c7',
  ],
  'content/maps/map-031.json': [
    'c1da1aa2f10d125ad2a95ac93b3741e9b850f78df29e27412ab625aa0234dbf7',
    'eedb506e33e3aae8da47e9b94824e58ced5b6fdc6f8617f9f538537fa007ec36',
  ],
  'content/maps/map-032.json': [
    'c4e85115f02c95513bf0c44c4d713a4b7b3c4eb10a3b1a5437776cc0332774ff',
    '72c7764aca1fffd3f75907e1443391262b46e621353117bd8695bd5cba647e11',
  ],
  'content/maps/map-033.json': [
    '95386032dd4356ca68a3b12967ab68e18658cffa549dd6274543ae4db47c85d3',
    'fcc80b072723dbf0272eb9ffe04e1097e178532ef0398ebdfe9ad5968cdaea7a',
  ],
  'content/maps/map-034.json': [
    '37e5ee448ce03d10cae4e5780dd673c766b0467ee5db2b680e8993498ccfa9e8',
    '4c4e619da689e8cbfa32af8bba27ccfc0742b8b6b9ae41afc1dd2a370bc6229f',
  ],
  'content/maps/map-035.json': [
    '580b25c4da639185f474cb59ba9596ed4f42e4f5aa2ba2ac15119ff6d1ddded6',
    '30e6d2dba962fb90354e5841bd67a6caf7d53022d3e3c213bf6ae4d4f158513d',
  ],
  'content/maps/map-036.json': [
    '21052dc5e14e07701635ec219634ed558378c86eb07613a2bcb19fc7a9d2f815',
    '94cdd03608ac51402cf390fbfd6b27df1940dd6903fdfdcc2f603961ba8159d7',
  ],
  'content/maps/map-037.json': [
    'e6e53d59b4d136edb4b09a483ad4d879b581eec152ac0bcdf202c2c5f7f4520c',
    '2909c069fa478845855a0d54fc88be9c18ed4d649c7fe151822a4e757bf7d721',
  ],
  'content/maps/map-038.json': [
    '3fcafc0b5110b70856e82457c15544df407bb819287897a3ed2605604ae0bc73',
    '0707f3e93caaca4019ff5d29fcd8e90196e25905876703caee2f1741d926e265',
  ],
  'content/maps/map-039.json': [
    '55ebb379f60166f841bcc04c18c4c97798cb85a3001d2c29ef76a32bcfb6c59d',
    'ad02f8483e472aeb602ec8a45758d0e76dcdc8739c56d9c538930096a6166675',
  ],
  'content/maps/map-040.json': [
    '7c3467e7dd3f6f862d39448350db8a26a60c5850b6863b612ab9ce357a71eec7',
    '4758c86b862d7f461c0315f8d3f4c0e0fd3ecc58d1b48d512c18fbd44b9125ad',
  ],
  'content/maps/map-041.json': [
    'b1e571fc6156a0b026a585deda487f7b4ea59e95ed01ed40551dd8f922265e06',
    'c4a068d472c4c69c2a371fd79382d14af51c8678406a2ff3b4df65ee802bd9b1',
  ],
  'content/maps/map-042.json': [
    '0d548e5fe9cab9bdb13c03d39a6b5fb1c4b5167f53f23e81eab6dbf9c1bb1121',
    '1cee50b08757fd9decd572a17595d3cc1d5659c8478898b645b8110abbe2c24d',
  ],
  'content/maps/map-043.json': [
    '12a94017f9373379551f6462f8938813ce784834e2e76811a898afdc1aef8f03',
    '8ab146ea732d4dc76e7b0c58dcab6ebde84a37adec25f4c3ee723382cbb59b96',
  ],
  'content/maps/map-044.json': [
    '18a34f33506165069eb69dedb9e4e5b6ee6483036e47e6064a489229adaa2d2d',
    '4598e628d6c8a529cb1694ac8c2a69c41b9aabbecbd234ace8b6bada5122d894',
  ],
  'content/maps/map-045.json': [
    'c6ab3e8c88ab236f3388b03fdfff54734f7afc1140667cfa17266ed175f6845e',
    '6f60a343921fe318b4cd6e38f7bca5b2bd0f823dea2919d931982afb692c5f2b',
  ],
  'content/maps/map-046.json': [
    '121191d37abac761d963b6671dfeac265ee993b287eaa0bc70b1f71546212af9',
    '7d20928077c03cbc6763252a56c6a3dd083f6278f21203ed497bcbc3badbc393',
  ],
  'content/maps/map-047.json': [
    '27307d4bbb20249e5a344559aa1719a77924e3a238559db29f013089da37bcee',
    '6f6dc2d0090f126abb10b7dde2ea43c59766d6a95aed62b1c312238ba22b7542',
  ],
  'content/maps/map-048.json': [
    'f0e821cd22d031332e51fe5651621a8a24d1bcbfb1cb9b08e3ae991c2a9ef828',
    'd8d5140f6a7877d93d4a19c95b176bfc364305b0b9d9b2acc57fc1877f6f3d04',
  ],
  'content/maps/map-049.json': [
    '40d24dbcc944653c39a5d3212eafbfea462342fb5b2ba5b3d9814cde36518921',
    '80814d5c60e746f82a8f6674f87eb7bf12f80ef586bea9ca8c91d94aefbdb748',
  ],
  'content/maps/map-050.json': [
    '808e7713f90d856c15a5f546d663f7886dc3851c9b4f83058940f74b93ab53a1',
    '063e59465bed0cb36c6d5a95e11a3cdf3f47ef65ba3f5f8f1e513991ff685820',
  ],
  'content/maps/map-051.json': [
    'dc342e74f8a9d76627de58e7ebd9cc7cf2c757c5a9a6088708e9ada9dc52c600',
    '1d7bc6ee7356b46c26070d303456b738576860a8568cc702895ef1dc46b16df4',
  ],
  'content/maps/map-052.json': [
    'd84299d0ad9e63f2e22bc11621752e2fb65006fd4a9d26e6868c444ab8a0f3d6',
    '6245fd1b21921eb041422c0db2b5fa95a7abf35ccd1fac99832c242d6482f838',
  ],
  'content/maps/map-053.json': [
    '4aa2966262fc69305a7cb8f25c69368c3ca758afc27086a1b74ac43802128422',
    '45452ec42cc032c1e88154373393cf6478244055ab67d667e69a30b94af83e0d',
  ],
  'content/maps/map-054.json': [
    '07682aede7bf995eda46a2d383d4b848e0a4f33c0ca26f259e572fdd2bfc4bfb',
    '2125007d206b4f46140caec80269b0305ab85817ebd17305df51ef28f94285e0',
  ],
  'content/maps/map-055.json': [
    '7751b5c3b1d77851d95e8ab7f4a7182b7bf4ebccb535966e8651500eca03f8ea',
    'ff65cfaf78c4c09d90b200184ad8eb316a4eab80b47bfa8a8148bda1a0c2c1a5',
  ],
  'content/maps/map-056.json': [
    'd892eb885f17a09a3d6dfcfaf7324fbc4d66681e8a019543b7eb479dc23207e3',
    '04ba9e0680182856ad2c73575765bd7984b2c6f6d423602f6d85cad853c1555c',
  ],
  'content/maps/map-057.json': [
    '3436c52a76bf808937937bd46fd3232681dc2b55cf90dd675d07f3b5c0af3b18',
    '7a263b069325ceefeadf73536fa59e9f78ab01066494a80f28eded4bb3fb4fd3',
  ],
  'content/maps/map-058.json': [
    '34f05ce761945d798d63a5c57e256a5ff00c28fe073b0358ea4587545c2656fc',
    'f5006037bdfaa7cf949f75977771b7faf05dcfaf5f89133920ee10c10633b750',
  ],
  'content/maps/map-059.json': [
    '89c3ef801d466df0ae17218c81db6dbb32caa3be6acfd7fd29ccfb2731a4f7c8',
    '8d0b354ca460034a1cb673867404130271f63781bb89b7fcaea3572fce61f436',
  ],
  'content/maps/map-060.json': [
    'f5f587693e3a2700627f62fb54e70874225dab3c0d03817aeabb7147ca4ade10',
    'bd3c4a5af5a481e925cf8569cdd423eabd7cd80ae5b2d41e9b7e3c447bc854b3',
  ],
  'content/maps/map-061.json': [
    'a2089511eb42d16682e089d3b5b6df3b13484e49ed235d86b8cb8c336d40293f',
    '04a10f181698c4119ced16064242f89f0b4fc7601d8a5ac21e73743b01cbf872',
  ],
  'content/maps/map-062.json': [
    '6eeb9f026db2154c00d881eaf609daba4d1325c2fe163272ed1fc7ecfd0bbaa8',
    'f45cc8a03b855ef9368739f6b75e5002e22e280777fbc48a5fb1dd4aac940512',
  ],
  'content/maps/map-063.json': [
    'fea08c1e41ce993f1be27e0250dbc0dbe77cc5f9252eb616ae99c8bf5a54886c',
    'bcf283ac74021e38b617346a54e76950a94cb76549ffbcbfbb92267a1b945757',
  ],
  'content/maps/map-064.json': [
    'ba9336e3f3f4d09296cc736e0d0aabd692047537f6aaf2e8f211d153d10dafe6',
    '87614da08779ee77e689968c85ef14d43ef457d30255caafc71cfe8ad694148c',
  ],
  'content/maps/map-065.json': [
    '8b2a031c99370733c6bab81ed0c7452c05054e3fee59ed6e2750162615655389',
    'f38bb314d6faf3003675b7de1630da7e15cede2fdd7475590f96debfbd017788',
  ],
  'content/maps/map-066.json': [
    'e3c17dd5d893bd90463be3198cd14eff9ffd1586186b1db8acc8b3abf9695b89',
    'b95af19120a053f425f5661bf9408ebe5451b7733d79e1901be7b4d143443896',
  ],
  'content/maps/map-067.json': [
    '51f3318028f5712007c517dd5de782d1f3274da19202c7a338b8ff2a2ee9c1fc',
    'a5ac2b1cb7925d01b76f07ebc684d67c83bb8a7516998e49da191bec230eab28',
  ],
  'content/maps/map-068.json': [
    'e5f42518c37835f6c539fd41b2263d918ff6fab5f3d42da60cfb3f0ecf8fc626',
    '62e9871d151b9c65a0f8ade508649ed1c89de07f4a374b8dac53d56263881225',
  ],
  'content/maps/map-069.json': [
    '141306fe920f821f33f653e682fed52ab42e422b73dc48019fce765ecb7ebe79',
    'f4a96712e0f7df8f51017073f8530a98288c92550594421b4af6550e3aa58356',
  ],
  'content/maps/map-070.json': [
    '85b74e1e0d7c21b38c0e4cae57b2a6c68f6f8ebe219dffb9b185404af461b7c8',
    '5333bd11c95f22cf3e524c31079e8138c16afa4754fa5415a6ff09f86438e42a',
  ],
  'content/maps/map-071.json': [
    '4632f5d763b85d3530c358d76fb42f7e99d828b47b2dbdb2273f37c7e4dc8fc8',
    '50d26b40dc20d97e8348a937ce1a726678a8beca0ae8b84a344557f093880f5d',
  ],
  'content/maps/map-072.json': [
    '13f6e888ad6d505356375d7afddce0d34bfd0ad1f0b0c25d3313920875017f0f',
    '1f4b13dc218b300b9b8c77d81a2ec2c4982137c15ac7ea6146fc023c0014e488',
  ],
  'content/maps/map-073.json': [
    'f8f24b4c30b2535eacc90f3043c912dc8f78152cc0e523eb94c9cba3d5674b04',
    '7f59f19b4911a5f76b3be5cd50fd66cf320c4a537d23dd7bc712e22100c0fb6f',
  ],
  'content/maps/map-074.json': [
    'd42b02795f6f25f194273698beda6af1e4765b6613a440b3dcf4d0b2bd939140',
    '457bfb583486bc580fc1f0203dca7fc764ada4849731a853791a1bd55d684760',
  ],
  'content/maps/map-075.json': [
    '21868b8201660954351afb4309f18aab5a4b4057c41942d0129f39198ea58147',
    '230259f121b8eee8f620ee4019cf805ebc9a75613dadd429c51c938636103abb',
  ],
  'content/maps/map-076.json': [
    '5c194141a5a0fbc601f0c5bc2dd01ec9207057aa1ba117637fe4359f33288076',
    '80d0e9c1b31c8e6b091f1afa3780d3b859348fa1b779b4097217889d4faefcaf',
  ],
  'content/maps/map-077.json': [
    '563e5d62d308965835d1b7580a179c6e818aa62cbacd2fd67b7cb69e12fd01b4',
    '421d7e949093a73b945215dc5d708232a88f7bdb8886fc2938caf0811aa2b08e',
  ],
  'content/maps/map-078.json': [
    '6acd1642a20d3b3cab9de95bca376665db4e3755790bb0f9d1f4ef21d70bbc60',
    '4681096496a104f797e9b6978e982ffe399689a8db9404eca42aee27f3d1fc6c',
  ],
  'content/maps/map-079.json': [
    'ca30f0372d8383caef60b04a791c18600b551c3aed56466ae6444619b9c9ce1b',
    'e3500f6fda8e233b7632417f5eb498eef4e3698d2af4c80f1f10bcd4c812aff3',
  ],
  'content/maps/map-080.json': [
    'db601138542d7ea1477e915a8083e0d874f30077056062107bd2de755d0b3374',
    '0cc342571334a6dab4b3d7b58e90349caa5be6c27c37f36cac32bb094baa4126',
  ],
  'content/maps/map-081.json': [
    '87fa5f6a7783d0cc77771fd58400917e1d43b75ea84b96cfa0688d5ef7da7e7c',
    'f405a6948cfe14978f2c28a2d766063b720a9019b169095e8e9a5c26e8245486',
  ],
  'content/maps/map-082.json': [
    'e313cbb1f634bd44c159ebfd1599e5f20395a92d892bb8e5f7164aed79b0c592',
    '045fe27b004966657ad72ea8687145722b0b4fb97780427fba6c12e9372fd6aa',
  ],
  'content/maps/map-083.json': [
    '27565e14bd34069234b88f6beddc4b1e93bc0d438f26fe186e91524ef92cb649',
    '4d5022516d8efdf1a45695017e069781fb2fb79dbbce353ee664ed8cebe43c64',
  ],
  'content/maps/map-084.json': [
    '91682b6fb59ebda6d0b9d847dc0400eba32a27851a8559c807ad792a735588be',
    'db4ad508794981838cd59881a38d9217b25c125e5f55d67cbcfb9e211e538e75',
  ],
  'content/maps/map-085.json': [
    '536aeac1ba2f5f1ac51506cec79e50f636c652f53d6d835776edc5ca3ccef09d',
    '631f3f69d473f8e8bbddca415f827e51d26354b1fb96fd4aec5a34df88823ae1',
  ],
  'content/maps/map-086.json': [
    'a2bc3b587f20c217ad29a41bf9407e859e7a0af1c39318000ad79da188235f54',
    'c70b5a67e874e4f1c037f0e4978499b639c74090f0a77f556e9ee2917bca1be6',
  ],
  'content/maps/map-087.json': [
    '2277d175adeecad53392448ac1f9e36be7bad394d84691f1a41533546feaac54',
    'f1eb6f9dd77ea9ab7d7b7cb655384c59024220c094e3e1452fc0438e90a0ddd0',
  ],
  'content/maps/map-088.json': [
    'b33ef0e2ddae83553e29bc7f05e43bc9aeb3d19e961ad7c25168204280a31c51',
    '310a9cc2b8be20f79327dd32475b384bea22372c368ea746b4155e79e4b09c18',
  ],
  'content/maps/map-089.json': [
    '948c1fa95ee7240bafd1bd51b29589345010fd75661a2399f734199f9feee3ba',
    'a5a7eec20c04df9022eb39dc231572b90aaee2cdf65c0b4589ef80b9dd064778',
  ],
  'content/maps/map-090.json': [
    '2e701cbbe8eeb317489af2a02403695ffce446f4a386a7fa7e797305aa97b9e8',
    '2f634a7fdc11dc331217963a23f2a317157181d0cbc1d3501e6d731c933360d2',
  ],
  'content/maps/map-091.json': [
    '6cf89680f802ae5cd06535dd6835444a80179c87bcd806436158e442d40ef4e3',
    '250de3ec740e3ad616b629fc769b04c29382d3c26a0eec765e8847c4a2c7e793',
  ],
  'content/maps/map-092.json': [
    '53e5f7f4cdbafdb74402bd7ca66c6b12083b0e51a8735c51cc7a93fb590dc324',
    'ca1f6afd2bd408cb882537b978f48b5607cfb238447c18773266466644e9f302',
  ],
  'content/maps/map-093.json': [
    '8ed8f864857182a46879b1dd1408905ada956fcd5219eb8e90c27352b5d7e462',
    '8d5410c06a5233a797bbbaae96f805008b8baf57acd6362cf236ff202f38ce26',
  ],
  'content/maps/map-094.json': [
    'af18e0c09475e71d7c4be9a26b6357151ae4e868a5f0d675a99d9bbf1ee20781',
    '08d950464b06ddeed2f175467683d12dbfd6c3862044c3ff7d38e6a4cbc17b54',
  ],
  'content/maps/map-095.json': [
    '5c80bd63568158c00fc6af0f2d3e02c791f3176e41980cdc7fea702cfeb1043c',
    '9dce315a7f6df5f0add190c0f88e96cb36c9aad74d5dfedffb67312a45a45abd',
  ],
  'content/maps/map-096.json': [
    'abb400d14fefcbb41889ff0f27a0a2843d36c26c0f640bb3f21a43beee0342ef',
    '273652d8ce710e9f012f3eb62e3eec4bc41d76e7088af254659274475bc44550',
  ],
  'content/maps/map-097.json': [
    '8c053c892b9c87582192ba06e544b2db0f03d4a969541f508aa23d38ce121e09',
    'b204139f796145fac5500e6d9db406f0fffe776f9a7af66e614aadd190d53af7',
  ],
  'content/maps/map-098.json': [
    'ead1fb6e3b6d6a85798c30ac237b3697b6f0de868442556f50e0667c445ef0f4',
    '24b9d19081124488378514da87ddf8d569d531fd0a8e8f11464fb5be86e5c9e3',
  ],
  'content/maps/map-099.json': [
    '05dd0f3527a9e3df6151aa7c6b4512e03ff27ce287e36606b2d0115cdf0b3a67',
    '0734baefb350e1d5d2a0bf9141b729a8125728310c68e0be2d3155b196fed24b',
  ],
  'content/maps/map-100.json': [
    '710c64ca80129a2ceeef04804202c3ff9280fcfd92025dc91ac69920cb4e254f',
    'c0db15e5cc3d12d2c9b565c986aa1481fffcf273eb87b37260161f99dd838fa4',
  ],
  'content/maps/map-101.json': [
    '7686d5ec0a664beeda46e9d429aa1158619155543707bd65f9654dd1bc7e7ef5',
    'fc18ed60a661bcd7cb03c34751b54bbced441eb031f76b77e05966ac141ae3ce',
  ],
  'content/maps/map-102.json': [
    '333cb157f7ea0c9a7a1d135a4f5ba673fc8ec7e358d5dd3568ac7632826395ff',
    'ea41a97cc89bdbd7b63a801d62835847b7fbe6d9235ad7a2ad589c415a6c1099',
  ],
  'content/maps/map-103.json': [
    'fa3d5bad7d25aaca534cd39e0bc07f64bd61b6dabc6b28f8ff2bf5e6a4339af0',
    'b191cc1ac3b7dc654f1e1c3af0ba9295e1cfa184aade32fe2355e96af2928e63',
  ],
  'content/maps/map-104.json': [
    'e17f2123f91c29706e274b9779352a7ad6b4dfb4744ed8478b9562c098569edd',
    '80ceeb28f39017b662f38f5816c78669c4581f7f3bab5b6269019bf0a33338e8',
  ],
  'content/maps/map-105.json': [
    'bbcaacdb3fc8f3fb824aa4878c0babf59d158209c4ba626d29c1491493ecbccb',
    'ca3e69789bbba95181b4d0a5ab1fa3cec30226807507716f490cef55b701d4a2',
  ],
  'content/maps/map-106.json': [
    '5d70228958209cbea887f3d486ecb218ec13e61683446907eff938f0eca4d1bc',
    '6a2c758a2afcb183b2f45813203ad75038a226da31ee000fe762e1b1ec76c119',
  ],
  'content/maps/map-107.json': [
    '15ccf84109f95d7e66ad8e59664474da8f0ca968ed993099f2e5b5e6c37786ed',
    '97546d01910f4cfb76fd8a6ad6a533be26d516aa1e9bc31e39ce8aaf2cf74cdf',
  ],
  'content/maps/map-108.json': [
    '4a34a9b3b643f2361abf1d0675d33a8ec15dd9231223eb9ceef3f4ed38d2f8f1',
    '8357c93751801fec09652159d1aee0f972b7c5947144f3d17529133d2b1ae423',
  ],
  'content/maps/map-109.json': [
    '8e710a0aa4578e9f8911fbd0913b5a19a4a65d4b0b6840abbc43ecb71c22e27c',
    'd13fbeb69b85506237b6f80d7e8a1842e7fa8bf4596c1ceba01c8a4e3077f8a8',
  ],
  'content/maps/map-110.json': [
    'da0d0cd1568d6e28d86727158d803b37f3239a26c26f1e617117cc27bdc6923a',
    'a74bd120b6a6bdc5f2ce8accbc2cd7ee77cf9c84ba3c6fc0ed8308e5616b1a02',
  ],
  'content/maps/map-111.json': [
    '97809ae8565c6a40b86d20e6cdfa1902be04f3092fdf6c068cf3a688d9b0cac7',
    '4e19146d72f71a59fa6843002d9a18acb7121b32977abdc74c79107d36b04d69',
  ],
  'content/maps/map-112.json': [
    'fbc654988cc1b10808ecddc38a5742bc9744d3d50f703cf8b497811015eb051c',
    '96812fd5ff01ff05ab2dc759b44b7b4cb4f4e9a32c3d39a6e683138a3f9e894c',
  ],
  'content/maps/map-113.json': [
    'bfcdf9ac8eba3edbff094d224c5c9e9fa988ac998f31337d42f69a1b695d7189',
    '545627d035fa0911e5b1110679ee2f348bf45cb5f155d6853baaf78a37c9c00e',
  ],
  'content/maps/map-114.json': [
    'd7984a03c75c3640f093cc3f389a6798c20b97049c85318a888ca9755b9bcd61',
    'fb9e3da3c5664826be1e5e266182d6c60338d00e9e4fdd50f12f69bf976c517c',
  ],
  'content/maps/map-115.json': [
    '03bf9f31987157d6ccb773a320c2ac8309acf9d6d09d9bf670fb543801baaa79',
    '6f6acacdacec9788bc241c7fb6d56d4d943f6a4e01055dba68e7ee9b80704236',
  ],
  'content/maps/map-116.json': [
    '3a6f4efc34646d4860ac0aca076e93d088783fecffcc0c81ac299bb1c29cde5f',
    '8f1c4b6d5497d011bcfabedd2427bc11e980ecad46c7701961feeba65fc807a9',
  ],
  'content/maps/map-117.json': [
    '00def417ca446e79b59dae4bd9f66ddf4fb29d2feb6422fab9c96d39499b67e1',
    'ac673b7c000e92693f1e3873ae9cadb55b44e526b8a7c4dc2c16f2cba23c623c',
  ],
  'content/maps/map-118.json': [
    '78efc4cd49a745003a699db42960848a62d8ca08c3183cd3f6505918b7b0dc83',
    '2d6ad193af75d1fec28f3485a82d72d5b0dbedde19232e1a99077600ed2e031e',
  ],
  'content/maps/map-119.json': [
    'e50c999d716439190fb963e3fdde9e4fde21940765971979b8c6669c03cf038c',
    '0fd7fc4890ea042b99dbec260cea1e12ac7b558bc778aa7df7c3aab74ecddda1',
  ],
  'content/maps/map-120.json': [
    '6199248f322f3c44f63478ed4a9bc94e78133d6612247c7b550fcd1c49dac269',
    '2f4aaa12814abcd0596a02d397d9a0575d7ff6fa73a4e36f3b1a48bdea7a48ff',
  ],
  'content/maps/map-121.json': [
    '39c9942b1c8b8351ffa38fa6cc3faea45b05f22c13b5476423b200456769d821',
    'a0ba4e9c09efb1b94f5003bb89e232d0de91585b3e13475a7eefd15d064d6d5a',
  ],
  'content/maps/map-122.json': [
    '211cdb881480fb0669b3458d6afd6efccebaee4085a145f59885adefef5285b2',
    'a53c02941b39fee9fc6a9f727199e701a3820497bfa5ef1c4ecbe47884357d8b',
  ],
  'content/maps/map-123.json': [
    '651748088cc1388198daa15e61bab03db7b3e5856b361212c2bdef26499aa2b0',
    'dcf3357be66d3b95469db4fa3f15fea9d84b8d8f570d22598e05f686cc6bf0a5',
  ],
  'content/maps/map-124.json': [
    'db256c8ce31ae07cc4672ab39ef8a2d259394fb179a528917b2d6aa969a7b9ce',
    '234f33f8fe505a3b798d37f2f0f793d4cbb246899b92005f5f7afb958bb4d8d5',
  ],
  'content/maps/map-125.json': [
    '037cd9f03dbd0407ef4e21802a38da021c3b6d347578aed7c16e38224fb3e8b6',
    'c35bf00a999d043843d0128b490f22fbb9a7b9a917bfdadba6e6c800219cbc1b',
  ],
  'content/maps/map-126.json': [
    '9ed9183880ec8bccd80b3845e361504f010b4fa06a792e3d785ba9b80c73a407',
    '97c6d8d523166e169d5c9d8b32bcbeebd5363e443cdbddb4f0daddf915ac7117',
  ],
  'content/maps/map-127.json': [
    '1f591bd8f42c140e39a443f2c22805bae44d8afe400bb0f777d4375532467236',
    '179e09ac98af368d37d657c3bc31fab2e2c0b4490beba5df8b64538856047d2a',
  ],
  'content/maps/map-128.json': [
    '70802cdaf83c4c1402301516e8435db1e5393e5360edb50e88618b989f696239',
    '339bc999e65831fdcaab122f2991608def8eb0dab0b4d387dd0bd31b6e43a0b8',
  ],
  'content/maps/map-129.json': [
    'c5b3aab43725831bbba05efd6f0aa672feb9a82bdbc5cb5e7c8cae3a07cda9a8',
    'b23990856f6c2b044aba7845d22c9f2ca2ea761a6319fca71fccf966cd0a79de',
  ],
  'content/maps/map-130.json': [
    '5d4a628ff23a00082669e5d5b4cc3464561fc58a62c3022d4021d8e6f694c300',
    '7f1fc548f690aa55702575897d7fd6b06126d06f156773b18428a735e35922c5',
  ],
  'content/maps/map-131.json': [
    '86e91fa702c3403a724a2f9f0603ddad2072553532d00a8f4489af95fcbcf119',
    'c2e7cb04c6e80494c3f0ca798b550c3a586d0451e85488785c6dc14abe43fe90',
  ],
  'content/maps/map-132.json': [
    'aa87b0bffd48eb1ed2c6293da8755d31ecb0da8c79e0fc174e07a72616acfb68',
    '11c0d448ca5b4c8d5acd927d7e65aa080824e9eb631da9011f3bda98d8145d84',
  ],
  'content/maps/map-133.json': [
    '416da9a1d86ba09deed44d68017ec0c99b3254532e96d9b8846b560130f59a5a',
    'a27033f3e2788e582ab2c7f20cd7c3dc192d62a81043a4316179721f5566c390',
  ],
  'content/maps/map-134.json': [
    'afcbaf47a82574850dcea1e2b2c8e3777e29edbd75b0584438ce5d1dd93747e9',
    'fc1f7262c8c6d02e6ceb79aa923559c4617cc7b34f28a373a90b33a62ef48dd4',
  ],
  'content/maps/map-135.json': [
    '8ec17bb42f5219921cece2a1102ef342953fb0805ad5851223713d9f87008c24',
    'dd118e57ae5cfc913e113304034e7a0c0a2b4a73af42d427ed1c07d0c68a85cc',
  ],
  'content/maps/map-136.json': [
    '1272f65325b424297bf41a73bb6a28abe6359083099a8d2424945e4e1fa81491',
    'adce4acc52d8ded5e89406080a6f251f06ac7c1175fa5284780d0559fc595567',
  ],
  'content/maps/map-137.json': [
    '83333c3c1d2c7693062f51d7f5c3cd054549960763d94fa04e7efdb2a778a85a',
    'c41d732e6c879e8f3c0bc64d823e8e92ee0d3cae617cc0740a1bafbeb2e67a99',
  ],
  'content/maps/map-138.json': [
    '6a68bf2a94bb26d91564628e2ca0e5437ca061d8cebf6e0907433372f9053bbd',
    '00a3a6fc40f5a2419bffa507a802e6fbd340cb357846946351a28292f3e3e836',
  ],
  'content/maps/map-139.json': [
    '398799a9e10c52189be86a8a108c27bad40caf6f5b5393b08fbbd1f18c038df2',
    'd741433e14f417c94b21d1b015a346e801294b3875254c7ecd0a92a267baeae7',
  ],
  'content/maps/map-140.json': [
    '182a0bad87b62f6e466a9441aaaefb2cf5893c830cc6dd3e12d2ffd2306ccd02',
    '755df3ba16a736242743f5195b85b53d32a696871a17ca6e54bac4939fdcf459',
  ],
  'content/maps/map-141.json': [
    'a9fee81622aa9d589be65840287a92160ae1e33153a295ec0fc6643c4637c5cf',
    '9fc17d6fae8b2cb4220da5c3eb6be488a8767e9827c7bc237b7ee41ddd0cdd3a',
  ],
  'content/maps/map-142.json': [
    '4f4070f9717c29019e8df8a3e8cec8321586da0b34ff999a5aca09e1099f2463',
    '8229b4d126fea29c7d288e17a87bcf5c2940425c26df5809f4e6700593766894',
  ],
  'content/maps/map-143.json': [
    'eb4a888e549ec6e0285f5543b7a525cf43fbbddc88c68b01c4b787e966b4ec6b',
    '4fbca5cdff3c931e54b1f69c5266a8a2dc282b33e49c4293b0bf814d5a05693f',
  ],
  'content/maps/map-144.json': [
    '4d9fea0cb5766b776579ebe070e14bf48f7b66ea957efa9836e150936738e8d0',
    '962f49baefc9a017114a4ae4305af6fdaea8eae2d4e54a684c5f2ff761bcb718',
  ],
  'content/maps/map-145.json': [
    '36379a2e51f4af5cb2ab00b7216c0ad82d76937fc3e277f5145cca6565be3ea5',
    '1da070492a8eddde44f614493305fd6bb3ccb4fe458a92c96b0fdc46df6e2bce',
  ],
  'content/maps/map-146.json': [
    '5d2da2132afcff2355c64a6f639b6998faa52c5b416cf67abaac375e81ff8ff8',
    '00508e7de6d5bc609d6aa4c567dce542cce09e7e33ada6009e7f4ab0c0c87d7d',
  ],
  'content/maps/map-147.json': [
    'e1f584637558cf6fa18119ddd16205c444ff6b632da05b31551785d1ad66e4f6',
    'f674512ce5ce7b150da5cd359ec77d72f1dcb609794a40fe37d4245e29220a0c',
  ],
  'content/maps/map-148.json': [
    'fbf2b1424d82b24a1dd8abb8ae7fd5cc7d4ab55da8207454bed41e55bca2f52b',
    '8029b2338b507b475c6fb3d95f2c86185c0fbe130ee7682b0745a9d81034b316',
  ],
  'content/maps/map-149.json': [
    '531da2c20ac6d4265957785838c35ccaeca1d7f2a0ed3370b58a5c97a32812bf',
    '22c36a0a260943fca252d3977b98fe26101039faca5c0f7a49e6fb1d67cbbeca',
  ],
  'content/maps/map-150.json': [
    '227769d21205b4bf824ecc07a10bcb44b25d9932d918a49be260a083e992cca9',
    '850e10abd3407da0520eb7cad34b8b0d9f2567fe7a3da01420c8971b9d590734',
  ],
  'content/maps/map-151.json': [
    '6c5ce6e0a13fbf74e781e3d305b946ae888ef445622481751c4686ac0ddd2bef',
    '524f4d19a354ea8621523da0db25f9df6869c1014ed6179bc8e722ecedd731ac',
  ],
  'content/maps/map-152.json': [
    '1364a8fe38f5a89a441ab9cd95985f3a001caba21b593c230f4a12a8fcb821e7',
    '62bc913d36caa02d6ca2acd81b8e4283b9d239c8cdfc94de475ddc85d3cf7a23',
  ],
  'content/maps/map-153.json': [
    '5370b03e552848d2f1d26213dc55e2258dd00b454222f80eaf0c769008b9a38b',
    '10c929bb4259752322489b9fb8e5b009109ff066b6f551eafa91f962ed731751',
  ],
  'content/maps/map-154.json': [
    'b85a5b77b78bb71a3a5c803b1cc4613dba0ed80760e23561ae6b1f01f3e56765',
    '2883876f4cedb9d99656c69a9ddeec0521563f069bc1f30e60769ee574846dbc',
  ],
  'content/maps/map-155.json': [
    '22188afd6acb75d1c6dc66495d3116adc118253cb2e49ca6f3cfa11f8add2139',
    'c483fee2d0ba8b8345a862559c0010d7a0ccd93dbb48d2db0d36d8edc9536e85',
  ],
  'content/maps/map-156.json': [
    '2d97c31a0288cbbdad6b567a3b94e32ff867c1102cfcc11c13518aecb6cb03e8',
    'b74f51e34e332dd71a3f9e6ceef4f92e21607262cfc17e82b1a6314a95772840',
  ],
  'content/maps/map-157.json': [
    'b5564c1151cac47d078017ad70d65ccd1672c66709cf75caaea05390421daaf7',
    'afb71616d4884bf39fe854094b7841aa8b5d098d0637c750be24c2f74bb1b4c9',
  ],
  'content/maps/map-158.json': [
    '72aeafb7aeec03fa1e29dae1c412a6a76180a053b64d3607889b77fa82588c1d',
    'c730b1e28e063a4899cac4e61b168869faa8f9e5a44761b0751237ba17e676ad',
  ],
  'content/maps/map-159.json': [
    'ebdd3dd2070701e580714a5b2f37eda916ce721be7942b9d7a975dc894c5f714',
    'f4c55d49714f7d6b3132b9d63756bd4cf35fc64a923154e3fb170d837c729359',
  ],
  'content/maps/map-160.json': [
    '8455149ecd8675da5a625b13d16cc14b6f6aceed7487a6824298856c9db7025b',
    'df9f8117a149502ec39a5a34e193c278d050351b0faf037c0d21a2e03006314b',
  ],
  'content/maps/map-161.json': [
    'bd980cc6bd9968bdac312abda1f948d00dee1b741cb7e8067208f95adb265c50',
    'b676b4cee69739b81865fc5b1bfcb33b07aa62a134fbf3f40a0445b63963dd68',
  ],
  'content/maps/map-162.json': [
    'a62989c597a87cd050fb39cc159c020816685ffea49388489ccd00bc0f4f1c92',
    '07acff2b85655532c1bcb2a1c11b96c58dc0460a933683fe29069c4d81f23300',
  ],
  'content/maps/map-163.json': [
    '103563b959b3b6315af1f80f778a85af270a8ffde2f9f75bf2bc61793f30c7a2',
    'cc89c256eca79ba81bac63c2e7cb596bd21fb4a491e0bd47d50260f3b03fa829',
  ],
  'content/maps/map-164.json': [
    'f26a7c4626176dbcf5edfc6c2f2366c62f9065fa90bc30b6a0fbd584b55aac89',
    'a97698dc322b61b400c3dfd6ff179112f595a92aa4caf0c4dbf82cbf5703af91',
  ],
  'content/maps/map-165.json': [
    '6b54efdddf177fd08238c78fd71b0950b5fd995a3722ff6193a657d797310c60',
    '248014b332f160e12e29cfb87875d57997b5de189e5f79087b5f1c1c3d0ec272',
  ],
  'content/maps/map-166.json': [
    '1e8b6c6bb0e28b336ff3c3c82e10c8c1135e1368e20ed1dc0618e437b76638f8',
    'a64b36d4fc04440aadbaec9435b19f606b7cdf3a2ec8c6545d9f1bfd81816aad',
  ],
  'content/maps/map-167.json': [
    '7174c4ccf22daa85001156a583abe15bd71f0e21725ba867a18d72479389a18a',
    'a3934cd8de0555628869877a689284b52d78140c0ab69ea4ea5178d3203dadea',
  ],
  'content/maps/map-169.json': [
    'fc3ba74db256b9540ac465329b911211c8bd8c6be2308307dc4a2ad4fe374155',
    'a7a14a41ef4576d3131822cda3b936d16104dcacd2c806af967bc1a41d1c0e89',
  ],
  'content/maps/map-170.json': [
    'f51552caab6851720efb4aa5e610a417bbdc88019c9c856ee10c974bb64708dd',
    '01c5b26fe3004960e216e62e4ebafdb28bb1d4a14124aadae7db0e292114db0f',
  ],
  'content/maps/map-172.json': [
    'bc20f29bff5e503d7b24e9bfa171f50f40e7b39f5d61d803673ca49c720ea016',
    '15181a6a6bfad4801bf9164d6e7741fad58cda00874299864c39f765f307bd40',
  ],
  'content/maps/map-173.json': [
    'e52bea8c4c4b60c86db66d06c0cfd12e0d89ad9b858f349bb5e7ceb129d575c2',
    '9ce21b8051104c61abbf7bbc4867e93f868be27e04dbb1d3be523f91fbb331b9',
  ],
  'content/maps/map-174.json': [
    'fcd72c4b94ab29bce90e1d3d277301ad0b73d5f04cf8a86d733f7e21072bd0e9',
    '853eadb52a7f489a5b6aa76df183ef141625c55934cd8525609d25bb0e957d7d',
  ],
  'content/maps/map-175.json': [
    '4a565318ff13d1dd2d843558a53c8d5980c6c6d751f590ee65f24805e52405eb',
    '6ab4559f7f64a55b7165a3e393b8a3668d5526485ea0223e242060575cc2ef45',
  ],
  'content/maps/map-176.json': [
    '37bea40f4900fe8795f4b01117754f62a654cffff2948aa165802137a0547c92',
    '3ce0231c242d6192da5839e4a842f972581a472f84b079a3e670e2a8f357331a',
  ],
  'content/maps/map-177.json': [
    '6e659c082994b05e2287822c4400a370f08eb04ac6680e199bd0c447b601cb78',
    '03b4253b7367e86e3567702bd0527967681df00e587980acc7e926bc0bd6bc7e',
  ],
  'content/maps/map-178.json': [
    'a5464c5a64bc0205002bacdc2b48ea86f4af49499b05b3145d67eeab5350b5b6',
    'e2e1132092484319f9b3f66208371d02c86d6cfe957fbda55c13b88bdf7016a2',
  ],
  'content/maps/map-179.json': [
    'eb15047dce6774f5b63a808d276e16fb18468ad10c175f6d4963632554c1c82b',
    'ca222e3edf98bd1789ef85de861c91bb7250f58f3a0071975683f2f8136f87fd',
  ],
  'content/maps/map-180.json': [
    '5364aa1b31c4a0d4df6478c95d016ad109a933a7254dadaa49ac00ea4a46392d',
    '26ccfa965d1a6e7353116e08265494142f6ab3c57a3c5e1e86a843927fffc2c3',
  ],
  'content/maps/map-181.json': [
    'be74efe1140d657eb70e36b85e837ee811451a8518757b345d3b36d7e1b405c8',
    '9e5dc0bf3d75cd5bd5c46303148ae830f61388c080ef2180a4b655b2bea6b38b',
  ],
  'content/maps/map-182.json': [
    '1a0f431368643d39bb941b0de83e3aa64d89e042ed83f07d6170dc9e071d5a8e',
    'ed3306d207523be9a8583d7c6716e1bfedb857083de02a89549e22a4d949420a',
  ],
  'content/maps/map-183.json': [
    'a6a954acd5de474a810321687c4358c3685099a4ad1d889edf655d97ffcd5eb2',
    '480140cb6145aed02d99edf82f2b4bef15697d69f2c22de2a4eab2066a284fba',
  ],
  'content/maps/map-184.json': [
    'fc88ca72d8740cd4660ae1b7ee344e07907c70bb0310a05028149d30d80b8f6f',
    '019e9d805b9c9de1ffa686e81cb0d9913caa03ceb1b49f4a6e6e4d236d472be3',
  ],
  'content/maps/map-185.json': [
    'e16f70f0667179b233d4e4f6d6b173381b4b856c421d255a9f393e420d485558',
    '04626b817ff3e12cef10f4aa506124621199dd552c3ffe69612c137a0f34c629',
  ],
  'content/maps/map-186.json': [
    '191985c2281a217df26572f49fbbb603e832dcef22b8c3b1c421fff84d75a94e',
    '7e0b654837d36945b21dd0fa892c3acbb0368047f87745b4ab5bb17d5ea93440',
  ],
  'content/maps/map-187.json': [
    'c8388667b945db887cb59f8eeeade67e4873dbe7698fcff26623b12b85ebc5f3',
    '67fed9e0af71aec7e4818e990e82a6a911461e38a69b0ff2bb1c37e3967c8481',
  ],
  'content/maps/map-188.json': [
    '7f1760bcb6876b3866f4101bdab2fddc7484f472553649f054eb641abac1cfec',
    '7515795e28fd67cc36d47ecbbbda354a4a150ce4cd837f5b7c76cdbfabf43832',
  ],
  'content/maps/map-189.json': [
    'd7141974830c41a3b50c9aa3089dd5b74a8f6d323098d1b48d57f47ca9191756',
    'e683a6f065d41a4d3d0a5a10a3428eba5c1fd9411d83bfe12794d17139d9e251',
  ],
  'content/maps/map-190.json': [
    'cd03568127a027249b998f23c2492032d442f6d8939292b73daffd477039279c',
    '8ecc1736e8d76b04a3cd9a9c0376caa50425ce09040a2a97a330f22a54e03c1e',
  ],
  'content/maps/map-191.json': [
    '1ef0a70c28bb4323594d4a2a300379afe9c452b33cda38e89414b50392efabdd',
    'e745d840b422fd75d30f6d922f8ed984607bc5a9e2c85f19bd62cd4e1c525583',
  ],
  'content/maps/map-192.json': [
    'ee08752a24808c8c13e93d6eebb13c99488322e1e460d731fcaff32299465cc1',
    'e65c2bf31823e7fa8f717c2a9bd40524df248733079e9689c3e4ba8ceb35a406',
  ],
  'content/maps/map-193.json': [
    'ae95e9e5d5aa532a32c9fb65bcad8ed97d10e201ecb7d130c3be3cc5892c22a1',
    'da6dc77cbe5e2c53ce2ffe81528245043336b0de4c1b19f13b8128672dc2d644',
  ],
  'content/maps/map-194.json': [
    '4c1e85c1ca503af689d470d47c11feb570a5b3919a86f386262aebf6726e981e',
    '248ed60e495228b6ba9237ff769468ad1eb3736ff20ceb8fb3a013e84bfb2eb8',
  ],
  'content/maps/map-195.json': [
    'c409b991a416519a2ffca69ad7cd43e4fd77d2f324d66fd66eaa3ce107fea5e4',
    'cdd2786d6f5217fa9f592189c4af43d3290c78491e88de7c9ff6b2b47b2e76bd',
  ],
  'content/maps/map-196.json': [
    '84765912a63177c81ab7ada3e16666df8929bcaeef161f8c6b3407e4166d54d7',
    '7fce4ae373e3904a66d017e5811f11b3e2d9c7e6fa3151b119eaf766047b9f10',
  ],
  'content/maps/map-197.json': [
    '81f0e3767bac0414a664c1fc106802b5aa02bcf2e9323ba6488e190e7301f3fe',
    '10a0cd940c3e277b7120baf6e14a6fa7153ea6cc38ef65449a4e19a3a3079bb0',
  ],
  'content/maps/map-198.json': [
    'ab2d2f3b259a5d43fea0af17555533bc6cb342b08a2049f734f7e666e869aab4',
    '0fccf0507fd72bfbe943a6eaf3fdf28ca9c09d28a9a582965277aab5cbb86126',
  ],
  'content/maps/map-199.json': [
    '6427a0c9369c91378d4a0a220064a38015affad73d7832ed09dfedf3d9dfcee1',
    'e47869ac91bffa6abfe26fd84863eaf421c47aa94ff82a110b5ef5b6d1a50f80',
  ],
  'content/maps/map-200.json': [
    '7ff37d853276df9300d700150b7a08c460c1455327252c3d23d15a08329ed799',
    'aa22ba38ebecee40a427ea77ad5c57105519043579dc5c46aa0a838040a110ca',
  ],
  'content/maps/map-201.json': [
    'a5f062cc943b5eb4694d4d7483ee0f7650bed1c1c951a9b8fc58216c6c5e02c7',
    '2e1ddf44dae8cedf985aff7c4f5f0896e91da7e530a4a2f37a404008477dc355',
  ],
  'content/maps/map-202.json': [
    'b14bfbb7be825cffc48252228095c23e502dd9051b7535ba6878bb93599a7fbc',
    '19856e0ded82e2ff8972a470e1a3c6e0a41cec1da1579646af512f9dde33bd42',
  ],
  'content/maps/map-203.json': [
    'ab01f4684c1c8618237c0f752ddce11449cd26c638658f27e48218725b11d838',
    'cf4361caa09940e3f4178467306ddfe25a82a8e56b3b12db070fa4d1fd29cde2',
  ],
  'content/maps/map-204.json': [
    '791487e869fa41de5a68fdba60e464202bb184525f036f98612deee20c64a23a',
    'dff229f795ce18046d1e121914a7e73d0b141b09f297fdc5a62d1ea7e5e3168e',
  ],
  'content/maps/map-205.json': [
    'b3579cbae88397ade163a38349f37b7243b390f9547f1fe617db21491d2d3119',
    '0c4a2eb67bf1b0c49cbda02939ceaa5d90968b04759617fcb7be5053d26cdefb',
  ],
  'content/maps/map-206.json': [
    '3d03dbbe0b0ec47664668eac3bb384b59490fa7d0542fea5536ab19777e8406e',
    'fa74a6a9695c3c931647082298b7009438fd63970222759d30d50b564c9bef1c',
  ],
  'content/maps/map-207.json': [
    '003369e5e323555ebad3ba596945526f54c99657d254a4e44b525d8a6c95250f',
    '7db85bd913074e16a65fcad1a8f74d969e453e6e1d592dc3cece5198a3cd79fc',
  ],
  'content/maps/map-208.json': [
    '64d04f02331cab1bb0ca87717a2a8cf72b4168febe36370b7509f96327e16d0a',
    '89f37f10dc27777bf980a69ac2fd2a4d6420ac32fbd3fa384fcd652b624ffa0c',
  ],
  'content/maps/map-209.json': [
    '6cec8a422b36d476202bca07ce67a36ebd1915a7a9d45e795a68f80534b73fda',
    'f64914bd1376b97c9a885d093730aae18e033122f1199fb75122775f737d3aa6',
  ],
  'content/maps/map-210.json': [
    '28bcea6cee2dc7cd29bfc3cdaca78968918dbba2da6b0b9a6e45dcb66c016b16',
    'aa9a3f889a5ac2cfe838c8ba915ce5de2cc2adebb1fd8b2150fa43c0e53ccd1f',
  ],
  'content/maps/map-211.json': [
    'c923cc5230738709ac28682528b0326aa8c890703eb8add095bb64975a82eafd',
    '863277a06ef4efc613f23c1d6e680895d1f50783d92fb599ce3d0b4dd72de8fe',
  ],
  'content/maps/map-212.json': [
    '4b57c42061c08fb16db88c4e416d77fc72658e7e2132314f4e31374ad9139448',
    '2471dd78dcac335c7ea53867df0a58700c399c72d5454fb62cec958090459fb7',
  ],
  'content/maps/map-213.json': [
    '044bf428d70c9f6c437f9d3f1ba09752814cd35f3d796970f76199a79b45609c',
    'a3fd229b3b96a838eeac156aa23b095b4ad9d2ae448e5858a3694795bf1372f5',
  ],
  'content/maps/map-214.json': [
    '160ef249e206abbf39a006a03d992acde6382e46115fa69985dd69fb54550633',
    '90ba4ccd8d4dcf581cfc532661a06a2e253f2eeef9b2d338bb55480271242cba',
  ],
  'content/maps/map-215.json': [
    '91d098bd84fcdc8997b28628dd1be4af3d2d7eecd598e1cdb8588e8fb171d455',
    '596e563f167a8e2afb907fb079a4824f47abaadb1d4df4e8798a6614a1300433',
  ],
  'content/maps/map-216.json': [
    '6945315d05b334d735f6ba76609ba8a390d885e574ad5208b3ad524c3d21cfa9',
    'd47215d388618dce5932f43aa4da191dbd6f7b70fa3d135d6d97f4e40e73151e',
  ],
  'content/maps/map-217.json': [
    '57592ad44456d3b288dfcf8e097f45d891648fef55818bb501ff94a98b3deb19',
    '4bd1efe2c8d1df5aca2dc9f3d4ebfb5dc692c335876e4803ad64b54b159e945d',
  ],
  'content/maps/map-218.json': [
    '676a3e69df3042e8da6adfb9b11c2982a3c224207efa85cfa1e7eb6dbe88baa3',
    '8efafbb59b2a6203c78c536b22222c0867fd1466c66d00d85c2db3211e1dd305',
  ],
  'content/maps/map-219.json': [
    '6a3d6de3194812f9fe2b04e7495e7157d523f328fc0f8a60862ad8dd4aac8a5a',
    'e7f7350443b1d09b6d1c7a197de7c4206b261722e38c24e279edcde6fdfd3088',
  ],
  'content/maps/map-220.json': [
    'd4648c9b76376e382b550e93cc0f5a8a8c52525d6b4528961596dc0e24d26c22',
    '4019a36df2ed4748dca3e20a2b9a5c73f37e6888cee7cc61fb42e1fb151a536e',
  ],
  'content/maps/map-221.json': [
    'ffc3beef42163703d4465fcdb0bde1170f46bbc6b0ce1186303afee2b2590bbc',
    'ba2ac3f3fa4e8ea9c674e23a1625f2e060c40e41051ff8904440a4cc102df84f',
  ],
  'content/maps/map-222.json': [
    '2eaaeecbb666afabced6de563b94e77a7814a74fe6e40da58f3eb897728ea51c',
    '58e0f5a0b4f142ad73da04cefbbe72a87e136e584550668107177a6ec41d8531',
  ],
  'content/maps/map-223.json': [
    'c3b2738bf5ae3523276caef10cf47bd7536106339fb1bcf874131acc694a0508',
    '1af4866b30c183722e495cb9c1ca799ea0d54d9657cb8788c36c4c167223ccc8',
  ],
  'content/maps/map-224.json': [
    '97fbea4b7371861ded91407611f0fceca268e86e318c17e7d8719fe4143e693a',
    'f109cce0f5e4868d8cccf4c52b4932f72af442811b2a9099095b1b5068aeb709',
  ],
  'content/maps/map-225.json': [
    '17eae3a0dc0706db61500dae850f7b51b0dd692039546ddfad34b76773d96155',
    '011bc17de31854473f3dfe9eec10c64e58a3b4efafec4b362dd044d3125ff623',
  ],
} as const satisfies Record<string, readonly [currentV4: string, publishedPreV4: string]>

export const PUBLISHED_PRE_V4_MAP_HASH_COUNT = Object.keys(PUBLISHED_PRE_V4_MAP_HASHES).length

const PUBLISHED_PRE_V4_MAP_BODY_SURFACE_DIGEST =
  'b53484ff0f7218fc2af4a5fe2a2ca1c7be2d30a23719917964b0332e7f9ca06d' as const

function zeroMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array<number>(cols).fill(0))
}

/**
 * Validation-only reconstruction of one published pre-v4 map body from its exact current v4
 * canonical counterpart. Old product types/loaders stay deleted; this shape exists solely so a
 * live current source producer can still prove the already-published historical transition seal.
 */
export function projectCurrentMapBodyToPublishedPreV4Surface(
  path: string,
  value: MigrationJson,
): MigrationJson {
  const pair = PUBLISHED_PRE_V4_MAP_HASHES[path as keyof typeof PUBLISHED_PRE_V4_MAP_HASHES]
  if (!pair) throw new Error(`historical map body surface: 非发布 atomic map ${path}`)
  if (sha256(serializeMigrationJson(value, path)) !== pair[0])
    throw new Error(`historical map body surface: current canonical hash 漂移 ${path}`)

  const map = validateProjectMap(value)
  if (map.tilesetRefs.length !== 1 || map.layers.length !== 2 || map.authoring)
    throw new Error(`historical map body surface: current source map 形状漂移 ${path}`)
  const rows = map.height * 2
  return {
    version: 2,
    width: map.width,
    height: map.height,
    tilesetId: map.tilesetRefs[0]!,
    layers: map.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      depthMode: 'height',
      tiles: layer.tiles,
      heights: layer.heights ?? zeroMatrix(rows, map.width),
    })),
    collision: map.collision,
  }
}

/** Exact-body companion used only by historical source-proof fixtures. */
export function projectCurrentMapBodiesToPublishedPreV4Surface<T extends MigrationSnapshot>(
  source: T,
): T {
  const paths = [...source.managedFiles].filter(isAtomicProjectMapPath).sort()
  const authorityPaths = Object.keys(PUBLISHED_PRE_V4_MAP_HASHES).sort()
  if (
    paths.length !== authorityPaths.length ||
    paths.some((path, index) => path !== authorityPaths[index])
  )
    throw new Error('historical map body surface: atomic map 清单漂移')

  const files = new Map(source.files)
  const hashes = source.hashes ? new Map(source.hashes) : undefined
  const surface: Array<{ path: string; value: MigrationJson }> = []
  for (const path of authorityPaths) {
    const value = files.get(path)
    if (value === undefined) throw new Error(`historical map body surface: map 正文缺失 ${path}`)
    const projected = projectCurrentMapBodyToPublishedPreV4Surface(path, value)
    files.set(path, projected)
    surface.push({ path, value: projected })
    if (hashes) {
      const pair = PUBLISHED_PRE_V4_MAP_HASHES[path as keyof typeof PUBLISHED_PRE_V4_MAP_HASHES]
      if (hashes.get(path) !== pair[0])
        throw new Error(`historical map body surface: recorded current hash 漂移 ${path}`)
      hashes.set(path, pair[1])
    }
  }
  if (sha256(JSON.stringify(surface)) !== PUBLISHED_PRE_V4_MAP_BODY_SURFACE_DIGEST)
    throw new Error('historical map body surface: published body surface 漂移')
  return { ...source, files, ...(hashes ? { hashes } : {}) }
}

export function projectCurrentMapHashesToPublishedPreV4Surface(
  source: MigrationSnapshot,
): MigrationSnapshot {
  // Authored project snapshots intentionally keep current map bodies. Historical transition
  // surface authority only exists on published baseline snapshots.
  if (!source.baselineMetadata) return source
  if (!source.hashes) throw new Error('historical map surface: baseline hashes 缺失')

  const paths = [...source.managedFiles].filter(isAtomicProjectMapPath).sort()
  const authorityPaths = Object.keys(PUBLISHED_PRE_V4_MAP_HASHES).sort()
  if (
    paths.length !== authorityPaths.length ||
    paths.some((path, index) => path !== authorityPaths[index])
  )
    throw new Error('historical map surface: atomic map 清单漂移')

  const hashes = new Map(source.hashes)
  for (const path of authorityPaths) {
    if (source.files.has(path))
      throw new Error(`historical map surface: baseline atomic map 不得携正文 ${path}`)
    const pair = PUBLISHED_PRE_V4_MAP_HASHES[path as keyof typeof PUBLISHED_PRE_V4_MAP_HASHES]
    const actual = hashes.get(path)
    if (actual !== pair[0])
      throw new Error(`historical map surface: current canonical hash 漂移 ${path}`)
    hashes.set(path, pair[1])
  }
  return { ...source, hashes }
}
