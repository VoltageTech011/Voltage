const {
    getNumberFromJid
} = require("./jid");

function normalizeNumber(value) {
    if (!value) return null;

    return String(value)
        .replace(/\D/g, "")
        .replace(/^0+/, "");
}

function isOwner(jid) {
    const number = normalizeNumber(
        getNumberFromJid(jid)
    );

    const configured = normalizeNumber(
        process.env.BOT_NUMBER
    );

    if (!number || !configured) {
        return false;
    }

    return number === configured;
}

function isDev(jid) {
    const number = normalizeNumber(
        getNumberFromJid(jid)
    );

    if (!number) return false;

    const developers = String(
        process.env.DEV_NUMBERS || ""
    )
        .split(",")
        .map(normalizeNumber)
        .filter(Boolean);

    return developers.includes(number);
}

module.exports = {
    normalizeNumber,
    isOwner,
    isDev
};
