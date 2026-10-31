/**
 * Media Search — IINA 插件主入口
 *
 * 功能：
 *  - 读取当前播放文件名，清洗掉压制信息
 *  - 菜单栏 / 自定义热键 / 侧边栏按钮，跳转到指定站点搜索
 *  - 搜索引擎可增删改（含内置），热键可自定义
 *  - 复制文件名到剪贴板
 *
 * 用到的 IINA API：core、mpv、menu、event、utils、preferences、sidebar、console
 */

// MARK: - 默认数据（首次安装写入偏好，之后以偏好为准）

// MARK: - 语言 / Localisation
//
// 插件跑在 JSCore 里，没有 navigator；IINA 提供了 utils.preferredLocalizations()，
// 返回 Bundle.main.preferredLocalizations（例如 ["zh-Hans", "en"]）。
// 只区分中文与其他：其他语言一律回退英文。

function detectLanguage() {
  try {
    var list = iina.utils.preferredLocalizations();
    var first = list && list.length ? String(list[0]) : "";
    return /^zh/i.test(first) ? "zh" : "en";
  } catch (e) {
    return "en";
  }
}

var LANG = detectLanguage();

var STRINGS = {
  zh: {
    noMedia: "当前没有正在播放的媒体",
    noEngines: "还没有配置搜索引擎，请在侧边栏面板里添加",
    invalidURL: "搜索地址无效，请检查「%1」的 URL 模板",
    searchDone: "%1：%2",
    cannotOpenBrowser: "无法打开浏览器",
    nothingToCopy: "没有可复制的内容",
    copyFailed: "复制失败：%1",
    copyNoPermission: "复制失败：需要「文件系统访问」权限，请在设置 → 插件里重新授权",
    copyOk: "已复制：%1",
    copyExit: "复制失败，osascript 退出码 %1",
    menuNoMedia: "没有正在播放的媒体",
    menuOpenPanel: "打开 Media Search 面板",
    menuSearch: "搜索：%1（%2）",
    menuNoEngines: "尚未配置搜索引擎",
    menuCurrentFile: "当前文件",
    menuRaw: "  原始：%1",
    menuQuery: "  关键词：%1",
    menuSearchOn: "在 %1 搜索",
    menuCopyFilename: "复制文件名（无扩展名）",
    menuRawSearch: "用完整文件名搜索",
    fixedDefaultSearch: "默认搜索",
    fixedRawSearch: "用完整文件名搜索",
    fixedOpenPanel: "打开面板",
    warnKeyTaken: "热键 %1 被「%2」和「%3」同时占用",
    warnCopyTaken: "复制文件名热键 %1 与「%2」重复",
    labelCopy: "复制文件名",
    warnCmdC: "⌘C 可能被系统「复制」菜单占用；若按下没反应，改成 ⌥C 之类的组合即可",
    warnBuiltin: "热键 %1（%2）可能与 IINA 自带快捷键冲突",
    warnFailedKeys: "热键 %1 无法被 IINA 识别，已跳过；换一个组合键即可",
    untitled: "未命名",
    newEngineName: "新搜索引擎",
    msgAdded: "已添加，请填写名称、地址和热键",
    msgSaveFailed: "保存失败",
    msgDeleteNotFound: "没有找到要删除的搜索引擎",
    msgDeleted: "已删除",
    msgEngineGone: "搜索引擎已不存在，请刷新面板",
    msgKeyInvalid: "热键无法识别，已保留原热键（示例：Alt+1、Meta+D、F2）",
    msgKeyInvalidCopy: "热键无法识别，示例：Alt+c、Meta+D、F2",
    msgCopyKeySet: "复制热键已更新为 %1",
    msgCopyTargetChanged: "复制内容已切换",
    msgEnginesReset: "已恢复默认搜索引擎",
    emptyLabel: "（空）",
    listSeparator: "、"
  },
  en: {
    noMedia: "Nothing is playing",
    noEngines: "No search engine set up yet — add one in the sidebar panel",
    invalidURL: "Invalid search URL — check the template for \u201c%1\u201d",
    searchDone: "%1: %2",
    cannotOpenBrowser: "Could not open the browser",
    nothingToCopy: "Nothing to copy",
    copyFailed: "Copy failed: %1",
    copyNoPermission: "Copy failed — the plugin needs the File System permission. Re-grant it in Settings \u2192 Plugins.",
    copyOk: "Copied: %1",
    copyExit: "Copy failed, osascript exited with %1",
    menuNoMedia: "Nothing is playing",
    menuOpenPanel: "Open Media Search Panel",
    menuSearch: "Search: %1 (%2)",
    menuNoEngines: "No search engine configured",
    menuCurrentFile: "Current file",
    menuRaw: "  Raw: %1",
    menuQuery: "  Query: %1",
    menuSearchOn: "Search on %1",
    menuCopyFilename: "Copy filename (no extension)",
    menuRawSearch: "Search with the full filename",
    fixedDefaultSearch: "Default search",
    fixedRawSearch: "Search with the full filename",
    fixedOpenPanel: "Open panel",
    warnKeyTaken: "Hotkey %1 is claimed by both \u201c%2\u201d and \u201c%3\u201d",
    warnCopyTaken: "The copy hotkey %1 collides with \u201c%2\u201d",
    labelCopy: "Copy filename",
    warnCmdC: "\u2318C is usually taken by the system Copy menu — switch to \u2325C if it does nothing",
    warnBuiltin: "Hotkey %1 (%2) may conflict with an IINA built-in shortcut",
    warnFailedKeys: "Hotkey %1 is not recognised by IINA and was skipped — try another combination",
    untitled: "Untitled",
    newEngineName: "New search engine",
    msgAdded: "Added — fill in the name, URL and hotkey",
    msgSaveFailed: "Could not save",
    msgDeleteNotFound: "That search engine no longer exists",
    msgDeleted: "Deleted",
    msgEngineGone: "That search engine no longer exists — reload the panel",
    msgKeyInvalid: "Unrecognised hotkey; the previous one was kept (e.g. Alt+1, Meta+D, F2)",
    msgKeyInvalidCopy: "Unrecognised hotkey, e.g. Alt+c, Meta+D, F2",
    msgCopyKeySet: "Copy hotkey is now %1",
    msgCopyTargetChanged: "Copy target changed",
    msgEnginesReset: "Default search engines restored",
    emptyLabel: "(none)",
    listSeparator: ", "
  }
};

function t(key) {
  var table = STRINGS[LANG] || STRINGS.en;
  var text = table[key];
  if (text === undefined) text = STRINGS.en[key];
  if (text === undefined) return key;
  for (var i = 1; i < arguments.length; i++) {
    text = text.replace("%" + i, arguments[i]);
  }
  return text;
}

// 内置引擎在两种语言下的名字。只有「名字仍是另一种语言的内置名」时才改写，
// 用户自己改过的名字不动。
var BUILTIN_NAMES = {
  douban: { zh: "豆瓣", en: "Douban" },
  bing: { zh: "必应", en: "Bing" }
};

var DEFAULT_ENGINES = [
  {
    id: "douban",
    name: "Douban",
    tpl: "https://search.douban.com/movie/subject_search?search_text={q}",
    key: "Alt+1",
  },
  {
    id: "imdb",
    name: "IMDb",
    tpl: "https://www.imdb.com/find/?q={q}&s=tt",
    key: "Alt+2",
  },
  {
    id: "tmdb",
    name: "TMDB",
    tpl: "https://www.themoviedb.org/search?query={q}&language=zh-CN",
    key: "Alt+3",
  },
  {
    id: "google",
    name: "Google",
    tpl: "https://www.google.com/search?q={q}",
    key: "Alt+4",
  },
  {
    id: "bing",
    name: "Bing",
    tpl: "https://www.bing.com/search?q={q}",
    key: "Alt+5",
  },
];

var CONFIG_VERSION = 3;

var PREF_DEFAULTS = {
  cleanName: true,
  keepEpisode: true,
  showOSD: true,
  copyTarget: "filename",
  copyKey: "Alt+c",
  configVersion: CONFIG_VERSION,
};

// v1.1 的旧默认热键，仅用于一次性迁移（用户自己改过的不动）
var LEGACY_KEYS = {
  douban: "Meta+Shift+d",
  imdb: "Meta+Shift+i",
  tmdb: "Meta+Shift+t",
  google: "Meta+Shift+g",
  bing: "Meta+Shift+n",
};

// IINA 自带键位（input.conf + 常用菜单项），用于冲突提示，只提示不阻止
var IINA_KEYS = [
  "Meta+s", "Meta+l", "Meta+/", "Meta+.", "Meta+0", "Meta+1", "Meta+2",
  "Meta+[", "Meta+]", "Meta+\\", "Meta+o", "Meta+q", "Meta+w", "Meta+c", "Meta+v",
  "Ctrl+Meta+v", "Ctrl+Meta+s", "Ctrl+Meta+a", "Ctrl+Meta+f", "Ctrl+Meta+t",
  "Alt+z", "Alt+x", "Alt+v",
];

// IINA 的键名规范（KeyCodeHelper.normalizeMpv）：顺序固定为 Ctrl、Alt、Shift、Meta，
// 有大小写区分的字母用大写字母代替 Shift。这里必须一致，否则同名热键会被当成两个。
var MOD_ORDER = ["Ctrl", "Alt", "Shift", "Meta"];

var SPECIAL_KEYS = {
  space: "SPACE", esc: "ESC", escape: "ESC", enter: "ENTER", "return": "ENTER",
  tab: "TAB", backspace: "BS", bs: "BS", delete: "DEL", del: "DEL",
  insert: "INS", ins: "INS", home: "HOME", end: "END",
  pageup: "PGUP", pgup: "PGUP", pagedown: "PGDN", pgdn: "PGDN",
  left: "LEFT", right: "RIGHT", up: "UP", down: "DOWN",
  plus: "PLUS", sharp: "SHARP",
  "-": "-", "=": "=", "[": "[", "]": "]", "\\": "\\", ";": ";", "'": "'",
  ",": ",", ".": ".", "/": "/", "`": "`",
};

/**
 * 把任意写法规范化为 IINA 能识别的键名：
 *   "cmd+shift+d" / "⌘⇧d" / "Meta+Shift+D"  ->  "Meta+D"
 *   "opt+1" / "option+1" / "⌥1"             ->  "Alt+1"
 * 返回 "" 表示清空，null 表示无法识别。
 *
 * 注意：IINA 自身用 charactersIgnoringModifiers 取值，所以 ⌥1 就是 Alt+1，
 * 不会变成 "¡"。
 */
function normalizeKey(input) {
  if (input === undefined || input === null) return "";
  var text = String(input).trim();
  if (!text) return "";

  text = text
    .replace(/⌘/g, "Meta+")
    .replace(/⇧/g, "Shift+")
    .replace(/⌥/g, "Alt+")
    .replace(/⌃/g, "Ctrl+");

  var parts = text.split("+").map(function (p) { return p.trim(); }).filter(function (p) { return p.length > 0; });
  // 裸键只接受功能键（F1–F24）：菜单无法显示它们的快捷键，但插件监听可以用
  if (parts.length === 1) {
    return /^F([1-9]|1[0-9]|2[0-4])$/i.test(parts[0]) ? parts[0].toUpperCase() : null;
  }

  var keyPart = parts[parts.length - 1];
  var mods = {};
  for (var i = 0; i < parts.length - 1; i++) {
    var low = parts[i].toLowerCase();
    if (low === "meta" || low === "cmd" || low === "command" || low === "super") mods.Meta = true;
    else if (low === "ctrl" || low === "control") mods.Ctrl = true;
    else if (low === "alt" || low === "option" || low === "opt") mods.Alt = true;
    else if (low === "shift") mods.Shift = true;
    else return null;
  }

  // 主键：单字符原样，功能键转大写名
  var key;
  if (keyPart.length === 1) {
    key = keyPart;
    if (key === "#") key = "SHARP";
    else if (key === "+") key = "PLUS";
  } else {
    var special = SPECIAL_KEYS[keyPart.toLowerCase()];
    if (!special) return null;
    key = special;
  }

  // 字母：Shift 用大写字母表达；本来就是大写的保持大写（mpv 里 X 与 x 是两个键）
  if (/^[A-Za-z]$/.test(key)) {
    if (mods.Shift) {
      key = key.toUpperCase();
      delete mods.Shift;
    }
  }

  var activeMods = MOD_ORDER.filter(function (m) { return mods[m]; });
  if (activeMods.length === 0) return null;

  return activeMods.join("+") + "+" + key;
}

function log(message) {
  try {
    iina.console.log("[Media Search] " + message);
  } catch (e) {
    // 忽略
  }
}

function getRawPref(key) {
  var value;
  try {
    value = iina.preferences.get(key);
  } catch (e) {
    log("读取偏好失败 " + key + ": " + e);
  }
  return value;
}

function getPref(key) {
  var value = getRawPref(key);
  if (value === undefined || value === null || value === "") {
    return PREF_DEFAULTS[key];
  }
  return value;
}

function setPref(key, value) {
  try {
    iina.preferences.set(key, value);
    iina.preferences.sync();
    return true;
  } catch (e) {
    log("写入偏好失败 " + key + ": " + e);
    return false;
  }
}

function notify(message) {
  if (getPref("showOSD")) {
    try {
      iina.core.osd(message);
    } catch (e) {
      log("OSD 失败: " + e);
    }
  }
  log(message);
}

function shorten(text, max) {
  var limit = max || 42;
  var str = String(text === undefined || text === null ? "" : text);
  return str.length > limit ? str.slice(0, limit) + "…" : str;
}

function normalizeSpaces(str) {
  return str.replace(/\s+/g, " ").replace(/^[\s\-–—]+|[\s\-–—]+$/g, "");
}

function pad2(num) {
  var n = parseInt(num, 10);
  if (isNaN(n)) return "0";
  return n < 10 ? "0" + n : String(n);
}

// MARK: - 热键处理

// 插件内置的固定热键，引擎和复制功能不能再占用（写作 IINA 规范形式）
var FIXED_KEYS = {
  "Meta+S": t("fixedDefaultSearch"),
  "Meta+R": t("fixedRawSearch"),
  "Meta+K": t("fixedOpenPanel"),
};

function collectWarnings(engines, copyKey) {
  var warnings = [];
  var owners = {};
  var key;

  for (key in FIXED_KEYS) {
    owners[key] = FIXED_KEYS[key];
  }

  engines.forEach(function (engine) {
    if (!engine.key) return;
    if (owners[engine.key]) {
      warnings.push(t("warnKeyTaken", engine.key, owners[engine.key], engine.name));
    } else {
      owners[engine.key] = engine.name;
    }
  });

  if (copyKey) {
    if (owners[copyKey]) {
      warnings.push(t("warnCopyTaken", copyKey, owners[copyKey]));
    } else {
      owners[copyKey] = t("labelCopy");
    }
  }

  for (key in owners) {
    if (IINA_KEYS.indexOf(key) >= 0) {
      if (key === "Meta+c") {
        warnings.push(t("warnCmdC"));
      } else {
        warnings.push(t("warnBuiltin", key, owners[key]));
      }
    }
  }

  return warnings;
}

// MARK: - 引擎存储

function cloneEngine(engine) {
  return { id: engine.id, name: engine.name, tpl: engine.tpl, key: engine.key || "" };
}

function defaultEngines() {
  return DEFAULT_ENGINES.map(cloneEngine);
}

function getEngines() {
  ensureMigrated();
  var raw = getRawPref("engines");
  if (typeof raw === "string" && raw.trim()) {
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(function (item) { return item && typeof item === "object"; })
          .map(function (item) {
            var normalized = normalizeKey(item.key);
            return {
              id: String(item.id || "e_" + Math.random().toString(36).slice(2, 8)),
              name: String(item.name || t("untitled")),
              tpl: String(item.tpl || ""),
              key: normalized === null ? "" : normalized,
            };
          });
      }
    } catch (e) {
      log("引擎配置解析失败，使用默认值: " + e);
    }
  }
  return defaultEngines();
}

function saveEngines(list) {
  return setPref("engines", JSON.stringify(list));
}

function newEngineId() {
  return "e_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/**
 * 一次性把 v1.1 的旧默认热键（⌘⇧D / ⌘⇧I / … / ⌘C）换成新的 ⌥ 系列。
 * 只替换「仍然等于旧默认值」的项，用户自己改过的热键保持不动。
 */
var migrationDone = false;

function ensureMigrated() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    migratePreferences();
  } catch (e) {
    log("偏好迁移失败: " + e);
  }
}

/**
 * 内置引擎的名字跟着界面语言走：英文环境里 Douban/Bing，中文环境里 豆瓣/必应。
 * 只改写「名字正好是另一种语言的内置名」的项，用户自己改过的名字保持不变。
 */
function syncDefaultNames() {
  try {
    var engines = getEngines();
    var changed = false;
    engines.forEach(function (engine) {
      var names = BUILTIN_NAMES[engine.id];
      if (!names) return;
      var other = LANG === "zh" ? names.en : names.zh;
      if (engine.name === other) {
        engine.name = names[LANG];
        changed = true;
      }
    });
    if (changed) saveEngines(engines);
  } catch (e) {
    log("同步引擎名称失败: " + e);
  }
}

function migratePreferences() {
  var version = parseInt(getRawPref("configVersion"), 10);
  if (isNaN(version)) version = 0;
  if (version >= CONFIG_VERSION) return;

  if (version < 2) {
    migrateHotkeysToAlt();
  }

  if (version < 3) {
    restoreLegacyEngineURLs();
  }

  setPref("configVersion", String(CONFIG_VERSION));
}

/** v2：把旧默认热键（⌘⇧D…、⌘C）换成 ⌥ 系列，只动仍是旧默认值的项。 */
function migrateHotkeysToAlt() {
  var defaultsById = {};
  DEFAULT_ENGINES.forEach(function (engine) { defaultsById[engine.id] = engine.key; });

  var raw = getRawPref("engines");
  if (typeof raw === "string" && raw.trim()) {
    try {
      var list = JSON.parse(raw);
      if (Array.isArray(list)) {
        var changed = false;
        list.forEach(function (item) {
          if (!item || typeof item !== "object") return;
          var legacy = LEGACY_KEYS[item.id];
          if (!legacy || !defaultsById[item.id]) return;
          if (normalizeKey(item.key) === normalizeKey(legacy)) {
            item.key = defaultsById[item.id];
            changed = true;
          }
        });
        if (changed) setPref("engines", JSON.stringify(list));
        log("已把默认热键迁移到 ⌥ 组合");
      }
    } catch (e) {
      log("热键迁移跳过（配置无法解析）: " + e);
    }
  }

  var copyKey = getRawPref("copyKey");
  if (copyKey === "Meta+c" || copyKey === "Meta+C") {
    setPref("copyKey", PREF_DEFAULTS.copyKey);
  }
}

/**
 * v3：回收 v1.0 的 `url_<id>` 偏好。
 *
 * 早期版本把每个引擎的地址单独存成 url_<id>，后来统一进 engines 后就没人读了，
 * 用户的「必应 → 某个站点」这类自定义会变成孤儿数据。点一次「恢复默认」
 * 就再也找不回来——这正是实际踩到的情况。
 *
 * 只在「该引擎地址还是出厂值」时接管，避免盖掉用户后来在面板里改过的地址。
 */
function restoreLegacyEngineURLs() {
  var raw = getRawPref("engines");
  if (typeof raw !== "string" || !raw.trim()) return;

  var list;
  try {
    list = JSON.parse(raw);
  } catch (e) {
    log("旧地址迁移跳过（配置无法解析）: " + e);
    return;
  }
  if (!Array.isArray(list)) return;

  var defaultsById = {};
  DEFAULT_ENGINES.forEach(function (engine) { defaultsById[engine.id] = engine.tpl; });

  var restored = [];
  list.forEach(function (item) {
    if (!item || typeof item !== "object" || !item.id) return;
    var legacy = getRawPref("url_" + item.id);
    if (typeof legacy !== "string" || !legacy.trim()) return;
    if (!defaultsById[item.id] || item.tpl !== defaultsById[item.id]) return;
    item.tpl = legacy.trim();
    restored.push(item.name || item.id);
  });

  if (restored.length) {
    setPref("engines", JSON.stringify(list));
    log("已从旧配置恢复自定义搜索地址: " + restored.join("、"));
  }
}

// MARK: - 文件名清洗

var EXT_RE = /\.(mp4|m4v|mkv|mov|avi|webm|flv|rmvb|rm|wmv|mpg|mpeg|ts|m2ts|vob|iso|ogm|divx|mts|3gp|f4v|asf|strm)$/i;
var BRACKET_RE = /\[[^\]]*\]/g;

var TAG_PATTERNS = [
  "\\b(?:2160p|1440p|1080p|1080i|720p|720i|576p|480p|360p|4k|8k|uhd|hd|sd)\\b",
  "\\b(?:web-?dl|webrip|web|bluray|blu-?ray|bdrip|brrip|bdremux|bd|remux|hdtv|hdrip|dvdrip|dvd|hddvd)\\b",
  "\\b(?:x264|x265|h264|h265|hevc|xvid|divx|avc|mpeg-?2|mpeg-?4)\\b",
  "\\b(?:10bit|8bit|12bit|hdr10(?:\\+|plus)?|hdr|dolby-?vision|dovi|sdr|3d|imax)\\b",
  // 音轨：DTS-HD MA / TrueHD / Atmos / AAC2.0 / DDP5.1 等（含尾随声道数字）
  "\\b(?:aac|ac3|eac3|dts(?:-?hd(?:-?ma)?)?|truehd|atmos|lpcm|pcm|flac|mp3|opus|ddp[257]?|dd[257]?)(?:[.\\-]?\\d(?:\\.\\d)?)?\\b",
  "(?:^|\\s)[257]\\.[01](?=$|\\s)",
  "\\b(?:proper|repack|internal|limited|unrated|extended|remastered|complete|multi(?:-?sub)?|dual(?:-?audio)?)\\b",
  // 语言 / 字幕标记（中文没有 \b 词边界，不能用 \b）
  "(?:国语|粤语|中英(?:字幕)?|双语|简繁|繁體|简体|中字|外挂(?:字幕)?|字幕)",
  "\\b(?:amzn|nf|netflix|hulu|dsnp|atvp|hmax|pmtp|stan|crav)\\b",
];

var TOKEN_RE = new RegExp(TAG_PATTERNS.join("|"), "gi");
var TOKEN_TEST_RE = new RegExp(TAG_PATTERNS.join("|"), "i");

function extractEpisode(str) {
  var m = str.match(/\bs(\d{1,2})[\s._-]*e(\d{1,3})(?:[\s._-]*e(\d{1,3}))?\b/i);
  if (m) return { matched: m[0], label: "S" + pad2(m[1]) + "E" + pad2(m[2]) };
  m = str.match(/(^|[\s._-])(\d{1,2})x(\d{1,3})\b/i);
  if (m) return { matched: m[0], label: "S" + pad2(m[2]) + "E" + pad2(m[3]) };
  m = str.match(/第\s*(\d{1,3})\s*[集话]/);
  if (m) return { matched: m[0], label: "S1E" + pad2(m[1]) };
  return null;
}

function removeReleaseGroup(str, hadTechTag) {
  if (!hadTechTag) return str;
  var parts = str.trim().split(/\s+/);
  if (parts.length < 2) return str;
  var last = parts[parts.length - 1];
  var isGroupName =
    /[A-Za-z0-9@!.\-]{2,16}/.test(last) &&
    (/[@!\-]/.test(last) || /[A-Z]/.test(last.slice(1)) || /\d/.test(last)) &&
    !/^(19|20)\d{2}$/.test(last);
  return isGroupName ? parts.slice(0, -1).join(" ") : str;
}

function cleanName(raw, options) {
  var s = String(raw || "");
  s = s.replace(EXT_RE, "");

  var opts = options || {};
  var clean = opts.clean === undefined ? true : opts.clean;
  if (!clean) return normalizeSpaces(s);

  s = s.replace(BRACKET_RE, " ");

  var episode = extractEpisode(s);
  if (episode) s = s.replace(episode.matched, " ");

  // 先在原始分隔符上剔除技术标签，这样 "DDP5.1" 这类带点的标签能被整体识别
  TOKEN_RE.lastIndex = 0;
  var hadTechTag = TOKEN_TEST_RE.test(s);
  TOKEN_RE.lastIndex = 0;
  s = s.replace(TOKEN_RE, " ");

  s = s.replace(/[._~]+/g, " ");

  TOKEN_RE.lastIndex = 0;
  s = s.replace(TOKEN_RE, " ");

  s = removeReleaseGroup(s, hadTechTag);
  s = normalizeSpaces(s);

  if (!s) s = normalizeSpaces(String(raw || "").replace(EXT_RE, ""));
  return opts.keepEpisode && episode ? s + " " + episode.label : s;
}

// MARK: - 当前媒体

function getMediaInfo() {
  try {
    var path = iina.mpv.getString("path") || "";
    var title = "";
    var isNetwork = false;
    try {
      isNetwork = iina.core.status.isNetworkResource === true;
      title = iina.core.status.title || "";
    } catch (e) {
      log("读取 core.status 失败: " + e);
    }
    if (!title) title = iina.mpv.getString("media-title") || "";

    var filename = "";
    if (path && !isNetwork) {
      filename = decodeURIComponent(path.split("/").pop() || "");
    }
    if (!filename && isNetwork) {
      filename = decodeURIComponent(title || (path.split("/").pop() || ""));
    }
    if (!filename) return null;

    var query = cleanName(filename, {
      clean: getPref("cleanName") !== false,
      keepEpisode: getPref("keepEpisode") !== false,
    });

    return { filename: filename, query: query, isNetwork: isNetwork, path: path };
  } catch (e) {
    log("读取媒体信息失败: " + e);
    return null;
  }
}

// MARK: - 搜索

function buildURL(engine, query) {
  var tpl = String(engine.tpl || "");
  if (!tpl) return "";
  if (/\{q\}/.test(tpl)) return tpl.replace(/\{q\}/g, encodeURIComponent(query));
  return tpl + encodeURIComponent(query);
}

function openSearch(engineId, useRawName) {
  var info = getMediaInfo();
  if (!info) {
    notify(t("noMedia"));
    return;
  }

  var engines = getEngines();
  if (!engines.length) {
    notify(t("noEngines"));
    return;
  }

  var engine = null;
  for (var i = 0; i < engines.length; i++) {
    if (engines[i].id === engineId) engine = engines[i];
  }
  if (!engine) engine = engines[0];

  var query = useRawName ? info.filename : info.query;
  var url = buildURL(engine, query);

  if (!/^https?:\/\//i.test(url)) {
    notify(t("invalidURL", engine.name));
    return;
  }

  var ok = iina.utils.open(url);
  notify(ok ? t("searchDone", engine.name, shorten(query)) : t("cannotOpenBrowser"));
}

// MARK: - 复制到剪贴板

function copyToClipboard(text) {
  var value = String(text === undefined || text === null ? "" : text);
  if (!value) {
    notify(t("nothingToCopy"));
    return;
  }

  var script = 'set the clipboard to "' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

  var promise;
  try {
    promise = iina.utils.exec("/usr/bin/osascript", ["-e", script], null, null, null);
  } catch (e) {
    notify(t("copyFailed", e));
    return;
  }

  if (!promise) {
    notify(t("copyNoPermission"));
    return;
  }

  if (typeof promise.then === "function") {
    promise
      .then(function (result) {
        if (result && result.status === 0) {
          notify(t("copyOk", shorten(value)));
        } else {
          notify(t("copyExit", result ? result.status : "?"));
        }
      })
      .catch(function (error) {
        notify(t("copyFailed", error));
      });
  } else {
    notify(t("copyOk", shorten(value)));
  }
}

// 复制用的「文件名」不带扩展名，粘到搜索框 / 聊天窗口里更干净
function stripExtension(name) {
  return String(name || "").replace(EXT_RE, "");
}

function copyCurrent(useRawName) {
  var info = getMediaInfo();
  if (!info) {
    notify(t("noMedia"));
    return;
  }

  var useRaw = useRawName;
  if (useRaw === undefined || useRaw === null) {
    useRaw = getPref("copyTarget") !== "query";
  }
  copyToClipboard(useRaw ? stripExtension(info.filename) : info.query);
}

// MARK: - 菜单栏

// 录制热键时要把菜单快捷键临时摘掉，否则 AppKit 会先把 ⌥1 当菜单快捷键吃掉，
// WebView 收不到 keydown，用户就没法把某个键重新录一遍。
var recordingMode = false;

function prettyKey(key) {
  if (!key) return "";
  var symbols = { Meta: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧" };
  return String(key).split("+").map(function (part) {
    if (symbols[part]) return symbols[part];
    if (part === "SPACE") return "␣";
    if (part === "PLUS") return "+";
    return part;
  }).join("");
}

function menuOptions(key, enabled) {
  var options = { enabled: enabled !== false };
  if (!recordingMode && key) options.keyBinding = key;
  return options;
}

function buildMenu() {
  iina.menu.removeAllItems();

  var info = getMediaInfo();
  var engines = getEngines();
  var copyKey = getPref("copyKey");

  if (!info) {
    iina.menu.addItem(iina.menu.item(t("menuNoMedia"), null, { enabled: false }));
    iina.menu.addItem(iina.menu.separator());
    iina.menu.addItem(
      iina.menu.item(t("menuOpenPanel") + (recordingMode ? "  " + prettyKey("Meta+K") : ""), function () {
        showSidebar();
      }, menuOptions("Meta+K"))
    );
    return;
  }

  if (engines.length) {
    var primary = engines[0];
    iina.menu.addItem(
      iina.menu.item(t("menuSearch", shorten(info.query), primary.name) +
        (recordingMode ? "  " + prettyKey("Meta+S") : ""), function () {
        openSearch(primary.id, false);
      }, menuOptions("Meta+S"))
    );
  } else {
    iina.menu.addItem(iina.menu.item(t("menuNoEngines"), null, { enabled: false }));
  }

  iina.menu.addItem(iina.menu.separator());
  iina.menu.addItem(iina.menu.item(t("menuCurrentFile"), null, { enabled: false }));
  iina.menu.addItem(iina.menu.item(t("menuRaw", shorten(info.filename, 60)), null, { enabled: false }));
  iina.menu.addItem(iina.menu.item(t("menuQuery", shorten(info.query, 60)), null, { enabled: false }));
  iina.menu.addItem(iina.menu.separator());

  engines.forEach(function (engine) {
    var title = t("menuSearchOn", engine.name);
    if (recordingMode && engine.key) title += "  " + prettyKey(engine.key);
    iina.menu.addItem(
      iina.menu.item(title, (function (id) {
        return function () { openSearch(id, false); };
      })(engine.id), menuOptions(engine.key))
    );
  });

  iina.menu.addItem(
    iina.menu.item(t("menuCopyFilename") + (recordingMode && copyKey ? "  " + prettyKey(copyKey) : ""),
      function () { copyCurrent(); }, menuOptions(copyKey))
  );

  if (engines.length) {
    iina.menu.addItem(
      iina.menu.item(t("menuRawSearch") + (recordingMode ? "  " + prettyKey("Meta+R") : ""), function () {
        openSearch(engines[0].id, true);
      }, menuOptions("Meta+R"))
    );
  }

  iina.menu.addItem(iina.menu.separator());
  iina.menu.addItem(
    iina.menu.item(t("menuOpenPanel") + (recordingMode ? "  " + prettyKey("Meta+K") : ""), function () {
      showSidebar();
    }, menuOptions("Meta+K"))
  );
}

// MARK: - 热键监听（比菜单快捷键更可靠，且支持 F1 这类键）

var boundKeys = [];
var lastKeySignature = null;

function wantHotkeys() {
  var list = [];
  if (recordingMode) return list;

  var engines = getEngines();
  engines.forEach(function (engine) {
    if (!engine.key) return;
    var exists = list.some(function (item) { return item[0] === engine.key; });
    if (exists) return;
    list.push([engine.key, (function (id) {
      return function () { openSearch(id, false); };
    })(engine.id)]);
  });

  var copyKey = getPref("copyKey");
  var copyExists = list.some(function (item) { return item[0] === copyKey; });
  if (copyKey && !copyExists) {
    list.push([copyKey, function () { copyCurrent(); }]);
  }
  return list;
}

/**
 * 增量重建热键监听。
 *
 * 两个刻意的设计：
 * 1) 不用「先全部注销再注册」——中途出状况会让所有热键一起失效、且难以自愈；
 *    这里先注册新键（IINA 对同键是覆盖式），全部处理完再回收多余的键。
 * 2) 每个键单独 try/catch——某个键被 IINA 拒绝时，不能让排在它后面的键
 *    一起陪葬。否则会出现「只有第一个热键有效，改一下配置才全好」的怪象。
 */
var failedKeys = [];

function rebindHotkeys() {
  var desired;
  try {
    desired = wantHotkeys();
  } catch (e) {
    log("读取热键配置失败，保留现有绑定: " + e);
    return;
  }

  var desiredKeys = desired.map(function (item) { return item[0]; });
  var failed = [];

  desired.forEach(function (item) {
    var handler = item[1];
    try {
      iina.input.onKeyDown(item[0], function () {
        try {
          handler();
        } catch (e) {
          log("执行热键失败 " + item[0] + ": " + e);
        }
        return true; // 阻止事件继续传给 mpv
      }, iina.input.PRIORITY_HIGH);
    } catch (e) {
      failed.push(item[0]);
      log("热键注册失败 " + item[0] + ": " + e);
    }
  });

  boundKeys.forEach(function (key) {
    if (desiredKeys.indexOf(key) >= 0) return;
    try {
      // 不能传 null 来「注销」：IINA 的 addListener 只接受对象型 callback，
      // 传 null 时它既不注册新回调、也不真正清掉旧 entry。这里注册一个
      // 返回 false 的空处理函数，等价于「不消费事件」，mpv 会继续拿到按键。
      iina.input.onKeyDown(key, function () { return false; }, iina.input.PRIORITY_HIGH);
    } catch (e) {
      log("注销热键失败 " + key + ": " + e);
    }
  });

  boundKeys = desiredKeys.filter(function (key) { return failed.indexOf(key) < 0; });
  failedKeys = failed;

  var signature = boundKeys.join(",") + "|failed:" + failedKeys.join(",");
  if (signature !== lastKeySignature) {
    lastKeySignature = signature;
    log("热键已就绪: " + (boundKeys.join(",") || "（无）") +
      (failedKeys.length ? "；失败: " + failedKeys.join(",") : ""));
  }
}

/**
 * 重建菜单并立刻让 IINA 应用它。
 *
 * 关键：IINA 只有在「插件菜单即将显示」时才触发 iina.menu-update
 * （MenuController.menuNeedsUpdate → updatePluginMenu → emit(.menuUpdate)）。
 * 也就是说面板没打开、菜单没点过时，NSMenu 里可能压根没有我们的条目，
 * 菜单快捷键也就不会生效。所以启动阶段必须主动 buildMenu + forceUpdate。
 */
var menuRefreshing = false;

function refreshMenu() {
  if (menuRefreshing) return;
  menuRefreshing = true;
  try {
    buildMenu();
    try {
      iina.menu.forceUpdate();
    } catch (e) {
      log("立即刷新菜单失败: " + e);
    }
  } catch (e) {
    log("重建菜单失败: " + e);
  } finally {
    menuRefreshing = false;
  }
}

// 菜单打开时由 IINA 触发；此时它自己会重建，不用再 forceUpdate
iina.event.on("iina.menu-update", buildMenu);

// MARK: - 侧边栏面板

function buildPayload(extra) {
  // 先更新绑定，这样下面的 hotkeys 列表是真正生效的那个
  rebindHotkeys();

  var info = getMediaInfo();
  var engines = getEngines();
  var copyKey = getPref("copyKey");
  var copyTarget = getPref("copyTarget") || "filename";

  var payload = {
    lang: LANG,
    hasMedia: !!info,
    filename: info ? info.filename : "",
    query: info ? info.query : "",
    engines: engines.map(function (engine) {
      return { id: engine.id, name: engine.name, tpl: engine.tpl, key: engine.key };
    }),
    copyKey: copyKey || "",
    hotkeys: boundKeys.slice(),
    copyTarget: copyTarget,
    // 面板里直接预览会复制成什么
    copyPreview: info
      ? (copyTarget === "query" ? info.query : stripExtension(info.filename))
      : "",
    warnings: collectWarnings(engines, copyKey).concat(
      failedKeys.length
        ? [t("warnFailedKeys", failedKeys.join(t("listSeparator")))]
        : []
    ),
    message: (extra && extra.message) || "",
    messageKind: (extra && extra.messageKind) || "",
    savedKey: (extra && extra.savedKey) || "",
    savedId: (extra && extra.savedId) || "",
  };

  return payload;
}

/** 只把状态推给面板，不动菜单。用于补推，避免菜单反复重建。 */
function pushSidebar(extra) {
  try {
    iina.sidebar.postMessage("state", buildPayload(extra));
  } catch (e) {
    log("推送面板状态失败: " + e);
  }
}

function pushState(extra) {
  var payload;
  try {
    payload = buildPayload(extra);
  } catch (e) {
    log("构建面板状态失败: " + e);
    return;
  }

  try {
    iina.sidebar.postMessage("state", payload);
  } catch (e) {
    log("推送面板状态失败: " + e);
  }

  // 菜单里的快捷键也跟着更新
  refreshMenu();
}

// MARK: - 面板装载
//
// 这里有一个很容易踩的坑，直接决定面板会不会「白板」：
//
//   IINA 的 sidebar.loadFile() 末尾会执行 messageHub.clearListeners()，
//   把之前注册的消息监听全部清空。
//
// 所以「先 onMessage 再 loadFile」的写法等于白注册：面板随后发来的 ready
// 根本没有人听，state 也就永远不会主动推过去。正确顺序只能是
// loadFile → 立刻重新 onMessage。
//
// 反过来，如果 ready 这次真的丢了，还有两道兜底：
//   1) 面板自己会在启动后发 refresh（带重试），插件的 cmd 监听能接住；
//   2) 任何 cmd 消息到达时都把面板标记为就绪，之后状态就能正常推。

var sidebarReady = false;
var lastSidebarLoad = 0;

/** 绑定 面板 → 插件 的消息通道。必须在 loadFile 之后调用。 */
function bindSidebarMessages() {
  iina.sidebar.onMessage("ready", function () {
    markSidebarReady();
    pushState();
    log("面板已就绪，已推送状态（引擎 " + getEngines().length + " 个）");
  });

  iina.sidebar.onMessage("cmd", function (payload) {
    // 面板能发消息就说明它活着，顺便修掉「ready 丢失后永远不推状态」的僵局
    markSidebarReady();
    handleCommand(payload || {});
  });
}

/**
 * 加载面板页面并重新绑定消息通道。
 *
 * 每次 loadFile 都会清空监听，因此这里做了节流：连续打开面板不会反复
 * 触发页面重载，避免用户正在编辑的引擎信息被刷掉。
 */
function ensureSidebar() {
  if (sidebarReady) return;

  var now = Date.now();
  if (now - lastSidebarLoad < 3000) return;
  lastSidebarLoad = now;

  try {
    iina.sidebar.loadFile("ui/sidebar.html");
  } catch (e) {
    log("加载侧边栏失败: " + e);
  }

  // loadFile 刚清空了监听，紧接着重新注册
  bindSidebarMessages();
  log("已加载面板页面并重新绑定消息通道");
}

function retryPush(delay) {
  setTimeout(function () {
    if (sidebarReady) return;
    pushSidebar();
  }, delay);
}

function showSidebar() {
  try {
    iina.sidebar.show();
  } catch (e) {
    log("显示侧边栏失败: " + e);
  }

  ensureSidebar();
  pushSidebar();

  // 刚显示时 WebView 可能还在加载，此时推的消息会被丢弃，补两次
  retryPush(250);
  retryPush(800);
}

function markSidebarReady() {
  if (!sidebarReady) {
    sidebarReady = true;
    log("面板已就绪");
  }
}

iina.event.on("iina.window-loaded", function () {
  // 先让热键与菜单就位：这一步不能等面板或文件事件，否则启动后热键可能一直不生效
  rebindHotkeys();
  refreshMenu();

  ensureSidebar();
});

// mpv 初始化完成后再补一次：此时输入系统和菜单控制器都已就绪
iina.event.on("iina.mpv-initialized", function () {
  rebindHotkeys();
  refreshMenu();
});

iina.event.on("iina.file-loaded", function () {
  // pushState 内部会重建热键与菜单
  pushState();
});

function handleCommand(payload) {
  var type = payload.type;
  var engines = getEngines();

  // 侧边栏 WebView 有焦点时按键不会进入播放器窗口，由面板转发过来
  if (type === "hotkey") {
    var pressed = String(payload.key || "");
    if (!pressed) return;
    if (pressed === getPref("copyKey")) {
      copyCurrent();
      return;
    }
    for (var h = 0; h < engines.length; h++) {
      if (engines[h].key === pressed) {
        openSearch(engines[h].id, false);
        return;
      }
    }
    return;
  }

  if (type === "search") {
    openSearch(payload.id, false);
    return;
  }

  if (type === "search-raw") {
    openSearch(payload.id, true);
    return;
  }

  if (type === "copy") {
    copyCurrent(payload.useRaw === true ? true : payload.useRaw === false ? false : null);
    return;
  }

  if (type === "add-engine") {
    var engine = { id: newEngineId(), name: t("newEngineName"), tpl: "https://www.google.com/search?q={q}", key: "" };
    engines.push(engine);
    if (saveEngines(engines)) {
      pushState({ message: t("msgAdded"), messageKind: "ok", savedId: engine.id });
    } else {
      pushState({ message: t("msgSaveFailed"), messageKind: "error" });
    }
    return;
  }

  if (type === "delete-engine") {
    var remaining = engines.filter(function (item) { return item.id !== payload.id; });
    if (remaining.length === engines.length) {
      pushState({ message: t("msgDeleteNotFound"), messageKind: "error" });
      return;
    }
    if (saveEngines(remaining)) {
      pushState({ message: t("msgDeleted"), messageKind: "ok" });
    } else {
      pushState({ message: t("msgSaveFailed"), messageKind: "error" });
    }
    return;
  }

  if (type === "save-engine") {
    var target = payload.engine || {};
    var found = null;
    for (var i = 0; i < engines.length; i++) {
      if (engines[i].id === target.id) found = engines[i];
    }
    if (!found) {
      pushState({ message: t("msgEngineGone"), messageKind: "error" });
      return;
    }

    var normalizedKey = normalizeKey(target.key);
    var keyInvalid = normalizedKey === null;

    found.name = String(target.name || "").trim() || t("untitled");
    found.tpl = String(target.tpl || "").trim();
    if (!keyInvalid) found.key = normalizedKey;

    if (saveEngines(engines)) {
      pushState({
        message: keyInvalid ? t("msgKeyInvalid") : "",
        messageKind: keyInvalid ? "error" : "",
        savedId: found.id,
        savedKey: keyInvalid ? "" : normalizedKey,
      });
    } else {
      pushState({ message: t("msgSaveFailed"), messageKind: "error" });
    }
    return;
  }

  if (type === "set-copy-key") {
    var copyNormalized = normalizeKey(payload.key);
    if (copyNormalized === null) {
      pushState({ message: t("msgKeyInvalidCopy"), messageKind: "error" });
      return;
    }
    setPref("copyKey", copyNormalized);
    pushState({ message: t("msgCopyKeySet", copyNormalized || t("emptyLabel")), messageKind: "ok", savedKey: copyNormalized });
    return;
  }

  if (type === "set-copy-target") {
    var target2 = payload.value === "query" ? "query" : "filename";
    setPref("copyTarget", target2);
    pushState({ message: t("msgCopyTargetChanged"), messageKind: "ok" });
    return;
  }

  if (type === "reset-engines") {
    if (saveEngines(defaultEngines())) {
      pushState({ message: t("msgEnginesReset"), messageKind: "ok" });
    } else {
      pushState({ message: t("msgSaveFailed"), messageKind: "error" });
    }
    return;
  }

  if (type === "recording") {
    var on = payload.on === true;
    if (on === recordingMode) return;
    recordingMode = on;
    // 录制时菜单不带快捷键，避免 AppKit 先把按键吃掉
    rebindHotkeys();
    refreshMenu();
    return;
  }

  if (type === "refresh") {
    // 面板能发消息就说明它已就绪；这里只补推状态，不重建菜单（重试较频繁）
    markSidebarReady();
    pushSidebar();
    return;
  }
}

ensureMigrated();
syncDefaultNames();
rebindHotkeys();
// 只在这里构建 JS 侧条目，不调 forceUpdate：此刻窗口/菜单控制器未必就绪，
// 强制刷新有风险，等 window-loaded 再刷新。
try {
  buildMenu();
} catch (e) {
  log("初始化菜单失败: " + e);
}
log("已加载 v1.4.0 (" + LANG + ")");
