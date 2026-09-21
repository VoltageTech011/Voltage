function normalizeJid(jid) {
    if (!jid) return null;

    return String(jid)
        .trim()
        .replace(/:\d+(?=@)/, "");
}

function getNumberFromJid(jid) {
    if (!jid) return null;

    const normalized = normalizeJid(jid);

    if (!normalized) return null;

    const match = normalized.match(/^(\d+)@/);

    return match ? match[1] : null;
}

function isGroupJid(jid) {
    return typeof jid === "string" &&
        jid.endsWith("@g.us");
}

function isUserJid(jid) {
    return typeof jid === "string" &&
        (
            jid.endsWith("@s.whatsapp.net") ||
            jid.endsWith("@lid")
        );
}

function isLidJid(jid) {
    return typeof jid === "string" &&
        jid.endsWith("@lid");
}

module.exports = {
    normalizeJid,
    getNumberFromJid,
    isGroupJid,
    isUserJid,
    isLidJid
};
