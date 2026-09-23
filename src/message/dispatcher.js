const {
    serializeMessage
} = require("./serializer");

const {
    shouldRespond
} = require("./triggers");

const {
    dispatchCommand
} = require("../plugins/dispatcher");

const {
    generateResponse
} = require("../ai/ai");

async function dispatchMessage(
    sock,
    raw
) {
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

        return message;
    }

    try {
        const response =
            await generateResponse(
                message
            );

        if (!response) {
            return message;
        }

        await message.reply(
            response
        );

        return message;
    } catch (error) {
        console.error(
            "[Voltage] AI processing error:",
            error
        );

        await message.reply(
            "My brain just hit a wall. Try that again."
        );

        return message;
    }
}

module.exports = {
    dispatchMessage
};
