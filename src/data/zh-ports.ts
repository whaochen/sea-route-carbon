/**
 * 常用海港繁體中文名稱與別名對照表（UN/LOCODE -> 繁體中文資訊）
 * 用於強化 searoute-ts 內建 ~1,600 個海港之雙向中英文搜尋體驗。
 */
export interface ZhPortMeta {
  zhName: string;
  zhCountry: string;
  aliases?: string[];
}

export const ZH_PORT_NAMES: Record<string, ZhPortMeta> = {
  // 台灣主要港口
  TWKHH: { zhName: '高雄港', zhCountry: '台灣', aliases: ['高雄', 'Kaohsiung'] },
  TWKEL: { zhName: '基隆港', zhCountry: '台灣', aliases: ['基隆', 'Keelung'] },
  TWTXG: { zhName: '台中港', zhCountry: '台灣', aliases: ['台中', '臺中', 'Taichung'] },
  TWTPE: { zhName: '台北港', zhCountry: '台灣', aliases: ['台北', '臺北', '八里', 'Taipei'] },
  TWHUN: { zhName: '花蓮港', zhCountry: '台灣', aliases: ['花蓮', 'Hualien'] },
  TWSUO: { zhName: '蘇澳港', zhCountry: '台灣', aliases: ['蘇澳', 'Suao'] },
  TWAPG: { zhName: '安平港', zhCountry: '台灣', aliases: ['安平', '台南', 'Anping'] },

  // 中國大陸與港澳
  CNSHA: { zhName: '上海港', zhCountry: '中國', aliases: ['上海', '洋山'] },
  CNNGB: { zhName: '寧波舟山港', zhCountry: '中國', aliases: ['寧波', '舟山'] },
  CNSZX: { zhName: '深圳港', zhCountry: '中國', aliases: ['深圳', '鹽田', '蛇口'] },
  CNYTN: { zhName: '鹽田港', zhCountry: '中國', aliases: ['鹽田', '深圳鹽田'] },
  CNSHK: { zhName: '蛇口港', zhCountry: '中國', aliases: ['蛇口', '深圳蛇口'] },
  CNQDG: { zhName: '青島港', zhCountry: '中國', aliases: ['青島'] },
  CNTAO: { zhName: '青島港', zhCountry: '中國', aliases: ['青島'] },
  CNCAN: { zhName: '廣州港', zhCountry: '中國', aliases: ['廣州', '南沙'] },
  CNTSN: { zhName: '天津港', zhCountry: '中國', aliases: ['天津', '新港'] },
  CNTXG: { zhName: '天津新港', zhCountry: '中國', aliases: ['天津'] },
  CNXMN: { zhName: '廈門港', zhCountry: '中國', aliases: ['廈門'] },
  CNDLC: { zhName: '大連港', zhCountry: '中國', aliases: ['大連'] },
  CNFOC: { zhName: '福州港', zhCountry: '中國', aliases: ['福州'] },
  HKHKG: { zhName: '香港', zhCountry: '香港', aliases: ['維多利亞港', '葵涌'] },

  // 東亞（日韓）
  JPTYO: { zhName: '東京港', zhCountry: '日本', aliases: ['東京'] },
  JPYOK: { zhName: '橫濱港', zhCountry: '日本', aliases: ['橫濱'] },
  JPOSA: { zhName: '大阪港', zhCountry: '日本', aliases: ['大阪'] },
  JPUKB: { zhName: '神戶港', zhCountry: '日本', aliases: ['神戶'] },
  JPNGO: { zhName: '名古屋港', zhCountry: '日本', aliases: ['名古屋'] },
  JPFUK: { zhName: '博多港（福岡）', zhCountry: '日本', aliases: ['福岡', '博多'] },
  KRPUS: { zhName: '釜山港', zhCountry: '南韓', aliases: ['釜山'] },
  KRINC: { zhName: '仁川港', zhCountry: '南韓', aliases: ['仁川'] },
  KRKAN: { zhName: '光陽港', zhCountry: '南韓', aliases: ['光陽'] },

  // 東南亞與南亞
  SGSIN: { zhName: '新加坡港', zhCountry: '新加坡', aliases: ['新加坡', '星國'] },
  MYPKG: { zhName: '巴生港', zhCountry: '馬來西亞', aliases: ['巴生', '吉隆坡', 'Port Klang'] },
  MYTPP: { zhName: '丹絨帕拉帕斯港', zhCountry: '馬來西亞', aliases: ['柔佛', 'PTP'] },
  THLCH: { zhName: '林查班港', zhCountry: '泰國', aliases: ['林查班', '曼谷'] },
  THBKK: { zhName: '曼谷港', zhCountry: '泰國', aliases: ['曼谷'] },
  VNSGN: { zhName: '胡志明市港（西貢）', zhCountry: '越南', aliases: ['胡志明', '西貢', '凱萊'] },
  VNHPH: { zhName: '海防港', zhCountry: '越南', aliases: ['海防', '河內'] },
  IDJKT: { zhName: '雅加達港（丹絨不碌）', zhCountry: '印尼', aliases: ['雅加達'] },
  IDSUB: { zhName: '泗水港', zhCountry: '印尼', aliases: ['泗水'] },
  PHMNL: { zhName: '馬尼拉港', zhCountry: '菲律賓', aliases: ['馬尼拉'] },
  LKCMB: { zhName: '可倫坡港', zhCountry: '斯里蘭卡', aliases: ['可倫坡'] },
  INNSA: { zhName: '那瓦舍瓦港（孟買新港）', zhCountry: '印度', aliases: ['孟買', 'JNPT'] },
  INMAA: { zhName: '清奈港', zhCountry: '印度', aliases: ['清奈'] },

  // 中東與非洲
  AEJEA: { zhName: '傑貝阿里港（杜拜）', zhCountry: '阿聯', aliases: ['杜拜', '迪拜', 'Jebel Ali'] },
  AEDXB: { zhName: '杜拜港', zhCountry: '阿聯', aliases: ['杜拜', '迪拜'] },
  SAJED: { zhName: '吉達港', zhCountry: '沙烏地阿拉伯', aliases: ['吉達'] },
  SADMM: { zhName: '達曼港', zhCountry: '沙烏地阿拉伯', aliases: ['達曼'] },
  EGPSD: { zhName: '塞得港', zhCountry: '埃及', aliases: ['塞得', '蘇伊士'] },
  EGSUZ: { zhName: '蘇伊士港', zhCountry: '埃及', aliases: ['蘇伊士'] },
  ZADUR: { zhName: '德班港', zhCountry: '南非', aliases: ['德班'] },
  ZACPT: { zhName: '開普敦港', zhCountry: '南非', aliases: ['開普敦', '好望角'] },
  MAPTM: { zhName: '丹吉爾地中海港', zhCountry: '摩洛哥', aliases: ['丹吉爾'] },

  // 歐洲
  NLRTM: { zhName: '鹿特丹港', zhCountry: '荷蘭', aliases: ['鹿特丹'] },
  NLAMS: { zhName: '阿姆斯特丹港', zhCountry: '荷蘭', aliases: ['阿姆斯特丹'] },
  DEHAM: { zhName: '漢堡港', zhCountry: '德國', aliases: ['漢堡'] },
  DEBRV: { zhName: '不來梅哈芬港', zhCountry: '德國', aliases: ['不來梅'] },
  BEANR: { zhName: '安特衛普港', zhCountry: '比利時', aliases: ['安特衛普'] },
  GBFXT: { zhName: '費利克斯托港', zhCountry: '英國', aliases: ['費利克斯托', '倫敦'] },
  GBSOU: { zhName: '南安普敦港', zhCountry: '英國', aliases: ['南安普敦'] },
  GBLGP: { zhName: '倫敦門戶港', zhCountry: '英國', aliases: ['倫敦'] },
  FRLEH: { zhName: '利哈佛港', zhCountry: '法國', aliases: ['利哈佛', '勒阿弗爾'] },
  FRMRS: { zhName: '馬賽港', zhCountry: '法國', aliases: ['馬賽'] },
  ESBCN: { zhName: '巴塞隆納港', zhCountry: '西班牙', aliases: ['巴塞隆納'] },
  ESALG: { zhName: '阿爾赫西拉斯港', zhCountry: '西班牙', aliases: ['阿爾赫西拉斯'] },
  ESVLC: { zhName: '瓦倫西亞港', zhCountry: '西班牙', aliases: ['瓦倫西亞'] },
  ITGOA: { zhName: '熱那亞港', zhCountry: '義大利', aliases: ['熱那亞'] },
  GRPIR: { zhName: '比雷埃夫斯港', zhCountry: '希臘', aliases: ['雅典', '比雷埃夫斯'] },
  TRIST: { zhName: '伊斯坦堡港', zhCountry: '土耳其', aliases: ['伊斯坦堡'] },
  SEGOT: { zhName: '哥德堡港', zhCountry: '瑞典', aliases: ['哥德堡'] },

  // 美洲
  USLAX: { zhName: '洛杉磯港', zhCountry: '美國', aliases: ['洛杉磯', 'LA'] },
  USLGB: { zhName: '長灘港', zhCountry: '美國', aliases: ['長灘', '長堤'] },
  USOAK: { zhName: '奧克蘭港', zhCountry: '美國', aliases: ['奧克蘭', '舊金山'] },
  USSEA: { zhName: '西雅圖港', zhCountry: '美國', aliases: ['西雅圖'] },
  USTIW: { zhName: '塔科馬港', zhCountry: '美國', aliases: ['塔科馬'] },
  USNYC: { zhName: '紐約／紐澤西港', zhCountry: '美國', aliases: ['紐約', '紐澤西'] },
  USSAV: { zhName: '薩凡納港', zhCountry: '美國', aliases: ['薩凡納'] },
  USHOU: { zhName: '休士頓港', zhCountry: '美國', aliases: ['休士頓', '休斯頓'] },
  USMIA: { zhName: '邁阿密港', zhCountry: '美國', aliases: ['邁阿密'] },
  CAVAN: { zhName: '溫哥華港', zhCountry: '加拿大', aliases: ['溫哥華'] },
  CAMTR: { zhName: '蒙特婁港', zhCountry: '加拿大', aliases: ['蒙特婁'] },
  MXZLO: { zhName: '曼薩尼約港', zhCountry: '墨西哥', aliases: ['曼薩尼約'] },
  PABLB: { zhName: '巴爾博亞港（巴拿馬）', zhCountry: '巴拿馬', aliases: ['巴拿馬'] },
  BRSSZ: { zhName: '桑托斯港', zhCountry: '巴西', aliases: ['桑托斯', '聖保羅'] },
  ARBUE: { zhName: '布宜諾斯艾利斯港', zhCountry: '阿根廷', aliases: ['布宜諾斯艾利斯'] },
  CLSAI: { zhName: '聖安東尼奧港', zhCountry: '智利', aliases: ['聖安東尼奧'] },

  // 大洋洲
  AUSYD: { zhName: '雪梨港', zhCountry: '澳洲', aliases: ['雪梨', '悉尼'] },
  AUMEL: { zhName: '墨爾本港', zhCountry: '澳洲', aliases: ['墨爾本'] },
  AUBNE: { zhName: '布里斯本港', zhCountry: '澳洲', aliases: ['布里斯本'] },
  NZAKL: { zhName: '奧克蘭港（紐西蘭）', zhCountry: '紐西蘭', aliases: ['奧克蘭'] },
};

/** 常用水道名稱繁體中文對照 */
export const PASSAGE_LABELS: Record<string, string> = {
  suez: '蘇伊士運河',
  babelmandeb: '曼德海峽',
  babalmandab: '曼德海峽',
  panama: '巴拿馬運河',
  malacca: '麻六甲海峽',
  gibraltar: '直布羅陀海峽',
  bosporus: '博斯普魯斯海峽',
  ormuz: '荷莫茲海峽',
  sunda: '巽他海峽',
  dover: '多佛海峽',
  kiel: '基爾運河',
  corinth: '科林斯運河',
  bering: '白令海峽',
  magellan: '麥哲倫海峽',
  cape_horn: '合恩角',
  northwest: '西北航道',
  northeast: '東北航道',
};
