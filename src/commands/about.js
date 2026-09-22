const {
    reply
} = require("../message/response");

module.exports = {
    name: "about",

    aliases: [
        "info"
    ],

    description:
        "Show information about Voltage.",

    usage:
        ".about",

    async execute(message) {
        const name =
            process.env.VOLTAGE_NAME ||
            "Voltage";

        const version =
            process.env.VERSION ||
            "1.0.0";

        const owner =
            process.env.OWNER_NAME ||
            "Thereal_VoltageLord";

        const text = [
            `*${name}*`,
            "",
            "A personal multi-capability AI system.",
            "",
            `Version: ${version}`,
            `Owner: ${owner}`,
            "Platform: WhatsApp",
            "Runtime: Node.js"
        ].join("\n");

        return reply(
            message,
            text
        );
    }
};
