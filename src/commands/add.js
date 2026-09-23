const {
    reply
} = require("../message/response");

const {
    canManageGroup
} = require("../group/permissions");

const {
    cleanNumber,
    numberToJid,
    getDisplayNumber,
    permissionMessage
} = require("../group/helpers");

module.exports = {
    name: "add",

    aliases: [
        "invite"
    ],

    description:
        "Add a WhatsApp number to the group.",

    usage:
        ".add 2348012345678",

    async execute(
        message,
        { args = [] } = {}
    ) {
        const permission =
            canManageGroup(message);

        if (!permission.allowed) {
            return reply(
                message,
                permissionMessage(
                    permission.reason
                )
            );
        }

        const number =
            cleanNumber(
                args[0]
            );

        if (!number) {
            return reply(
                message,
                "Provide a WhatsApp number.\n\nExample: `.add 2348012345678`"
            );
        }

        if (
            number.length < 7 ||
            number.length > 15
        ) {
            return reply(
                message,
                "That doesn't look like a valid international phone number."
            );
        }

        const target =
            numberToJid(number);

        try {
            const result =
                await message.sock.groupParticipantsUpdate(
                    message.from,
                    [target],
                    "add"
                );

            const status =
                result?.[0]?.status;

            if (
                status &&
                status !== "200"
            ) {
                return reply(
                    message,
                    `I couldn't add \`${getDisplayNumber(target)}\`.\n\nWhatsApp response: ${status}`
                );
            }

            return reply(
                message,
                `Add request sent for \`${getDisplayNumber(target)}\`.`
            );
        } catch (error) {
            console.error(
                "[Voltage] Add failed:",
                error
            );

            return reply(
                message,
                "I couldn't add that number. WhatsApp rejected the request."
            );
        }
    }
};
