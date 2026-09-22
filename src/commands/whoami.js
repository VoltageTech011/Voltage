const {
    reply
} = require("../message/response");

module.exports = {
    name: "whoami",

    aliases: [
        "identity",
        "me"
    ],

    description:
        "Display your Voltage identity.",

    usage:
        ".whoami",

    async execute(message) {
        const name =
            message.pushName ||
            "Unknown";

        const number =
            message.senderNumber ||
            "Unknown";

        const role =
            message.isOwner
                ? "OWNER"
                : message.isDev
                    ? "DEVELOPER"
                    : "USER";

        const access =
            message.isOwner
                ? "ROOT"
                : message.isDev
                    ? "ELEVATED"
                    : "STANDARD";

        const context =
            message.isGroup
                ? "GROUP"
                : "PRIVATE";

        const text =
`╭──〔 VOLTAGE // IDENTITY 〕──╮
│                            │
│  > identity.lookup()       │
│  > resolving user...       │
│  > access verified         │
│                            │
│  USER                      │
│  ├─ Name: ${name}
│  ├─ Number: ${number}
│  ├─ Role: ${role}
│  ├─ Access: ${access}
│  └─ Context: ${context}
│                            │
╰────────────────────────────╯`;

        return reply(
            message,
            text
        );
    }
};
