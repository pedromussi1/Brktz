/**
 * Seeds the database with the 12 default quizzes.
 * Run once: node server/seed.js
 * Safe to re-run — skips if quizzes already exist.
 */
const db = require('./db');

const SEED_QUIZZES = [
  {
    id: 'seed-1', title: 'K-Pop Idol Quiz', creator: 'kpopmaster99',
    type: 'image', category: 'kpop', thumbnail: 'https://picsum.photos/seed/kpop1/480/270',
    plays: 48200, items: [
      { name: 'BTS – Jimin', image: 'https://picsum.photos/seed/bts_jimin/400/400' },
      { name: 'BLACKPINK – Jennie', image: 'https://picsum.photos/seed/bp_jennie/400/400' },
      { name: 'EXO – Baekhyun', image: 'https://picsum.photos/seed/exo_baek/400/400' },
      { name: 'TWICE – Nayeon', image: 'https://picsum.photos/seed/twice_nay/400/400' },
      { name: "GOT7 – BamBam", image: 'https://picsum.photos/seed/got7_bam/400/400' },
      { name: 'ITZY – Ryujin', image: 'https://picsum.photos/seed/itzy_ryu/400/400' },
      { name: 'Stray Kids – Felix', image: 'https://picsum.photos/seed/skz_felix/400/400' },
      { name: 'aespa – Karina', image: 'https://picsum.photos/seed/aespa_kar/400/400' },
      { name: 'NCT – Taeyong', image: 'https://picsum.photos/seed/nct_taey/400/400' },
      { name: 'Red Velvet – Irene', image: 'https://picsum.photos/seed/rv_irene/400/400' },
      { name: 'SHINee – Taemin', image: 'https://picsum.photos/seed/shin_taem/400/400' },
      { name: 'MAMAMOO – Hwasa', image: 'https://picsum.photos/seed/mama_hwas/400/400' },
      { name: 'TXT – Yeonjun', image: 'https://picsum.photos/seed/txt_yeon/400/400' },
      { name: 'ENHYPEN – Jay', image: 'https://picsum.photos/seed/enh_jay/400/400' },
      { name: 'NewJeans – Hanni', image: 'https://picsum.photos/seed/nj_hanni/400/400' },
      { name: 'LE SSERAFIM – Kazuha', image: 'https://picsum.photos/seed/ls_kaz/400/400' },
    ]
  },
  {
    id: 'seed-2', title: 'Anime Character Quiz', creator: 'otaku_lord',
    type: 'image', category: 'anime', thumbnail: 'https://picsum.photos/seed/anime_wc/480/270',
    plays: 91500, items: [
      { name: 'Naruto Uzumaki', image: 'https://picsum.photos/seed/naruto/400/400' },
      { name: 'Monkey D. Luffy', image: 'https://picsum.photos/seed/luffy/400/400' },
      { name: 'Levi Ackerman', image: 'https://picsum.photos/seed/levi/400/400' },
      { name: 'Goku', image: 'https://picsum.photos/seed/goku_db/400/400' },
      { name: 'Itachi Uchiha', image: 'https://picsum.photos/seed/itachi/400/400' },
      { name: 'Rem (Re:Zero)', image: 'https://picsum.photos/seed/rem_rz/400/400' },
      { name: 'Mikasa Ackerman', image: 'https://picsum.photos/seed/mikasa/400/400' },
      { name: 'Gojo Satoru', image: 'https://picsum.photos/seed/gojo/400/400' },
      { name: 'Zoro Roronoa', image: 'https://picsum.photos/seed/zoro/400/400' },
      { name: 'Nezuko Kamado', image: 'https://picsum.photos/seed/nezuko/400/400' },
      { name: 'Killua Zoldyck', image: 'https://picsum.photos/seed/killua/400/400' },
      { name: 'Zero Two', image: 'https://picsum.photos/seed/zero2/400/400' },
      { name: 'Edward Elric', image: 'https://picsum.photos/seed/edward/400/400' },
      { name: 'Vegeta', image: 'https://picsum.photos/seed/vegeta/400/400' },
      { name: 'Hinata Hyuga', image: 'https://picsum.photos/seed/hinata/400/400' },
      { name: 'Tanjiro Kamado', image: 'https://picsum.photos/seed/tanjiro/400/400' },
    ]
  },
  {
    id: 'seed-3', title: 'Best Food Quiz', creator: 'foodie_culture',
    type: 'image', category: 'food', thumbnail: 'https://picsum.photos/seed/food_wc/480/270',
    plays: 38700, items: [
      { name: 'Ramen', image: 'https://picsum.photos/seed/ramen/400/400' },
      { name: 'Pizza', image: 'https://picsum.photos/seed/pizza/400/400' },
      { name: 'Sushi', image: 'https://picsum.photos/seed/sushi/400/400' },
      { name: 'Tacos', image: 'https://picsum.photos/seed/tacos/400/400' },
      { name: 'Burger', image: 'https://picsum.photos/seed/burger/400/400' },
      { name: 'Fried Chicken', image: 'https://picsum.photos/seed/friedchicken/400/400' },
      { name: 'Bibimbap', image: 'https://picsum.photos/seed/bibimbap/400/400' },
      { name: 'Pad Thai', image: 'https://picsum.photos/seed/padthai/400/400' },
    ]
  },
  {
    id: 'seed-4', title: 'League of Legends Champion Quiz', creator: 'lolpro_euw',
    type: 'image', category: 'gaming', thumbnail: 'https://picsum.photos/seed/lol_wc/480/270',
    plays: 67300, items: [
      { name: 'Jinx', image: 'https://picsum.photos/seed/jinx/400/400' },
      { name: 'Lux', image: 'https://picsum.photos/seed/lux/400/400' },
      { name: 'Thresh', image: 'https://picsum.photos/seed/thresh/400/400' },
      { name: 'Yasuo', image: 'https://picsum.photos/seed/yasuo/400/400' },
      { name: 'Ahri', image: 'https://picsum.photos/seed/ahri/400/400' },
      { name: 'Zed', image: 'https://picsum.photos/seed/zed/400/400' },
      { name: 'Teemo', image: 'https://picsum.photos/seed/teemo/400/400' },
      { name: "Kai'Sa", image: 'https://picsum.photos/seed/kaisa/400/400' },
      { name: 'Ezreal', image: 'https://picsum.photos/seed/ezreal/400/400' },
      { name: 'Katarina', image: 'https://picsum.photos/seed/katarina/400/400' },
      { name: 'Akali', image: 'https://picsum.photos/seed/akali/400/400' },
      { name: 'Lee Sin', image: 'https://picsum.photos/seed/leesin/400/400' },
      { name: 'Evelynn', image: 'https://picsum.photos/seed/evelynn/400/400' },
      { name: 'Jhin', image: 'https://picsum.photos/seed/jhin/400/400' },
      { name: 'Sett', image: 'https://picsum.photos/seed/sett/400/400' },
      { name: 'Seraphine', image: 'https://picsum.photos/seed/seraphine/400/400' },
    ]
  },
  {
    id: 'seed-5', title: 'Best Pokemon Quiz', creator: 'pokefanatic',
    type: 'image', category: 'gaming', thumbnail: 'https://picsum.photos/seed/poke_wc/480/270',
    plays: 134000, items: [
      { name: 'Charizard', image: 'https://picsum.photos/seed/charizard/400/400' },
      { name: 'Pikachu', image: 'https://picsum.photos/seed/pikachu/400/400' },
      { name: 'Mewtwo', image: 'https://picsum.photos/seed/mewtwo/400/400' },
      { name: 'Eevee', image: 'https://picsum.photos/seed/eevee/400/400' },
      { name: 'Gengar', image: 'https://picsum.photos/seed/gengar/400/400' },
      { name: 'Lucario', image: 'https://picsum.photos/seed/lucario/400/400' },
      { name: 'Gardevoir', image: 'https://picsum.photos/seed/gardevoir/400/400' },
      { name: 'Umbreon', image: 'https://picsum.photos/seed/umbreon/400/400' },
      { name: 'Greninja', image: 'https://picsum.photos/seed/greninja/400/400' },
      { name: 'Arcanine', image: 'https://picsum.photos/seed/arcanine/400/400' },
      { name: 'Rayquaza', image: 'https://picsum.photos/seed/rayquaza/400/400' },
      { name: 'Sylveon', image: 'https://picsum.photos/seed/sylveon/400/400' },
      { name: 'Garchomp', image: 'https://picsum.photos/seed/garchomp/400/400' },
      { name: 'Dragonite', image: 'https://picsum.photos/seed/dragonite/400/400' },
      { name: 'Typhlosion', image: 'https://picsum.photos/seed/typhlosion/400/400' },
      { name: 'Absol', image: 'https://picsum.photos/seed/absol/400/400' },
    ]
  },
  {
    id: 'seed-6', title: 'Best Movie Quiz', creator: 'cinephile_x',
    type: 'image', category: 'entertainment', thumbnail: 'https://picsum.photos/seed/movie_wc/480/270',
    plays: 74200, items: [
      { name: 'The Dark Knight', image: 'https://picsum.photos/seed/darknight/400/400' },
      { name: 'Inception', image: 'https://picsum.photos/seed/inception/400/400' },
      { name: 'Parasite', image: 'https://picsum.photos/seed/parasite/400/400' },
      { name: 'Interstellar', image: 'https://picsum.photos/seed/interstellar/400/400' },
      { name: 'Your Name', image: 'https://picsum.photos/seed/yourname/400/400' },
      { name: 'Spider-Man: NWH', image: 'https://picsum.photos/seed/spiderman/400/400' },
      { name: 'Spirited Away', image: 'https://picsum.photos/seed/spirited/400/400' },
      { name: 'Avengers: Endgame', image: 'https://picsum.photos/seed/endgame/400/400' },
    ]
  },
  {
    id: 'seed-7', title: 'Streamer Face-Off Quiz', creator: 'twitchtracker',
    type: 'image', category: 'entertainment', thumbnail: 'https://picsum.photos/seed/stream_wc/480/270',
    plays: 55600, items: [
      { name: 'xQc', image: 'https://picsum.photos/seed/xqc/400/400' },
      { name: 'Pokimane', image: 'https://picsum.photos/seed/pokimane/400/400' },
      { name: 'Shroud', image: 'https://picsum.photos/seed/shroud/400/400' },
      { name: 'Valkyrae', image: 'https://picsum.photos/seed/valkyrae/400/400' },
      { name: 'Ninja', image: 'https://picsum.photos/seed/ninja/400/400' },
      { name: 'HasanAbi', image: 'https://picsum.photos/seed/hasan/400/400' },
      { name: 'Ludwig', image: 'https://picsum.photos/seed/ludwig/400/400' },
      { name: 'Amouranth', image: 'https://picsum.photos/seed/amouranth/400/400' },
    ]
  },
  {
    id: 'seed-8', title: 'Best Anime Opening Song', creator: 'animefan_ace',
    type: 'text', category: 'anime', thumbnail: 'https://picsum.photos/seed/op_wc/480/270',
    plays: 61400, items: [
      { name: 'Gurenge – Demon Slayer', image: 'https://picsum.photos/seed/gurenge/400/400' },
      { name: 'Guren no Yumiya – AoT', image: 'https://picsum.photos/seed/guren/400/400' },
      { name: 'Unravel – Tokyo Ghoul', image: 'https://picsum.photos/seed/unravel/400/400' },
      { name: 'Silhouette – Naruto', image: 'https://picsum.photos/seed/silhouette/400/400' },
      { name: 'Blue Bird – Naruto', image: 'https://picsum.photos/seed/bluebird/400/400' },
      { name: 'Tank! – Cowboy Bebop', image: 'https://picsum.photos/seed/tank/400/400' },
      { name: "A Cruel Angel's Thesis", image: 'https://picsum.photos/seed/cruel/400/400' },
      { name: 'Again – FMA:B', image: 'https://picsum.photos/seed/again_fma/400/400' },
      { name: 'Cha-La Head-Cha-La – DBZ', image: 'https://picsum.photos/seed/chala/400/400' },
      { name: 'Colors – Code Geass', image: 'https://picsum.photos/seed/colors_cg/400/400' },
      { name: 'My Hero – BNHA', image: 'https://picsum.photos/seed/myhero/400/400' },
      { name: 'Odd Future – BNHA', image: 'https://picsum.photos/seed/oddfuture/400/400' },
      { name: 'Sign – Naruto Shippuden', image: 'https://picsum.photos/seed/signnrt/400/400' },
      { name: 'Crossing Field – SAO', image: 'https://picsum.photos/seed/crossfield/400/400' },
      { name: 'We Are! – One Piece', image: 'https://picsum.photos/seed/weare/400/400' },
      { name: 'KING – Guilty Crown', image: 'https://picsum.photos/seed/kinggc/400/400' },
    ]
  },
  {
    id: 'seed-9', title: 'Best Country Quiz', creator: 'geoquiz_world',
    type: 'image', category: 'other', thumbnail: 'https://picsum.photos/seed/country_wc/480/270',
    plays: 29400, items: [
      { name: 'Japan', image: 'https://picsum.photos/seed/japan/400/400' },
      { name: 'South Korea', image: 'https://picsum.photos/seed/skorea/400/400' },
      { name: 'Italy', image: 'https://picsum.photos/seed/italy/400/400' },
      { name: 'France', image: 'https://picsum.photos/seed/france/400/400' },
      { name: 'United States', image: 'https://picsum.photos/seed/usa/400/400' },
      { name: 'Brazil', image: 'https://picsum.photos/seed/brazil/400/400' },
      { name: 'Australia', image: 'https://picsum.photos/seed/australia/400/400' },
      { name: 'Canada', image: 'https://picsum.photos/seed/canada/400/400' },
    ]
  },
  {
    id: 'seed-10', title: 'Best TV Show Quiz', creator: 'tvshow_buff',
    type: 'image', category: 'entertainment', thumbnail: 'https://picsum.photos/seed/tv_wc/480/270',
    plays: 88900, items: [
      { name: 'Breaking Bad', image: 'https://picsum.photos/seed/breakbad/400/400' },
      { name: 'Game of Thrones', image: 'https://picsum.photos/seed/got/400/400' },
      { name: 'Stranger Things', image: 'https://picsum.photos/seed/strangerthings/400/400' },
      { name: 'The Last of Us', image: 'https://picsum.photos/seed/tlou/400/400' },
      { name: 'Squid Game', image: 'https://picsum.photos/seed/squidgame/400/400' },
      { name: 'Dark', image: 'https://picsum.photos/seed/darkshow/400/400' },
      { name: 'The Office', image: 'https://picsum.photos/seed/theoffice/400/400' },
      { name: 'Attack on Titan', image: 'https://picsum.photos/seed/aot_show/400/400' },
    ]
  },
  {
    id: 'seed-11', title: 'Gaming Console Quiz', creator: 'techquiz_ai',
    type: 'image', category: 'gaming', thumbnail: 'https://picsum.photos/seed/console_wc/480/270',
    plays: 22300, items: [
      { name: 'PlayStation 5', image: 'https://picsum.photos/seed/ps5/400/400' },
      { name: 'Xbox Series X', image: 'https://picsum.photos/seed/xbox/400/400' },
      { name: 'Nintendo Switch', image: 'https://picsum.photos/seed/switch/400/400' },
      { name: 'PC Gaming', image: 'https://picsum.photos/seed/pcgaming/400/400' },
    ]
  },
  {
    id: 'seed-12', title: 'BLACKPINK Song Quiz', creator: 'hallyuwave',
    type: 'image', category: 'kpop', thumbnail: 'https://picsum.photos/seed/bp_wc/480/270',
    plays: 44600, items: [
      { name: 'How You Like That', image: 'https://picsum.photos/seed/hylt/400/400' },
      { name: 'Pink Venom', image: 'https://picsum.photos/seed/pinkvenom/400/400' },
      { name: 'DDU-DU DDU-DU', image: 'https://picsum.photos/seed/ddududu/400/400' },
      { name: 'Kill This Love', image: 'https://picsum.photos/seed/killlove/400/400' },
      { name: 'Lovesick Girls', image: 'https://picsum.photos/seed/lovesick/400/400' },
      { name: 'Ice Cream', image: 'https://picsum.photos/seed/icecream/400/400' },
      { name: 'Shut Down', image: 'https://picsum.photos/seed/shutdown/400/400' },
      { name: 'Playing with Fire', image: 'https://picsum.photos/seed/playingfire/400/400' },
    ]
  },
];

function seed() {
  const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM quizzes').get().cnt;
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} quizzes — skipping seed.`);
    return;
  }

  const insertQuiz = db.prepare(`
    INSERT INTO quizzes (id, title, description, creator_id, item_type, category, thumbnail, plays, created_at)
    VALUES (?, ?, '', NULL, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertItem = db.prepare(`
    INSERT INTO quiz_items (quiz_id, name, image_url, video_url, position)
    VALUES (?, ?, ?, '', ?)
  `);

  const seedAll = db.transaction(() => {
    SEED_QUIZZES.forEach((q, qi) => {
      // Stagger created_at so they have different timestamps
      const offsetMinutes = `-${(SEED_QUIZZES.length - qi) * 60} minutes`;
      insertQuiz.run(q.id, q.title, q.type, q.category, q.thumbnail, q.plays, offsetMinutes);
      q.items.forEach((item, i) => {
        insertItem.run(q.id, item.name, item.image || '', i);
      });
    });
  });

  seedAll();
  console.log(`Seeded ${SEED_QUIZZES.length} quizzes.`);
}

seed();
