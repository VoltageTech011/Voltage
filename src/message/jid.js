function normalizeJid(jid) {
    if (!jid) {
        return null;
    }

    return String(jid)
        .trim()
        .toLowerCase()
        .replace(/:\d+(?=@)/, "");
}

function getNumberFromJid(jid) {
    if (!jid) {
        return null;
    }

    const normalized =
        normalizeJid(jid);

    if (!normalized) {
        return null;
    }

    const match =
        normalized.match(/^(\d+)@/);

    return match
        ? match[1]
        : null;
}

function isGroupJid(jid) {
    return (
        typeof jid === "string" &&
        normalizeJid(jid)?.endsWith("@g.us")
    );
}

function isUserJid(jid) {
    const normalized =
        normalizeJid(jid);

    return Boolean(
        normalized &&
        (
            normalized.endsWith(
                "@s.whatsapp.net"
            ) ||
            normalized.endsWith("@lid")
        )
    );
}

function isLidJid(jid) {
    return (
        normalizeJid(jid)?.endsWith("@lid") ||
        false
    );
}

function isPhoneJid(jid) {
    return (
        normalizeJid(jid)?.endsWith(
            "@s.whatsapp.net"
        ) || false
    );
}

function toPhoneJid(number) {
    if (!number) {
        return null;
    }

    const normalized =
        String(number)
            .replace(/\D/g, "")
            .replace(/^0+/, "");

    if (!normalized) {
        return null;
    }

    return `${normalized}@s.whatsapp.net`;
}

module.exports = {
    normalizeJid,
    getNumberFromJid,
    isGroupJid,
    isUserJid,
    isLidJid,
    isPhoneJid,
    toPhoneJid
};
