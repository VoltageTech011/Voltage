const {
    getNumberFromJid,
    normalizeJid
} = require("../message/jid");

function getParticipants(message) {
    return (
        message?.groupMetadata?.participants ||
        []
    );
}

function normalizeNumber(value) {
    if (!value) {
        return null;
    }

    return String(value)
        .replace(/\D/g, "")
        .replace(/^0+/, "")
        .trim();
}

function getConfiguredOwner() {
    return normalizeNumber(
        process.env.OWNER_NUMBER ||
        process.env.OWNER_PHONE ||
        ""
    );
}

function getConnectedJids(message) {
    const user =
        message?.sock?.user;

    if (!user) {
        return [];
    }

    return [
        user.id,
        user.lid
    ]
        .filter(Boolean)
        .map(
            jid =>
                normalizeJid(jid)
        )
        .filter(Boolean);
}

function getConnectedNumber(message) {
    const jids =
        getConnectedJids(
            message
        );

    for (
        const jid
        of jids
    ) {
        const number =
            normalizeNumber(
                getNumberFromJid(
                    jid
                )
            );

        if (number) {
            return number;
        }
    }

    return null;
}

function isOwner(
    jid,
    message = null
) {
    if (
        message?.isFromMe
    ) {
        return true;
    }

    const senderJid =
        normalizeJid(jid);

    if (!senderJid) {
        return false;
    }

    const senderNumber =
        normalizeNumber(
            getNumberFromJid(
                senderJid
            )
        );

    const configuredOwner =
        getConfiguredOwner();

    if (
        configuredOwner &&
        senderNumber &&
        senderNumber ===
            configuredOwner
    ) {
        return true;
    }

    const connectedJids =
        getConnectedJids(
            message
        );

    if (
        connectedJids.includes(
            senderJid
        )
    ) {
        return true;
    }

    const connectedNumber =
        getConnectedNumber(
            message
        );

    if (
        connectedNumber &&
        senderNumber &&
        senderNumber ===
            connectedNumber
    ) {
        return true;
    }

    return false;
}

function isDev(jid) {
    const senderNumber =
        normalizeNumber(
            getNumberFromJid(jid)
        );

    if (!senderNumber) {
        return false;
    }

    const developers =
        String(
            process.env.DEV_NUMBERS ||
            ""
        )
            .split(",")
            .map(
                number =>
                    normalizeNumber(
                        number
                    )
            )
            .filter(Boolean);

    return developers.includes(
        senderNumber
    );
}

function getParticipant(
    message,
    jid
) {
    const target =
        normalizeJid(jid);

    if (!target) {
        return null;
    }

    return getParticipants(message)
        .find(
            participant =>
                normalizeJid(
                    participant?.id
                ) === target
        ) || null;
}

function findBotParticipant(
    message
) {
    const participants =
        getParticipants(
            message
        );

    const connectedJids =
        getConnectedJids(
            message
        );

    for (
        const participant
        of participants
    ) {
        const participantJid =
            normalizeJid(
                participant?.id
            );

        if (
            participantJid &&
            connectedJids.includes(
                participantJid
            )
        ) {
            return participant;
        }
    }

    const connectedNumber =
        getConnectedNumber(
            message
        );

    if (connectedNumber) {
        for (
            const participant
            of participants
        ) {
            const number =
                normalizeNumber(
                    getNumberFromJid(
                        participant?.id
                    )
                );

            if (
                number &&
                number ===
                    connectedNumber
            ) {
                return participant;
            }
        }
    }

    return null;
}

function isAdminParticipant(
    participant
) {
    if (!participant) {
        return false;
    }

    return (
        participant.admin ===
            "admin" ||
        participant.admin ===
            "superadmin"
    );
}

function isRequesterAdmin(
    message
) {
    if (message?.isOwner) {
        return true;
    }

    return isAdminParticipant(
        getParticipant(
            message,
            message?.sender
        )
    );
}

function isBotAdmin(message) {
    return isAdminParticipant(
        findBotParticipant(
            message
        )
    );
}

function isTargetAdmin(
    message,
    jid
) {
    return isAdminParticipant(
        getParticipant(
            message,
            jid
        )
    );
}

function isTargetInGroup(
    message,
    jid
) {
    return Boolean(
        getParticipant(
            message,
            jid
        )
    );
}

function canManageGroup(
    message
) {
    if (!message?.isGroup) {
        return {
            allowed: false,
            reason: "group"
        };
    }

    if (!isRequesterAdmin(message)) {
        return {
            allowed: false,
            reason: "requester"
        };
    }

    if (!isBotAdmin(message)) {
        return {
            allowed: false,
            reason: "bot"
        };
    }

    return {
        allowed: true,
        reason: null
    };
}

module.exports = {
    getParticipants,
    getParticipant,
    normalizeNumber,
    getConnectedJids,
    getConnectedNumber,
    isOwner,
    isDev,
    isAdminParticipant,
    isRequesterAdmin,
    isBotAdmin,
    isTargetAdmin,
    isTargetInGroup,
    canManageGroup
};
