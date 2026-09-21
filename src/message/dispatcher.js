const {
    serializeMessage
} = require("./serializer");

async function dispatchMessage(sock, raw) {
    const message =
        await serializeMessage(sock, raw);

    if (!message) {
        return null;
    }

    console.log(
        `[Voltage] ${message.isGroup ? "GROUP" : "DM"} ` +
        `${message.senderNumber || "unknown"}: ` +
        `${message.text || `[${message.type}]`}`
    );

    return message;
}

module.exports = {
    dispatchMessage
};
