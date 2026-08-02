const chalk = require("chalk");

const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function getWIBTimeString() {
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wibTime.toISOString().slice(11, 19); // HH:MM:SS
}

const logger = {
  info: (tag, msg) => {
    console.log(
      chalk.cyan(`[${getWIBTimeString()}]`) +
      chalk.blue(` [${tag}] `) +
      chalk.white(msg)
    );
  },
  success: (tag, msg) => {
    console.log(
      chalk.cyan(`[${getWIBTimeString()}]`) +
      chalk.green(` [${tag}] `) +
      chalk.white(msg)
    );
  },
  warn: (tag, msg) => {
    console.log(
      chalk.cyan(`[${getWIBTimeString()}]`) +
      chalk.yellow(` [${tag}] `) +
      chalk.white(msg)
    );
  },
  error: (tag, msg) => {
    console.log(
      chalk.cyan(`[${getWIBTimeString()}]`) +
      chalk.red(` [${tag}] `) +
      chalk.white(msg)
    );
  },
  debug: (tag, msg) => {
    if (process.env.DEBUG) {
      console.log(
        chalk.cyan(`[${getWIBTimeString()}]`) +
        chalk.magenta(` [${tag}] `) +
        chalk.gray(msg)
      );
    }
  },
};

function logMessage({ chatType, groupName, pushName, sender, message }) {
  const time = chalk.gray(`[${getWIBTimeString()}]`);
  const type = chatType === "group"
    ? chalk.blue(`[GROUP:${groupName}]`)
    : chalk.magenta("[PRIVATE]");
  const user = chalk.yellow(`${pushName}`);
  const msg = chalk.white(message?.substring(0, 80) || "");
  console.log(`${time} ${type} ${user}: ${msg}`);
}

function logCommand(command, pushName, chatType) {
  const time = chalk.gray(`[${getWIBTimeString()}]`);
  const type = chatType === "group"
    ? chalk.blue("[GROUP]")
    : chalk.magenta("[PRIVATE]");
  const cmd = chalk.green(`${command}`);
  const user = chalk.yellow(pushName);
  console.log(`${time} ${type} ${cmd} by ${user}`);
}

function createBanner(lines, color = "cyan") {
  const chalkColor = chalk[color] || chalk.cyan;
  const maxLen = Math.max(...lines.map(l => l.length));
  const border = chalkColor("=".repeat(maxLen + 4));
  const result = [
    `+${border}+`,
    ...lines.map(l => `|  ${chalkColor(l.padEnd(maxLen))}  |`),
    `+${border}+`,
  ];
  return result.join("\n");
}

module.exports = { chalk, c, logger, logMessage, logCommand, createBanner };
