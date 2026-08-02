const axios = require("axios");

const TARGET_IMAGES = 10; // jumlah gambar yang HARUS terkirim
const CANDIDATE_BUFFER = 25; // ambil kandidat lebih banyak sebagai cadangan jika ada link gagal

async function react(sock, m, emoji) {
  try {
    if (typeof m.react === "function") {
      await m.react(emoji);
    } else {
      await sock.sendMessage(m.chat, {
        react: { text: emoji, key: m.key },
      });
    }
  } catch (e) {
    // Diamkan saja kalau gagal react, jangan sampai mengganggu flow utama
  }
}

function extractImageUrl(item) {
  const url =
    item?.image_url ||
    item?.imageUrl ||
    item?.images?.orig?.url ||
    item?.images?.original?.url ||
    item?.image?.url ||
    item?.url;

  if (!url || typeof url !== "string") return null;

  // Saring url yang jelas bukan gambar (mis. video) supaya tidak gagal saat dikirim sebagai image
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    return null;
  }

  return url;
}

async function sendPinterestImages(sock, m, query) {
  if (!query) {
    return m.reply("Contoh: `.pinsearch anime girl`");
  }

  await react(sock, m, "⌛");

  const apiUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`;

  let res;
  try {
    res = await axios.get(apiUrl, { timeout: 20000 });
  } catch (e) {
    await react(sock, m, "❌");
    return m.reply("Gagal mengambil data Pinterest.");
  }

  const raw = res.data;
  const items =
    raw?.data ||
    raw?.result ||
    raw?.results ||
    raw?.pins ||
    raw ||
    [];

  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    await react(sock, m, "❌");
    return m.reply("Hasil tidak ditemukan.");
  }

  // Kumpulkan kandidat lebih banyak dari target sebagai cadangan jika ada link yang gagal dikirim nanti
  const candidates = [];
  const seen = new Set();
  for (const item of list) {
    const imageUrl = extractImageUrl(item);
    if (imageUrl && !seen.has(imageUrl)) {
      seen.add(imageUrl);
      candidates.push(imageUrl);
    }
    if (candidates.length >= CANDIDATE_BUFFER) break;
  }

  if (!candidates.length) {
    await react(sock, m, "❌");
    return m.reply("Link gambar tidak ditemukan di respons API.");
  }

  await m.reply(
    `🔎 *Pinterest Search*\n\nQuery: *${query}*\nMencari ${TARGET_IMAGES} gambar terbaik...`
  );

  let sentCount = 0;
  let isFirst = true;

  for (const imageUrl of candidates) {
    if (sentCount >= TARGET_IMAGES) break;

    try {
      await sock.sendMessage(m.chat, {
        image: { url: imageUrl },
        caption: isFirst ? `📌 Hasil Pinterest untuk: ${query}` : undefined,
      });
      sentCount++;
      isFirst = false;
    } catch (e) {
      // Lewati gambar yang gagal, lanjut ke kandidat berikutnya tanpa menghentikan proses
      continue;
    }
  }

  if (sentCount === 0) {
    await react(sock, m, "❌");
    return m.reply("Semua gambar gagal dikirim, coba lagi.");
  }

  await react(sock, m, "✅");

  if (sentCount < TARGET_IMAGES) {
    return m.reply(
      `⚠️ Hanya ${sentCount} dari ${TARGET_IMAGES} gambar yang berhasil terkirim (sisanya rusak/tidak valid).`
    );
  }
}

module.exports = {
  config: {
    name: "pinsearch",
    alias: ["pinterest", "pin"],
    category: "search",
    description: "Cari dan kirim 10 gambar Pinterest sekaligus",
    usage: "[query]",
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { sock, args }) {
    const query = args.join(" ").trim();
    return sendPinterestImages(sock, m, query);
  },
};
