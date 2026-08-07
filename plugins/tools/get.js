const axios = require("axios");

module.exports = {
  config: {
    name: "get",
    alias: ["fetch", "hit", "request"],
    category: "tools",
    description: "Hit API endpoint — auto detect JSON, image, atau teks",
    usage: "<url>",
    example: ".get https://api.nexadev.my.id/endpoint",
    isEnabled: true,
    cooldown: 3,
    limit: 1,
    skipRegistration: false,
  },

  async handler(m, { sock, config, args }) {
    const prefix = m.prefix || ".";
    const botName = config.bot?.name || "NexaBot";

    // ── Validasi URL ─────────────────────────────────────────
    let url = args[0] || (m.text?.split(" ").slice(1).join(" ").trim());
    if (!url) {
      return m.reply(
        `⚠️ *URL tidak ditemukan!*\n\n` +
        `📌 *Penggunaan:*\n` +
        `› \`${prefix}get <url>\`\n\n` +
        `📝 *Contoh:*\n` +
        `› \`${prefix}get https://api.nexadev.my.id/ai/claude?text=hallo
        
        \`\n` +
        `› \`${prefix}get https://picsum.photos/200/300\``
      );
    }

    // Tambah https:// kalau user lupa
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    await m.react("⏳");

    try {
      // ── Hit API dengan stream untuk detect content-type ─────
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024, // max 50MB
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0",
        },
      });

      const contentType = response.headers["content-type"] || "";
      const data = Buffer.from(response.data);

      // ── Detect Image ────────────────────────────────────────
      if (contentType.includes("image")) {
        const ext = contentType.includes("png") ? "png"
                  : contentType.includes("gif") ? "gif"
                  : contentType.includes("webp") ? "webp"
                  : contentType.includes("bmp") ? "bmp"
                  : "jpg";

        await sock.sendMessage(
          m.chat,
          {
            image: data,
            caption: `✅ *GET — Image Detected*\n\n` +
                     `┌  ◦  ᴜʀʟ   : ${url.length > 50 ? url.substring(0, 50) + "..." : url}\n` +
                     `│  ◦  ᴛʏᴘᴇ  : ${contentType}\n` +
                     `│  ◦  ꜱɪᴢᴇ  : ${(data.length / 1024).toFixed(2)} KB\n` +
                     `└  ◦  ꜱᴛᴀᴛᴜꜱ: ${response.status}`,
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
            },
          },
          { quoted: m }
        );
        return await m.react("✅");
      }

      // ── Detect Video ────────────────────────────────────────
      if (contentType.includes("video")) {
        await sock.sendMessage(
          m.chat,
          {
            video: data,
            caption: `✅ *GET — Video Detected*\n\n` +
                     `┌  ◦  ᴜʀʟ   : ${url.length > 50 ? url.substring(0, 50) + "..." : url}\n` +
                     `│  ◦  ᴛʏᴘᴇ  : ${contentType}\n` +
                     `│  ◦  ꜱɪᴢᴇ  : ${(data.length / 1024 / 1024).toFixed(2)} MB\n` +
                     `└  ◦  ꜱᴛᴀᴛᴜꜱ: ${response.status}`,
          },
          { quoted: m }
        );
        return await m.react("✅");
      }

      // ── Detect Audio ────────────────────────────────────────
      if (contentType.includes("audio")) {
        await sock.sendMessage(
          m.chat,
          {
            audio: data,
            mimetype: contentType,
            ptt: false,
          },
          { quoted: m }
        );
        return await m.react("✅");
      }

      // ── Convert ke String untuk JSON/Teks ───────────────────
      const text = data.toString("utf-8").trim();

      // ── Detect JSON ─────────────────────────────────────────
      let isJson = false;
      let parsed = null;
      try {
        parsed = JSON.parse(text);
        isJson = true;
      } catch {
        isJson = false;
      }

      if (isJson && parsed !== null) {
        // Format JSON jadi pretty string
        const prettyJson = JSON.stringify(parsed, null, 2);
        const jsonPreview = prettyJson.length > 3500
          ? prettyJson.substring(0, 3500) + "\n\n... (truncated)"
          : prettyJson;

        const caption =
          `✅ *GET — JSON Response*\n\n` +
          `┌  ◦  ᴜʀʟ    : ${url.length > 50 ? url.substring(0, 50) + "..." : url}\n` +
          `│  ◦  ꜱᴛᴀᴛᴜꜱ : ${response.status}\n` +
          `│  ◦  ᴛʏᴘᴇ   : ${contentType || "application/json"}\n` +
          `│  ◦  ꜱɪᴢᴇ   : ${(data.length / 1024).toFixed(2)} KB\n` +
          `└  ◦  ᴋᴇʏꜱ   : ${Object.keys(parsed).length} keys\n\n` +
          `\`\`\`json\n${jsonPreview}\n\`\`\``;

        // Kalau JSON terlalu panjang, kirim sebagai dokumen
        if (prettyJson.length > 4000) {
          const jsonBuffer = Buffer.from(prettyJson, "utf-8");
          await sock.sendMessage(
            m.chat,
            {
              document: jsonBuffer,
              fileName: "response.json",
              mimetype: "application/json",
              caption: caption.substring(0, 1000),
            },
            { quoted: m }
          );
        } else {
          await m.reply(caption);
        }
        return await m.react("✅");
      }

      // ── Fallback: Teks/HTML/Plain ───────────────────────────
      const textPreview = text.length > 3500
        ? text.substring(0, 3500) + "\n\n... (truncated)"
        : text;

      const caption =
        `✅ *GET — Text Response*\n\n` +
        `┌  ◦  ᴜʀʟ    : ${url.length > 50 ? url.substring(0, 50) + "..." : url}\n` +
        `│  ◦  ꜱᴛᴀᴛᴜꜱ : ${response.status}\n` +
        `│  ◦  ᴛʏᴘᴇ   : ${contentType || "text/plain"}\n` +
        `│  ◦  ꜱɪᴢᴇ   : ${(data.length / 1024).toFixed(2)} KB\n` +
        `│  ◦  ʟᴇɴɢᴛʜ : ${text.length} chars\n` +
        `└  ◦  ᴘʀᴇᴠɪᴇᴡ : 👇\n\n` +
        `\`\`\`\n${textPreview}\n\`\`\``;

      await m.reply(caption);
      return await m.react("✅");

    } catch (error) {
      await m.react("❌");

      let errMsg = "❌ *Request Gagal!*\n\n";
      if (error.response) {
        // Server merespons dengan status error
        errMsg +=
          `┌  ◦  ᴜʀʟ    : ${url.length > 50 ? url.substring(0, 50) + "..." : url}\n` +
          `│  ◦  ꜱᴛᴀᴛᴜꜱ : ${error.response.status} ${error.response.statusText}\n` +
          `│  ◦  ʜᴇᴀᴅᴇʀꜱ : ${JSON.stringify(error.response.headers)}\n` +
          `└  ◦  ᴅᴀᴛᴀ   : ${JSON.stringify(error.response.data).substring(0, 500)}`;
      } else if (error.request) {
        // Request terkirim tapi tidak ada respon
        errMsg +=
          `┌  ◦  ᴜʀʟ    : ${url.length > 50 ? url.substring(0, 50) + "..." : url}\n` +
          `└  ◦  ᴇʀʀᴏʀ  : Tidak ada respon dari server (timeout/network)`;
      } else {
        // Error lain
        errMsg +=
          `┌  ◦  ᴜʀʟ    : ${url.length > 50 ? url.substring(0, 50) + "..." : url}\n` +
          `└  ◦  ᴇʀʀᴏʀ  : ${error.message}`;
      }

      return m.reply(errMsg);
    }
  },
};
