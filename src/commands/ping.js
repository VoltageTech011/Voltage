const {
    reply
} = require("../message/response");

module.exports = {
    name: "ping",
    aliases: [],
    description: "Check Voltage response time.",

    async execute(message) {
        const started =
            Date.now();

        await reply(
            message,
            "Pong."
        );

        const elapsed =
            Date.now() - started;

        return elapsed;
    }
};
