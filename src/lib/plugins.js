// ╔══════════════════════════════════════╗
// ║        NEXA BOT - PLUGIN LOADER       ║
// ╚══════════════════════════════════════╝

const fs = require("fs");
const path = require("path");
const colors = require("./colors");

/** @type {Map<string, Object>} */
const pluginStore = new Map();

/** @type {Object[]} */
let allPlugins = [];

/**
 * Load a single plugin file
 */
function loadPlugin(filePath) {
  try {
    // Remove from require cache to allow hot-reload
    delete require.cache[require.resolve(filePath)];
    const plugin = require(filePath);

    if (!plugin?.config || !plugin?.handler) {
      return null;
    }

    if (!plugin.config.name) {
      return null;
    }

    plugin.config.isEnabled = plugin.config.isEnabled !== false;
    plugin.config.cooldown = plugin.config.cooldown || 0;
    plugin.config.energi = plugin.config.energi || 0;
    plugin.config.category = plugin.config.category || "main";

    // Register under all names/aliases
    const names = Array.isArray(plugin.config.name)
      ? plugin.config.name
      : [plugin.config.name];

    for (const name of names) {
      pluginStore.set(name.toLowerCase(), plugin);
    }

    if (plugin.config.alias) {
      const aliases = Array.isArray(plugin.config.alias)
        ? plugin.config.alias
        : [plugin.config.alias];
      for (const alias of aliases) {
        pluginStore.set(alias.toLowerCase(), plugin);
      }
    }

    return plugin;
  } catch (err) {
    colors.logger.error("PluginLoader", `Failed to load ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

/**
 * Load all plugins from plugins directory
 */
async function reloadAllPlugins() {
  pluginStore.clear();
  allPlugins = [];

  const pluginsDir = path.join(process.cwd(), "plugins");

  if (!fs.existsSync(pluginsDir)) {
    colors.logger.warn("PluginLoader", "plugins/ directory not found");
    return 0;
  }

  let count = 0;

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        const plugin = loadPlugin(fullPath);
        if (plugin) {
          allPlugins.push(plugin);
          count++;
        }
      }
    }
  }

  scanDir(pluginsDir);

  colors.logger.success("PluginLoader", `Loaded ${count} plugins`);
  return count;
}

/**
 * Get plugin by command name
 */
function getPlugin(command) {
  if (!command) return null;
  return pluginStore.get(command.toLowerCase()) || null;
}

/**
 * Get total plugin count (unique plugins)
 */
function getPluginCount() {
  return allPlugins.length;
}

/**
 * Get all loaded plugins
 */
function getAllPlugins() {
  return allPlugins;
}

/**
 * Watch for file changes and reload (dev mode)
 */
function watchPlugins() {
  const pluginsDir = path.join(process.cwd(), "plugins");
  if (!fs.existsSync(pluginsDir)) return;

  colors.logger.info("PluginLoader", "Watching plugins for changes...");

  fs.watch(pluginsDir, { recursive: true }, (event, filename) => {
    if (filename && filename.endsWith(".js")) {
      const filePath = path.join(pluginsDir, filename);
      if (fs.existsSync(filePath)) {
        colors.logger.info("PluginLoader", `Reloading: ${filename}`);
        const plugin = loadPlugin(filePath);
        if (plugin) {
          // Update allPlugins array
          const idx = allPlugins.findIndex(
            p => p.config.name === plugin.config.name
          );
          if (idx !== -1) allPlugins[idx] = plugin;
          else allPlugins.push(plugin);
        }
      }
    }
  });
}

module.exports = {
  pluginStore,
  loadPlugin,
  reloadAllPlugins,
  getPlugin,
  getPluginCount,
  getAllPlugins,
  watchPlugins,
};
