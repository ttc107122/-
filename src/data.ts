import { Contact, Group, ChatMessage, MomentPost, UserProfile, APIConfig } from "./types";

// Standard preset avatars (cute minimalist SVG data URLs for out-of-the-box gorgeousness)
export const AVATAR_ME = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23fcd34d"/><circle cx="50" cy="40" r="22" fill="%231f1f1f"/><path d="M20,85 C20,65 30,55 50,55 C70,55 80,65 80,85" fill="%231f1f1f"/></svg>`;

export const AVATAR_KANADE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23f472b6"/><circle cx="50" cy="40" r="22" fill="%23ffffff"/><path d="M20,85 C20,65 30,55 50,55 C70,55 80,65 80,85" fill="%23ffffff"/><circle cx="40" cy="38" r="3" fill="%231f1f1f"/><circle cx="60" cy="38" r="3" fill="%231f1f1f"/><path d="M45,46 Q50,50 55,46" stroke="%231f1f1f" stroke-width="2" fill="none"/></svg>`;

export const AVATAR_REN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%2360a5fa"/><circle cx="50" cy="40" r="22" fill="%23111827"/><path d="M20,85 C20,65 30,55 50,55 C70,55 80,65 80,85" fill="%23111827"/><circle cx="40" cy="38" r="3" fill="%2360a5fa"/><circle cx="60" cy="38" r="3" fill="%2360a5fa"/><path d="M42,45 H58" stroke="%2360a5fa" stroke-width="2" fill="none"/></svg>`;

export const AVATAR_HINA = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%2334d399"/><circle cx="50" cy="40" r="22" fill="%23ffffff"/><path d="M20,85 C20,65 30,55 50,55 C70,55 80,65 80,85" fill="%23ffffff"/><circle cx="38" cy="38" r="3.5" fill="%23047857"/><circle cx="62" cy="38" r="3.5" fill="%23047857"/><path d="M43,45 Q50,52 57,45" stroke="%23047857" stroke-width="2.5" fill="none"/></svg>`;

export const DEFAULT_USER: UserProfile = {
  name: "星野 つむぎ",
  avatar: AVATAR_ME,
  signature: "風と共に、想いを遠くへ。🍀",
  persona: "你是一個溫和、偶爾帶點感性、對生活充滿熱情的大學生，喜歡拍照、喝咖啡。聊天時語氣和藹、重視與朋友的牽絆，常用『〜ね』和『〜よ』結尾。",
  state: "🌸 桜舞う季節"
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: "kanade",
    name: "櫻井 奏 (Kanade)",
    signature: "ピアノの音色にのせて、想いが届きますように。🎹",
    persona: "櫻井奏（Kanade）是你的青梅竹馬。她是一位溫婉、文靜、心思細膩的鋼琴演奏系學生。她對你非常溫柔，說話語氣輕聲細語，充滿關心。聊天時總會先為你著想，偶爾會有些害羞。不擅長應對科技，但很喜歡寫信和談鋼琴曲。",
    avatar: AVATAR_KANADE,
    avatarShape: "rounded",
    postFrequency: "medium",
    isPinned: true
  },
  {
    id: "ren",
    name: "白石 蓮 (Ren)",
    signature: "System.out.println(\"Hello, Beautiful World.\"); 💻",
    persona: "白石蓮（Ren）是你的極客學長。他是一位冷酷、理智、說話精準而富有哲理的AI工程師與密碼學愛好者。表面上看起來高冷、不易親近，但其實很關心朋友，對有深度、科學或未來科技的話題非常狂熱。他的聊天語氣偏向簡潔、略帶冷幽默，喜歡使用代碼隱喻或邏輯術語。",
    avatar: AVATAR_REN,
    avatarShape: "circle",
    postFrequency: "low",
    isPinned: false
  },
  {
    id: "hina",
    name: "藤原 陽菜 (Hina)",
    signature: "美味しいものは、世界を救う！🍰✨",
    persona: "藤原陽菜（Hina）是你的同班死黨。她是一個精力充沛、樂觀開朗、嗜甜如命的超級吃貨。熱愛咖啡廳、精緻甜點、貓咪和潮流美工設計。她的聊天語氣極其興奮、活潑，常用驚嘆號、貓咪顏文字（如 (ฅ^･ω･^ฅ)）和波浪號。不管什麼時候，她都能帶給人滿滿的元氣！",
    avatar: AVATAR_HINA,
    avatarShape: "rounded",
    postFrequency: "high",
    isPinned: false
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    chatId: "kanade",
    senderId: "kanade",
    senderName: "櫻井 奏 (Kanade)",
    senderAvatar: AVATAR_KANADE,
    content: "つむぎ、最近忙しい？もし時間があったら、今度の週末にピアノの発表会の曲を聴いてほしいな…と思って。",
    timestamp: "10:15",
    type: "text"
  },
  {
    id: "m2",
    chatId: "kanade",
    senderId: "me",
    senderName: "星野 つむぎ",
    senderAvatar: AVATAR_ME,
    content: "もちろん！奏のピアノ、喜んで聴きに行くよ。週末楽しみにしてるね！",
    timestamp: "10:18",
    type: "text"
  },
  {
    id: "m3",
    chatId: "kanade",
    senderId: "kanade",
    senderName: "櫻井 奏 (Kanade)",
    senderAvatar: AVATAR_KANADE,
    content: "ありがとう！本当に嬉しい。つむぎが来てくれるなら、もっと練習頑張れる気がする。楽しみにしてるね。🌸",
    timestamp: "10:20",
    type: "text"
  },
  {
    id: "m4",
    chatId: "ren",
    senderId: "ren",
    senderName: "白石 蓮 (Ren)",
    senderAvatar: AVATAR_REN,
    content: "つむぎ。頼まれていたニューラルネットワークのパラメータ調整、最適化が完了した。検証用のコードを送るから、暇な時に実行してみてくれ。",
    timestamp: "昨日",
    type: "text"
  }
];

export const INITIAL_POSTS: MomentPost[] = [
  {
    id: "p1",
    authorId: "hina",
    authorName: "藤原 陽菜 (Hina)",
    authorAvatar: AVATAR_HINA,
    authorAvatarShape: "rounded",
    content: "春の新作イチゴパフェ、実食してきたよ〜！🍓🍨 甘酸っぱくてサクサクのパイ生地が最高すぎて、一瞬で溶けちゃった…！お腹も心も幸せで満たされてます！次はつむぎも絶対誘う！(ฅ^･ω･^ฅ)✨",
    timestamp: "2時間前",
    likes: ["櫻井 奏 (Kanade)", "星野 つむぎ"],
    comments: [
      {
        id: "c1",
        authorName: "櫻井 奏 (Kanade)",
        text: "すごく美味しそうだね、陽菜ちゃん。私も今度連れて行ってほしいな…🌸",
        timestamp: "1.5時間前"
      },
      {
        id: "c2",
        authorName: "藤原 陽菜 (Hina)",
        text: "@櫻井 奏 (Kanade) もちろん！奏ちゃんも一緒に行こう！美味しいピアノのご褒美にしよ！🎹💕",
        timestamp: "1時間前"
      }
    ]
  },
  {
    id: "p2",
    authorId: "ren",
    authorName: "白石 蓮 (Ren)",
    authorAvatar: AVATAR_REN,
    authorAvatarShape: "circle",
    content: "深夜3時の静寂の中でコンパイルを通す。バグが消え、コンソールに無菌のログが流れる瞬間、世界と調和した感覚になる。やはり深夜のコード記述は至高のデバッグ環境だな。☕💻🌌",
    timestamp: "昨日",
    likes: ["星野 つむぎ"],
    comments: [
      {
        id: "c3",
        authorName: "星野 つむぎ",
        text: "蓮学長、夜更かしは体に気をつけてくださいね！でも、その静かな時間の集中力はとても分かります。",
        timestamp: "昨日"
      },
      {
        id: "c4",
        authorName: "白石 蓮 (Ren)",
        text: "@星野 つむぎ 忠告感謝する。しかし、睡眠よりも最適化されたアルゴリズムの方が私の脳内ホルモンを活性化させるようだ。まあ、最低限の睡眠は確保する。",
        timestamp: "昨日"
      }
    ]
  }
];

export const DEFAULT_API_CONFIG: APIConfig = {
  url: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile",
  apiKey: ""
};
