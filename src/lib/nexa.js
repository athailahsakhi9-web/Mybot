const axios = require("axios");
const FormData = require("form-data");
const { fromBuffer } = require('file-type');

const key = "AIzaBj7z2z3xBjsk"; // key default buat uploadnya jgn diganti
let domain = 'https://c.termai.cc';

/**
 * Upload buffer ke c.termai.cc
 * @param {Buffer} buffer - isi file
 * @param {Object} opts
 * @param {string} opts.filename - wajib, mis: "image.jpg" / "video.mp4" / "audio.mp3"
 * @param {string} [opts.contentType] - opsional, mis: "image/jpeg"
 * @param {number} [opts.timeoutMs=60000]
 * @returns {Promise<{url:string,directUrl:string}>}
 */
async function uploadToTmpFiles(buffer, opts) {
  if (!Buffer.isBuffer(buffer)) throw new Error("buffer harus Buffer");
  if (!opts?.filename) throw new Error("opts.filename wajib (contoh: image.jpg)");

  // Deteksi extensi dari buffer jika tersedia
  let ext;
  try {
    const type = await fromBuffer(buffer);
    ext = type ? type.ext : opts.filename.split('.').pop();
  } catch {
    ext = opts.filename.split('.').pop();
  }

  const form = new FormData();
  form.append("file", buffer, {
    filename: opts.filename,
    contentType: opts.contentType || "application/octet-stream",
    knownLength: buffer.length,
  });

  const res = await axios.post(`${domain}/api/upload?key=${key}`, form, {
    headers: {
      ...form.getHeaders(),
      Accept: "application/json",
    },
    timeout: opts.timeoutMs ?? 60_000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `Upload gagal (HTTP ${res.status}): ${
        typeof res.data === "string" ? res.data : JSON.stringify(res.data)
      }`
    );
  }

  // Response dari termai.cc
  const path = res.data?.path;
  if (!path) throw new Error("Response tidak ada data.path");

  const url = path;
  const directUrl = path;

  return { url, directUrl };
}

module.exports = { uploadToTmpFiles };
