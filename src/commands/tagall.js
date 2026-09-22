const {
    reply
} = require("../message/response");

const {
    isRequesterAdmin
} = require("../group/permissions");

module.exports = {
    name: "tagall",

    aliases: [
        "everyone",
        "all"
    ],

    description:
        "Mention everyone in the group.",

    usage:
        ".tagall [message]",

    async execute(
        message,
        { args = [] } = {}
    ) {
        if (!message.isGroup) {
            return reply(
                message,
                "This command can only be used inside a group."
            );
        }

        if (!isRequesterAdmin(message)) {
            return reply(
                message,
                "Only group admins can use `.tagall`."
            );
        }

        const participants =
            message.groupMetadata?.participants ||
            [];

        if (!participants.length) {
            return reply(
                message,
                "I couldn't load the group members."
            );
        }

        const mentions =
            participants
                .map(
                    participant =>
                        participant.id
                )
                .filter(Boolean);

        const customText =
            args.join(" ").trim();

        const header =
            customText ||
            "Attention, everyone.";

        const lines = [
            "╭──〔 VOLTAGE // GROUP 〕──╮",
            "│                          │",
            `│  ${header}`,
            "│                          │",
            "╰──────────────────────────╯",
            ""
        ];

        for (
            const participant of participants
        ) {
            const number =
                String(
                    participant.id || ""
                )
                    .split("@")[0]
                    .split(":")[0];

            lines.push(
                `@${number}`
            );
        }

        return message.sock.sendMessage(
            message.from,
            {
                text:
                    lines.join("\n"),
                mentions
            },
            {
                quoted:
                    message.raw
            }
        );
    }
};
