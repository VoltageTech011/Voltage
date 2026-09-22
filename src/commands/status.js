const {
    reply
} = require("../message/response");

module.exports = {
    name: "status",

    aliases: [
        "state"
    ],

    description:
        "Show Voltage system status.",

    usage:
        ".status",

    async execute(message) {
        const uptime =
            Math.floor(
                process.uptime()
            );

        const hours =
            Math.floor(
                uptime / 3600
            );

        const minutes =
            Math.floor(
                (uptime % 3600) / 60
            );

        const seconds =
            uptime % 60;

        const text = [
            "*Voltage Status*",
            "",
            "System: Online",
            "WhatsApp: Connected",
            `Uptime: ${hours}h ${minutes}m ${seconds}s`,
            `Mode: ${
                process.env.MODE || "private"
            }`
        ].join("\n");

        return reply(
            message,
            text
        );
    }
};
