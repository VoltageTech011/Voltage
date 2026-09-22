const {
    reply
} = require("../message/response");

module.exports = {
    name: "protocol",

    aliases: [
        "rules",
        "config"
    ],

    description:
        "Display Voltage's current operating protocol.",

    usage:
        ".protocol",

    async execute(message) {
        const mode =
            process.env.MODE ||
            process.env.BOT_MODE ||
            "private";

        const prefix =
            process.env.PREFIX ||
            ".";

        const version =
            process.env.VERSION ||
            "1.0.0";

        const owner =
            process.env.OWNER_NAME ||
            "Thereal_VoltageLord";

        const trigger =
            message.isGroup
                ? "GROUP FILTER"
                : "DM FILTER";

        return reply(
            message,
`╭──〔 VOLTAGE // PROTOCOL 〕──╮
│                            │
│  OPERATING PROTOCOL        │
│                            │
│  OWNER       ${owner}
│  VERSION     ${version}
│  PREFIX      ${prefix}
│  MODE        ${mode.toUpperCase()}
│  CONTEXT     ${trigger}
│                            │
│  CORE RULES                │
│  ├─ Permission checks      │
│  ├─ Command routing        │
│  ├─ Session protection     │
│  ├─ Group trigger filter   │
│  └─ Owner authorization    │
│                            │
│  STATUS: ● ENFORCED        │
│                            │
╰────────────────────────────╯`
        );
    }
};
