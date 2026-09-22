const {
    reply,
    edit
} = require("../message/response");

module.exports = {
    name: "ping",

    aliases: [
        "p"
    ],

    description:
        "Check Voltage's connection latency.",

    usage:
        ".ping",

    async execute(message) {
        const start =
            Date.now();

        const sent =
            await reply(
                message,
`┌─[ VOLTAGE // CORE ]─────────┐
│                             │
│  > initializing core...     │
│  > loading network...       │
│                             │
│  CORE  [██░░░░░░░░] 25%     │
│                             │
└─────────────────────────────┘`,
                {
                    footer: false
                }
            );

        const latency =
            Date.now() - start;

        if (!sent?.key) {
            return sent;
        }

        const wait =
            ms =>
                new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            ms
                        )
                );

        await wait(700);

        await edit(
            message,
`┌─[ VOLTAGE // CORE ]─────────┐
│                             │
│  > initializing core... OK  │
│  > loading network...       │
│                             │
│  CORE  [█████░░░░░░] 50%    │
│                             │
└─────────────────────────────┘`,
            {
                footer: false
            }
        );

        await wait(700);

        await edit(
            message,
`┌─[ VOLTAGE // CORE ]─────────┐
│                             │
│  > initializing core... OK  │
│  > network handshake... OK  │
│  > measuring response...    │
│                             │
│  CORE  [████████░░░░] 75%   │
│                             │
└─────────────────────────────┘`,
            {
                footer: false
            }
        );

        await wait(700);

        const result =
            await edit(
                message,
`┌─[ VOLTAGE // CORE ]─────────┐
│                             │
│  > initializing core... OK  │
│  > network handshake... OK  │
│  > response received... OK  │
│                             │
│  STATUS   : ONLINE          │
│  LATENCY  : ${latency} ms   │
│  CORE     : 100% ✓          │
│                             │
└─────────────────────────────┘`
            );

        console.log(
            `[Voltage] Ping response: ${latency}ms`
        );

        return result;
    }
};
