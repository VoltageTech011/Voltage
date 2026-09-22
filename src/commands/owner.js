const {
    reply
} = require("../message/response");

module.exports = {
    name: "owner",

    aliases: [
        "creator"
    ],

    description:
        "Show Voltage's owner.",

    usage:
        ".owner",

    async execute(message) {
        const owner =
            process.env.OWNER_NAME ||
            "Thereal_VoltageLord";

        await message.react("⚡");

        const panel =
`╭──〔 VOLTAGE // SOURCE 〕──╮
│                          │
│  [!] SOURCE IDENTIFIED   │
│                          │
│  root@voltage:~$ whoami  │
│  > THΞRΞΛL_VØLTΛGΞLØRD   │
│                          │
│  ACCESS: OWNER           │
│  STATUS: VERIFIED        │
│                          │
│  CODE → BUILD → BREAK    │
│       → LEARN → REPEAT   │
│                          │
│  "Different isn't a      │
│   destination. It's the  │
│   way you build."        │
╰──────────────────────────╯`;

        await reply(
            message,
            panel
        );

        const connectedJid =
            message.sock?.user?.id ||
            message.sock?.user?.jid ||
            null;

        if (!connectedJid) {
            return;
        }

        const cleanJid =
            connectedJid.split(":")[0];

        const phone =
            cleanJid.split("@")[0];

        if (!phone) {
            return;
        }

        return message.send({
            contacts: {
                displayName: owner,
                contacts: [
                    {
                        vcard:
`BEGIN:VCARD
VERSION:3.0
FN:${owner}
N:${owner};;;;
TEL;type=CELL;type=VOICE;waid=${phone}:+${phone}
END:VCARD`
                    }
                ]
            }
        });
    }
};
