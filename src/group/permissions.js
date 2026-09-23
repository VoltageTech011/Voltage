function getParticipants(message) {
    return (
        message?.groupMetadata?.participants ||
        []
    );
}

function normalizeJid(jid) {
    if (!jid) {
        return null;
    }

    return String(jid)
        .trim()
        .toLowerCase();
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

function isAdminParticipant(
    participant
) {
    if (!participant) {
        return false;
    }

    return (
        participant.admin === "admin" ||
        participant.admin === "superadmin"
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

function getBotJid(message) {
    return (
        message?.sock?.user?.id ||
        null
    );
}

function isBotAdmin(message) {
    const botJid =
        getBotJid(message);

    if (!botJid) {
        return false;
    }

    return isAdminParticipant(
        getParticipant(
            message,
            botJid
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
    isAdminParticipant,
    isRequesterAdmin,
    isBotAdmin,
    isTargetAdmin,
    isTargetInGroup,
    canManageGroup
};
