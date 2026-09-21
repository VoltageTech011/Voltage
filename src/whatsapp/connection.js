const {
    DisconnectReason
} = require("@whiskeysockets/baileys");

function getDisconnectReason(lastDisconnect) {
    return lastDisconnect?.error?.output?.statusCode;
}

function shouldReconnect(lastDisconnect) {
    const reason = getDisconnectReason(lastDisconnect);

    return reason !== DisconnectReason.loggedOut;
}

function getConnectionState(update) {
    if (update === "open") return "connected";
    if (update === "connecting") return "connecting";
    if (update === "close") return "disconnected";

    return "unknown";
}

module.exports = {
    getDisconnectReason,
    shouldReconnect,
    getConnectionState
};
