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

function getConnectedNumber(message) {
    const jid =
        message?.sock?.user?.id;

    if (!jid) {
        return null;
    }

    return normalizeNumber(
        getNumberFromJid(jid)
    );
}

function isOwner(
    jid,
    message = null
) {
    const senderNumber =
        normalizeNumber(
            getNumberFromJid(jid)
        );

    if (!senderNumber) {
        return false;
    }

    const configuredOwner =
        getConfiguredOwner();

    if (
        configuredOwner &&
        senderNumber === configuredOwner
    ) {
        return true;
    }

    const connectedNumber =
        getConnectedNumber(message);

    if (
        connectedNumber &&
        senderNumber === connectedNumber
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
                    normalizeNumber(number)
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

function isRequesterAdmin(message) {
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

function canManageGroup(message) {
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
    isOwner,
    isDev,
    isAdminParticipant,
    isRequesterAdmin,
    isBotAdmin,
    isTargetAdmin,
    isTargetInGroup,
    canManageGroup
};
