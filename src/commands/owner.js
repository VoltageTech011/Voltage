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

        return reply(
            message,
            `Voltage was created and is owned by ${owner}.`
        );
    }
};
