const {
    reply
} = require("../message/response");

const registry =
    require("../plugins/registry");

function formatRuntime() {
    const uptime =
        Math.floor(process.uptime());

    const days =
        Math.floor(uptime / 86400);

    const hours =
        Math.floor(
            (uptime % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (uptime % 3600) / 60
        );

    const seconds =
        uptime % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

function getCommands(names) {
    return names
        .map(name => registry.get(name))
        .filter(Boolean);
}

function formatCommand(command) {
    return `┋ ⬡ ${command.name}`;
}

module.exports = {
    name: "menu",

    aliases: [
        "help",
        "commands"
    ],

    description:
        "Show the Voltage command menu.",

    usage:
        ".menu",

    async execute(message) {
        const groupCommands = getCommands([
            "tagall",
            "promote",
            "demote",
            "kick",
            "del",
            "warn",
            "add",
            "leave",
            "open",
            "close"
        ]);

        const systemCommands = getCommands([
            "menu",
            "help",
            "ping",
            "about",
            "owner",
            "pair",
            "private",
            "public"
        ]);

        const commandCount =
            registry.size();

        const owner =
            process.env.MENU_OWNER ||
            process.env.OWNER_NAME ||
            "Thereal_voltagelord0";

        const prefix =
            process.env.PREFIX || ".";

        const mode =
            process.env.MODE ||
            process.env.BOT_MODE ||
            "private";

        const version =
            process.env.VERSION ||
            "1.0.0";

        const runtime =
            formatRuntime();

        const lines = [
            "╭┈───〔 VOLTAGE ASSISTANT 〕┈───⊷",
            `├✦ Owner: ${owner}`,
            `├✦ Commands: ${commandCount}`,
            `├✦ Runtime: ${runtime}`,
            `├✦ Prefix: ${prefix}`,
            `├✦ Mode: ${mode}`,
            `├✦ Version: ${version}`,
            "╰───────────────────⊷",
            "",
            "`『 GROUP 』`",
            "╭───────────────────⊷"
        ];

        for (const command of groupCommands) {
            lines.push(
                formatCommand(command)
            );
        }

        lines.push(
            "╰───────────────────⊷",
            "",
            "`『 SYSTEM 』`",
            "╭───────────────────⊷"
        );

        for (const command of systemCommands) {
            lines.push(
                formatCommand(command)
            );
        }

        lines.push(
            "╰───────────────────⊷",
            "",
            "> *©️ Powered by Thereal_VoltageLord*"
        );

        return reply(
            message,
            lines.join("\n")
        );
    }
};
