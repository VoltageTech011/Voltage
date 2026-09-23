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
    }

    try {
        const result =
            await generateResponse(
                message
            );

        if (
            result?.success &&
            result.text
        ) {
            await message.reply(
                result.text
            );
        } else {
            console.error(
                "[Voltage] AI response failed:",
                result?.error ||
                "Unknown AI error."
            );
        }
    } catch (error) {
        console.error(
            "[Voltage] AI processing error:",
            error
        );
    }

    return message;
}

module.exports = {
    dispatchMessage
};
