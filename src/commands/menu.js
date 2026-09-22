const {
    reply
} = require("../message/response");

const registry =
    require("../plugins/registry");

module.exports = {
    name: "menu",

    aliases: [
        "help",
        "commands"
    ],

    description:
        "Show available Voltage commands.",

    usage:
        ".menu",

    async execute(message) {
        const plugins =
            registry
                .all()
                .sort((a, b) =>
                    a.name.localeCompare(
                        b.name
                    )
                );

        const lines = [
            "*Voltage Command Menu*",
            ""
        ];

        for (const plugin of plugins) {
            lines.push(
                `• ${plugin.usage || `.${plugin.name}`} — ${plugin.description || "No description"}`
            );
        }

        lines.push(
            "",
            `Total commands: ${plugins.length}`
        );

        return reply(
            message,
            lines.join("\n")
        );
    }
};
