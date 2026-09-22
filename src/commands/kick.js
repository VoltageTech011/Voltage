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
    name: "kick",

    aliases: [
        "remove"
    ],

    description:
        "Remove a member from the group.",

    usage:
        ".kick @user",

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
                "Tag, reply to, or provide the number of the member you want to remove."
            );
        }

        if (
            target === message.sender
        ) {
            return reply(
                message,
                "You can't remove yourself with `.kick`."
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
                "That member is an admin. Demote them first."
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

        try {
            await message.sock.groupParticipantsUpdate(
                message.from,
                [target],
                "remove"
            );

            return reply(
                message,
                `Member \`${getDisplayNumber(target)}\` has been removed.`
            );
        } catch (error) {
            console.error(
                "[Voltage] Kick failed:",
                error
            );

            return reply(
                message,
                "I couldn't remove that member. WhatsApp rejected the action."
            );
        }
    }
};
