const {
    serializeMessage
} = require("./serializer");

const {
    shouldRespond
} = require("./triggers");

const {
    dispatchCommand
} = require("../plugins/dispatcher");

async function dispatchMessage(sock, raw) {
    const message =
        await serializeMessage(
            sock,
            raw
        );

    if (!message) {
        return null;
    }

    const trigger =
        shouldRespond(message);

    console.log(
        `[Voltage] ${
            message.isGroup
                ? "GROUP"
                : "DM"
        } ` +
        `${message.senderNumber || "unknown"} ` +
        `→ ${trigger.reason}: ` +
        `${message.text || `[${message.type}]`}`
    );

    if (!trigger.respond) {
        return null;
    }

    message.trigger =
        trigger;

    message.command =
        trigger.command || null;

    if (message.command) {
        const handled =
            await dispatchCommand(
                message
            );

        if (handled) {
            return message;
        }
    }

    return message;
}

module.exports = {
    dispatchMessage
};
