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
        .map(
            name =>
                registry.get(name)
        )
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
        const groupCommands =
            getCommands([
                "tagall",
                "tagadmin",
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

        const systemCommands =
            getCommands([
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
            "Thereal_VoltageLord";

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
            "╭──────「 ⚡ VOLTAGE 」──────╮",
            "│                           │",
            "│   PERSONAL AI SYSTEM      │",
            "│                           │",
            `│   STATUS   : ● ONLINE     │`,
            `│   OWNER    : ${owner}`,
            `│   COMMANDS : ${commandCount}`,
            `│   RUNTIME  : ${runtime}`,
            `│   PREFIX   : ${prefix}`,
            `│   MODE     : ${mode}`,
            `│   VERSION  : ${version}`,
            "│                           │",
            "╰───────────────────────────╯",
            "",
            "`『 GROUP OPERATIONS 』`",
            "╭───────────────────────────╮"
        ];

        for (
            const command
            of groupCommands
        ) {
            lines.push(
                formatCommand(command)
            );
        }

        lines.push(
            "╰───────────────────────────╯",
            "",
            "`『 SYSTEM 』`",
            "╭───────────────────────────╮"
        );

        for (
            const command
            of systemCommands
        ) {
            lines.push(
                formatCommand(command)
            );
        }

        lines.push(
            "╰───────────────────────────╯",
            "",
            "╭──────「 CORE STATUS 」─────╮",
            "│                           │",
            "│  ⚡ Core Engine : ONLINE  │",
            "│  ◉ WhatsApp    : ACTIVE   │",
            `│  ◇ Plugins     : ${commandCount} LOADED`,
            `│  ◈ Runtime     : ${runtime}`,
            "│                           │",
            "╰───────────────────────────╯",
            "",
            "> `Don't just use it. Watch it evolve.`",
            "",
            "> *©️ Powered by Thereal_VoltageLord*"
        );

        return reply(
            message,
            lines.join("\n"),
            {
                footer: false
            }
        );
    }
};
