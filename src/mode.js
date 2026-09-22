const {
    reply
} = require("../message/response");

module.exports = {
    name: "mode",

    aliases: [
        "botmode"
    ],

    description:
        "Change Voltage's operating mode.",

    usage:
        ".mode private",

    async execute(message) {
        if (!message.isOwner) {
            return reply(
                message,
                "Only the Voltage owner can change the operating mode."
            );
        }

        const requested =
            String(
                message.text || ""
            )
                .trim()
                .split(/\s+/)[1]
                ?.toLowerCase();

        const current =
            String(
                process.env.MODE ||
                process.env.BOT_MODE ||
                "private"
            ).toLowerCase();

        if (!requested) {
            return reply(
                message,
`╭──〔 VOLTAGE // MODE 〕──╮
│                        │
│  CURRENT MODE          │
│  └─ ${current.toUpperCase()}
│                        │
│  AVAILABLE             │
│  ├─ .mode private      │
│  └─ .mode public       │
│                        │
╰────────────────────────╯`
            );
        }

        if (
            requested !== "private" &&
            requested !== "public"
        ) {
            return reply(
                message,
`╭──〔 VOLTAGE // MODE 〕──╮
│                        │
│  INVALID MODE          │
│                        │
│  Use:                  │
│  .mode private         │
│  .mode public          │
│                        │
╰────────────────────────╯`
            );
        }

        if (requested === current) {
            return reply(
                message,
`╭──〔 VOLTAGE // MODE 〕──╮
│                        │
│  MODE ALREADY ACTIVE   │
│                        │
│  CURRENT: ${current.toUpperCase()}
│  STATUS: ● ACTIVE      │
│                        │
╰────────────────────────╯`
            );
        }

        process.env.MODE =
            requested;

        process.env.BOT_MODE =
            requested;

        return reply(
            message,
`╭──〔 VOLTAGE // MODE 〕──╮
│                        │
│  MODE CHANGE           │
│                        │
│  FROM: ${current.toUpperCase()}
│  TO:   ${requested.toUpperCase()}
│                        │
│  STATUS: ● ACTIVE      │
│                        │
╰────────────────────────╯`
        );
    }
};
