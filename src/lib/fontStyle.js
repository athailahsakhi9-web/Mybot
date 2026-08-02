// src/lib/fontStyle.js
// Modul konversi teks -> font unicode. Dipakai oleh plugin .style
// dan oleh m.reply (serialize.js) untuk menerapkan gaya font
// pilihan user secara otomatis ke semua balasan bot.

const STYLES = {
  1: { name: "Bold",         upper: 0x1D400, lower: 0x1D41A, digit: 0x1D7CE },
  2: { name: "Bold Italic",  upper: 0x1D468, lower: 0x1D482, digit: null },
  3: { name: "Bold Script",  upper: 0x1D4D0, lower: 0x1D4EA, digit: null },
  4: { name: "Bold Fraktur", upper: 0x1D56C, lower: 0x1D586, digit: null },
  5: {
    name: "Double Struck", upper: 0x1D538, lower: 0x1D552, digit: 0x1D7D8,
    exceptions: {
      C: 0x2102, H: 0x210D, N: 0x2115, P: 0x2119,
      Q: 0x211A, R: 0x211D, Z: 0x2124,
    },
  },
};

function convert(text, style) {
  if (!text || typeof text !== "string") return text;
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (ch >= "0" && ch <= "9" && style.digit !== null) {
      out += String.fromCodePoint(style.digit + (code - 48));
    } else if (ch >= "A" && ch <= "Z") {
      if (style.exceptions?.[ch]) out += String.fromCodePoint(style.exceptions[ch]);
      else out += String.fromCodePoint(style.upper + (code - 65));
    } else if (ch >= "a" && ch <= "z") {
      out += String.fromCodePoint(style.lower + (code - 97));
    } else {
      out += ch;
    }
  }
  return out;
}

// Terapkan gaya font sesuai nomor (1-5). Nomor tidak valid / 0 -> teks asli.
function applyStyle(text, styleNum) {
  const style = STYLES[styleNum];
  if (!style) return text;
  return convert(text, style);
}

module.exports = { STYLES, convert, applyStyle };
