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

async function dispatchMessage(sock, raw) {
    console.log(
        "[Voltage] dispatchMessage() started."
    );

    const message =
        await serializeMessage(
            sock,
            raw
        );

    if (!message) {
        console.log(
            "[Voltage] Message serialization returned null."
        );

        return null;
    }

    console.log(
        `[Voltage] Serialized message: type=${message.type} text="${message.text || ""}" sender=${message.sender || "unknown"} senderNumber=${message.senderNumber || "unknown"} owner=${message.isOwner} fromMe=${message.isFromMe}`
    );

    const trigger =
        shouldRespond(message);

    console.log(
        `[Voltage] Trigger result: respond=${trigger.respond} reason=${trigger.reason}`
    );

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

    /*
     * Commands are handled before AI.
     */
    if (message.command) {
        console.log(
            `[Voltage] Dispatching command: ${message.command.name}`
        );

        const handled =
            await dispatchCommand(
                message
            );

        if (handled) {
            console.log(
                `[Voltage] Command handled: ${message.command.name}`
            );

            return message;
        }

        console.log(
            `[Voltage] Command was not handled: ${message.command.name}`
        );

        return message;
    }

    /*
     * Normal Voltage conversation.
     */
    console.log(
        "[Voltage] AI trigger accepted."
    );

    console.log(
        `[Voltage] Sending prompt to AI: "${message.text}"`
    );

    try {
        const result =
            await generateResponse(
                message
            );

        if (!result) {
            console.error(
                "[Voltage] AI returned no result."
            );

            await message.reply(
                "I got nothing back from the AI."
            );

            return message;
        }

        if (!result.success) {
            console.error(
                "[Voltage] AI request failed:",
                result.error
            );

            await message.reply(
                "My brain just failed to respond. Try that again."
            );

            return message;
        }

        const response =
            String(
                result.text || ""
            ).trim();

        if (!response) {
            console.error(
                "[Voltage] AI returned an empty response."
            );

            await message.reply(
                "The response came back empty. Try again."
            );

            return message;
        }

        console.log(
            `[Voltage] AI response received from ${result.provider || "unknown"}${result.model ? ` / ${result.model}` : ""}`
        );

        console.log(
            `[Voltage] Replying to WhatsApp: "${response}"`
        );

        await message.reply(
            response
        );

        console.log(
            "[Voltage] AI response sent successfully."
        );

        return message;
    } catch (error) {
        console.error(
            "[Voltage] AI dispatch error:",
            error
        );

        try {
            await message.reply(
                "Something broke while processing that. Try again."
            );
        } catch (replyError) {
            console.error(
                "[Voltage] Failed to send AI error reply:",
                replyError
            );
        }

        return message;
    }
}

module.exports = {
    dispatchMessage
};
