const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const axios = require("axios");

const BASE = "https://quillbot.com";
const SESSION_FILE = path.join(process.cwd(), "src", "session", "quillbot-sessions.json");
const MAX_MESSAGES_PER_SESSION = 5;
const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

const jar = new CookieJar();

const client = wrapper(axios.create({
  jar,
  withCredentials: true,
  decompress: true,
  validateStatus: () => true,
  timeout: 120000
}));

function uuid() {
  return crypto.randomUUID();
}

function hex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

async function setCookie(name, value) {
  await jar.setCookie(`${name}=${value}; Path=/; Domain=quillbot.com; Secure; SameSite=None`, BASE);
}

async function initCookies(deviceId) {
  await setCookie("qbDeviceId", deviceId);
  await setCookie("ajs_anonymous_id", uuid());
  await setCookie("anonID", hex(8));
  await setCookie("authenticated", "false");
  await setCookie("premium", "false");
  await setCookie("acceptedPremiumModesTnc", "false");
  await setCookie("qdid", hex(16));

  if (process.env.QB_COOKIE) {
    for (const part of process.env.QB_COOKIE.split(";")) {
      const clean = part.trim();
      if (clean) await jar.setCookie(`${clean}; Path=/; Domain=quillbot.com`, BASE);
    }
  }
}

function createSession() {
  return {
    conversation_id: uuid(),
    device_id: uuid(),
    message_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function getSession() {
  const data = await readJson(SESSION_FILE, {
    current: null,
    sessions: []
  });

  let current = data.current;

  if (!current || current.message_count >= MAX_MESSAGES_PER_SESSION) {
    current = createSession();
    data.current = current;
    data.sessions.push(current);
    await writeJson(SESSION_FILE, data);
    return {
      data,
      session: current,
      new_session: true
    };
  }

  return {
    data,
    session: current,
    new_session: false
  };
}

async function updateSession(data, conversationId) {
  const session = data.sessions.find(v => v.conversation_id === conversationId);

  if (session) {
    session.message_count += 1;
    session.updated_at = new Date().toISOString();
    data.current = session;
  }

  await writeJson(SESSION_FILE, data);
}

function parseNdjson(text) {
  const chunks = [];

  for (const line of text.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || !clean.startsWith("{")) continue;

    try {
      const json = JSON.parse(clean);
      if (json.type === "content" && typeof json.content === "string") chunks.push(json.content);
    } catch {}
  }

  return chunks.join("").trim();
}

async function ask(prompt) {
  const { data, session, new_session } = await getSession();

  await initCookies(session.device_id);

  await client.get(`${BASE}/`, {
    headers: {
      "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "upgrade-insecure-requests": "1",
      "user-agent": USER_AGENT,
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "sec-fetch-site": "none",
      "sec-fetch-mode": "navigate",
      "sec-fetch-user": "?1",
      "sec-fetch-dest": "document",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  });

  const traceId = hex(16);
  const spanId = hex(8);
  const sampleRand = Math.random();

  const body = {
    message: {
      content: `${prompt}\n\n`
    },
    context: {
      editorContext: "",
      selectionContext: "",
      userDialect: "en-us",
      apiVersion: 2
    },
    origin: {
      name: "ai-chat.chat",
      url: BASE
    }
  };

  const res = await client.post(`${BASE}/api/ai-chat/chat/conversation/${session.conversation_id}`, body, {
    responseType: "text",
    headers: {
      "cache-control": "max-age=0",
      "sec-ch-ua-platform": `"Android"`,
      "platform-type": "webapp",
      "qb-product": "AI-CHAT",
      "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
      "sec-ch-ua-mobile": "?1",
      "useridtoken": "empty-token",
      "baggage": `sentry-environment=prod,sentry-release=v42.51.6,sentry-public_key=5743ef12f4887fc460c7968ebb2de54d,sentry-trace_id=${traceId},sentry-sampled=false,sentry-sample_rand=${sampleRand},sentry-sample_rate=0.01`,
      "sentry-trace": `${traceId}-${spanId}-0`,
      "user-agent": USER_AGENT,
      "accept": "text/event-stream",
      "webapp-version": "42.51.6",
      "content-type": "application/json",
      "origin": BASE,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "referer": `${BASE}/ai-chat/c/${session.conversation_id}`,
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  });

  const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  const result = parseNdjson(raw);
  const success = res.status >= 200 && res.status < 300 && !!result;

  if (success) await updateSession(data, session.conversation_id);

  const updated = data.sessions.find(v => v.conversation_id === session.conversation_id) || session;

  return {
    Status: success,
    Code: res.status,
    Input: prompt,
    Conversation_id: session.conversation_id,
    New_session: new_session,
    Message_count: updated.message_count,
    Max_messages_per_session: MAX_MESSAGES_PER_SESSION,
    Result: result || null,
    Error: success ? null : raw
  };
}

const pluginConfig = {
  name: "quillbot",
  alias: ["qb"],
  category: "ai",
  description: "Tanya jawab dengan AI QuillBot",
  usage: ".quillbot <pertanyaan>",
  example: ".quillbot jelaskan fotosintesis",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true
};

async function handler(m) {
  const text = (m.text || "").trim();

  if (!text) {
    return m.reply(`*Format Salah!*\n\n> Gunakan: ${m.prefix}${m.command} <pertanyaan lu>`);
  }

  await m.react("⌛");

  try {
    const result = await ask(text);

    if (result.Status && result.Result) {
      await m.reply(result.Result);
      await m.react("✅");
    } else {
      await m.react("❌");
      await m.reply(`❌ *QuillBot Error / Cloudflare Block*\n\n> Status: ${result.Code}`);
    }
  } catch (e) {
    await m.react("❌");
    await m.reply(`❌ *Crash:* ${e.message}`);
  }
}

module.exports = { config: pluginConfig, handler };