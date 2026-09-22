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
    name: "demote",

    aliases: [
        "unadmin"
    ],

    description:
        "Remove a member's group admin status.",

    usage:
        ".demote @user",

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
                "Tag, reply to, or provide the number of the admin you want to demote."
            );
        }

        if (
            target === message.sender
        ) {
            return reply(
                message,
                "You can't demote yourself."
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
            !isTargetAdmin(
                message,
                target
            )
        ) {
            return reply(
                message,
                "That member is not a group admin."
            );
        }

        try {
            await message.sock.groupParticipantsUpdate(
                message.from,
                [target],
                "demote"
            );

            return reply(
                message,
                `\`${getDisplayNumber(target)}\` is no longer a group admin.`
            );
        } catch (error) {
            console.error(
                "[Voltage] Demote failed:",
                error
            );

            return reply(
                message,
                "I couldn't demote that member. WhatsApp rejected the action."
            );
        }
    }
};
