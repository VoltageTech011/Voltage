const {
    reply
} = require("../message/response");

module.exports = {
    name: "ping",

    aliases: [
        "p"
    ],

    description:
        "Check if Voltage is online.",

    usage:
        ".ping",

    async execute(message) {
        const start =
            Date.now();

        const sent =
            await reply(
                message,
                "Pong."
            );

        const latency =
            Date.now() - start;

        if (sent?.key) {
            console.log(
                `[Voltage] Ping response: ${latency}ms`
            );
        }

        return sent;
    }
};
