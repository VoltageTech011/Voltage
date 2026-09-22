const {
    reply
} = require("../message/response");

module.exports = {
    name: "trace",

    aliases: [
        "inspect"
    ],

    description:
        "Inspect the current message route and context.",

    usage:
        ".trace",

    async execute(message) {
        const messageId =
            message.id ||
            "UNKNOWN";

        const sender =
            message.senderNumber ||
            "UNKNOWN";

        const type =
            message.type ||
            "UNKNOWN";

        const context =
            message.isGroup
                ? "GROUP"
                : "PRIVATE";

        const trigger =
            message.trigger ||
            "COMMAND";

        const quoted =
            message.quoted
                ? "YES"
                : "NO";

        const mentions =
            Array.isArray(
                message.mentions
            )
                ? message.mentions.length
                : 0;

        return reply(
            message,
`╭──〔 VOLTAGE // TRACE 〕──╮
│                         │
│  MESSAGE TRACE          │
│                         │
│  SOURCE                 │
│  ├─ Sender: ${sender}
│  ├─ Type: ${type}
│  ├─ Context: ${context}
│  ├─ Quoted: ${quoted}
│  └─ Mentions: ${mentions}
│                         │
│  MESSAGE ID             │
│  └─ ${messageId}
│                         │
│  TRIGGER                │
│  └─ ${trigger}
│                         │
│  ROUTE                  │
│  └─ Voltage Core        │
│                         │
╰─────────────────────────╯`
        );
    }
};
