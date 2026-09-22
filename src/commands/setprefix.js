const {
    reply
} = require("../message/response");

module.exports = {
    name: "setprefix",

    aliases: [
        "prefix"
    ],

    description:
        "Change Voltage's command prefix.",

    usage:
        ".setprefix !",

    async execute(message, { args = [] } = {}) {
        if (!message.isOwner) {
            return reply(
                message,
                "Only the Voltage owner can change the command prefix."
            );
        }

        const newPrefix =
            String(args[0] || "").trim();

        const currentPrefix =
            process.env.PREFIX || ".";

        if (!newPrefix) {
            return reply(
                message,
`╭──〔 VOLTAGE // PREFIX 〕──╮
│                          │
│  CURRENT PREFIX          │
│  └─ ${currentPrefix}
│                          │
│  USAGE                   │
│  └─ .setprefix <new>     │
│                          │
│  EXAMPLE                 │
│  └─ .setprefix !         │
│                          │
╰──────────────────────────╯`
            );
        }

        if (
            newPrefix.length > 3 ||
            /\s/.test(newPrefix)
        ) {
            return reply(
                message,
`╭──〔 VOLTAGE // PREFIX 〕──╮
│                          │
│  INVALID PREFIX          │
│                          │
│  Prefix must be 1–3      │
│  characters and contain  │
│  no spaces.              │
│                          │
╰──────────────────────────╯`
            );
        }

        process.env.PREFIX =
            newPrefix;

        return reply(
            message,
`╭──〔 VOLTAGE // PREFIX 〕──╮
│                          │
│  COMMAND PREFIX UPDATED  │
│                          │
│  OLD  →  ${currentPrefix}
│  NEW  →  ${newPrefix}
│                          │
│  STATUS: ● ACTIVE        │
│                          │
╰──────────────────────────╯`
        );
    }
};
