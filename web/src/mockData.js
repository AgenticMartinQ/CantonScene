const monthlyDemoPack = "2026-06";

const blockedDemoSlugs = new Set([]);

const cardPositions = [
  { x: 8, y: 46 },
  { x: 44, y: 32 },
  { x: 46, y: 58 },
];

const focusCantoneseBySlug = {
  "wet-market-fruit-stall": "街市",
  "mtr-platform": "港鐵月台",
  "central-tram": "電車街",
  "cha-chaan-teng-table": "茶餐廳",
  "star-ferry-pier": "天星小輪",
  "public-housing-courtyard": "屋邨",
  "convenience-store-umbrellas": "落雨天",
  "temple-street-night-market": "夜市",
  "victoria-harbour-promenade": "海港景",
  "green-minibus-stop": "小巴站",
  "mid-levels-escalator": "扶手電梯",
  "basketball-court-estate": "運動場",
  "seafood-restaurant-tanks": "海鮮",
  "flower-market-stalls": "花墟",
  "wet-market-vegetables": "菜檔",
  "rainy-taxi-stand": "的士站",
  "hiking-trail-city-view": "行山",
  "beach-barbecue-evening": "沙灘燒烤",
  "school-crossing": "返學",
  "ifc-lunch-footbridge": "午飯人潮",
  "dai-pai-dong": "大牌檔",
  "mtr-exit": "港鐵出口",
  "park-tai-chi": "晨運公園",
  "ferry-interior": "搭船",
  "supermarket-produce": "超級市場",
  "apartment-mailboxes": "住宅大堂",
  "airport-express-platform": "機場快綫",
  "soccer-pitch-high-rises": "足球場",
  "temple-courtyard-incense": "廟宇",
  "harbourfront-cycling-path": "單車徑",
};

function demoAudioUrl(sceneSlug, fileName) {
  return `/assets/audio/demo-scenes/${monthlyDemoPack}/${sceneSlug}/${fileName}.mp3`;
}

const sceneSeeds = [
  {
    slug: "wet-market-fruit-stall",
    focus: "Wet Market",
    file: "01-wet-market-fruit-stall.jpg",
    englishSummary: "A colourful wet market fruit stall with bright lamps and stacked produce.",
    cantoneseSummary: "呢個街市生果檔好繽紛，燈光好光，生果一箱箱咁擺好。",
    jyutpingSummary: "ni1 go3 gaai1 si5 sang1 gwo2 dong3 hou2 ban1 fan1, dang1 gwong1 hou2 gwong1, sang1 gwo2 jat1 soeng1 soeng1 gam2 baai2 hou2.",
    cards: [
      ["Fruit stall", "生果檔", "sang1 gwo2 dong3", "A stall selling different kinds of fruit."],
      ["Hanging lamps", "吊燈", "diu3 dang1", "Bright lamps hanging above the stall."],
      ["Fruit boxes", "生果箱", "sang1 gwo2 soeng1", "Boxes of fruit stacked for sale."],
    ],
  },
  {
    slug: "mtr-platform",
    focus: "MTR Platform",
    file: "02-mtr-platform.jpg",
    englishSummary: "Commuters wait on an MTR platform beside a train with open doors.",
    cantoneseSummary: "一班乘客喺港鐵月台等車，列車門口已經開咗。",
    jyutpingSummary: "jat1 baan1 sing4 haak3 hai2 gong2 tit3 jyut6 toi4 dang2 ce1, lit6 ce1 mun4 hau2 ji5 ging1 hoi1 zo2.",
    cards: [
      ["MTR train", "港鐵", "gong2 tit3", "A train stopped at the platform."],
      ["Platform", "月台", "jyut6 toi4", "The place where passengers wait for the train."],
      ["Commuters", "乘客", "sing4 haak3", "People travelling around the city."],
    ],
  },
  {
    slug: "central-tram",
    focus: "Tram Streets",
    file: "03-central-tram.jpg",
    englishSummary: "A tram passes through a dense Central street with buildings and traffic around it.",
    cantoneseSummary: "電車喺中環嘅街道經過，旁邊好多樓同車。",
    jyutpingSummary: "din6 ce1 hai2 zung1 waan4 ge3 gaai1 dou6 ging1 gwo3, pong4 bin1 hou2 do1 lau2 tung4 ce1.",
    cards: [
      ["Tram", "電車", "din6 ce1", "A classic tram on Hong Kong Island."],
      ["Street", "街道", "gaai1 dou6", "A busy city street."],
      ["Tracks", "路軌", "lou6 gwai2", "The rails that the tram runs on."],
    ],
  },
  {
    slug: "cha-chaan-teng-table",
    focus: "Cha Chaan Teng",
    file: "04-cha-chaan-teng-table-hq.png",
    englishSummary: "A cha chaan teng table with Hong Kong milk tea and a pineapple bun.",
    cantoneseSummary: "茶餐廳枱面有杯港式奶茶同一個菠蘿包。",
    jyutpingSummary: "caa4 caan1 teng1 toi2 min6 jau5 bui1 gong2 sik1 naai5 caa4 tung4 jat1 go3 bo1 lo4 baau1.",
    cards: [
      ["Milk tea", "奶茶", "naai5 caa4", "Hong Kong-style milk tea in a glass.", { x: 8, y: 42 }],
      ["Pineapple bun", "菠蘿包", "bo1 lo4 baau1", "A sweet bun often eaten with tea.", { x: 45, y: 61 }],
      ["Tabletop", "枱面", "toi2 min6", "The surface of a restaurant table.", { x: 28, y: 74 }],
      ["Tea glass", "玻璃杯", "bo1 lei4 bui1", "A tall glass holding the milk tea.", { x: 8, y: 57 }],
      ["Booth seat", "卡位", "kaa1 wai2", "A booth-style seat inside the restaurant.", { x: 46, y: 35 }],
    ],
  },
  {
    slug: "star-ferry-pier",
    focus: "Star Ferry",
    file: "05-star-ferry-pier.jpg",
    englishSummary: "A ferry pier scene with harbour water, skyline, and passengers nearby.",
    cantoneseSummary: "碼頭望到維港同天際線，附近有乘客等船。",
    jyutpingSummary: "maa5 tau4 mong6 dou2 wai4 gong2 tung4 tin1 zai3 sin3, fu6 gan6 jau5 sing4 haak3 dang2 syun4.",
    cards: [
      ["Ferry", "渡輪", "dou6 leon4", "A ferry crossing the harbour."],
      ["Pier", "碼頭", "maa5 tau4", "The place where people board a boat."],
      ["Harbour", "海港", "hoi2 gong2", "The water between Kowloon and Hong Kong Island."],
    ],
  },
  {
    slug: "public-housing-courtyard",
    focus: "Housing Estate",
    file: "06-public-housing-courtyard.jpg",
    englishSummary: "A public housing estate courtyard with laundry, walkways, and tower blocks.",
    cantoneseSummary: "屋邨平台有晾緊嘅衫、行人通道同一座座大廈。",
    jyutpingSummary: "uk1 cyun1 ping4 toi4 jau5 long3 gan2 ge3 saam1, haang4 jan4 tung1 dou6 tung4 jat1 zo6 zo6 daai6 haa6.",
    cards: [
      ["Housing estate", "屋邨", "uk1 cyun1", "A public residential estate."],
      ["Laundry", "衫", "saam1", "Clothes hanging out to dry."],
      ["Courtyard", "平台", "ping4 toi4", "An open shared area between buildings."],
      ["Windows", "窗", "coeng1", "Windows on the residential tower.", { x: 70, y: 34 }],
      ["Air conditioner", "冷氣機", "laang5 hei3 gei1", "An air-conditioning unit outside a flat.", { x: 82, y: 44 }, { audioUrl: demoAudioUrl("public-housing-courtyard", "air-conditioner-v2") }],
      ["Trees", "樹", "syu6", "Trees planted around the courtyard.", { x: 18, y: 65 }],
      ["Covered walkway", "有蓋通道", "jau5 goi3 tung1 dou6", "A covered walkway below the estate blocks.", { x: 50, y: 78 }],
      ["Bench", "長櫈", "coeng4 dang3", "A bench in the shared outdoor area.", { x: 20, y: 88 }],
    ],
  },
  {
    slug: "convenience-store-umbrellas",
    focus: "Rainy Day",
    file: "07-convenience-store-umbrellas.jpg",
    englishSummary: "A convenience store entrance with umbrellas ready for a rainy Hong Kong day.",
    cantoneseSummary: "便利店門口放住雨遮，啱晒香港落雨天用。",
    jyutpingSummary: "bin6 lei6 dim3 mun4 hau2 fong3 zyu6 jyu5 ze1, ngaam1 saai3 hoeng1 gong2 lok6 jyu5 tin1 jung6.",
    cards: [
      ["Umbrella", "雨遮", "jyu5 ze1", "An umbrella for rainy weather."],
      ["Shop entrance", "舖頭門口", "pou3 tau2 mun4 hau2", "The entrance of a small shop."],
      ["Convenience store", "便利店", "bin6 lei6 dim3", "A shop for quick daily purchases."],
    ],
  },
  {
    slug: "temple-street-night-market",
    focus: "Night Market",
    file: "08-temple-street-night-market.jpg",
    englishSummary: "A busy Temple Street night market with stalls, lights, and people walking through.",
    cantoneseSummary: "廟街夜市好多人，兩邊都有攤檔同燈光。",
    jyutpingSummary: "miu6 gaai1 je6 si5 hou2 do1 jan4, loeng5 bin1 dou1 jau5 taan1 dong3 tung4 dang1 gwong1.",
    cards: [
      ["Night market", "夜市", "je6 si5", "An outdoor market open at night."],
      ["Stall", "攤檔", "taan1 dong3", "A small selling booth."],
      ["Crowd", "人群", "jan4 kwan4", "Many people walking together."],
    ],
  },
  {
    slug: "victoria-harbour-promenade",
    focus: "Harbour View",
    file: "09-victoria-harbour-promenade.jpg",
    englishSummary: "A harbour promenade with the skyline and open water in the background.",
    cantoneseSummary: "海濱長廊望到維港同對岸嘅天際線。",
    jyutpingSummary: "hoi2 ban1 coeng4 long4 mong6 dou2 wai4 gong2 tung4 deoi3 ngon6 ge3 tin1 zai3 sin3.",
    cards: [
      ["Promenade", "海濱長廊", "hoi2 ban1 coeng4 long4", "A walkway beside the harbour."],
      ["Skyline", "天際線", "tin1 zai3 sin3", "The shape of tall buildings against the sky."],
      ["Railings", "欄杆", "laan4 gon1", "A barrier beside the walkway."],
    ],
  },
  {
    slug: "green-minibus-stop",
    focus: "Minibus Stop",
    file: "10-green-minibus-stop.jpg",
    englishSummary: "A green minibus stop where people queue to get around the neighbourhood.",
    cantoneseSummary: "小巴站有人排隊等車，準備去附近嘅地方。",
    jyutpingSummary: "siu2 baa1 zaam6 jau5 jan4 paai4 deoi2 dang2 ce1, zeon2 bei6 heoi3 fu6 gan6 ge3 dei6 fong1.",
    cards: [
      ["Minibus", "小巴", "siu2 baa1", "A small public bus in Hong Kong."],
      ["Bus stop", "車站", "ce1 zaam6", "A place to wait for transport."],
      ["Queue", "排隊", "paai4 deoi2", "People standing in line."],
    ],
  },
  {
    slug: "mid-levels-escalator",
    focus: "Escalator",
    file: "11-mid-levels-escalator.jpg",
    englishSummary: "People ride the Mid-Levels escalator through a steep urban neighbourhood.",
    cantoneseSummary: "有人搭半山扶手電梯，穿過斜斜哋嘅市區街道。",
    jyutpingSummary: "jau5 jan4 daap3 bun3 saan1 fu4 sau2 din6 tai1, cyun1 gwo3 ce3 ce3 dei2 ge3 si5 keoi1 gaai1 dou6.",
    cards: [
      ["Escalator", "扶手電梯", "fu4 sau2 din6 tai1", "A moving staircase."],
      ["Walkway", "行人通道", "haang4 jan4 tung1 dou6", "A path for pedestrians."],
      ["Hillside street", "斜路", "ce3 lou6", "A street going uphill or downhill."],
    ],
  },
  {
    slug: "basketball-court-estate",
    focus: "Sports Court",
    file: "12-basketball-court-estate.jpg",
    englishSummary: "A basketball court sits below tall residential blocks in a housing estate.",
    cantoneseSummary: "屋邨入面有個籃球場，旁邊係高高嘅住宅大廈。",
    jyutpingSummary: "uk1 cyun1 jap6 min6 jau5 go3 laam4 kau4 coeng4, pong4 bin1 hai6 gou1 gou1 ge3 zyu6 zaak6 daai6 haa6.",
    cards: [
      ["Court", "球場", "kau4 coeng4", "A place for playing sports."],
      ["Hoop", "籃框", "laam4 hong1", "The basket used in basketball."],
      ["Tower blocks", "大廈", "daai6 haa6", "Tall residential buildings."],
    ],
  },
  {
    slug: "seafood-restaurant-tanks",
    focus: "Seafood",
    file: "13-seafood-restaurant-tanks.jpg",
    englishSummary: "A seafood restaurant display with tanks and fresh seafood by the entrance.",
    cantoneseSummary: "海鮮酒家門口有魚缸，入面放住新鮮海鮮。",
    jyutpingSummary: "hoi2 sin1 zau2 gaa1 mun4 hau2 jau5 jyu4 gong1, jap6 min6 fong3 zyu6 san1 sin1 hoi2 sin1.",
    cards: [
      ["Fish tank", "魚缸", "jyu4 gong1", "A tank holding live seafood."],
      ["Seafood", "海鮮", "hoi2 sin1", "Fresh seafood for cooking."],
      ["Restaurant", "酒家", "zau2 gaa1", "A Chinese restaurant."],
    ],
  },
  {
    slug: "flower-market-stalls",
    focus: "Flower Market",
    file: "14-flower-market-stalls.jpg",
    englishSummary: "A flower market street with colourful bouquets and buckets of fresh flowers.",
    cantoneseSummary: "花墟有好多鮮花，一束束花插喺水桶入面。",
    jyutpingSummary: "faa1 heoi1 jau5 hou2 do1 sin1 faa1, jat1 cuk1 cuk1 faa1 caap3 hai2 seoi2 tung2 jap6 min6.",
    cards: [
      ["Flowers", "鮮花", "sin1 faa1", "Fresh flowers for sale."],
      ["Flower stall", "花檔", "faa1 dong3", "A stall selling flowers."],
      ["Bucket", "水桶", "seoi2 tung2", "A bucket holding flowers in water."],
    ],
  },
  {
    slug: "wet-market-vegetables",
    focus: "Vegetables",
    file: "15-wet-market-vegetables.jpg",
    englishSummary: "A wet market vegetable stall with leafy greens arranged for shoppers.",
    cantoneseSummary: "街市菜檔擺滿青菜，等人買餸。",
    jyutpingSummary: "gaai1 si5 coi3 dong3 baai2 mun5 ceng1 coi3, dang2 jan4 maai5 sung3.",
    cards: [
      ["Vegetables", "菜", "coi3", "Fresh vegetables for cooking."],
      ["Vendor", "檔主", "dong3 zyu2", "The person running the stall."],
      ["Scale", "磅", "bong6", "A scale for weighing food."],
    ],
  },
  {
    slug: "rainy-taxi-stand",
    focus: "Taxi Stand",
    file: "16-rainy-taxi-stand.jpg",
    englishSummary: "A rainy taxi stand with wet roads and city lights reflected on the ground.",
    cantoneseSummary: "落雨嘅的士站，地下濕晒，街燈反晒光。",
    jyutpingSummary: "lok6 jyu5 ge3 dik1 si2 zaam6, dei6 haa6 sap1 saai3, gaai1 dang1 faan2 saai3 gwong1.",
    cards: [
      ["Taxi", "的士", "dik1 si2", "A taxi for getting around the city."],
      ["Wet road", "濕地", "sap1 dei6", "The road is wet after rain."],
      ["Street lights", "街燈", "gaai1 dang1", "Lights along the street."],
    ],
  },
  {
    slug: "hiking-trail-city-view",
    focus: "Hiking",
    file: "17-hiking-trail-city-view.jpg",
    englishSummary: "A hiking trail overlooking Hong Kong's dense city and harbour landscape.",
    cantoneseSummary: "行山徑望落去見到香港市區同海港景色。",
    jyutpingSummary: "haang4 saan1 ging3 mong6 lok6 heoi3 gin3 dou2 hoeng1 gong2 si5 keoi1 tung4 hoi2 gong2 ging2 sik1.",
    cards: [
      ["Hiking trail", "山徑", "saan1 ging3", "A path for hiking."],
      ["City view", "城市景", "sing4 si5 ging2", "A view of the city from above."],
      ["Railing", "欄杆", "laan4 gon1", "A safety barrier beside the path."],
    ],
  },
  {
    slug: "beach-barbecue-evening",
    focus: "Beach BBQ",
    file: "18-beach-barbecue-evening.jpg",
    englishSummary: "An evening beach barbecue area with tables, grills, and warm sunset light.",
    cantoneseSummary: "黃昏嘅沙灘燒烤場，有枱、爐同暖暖嘅夕陽光。",
    jyutpingSummary: "wong4 fan1 ge3 saa1 taan1 siu1 haau1 coeng4, jau5 toi2, lou4 tung4 nyun5 nyun5 ge3 zik6 joeng4 gwong1.",
    cards: [
      ["Barbecue", "燒烤", "siu1 haau1", "Cooking food on a grill."],
      ["Beach", "沙灘", "saa1 taan1", "A sandy area beside the sea."],
      ["Sunset", "黃昏", "wong4 fan1", "The time when the sun is going down."],
    ],
  },
  {
    slug: "school-crossing",
    focus: "School Run",
    file: "19-school-crossing.jpg",
    englishSummary: "Parents and children cross the road near school during the morning rush.",
    cantoneseSummary: "朝早返學時間，家長同小朋友喺學校附近過馬路。",
    jyutpingSummary: "ziu1 zou2 faan1 hok6 si4 gaan3, gaa1 zoeng2 tung4 siu2 pang4 jau5 hai2 hok6 haau6 fu6 gan6 gwo3 maa5 lou6.",
    cards: [
      ["Crossing", "斑馬線", "baan1 maa5 sin3", "A marked place to cross the road."],
      ["School bag", "書包", "syu1 baau1", "A bag used by students."],
      ["Parent", "家長", "gaa1 zoeng2", "An adult taking care of a child."],
    ],
  },
  {
    slug: "ifc-lunch-footbridge",
    focus: "Lunch Crowd",
    file: "20-ifc-lunch-footbridge.jpg",
    englishSummary: "Office workers walk across a Central footbridge during lunch hour.",
    cantoneseSummary: "中環午飯時間，好多返工人士行過天橋。",
    jyutpingSummary: "zung1 waan4 ng5 faan6 si4 gaan3, hou2 do1 faan1 gung1 jan4 si6 haang4 gwo3 tin1 kiu4.",
    cards: [
      ["Footbridge", "天橋", "tin1 kiu4", "A walkway above the road."],
      ["Lunch crowd", "午飯人潮", "ng5 faan6 jan4 ciu4", "Many people going out for lunch."],
      ["Office tower", "商廈", "soeng1 haa6", "A tall building with offices."],
    ],
  },
  {
    slug: "dai-pai-dong",
    focus: "Dai Pai Dong",
    file: "21-dai-pai-dong.jpg",
    englishSummary: "An outdoor cooked-food stall with small tables, stools, and diners at night.",
    cantoneseSummary: "夜晚嘅大牌檔有露天枱、膠櫈同食緊飯嘅人。",
    jyutpingSummary: "je6 maan5 ge3 daai6 paai4 dong3 jau5 lou6 tin1 toi2, gaau1 dang3 tung4 sik6 gan2 faan6 ge3 jan4.",
    cards: [
      ["Food stall", "熟食檔", "suk6 sik6 dong3", "A stall serving cooked food."],
      ["Plastic stool", "膠櫈", "gaau1 dang3", "A small plastic seat."],
      ["Outdoor table", "露天枱", "lou6 tin1 toi2", "A table placed outside."],
    ],
  },
  {
    slug: "mtr-exit",
    focus: "MTR Exit",
    file: "22-mtr-exit.jpg",
    englishSummary: "An MTR exit area with signs, stairs, and passengers entering and leaving.",
    cantoneseSummary: "港鐵出口附近有指示牌、樓梯同出入嘅乘客。",
    jyutpingSummary: "gong2 tit3 ceot1 hau2 fu6 gan6 jau5 zi2 si6 paai4, lau4 tai1 tung4 ceot1 jap6 ge3 sing4 haak3.",
    cards: [
      ["Exit", "出口", "ceot1 hau2", "The way out of a station."],
      ["Sign", "指示牌", "zi2 si6 paai4", "A sign that gives directions."],
      ["Passengers", "乘客", "sing4 haak3", "People using public transport."],
    ],
  },
  {
    slug: "park-tai-chi",
    focus: "Morning Park",
    file: "23-park-tai-chi.jpg",
    englishSummary: "People practise tai chi in a quiet Hong Kong park in the morning.",
    cantoneseSummary: "朝早有人喺公園入面打太極，環境幾清靜。",
    jyutpingSummary: "ziu1 zou2 jau5 jan4 hai2 gung1 jyun2 jap6 min6 daa2 taai3 gik6, waan4 ging2 gei2 cing1 zing6.",
    cards: [
      ["Tai chi", "太極", "taai3 gik6", "A slow traditional exercise."],
      ["Park", "公園", "gung1 jyun2", "A public green space."],
      ["Trees", "樹", "syu6", "Trees giving shade in the park."],
    ],
  },
  {
    slug: "ferry-interior",
    focus: "Ferry Ride",
    file: "24-ferry-interior.jpg",
    englishSummary: "The inside of a ferry with seats, windows, and harbour views outside.",
    cantoneseSummary: "船艙入面有座位同窗，窗外望到海港。",
    jyutpingSummary: "syun4 cong1 jap6 min6 jau5 zo6 wai2 tung4 coeng1, coeng1 ngoi6 mong6 dou2 hoi2 gong2.",
    cards: [
      ["Seat", "座位", "zo6 wai2", "A place to sit on the ferry."],
      ["Window", "窗", "coeng1", "A window looking out to the harbour."],
      ["Ferry ride", "搭船", "daap3 syun4", "Travelling by ferry."],
    ],
  },
  {
    slug: "supermarket-produce",
    focus: "Supermarket",
    file: "25-supermarket-produce.jpg",
    englishSummary: "A supermarket produce aisle with fresh fruit and vegetables arranged neatly.",
    cantoneseSummary: "超級市場蔬果區擺滿水果同菜，排得好整齊。",
    jyutpingSummary: "ciu1 kap1 si5 coeng4 so1 gwo2 keoi1 baai2 mun5 seoi2 gwo2 tung4 coi3, paai4 dak1 hou2 zing2 cai4.",
    cards: [
      ["Produce", "蔬果", "so1 gwo2", "Fruit and vegetables in a supermarket."],
      ["Aisle", "通道", "tung1 dou6", "A walkway between shelves."],
      ["Basket", "籃", "laam4", "A basket for carrying groceries."],
    ],
  },
  {
    slug: "apartment-mailboxes",
    focus: "Apartment Lobby",
    file: "26-apartment-mailboxes.jpg",
    englishSummary: "An apartment building entrance with mailboxes and a security gate.",
    cantoneseSummary: "住宅大堂有信箱同閘，住戶由呢度出入。",
    jyutpingSummary: "zyu6 zaak6 daai6 tong4 jau5 seon3 soeng1 tung4 zaap6, zyu6 wu6 jau4 ni1 dou6 ceot1 jap6.",
    cards: [
      ["Mailbox", "信箱", "seon3 soeng1", "A box for receiving letters."],
      ["Lobby", "大堂", "daai6 tong4", "The entrance area of a building."],
      ["Security gate", "閘", "zaap6", "A gate at the building entrance."],
    ],
  },
  {
    slug: "airport-express-platform",
    focus: "Airport Express",
    file: "27-airport-express-platform.jpg",
    englishSummary: "Travellers with suitcases wait on an Airport Express platform.",
    cantoneseSummary: "旅客拖住行李喼喺機場快綫月台等車。",
    jyutpingSummary: "leoi5 haak3 to1 zyu6 hang4 lei5 gep1 hai2 gei1 coeng4 faai3 sin3 jyut6 toi4 dang2 ce1.",
    cards: [
      ["Suitcase", "行李喼", "hang4 lei5 gep1", "A suitcase used for travel."],
      ["Platform", "月台", "jyut6 toi4", "Where passengers wait for the train."],
      ["Airport train", "機場快綫", "gei1 coeng4 faai3 sin3", "A train going to the airport."],
    ],
  },
  {
    slug: "soccer-pitch-high-rises",
    focus: "Football Pitch",
    file: "28-soccer-pitch-high-rises.jpg",
    englishSummary: "A football pitch sits beside high-rise buildings in the city.",
    cantoneseSummary: "市區入面有個足球場，旁邊係一座座高樓。",
    jyutpingSummary: "si5 keoi1 jap6 min6 jau5 go3 zuk1 kau4 coeng4, pong4 bin1 hai6 jat1 zo6 zo6 gou1 lau2.",
    cards: [
      ["Football pitch", "足球場", "zuk1 kau4 coeng4", "A field for playing football."],
      ["Goal", "龍門", "lung4 mun4", "The goal used in football."],
      ["High-rises", "高樓", "gou1 lau2", "Tall buildings around the pitch."],
    ],
  },
  {
    slug: "temple-courtyard-incense",
    focus: "Temple Visit",
    file: "29-temple-courtyard-incense.jpg",
    englishSummary: "A temple courtyard with incense, lanterns, and visitors moving quietly.",
    cantoneseSummary: "廟宇庭院有香同燈籠，大家靜靜哋行入去。",
    jyutpingSummary: "miu6 jyu5 ting4 jyun2 jau5 hoeng1 tung4 dang1 lung4, daai6 gaa1 zing6 zing6 dei2 haang4 jap6 heoi3.",
    cards: [
      ["Incense", "香", "hoeng1", "Incense burning at a temple."],
      ["Lanterns", "燈籠", "dang1 lung4", "Lanterns hanging in the temple."],
      ["Courtyard", "庭院", "ting4 jyun2", "An open space inside the temple."],
    ],
  },
  {
    slug: "harbourfront-cycling-path",
    focus: "Cycling Path",
    file: "30-harbourfront-cycling-path.jpg",
    englishSummary: "A harbourfront cycling path with bicycles, water views, and open sky.",
    cantoneseSummary: "海邊單車徑有單車、海景同開揚天空。",
    jyutpingSummary: "hoi2 bin1 daan1 ce1 ging3 jau5 daan1 ce1, hoi2 ging2 tung4 hoi1 joeng4 tin1 hung1.",
    cards: [
      ["Cycling path", "單車徑", "daan1 ce1 ging3", "A path for riding bicycles."],
      ["Bicycle", "單車", "daan1 ce1", "A bicycle for riding."],
      ["Harbour", "海港", "hoi2 gong2", "Water along the harbourfront."],
    ],
  },
];

function dateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function dateKey(date = new Date()) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function sceneIndexForDate(date = new Date()) {
  const day = Number(dateParts(date).day || 1);
  return (day - 1) % dailyDemoScenes.length;
}

function cardFromSeed(seed, index, sceneSlug) {
  const [english, cantonese, jyutping, description, customPositionOrFields, customFields] = seed;
  const customPosition = customPositionOrFields?.x != null && customPositionOrFields?.y != null ? customPositionOrFields : null;
  const extraFields = customFields || (customPosition ? null : customPositionOrFields);
  const id = english.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    id,
    english,
    cantonese,
    jyutping,
    description,
    ...(customPosition || cardPositions[index % cardPositions.length]),
    audioUrl: demoAudioUrl(sceneSlug, id),
    ...(extraFields || {}),
  };
}

export const dailyDemoScenes = sceneSeeds.map((scene, sceneIndex) => ({
  ...scene,
  id: `${monthlyDemoPack}-${scene.slug}`,
  qaBlocked: blockedDemoSlugs.has(scene.slug),
  focusCantonese: focusCantoneseBySlug[scene.slug] || "",
  focusAudioUrl: demoAudioUrl(scene.slug, "focus"),
  mediaUrl: `/assets/demo-scenes/monthly/${scene.file}`,
  objects: scene.cards.map((card, index) => cardFromSeed(card, index, scene.slug)),
  dayOfMonth: sceneIndex + 1,
}));

export const activeDailyDemoScenes = dailyDemoScenes.filter((scene) => !scene.qaBlocked);

function sceneForIndex(index, seen = new Map()) {
  if (seen.has(index)) return seen.get(index);
  const scene = dailyDemoScenes[index];
  if (!scene?.qaBlocked) {
    seen.set(index, scene);
    return scene;
  }
  if (!activeDailyDemoScenes.length) return scene;
  const recentWindowStart = Math.max(0, index - 6);
  const recentSceneIds = new Set();
  for (let previousIndex = recentWindowStart; previousIndex < index; previousIndex += 1) {
    const previousScene = sceneForIndex(previousIndex, seen);
    if (previousScene?.id) recentSceneIds.add(previousScene.id);
  }
  let candidates = activeDailyDemoScenes.filter((activeScene) => !recentSceneIds.has(activeScene.id));
  if (!candidates.length && activeDailyDemoScenes.length > 1) {
    const previousScene = sceneForIndex(index - 1, seen);
    candidates = activeDailyDemoScenes.filter((activeScene) => activeScene.id !== previousScene?.id);
  }
  const fallbackPool = candidates.length ? candidates : activeDailyDemoScenes;
  const fallback = fallbackPool[index % fallbackPool.length];
  seen.set(index, fallback);
  return fallback;
}

export function getDailyDemoScene(date = new Date()) {
  const key = dateKey(date);
  const startIndex = sceneIndexForDate(date);
  const scene = sceneForIndex(startIndex);
  return {
    ...scene,
    id: `daily-demo-${key}-${scene.slug}`,
    type: "photo",
    fileName: scene.file,
    createdAt: `${key}T00:00:00+08:00`,
    objects: scene.objects.map((object) => ({ ...object })),
    attempts: [],
    isDemo: true,
  };
}

export const mockObjects = getDailyDemoScene().objects;
