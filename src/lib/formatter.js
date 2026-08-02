// ╔══════════════════════════════════════╗
// ║         NEXA BOT - FORMATTER          ║
// ╚══════════════════════════════════════╝

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function createWaitMessage(text = "Mohon tunggu...") {
  return `⏳ *Memproses...*\n\n> ${text}`;
}

function createErrorMessage(text = "Terjadi kesalahan!") {
  return `❌ *Error!*\n\n> ${text}\n\n> _Silakan coba lagi atau hubungi owner._`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatNumber(num) {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
}

module.exports = {
  formatUptime,
  createWaitMessage,
  createErrorMessage,
  formatBytes,
  formatNumber,
};
