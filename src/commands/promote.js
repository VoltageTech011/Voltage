const {
    reply
} = require("../message/response");

const {
    canManageGroup,
    isTargetAdmin,
    isTargetInGroup
} = require("../group/permissions");

const {
    getTarget,
    getDisplayNumber,
    permissionMessage
} = require("../group/helpers");

module.exports = {
    name: "promote",

    aliases: [
        "admin"
    ],

    description:
        "Promote a group member to admin.",

    usage:
        ".promote @user",

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

        const target =
            getTarget(
                message,
                args
            );

        if (!target) {
            return reply(
                message,
                "Tag, reply to, or provide the number of the member you want to promote."
            );
        }

        if (
            !isTargetInGroup(
                message,
                target
            )
        ) {
            return reply(
                message,
                `Member \`${getDisplayNumber(target)}\` is not in this group.`
            );
        }

        if (
            isTargetAdmin(
                message,
                target
            )
        ) {
            return reply(
                message,
                "That member is already an admin."
            );
        }

        try {
            await message.sock.groupParticipantsUpdate(
                message.from,
                [target],
                "promote"
            );

            return reply(
                message,
                `\`${getDisplayNumber(target)}\` is now a group admin.`
            );
        } catch (error) {
            console.error(
                "[Voltage] Promote failed:",
                error
            );

            return reply(
                message,
                "I couldn't promote that member. WhatsApp rejected the action."
            );
        }
    }
};
