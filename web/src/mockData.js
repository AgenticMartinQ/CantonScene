const demoImageUrl = "/assets/hong-kong-camera-bg.png";

export const dailyDemoScenes = [
  {
    id: "wet-market-evening",
    focus: "Street Cantonese",
    mediaUrl: demoImageUrl,
    englishSummary: "A wet market street with fruit stalls, buses, and glowing shop lights after rain.",
    cantoneseSummary: "雨後嘅街市好熱鬧，有生果檔、巴士同埋光猛嘅舖頭燈。",
    jyutpingSummary: "jyu5 hau6 ge3 gaai1 si5 hou2 jit6 naau6, jau5 sang1 gwo2 dong3, baa1 si2 tung4 maai4 gwong1 maang5 ge3 pou3 tau2 dang1.",
    objects: [
      {
        id: "fruit",
        english: "Fruit",
        cantonese: "生果",
        jyutping: "sang1 gwo2",
        x: 48,
        y: 62,
        description: "A fruit display at a busy street stall.",
      },
      {
        id: "awning",
        english: "Shop awning",
        cantonese: "簷篷",
        jyutping: "jim4 pung4",
        x: 44,
        y: 30,
        description: "A striped awning above the shopfront.",
      },
      {
        id: "bus",
        english: "Bus",
        cantonese: "巴士",
        jyutping: "baa1 si2",
        x: 10,
        y: 42,
        description: "A bus moving along the wet street.",
      },
    ],
  },
  {
    id: "rainy-street-lights",
    focus: "Rainy Streets",
    mediaUrl: demoImageUrl,
    englishSummary: "A rainy Hong Kong street with reflections on the road and warm lights from small shops.",
    cantoneseSummary: "條香港街落完雨，地下反晒光，細舖啲燈好暖。",
    jyutpingSummary: "tiu4 hoeng1 gong2 gaai1 lok6 jyun4 jyu5, dei6 haa6 faan2 saai3 gwong1, sai3 pou3 di1 dang1 hou2 nyun5.",
    objects: [
      {
        id: "wet-road",
        english: "Wet road",
        cantonese: "濕地",
        jyutping: "sap1 dei6",
        x: 38,
        y: 76,
        description: "The road is wet and reflecting the street lights.",
      },
      {
        id: "street-lights",
        english: "Street lights",
        cantonese: "街燈",
        jyutping: "gaai1 dang1",
        x: 46,
        y: 36,
        description: "Warm lights hanging outside the market stalls.",
      },
      {
        id: "double-decker",
        english: "Double-decker bus",
        cantonese: "雙層巴士",
        jyutping: "soeng1 cang4 baa1 si2",
        x: 6,
        y: 48,
        description: "A double-decker bus passing through the street.",
      },
    ],
  },
  {
    id: "neighbourhood-shopfront",
    focus: "Neighbourhood Shops",
    mediaUrl: demoImageUrl,
    englishSummary: "A local shopfront on a narrow street, with hanging goods and fruit boxes near the entrance.",
    cantoneseSummary: "窄窄哋嘅街邊有間街坊舖，門口擺住生果箱同掛住啲貨。",
    jyutpingSummary: "zaak3 zaak3 dei2 ge3 gaai1 bin1 jau5 gaan1 gaai1 fong1 pou3, mun4 hau2 baai2 zyu6 sang1 gwo2 soeng1 tung4 gwaa3 zyu6 di1 fo3.",
    objects: [
      {
        id: "shopfront",
        english: "Shopfront",
        cantonese: "舖頭門口",
        jyutping: "pou3 tau2 mun4 hau2",
        x: 48,
        y: 44,
        description: "The entrance of a small local shop.",
      },
      {
        id: "hanging-goods",
        english: "Hanging goods",
        cantonese: "掛住嘅貨",
        jyutping: "gwaa3 zyu6 ge3 fo3",
        x: 46,
        y: 52,
        description: "Goods hanging near the shop entrance.",
      },
      {
        id: "fruit-boxes",
        english: "Fruit boxes",
        cantonese: "生果箱",
        jyutping: "sang1 gwo2 soeng1",
        x: 48,
        y: 66,
        description: "Boxes of fruit stacked near the shop.",
      },
    ],
  },
  {
    id: "city-bus-stop",
    focus: "Transport Words",
    mediaUrl: demoImageUrl,
    englishSummary: "A city street where buses pass by beside market stalls and tall residential buildings.",
    cantoneseSummary: "城市街道有巴士經過，旁邊係街市檔同高高嘅住宅大廈。",
    jyutpingSummary: "sing4 si5 gaai1 dou6 jau5 baa1 si2 ging1 gwo3, pong4 bin1 hai6 gaai1 si5 dong3 tung4 gou1 gou1 ge3 zyu6 zaak6 daai6 haa6.",
    objects: [
      {
        id: "bus-lane",
        english: "Bus lane",
        cantonese: "巴士線",
        jyutping: "baa1 si2 sin3",
        x: 14,
        y: 58,
        description: "The lane where buses pass through.",
      },
      {
        id: "tall-buildings",
        english: "Tall buildings",
        cantonese: "高樓",
        jyutping: "gou1 lau2",
        x: 38,
        y: 16,
        description: "Tall residential buildings in the background.",
      },
      {
        id: "market-stall",
        english: "Market stall",
        cantonese: "街市檔",
        jyutping: "gaai1 si5 dong3",
        x: 48,
        y: 56,
        description: "A market stall selling goods by the road.",
      },
    ],
  },
];

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getDailyDemoScene(date = new Date()) {
  const key = dateKey(date);
  const scene = dailyDemoScenes[hashString(key) % dailyDemoScenes.length];
  return {
    ...scene,
    id: `daily-demo-${key}-${scene.id}`,
    type: "photo",
    fileName: `${scene.id}.jpg`,
    createdAt: `${key}T00:00:00+08:00`,
    objects: scene.objects.map((object) => ({ ...object })),
    attempts: [],
    isDemo: true,
  };
}

export const mockObjects = getDailyDemoScene().objects;
