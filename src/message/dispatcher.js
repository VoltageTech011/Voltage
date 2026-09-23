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

const FOOTER =
    "Powered by Thereal_VoltageLord";

async function dispatchMessage(sock, raw) {
    console.log(
        "[Voltage] dispatchMessage() started."
    );

    let message;

    try {
        message =
            await serializeMessage(
                sock,
                raw
            );
    } catch (error) {
        console.error(
            "[Voltage] Serialization error:",
            error
        );

        return null;
    }

    if (!message) {
        console.log(
            "[Voltage] Message serialization returned null."
        );

        return null;
    }

    console.log(
        `[Voltage] Serialized message: ` +
        `type=${message.type} ` +
        `text="${message.text}" ` +
        `sender=${message.sender} ` +
        `senderNumber=${message.senderNumber} ` +
        `owner=${message.isOwner} ` +
        `fromMe=${message.isFromMe}`
    );

    if (
        message.type === "unknown" &&
        !message.text
    ) {
        console.log(
            "[Voltage] Ignoring unsupported/system message."
        );

        return null;
    }

    const trigger =
        shouldRespond(message);

    console.log(
        `[Voltage] Trigger result: ` +
        `respond=${trigger.respond} ` +
        `reason=${trigger.reason}`
    );

    if (!trigger.respond) {
        return null;
    }

    message.trigger =
        trigger;

    message.command =
        trigger.command || null;

    console.log(
        `[Voltage] ${
            message.isGroup
                ? "GROUP"
                : "DM"
        } ${message.senderNumber || "unknown"} ` +
        `→ ${trigger.reason}: ` +
        `${message.text || `[${message.type}]`}`
    );

    /*
     * COMMAND PATH
     *
     * Commands must be handled before AI.
     */
    if (message.command) {
        console.log(
            `[Voltage] Command detected: .${message.command.name}`
        );

        try {
            const handled =
                await dispatchCommand(
                    message
                );

            console.log(
                `[Voltage] Command result: handled=${Boolean(handled)}`
            );

            if (handled) {
                console.log(
                    "[Voltage] Command handled. AI will not run."
                );

                return message;
            }

            console.log(
                "[Voltage] Command was not handled."
            );
        } catch (error) {
            console.error(
                "[Voltage] Command dispatch error:",
                error
            );

            try {
                await message.reply(
                    `Command error: ${
                        error.message ||
                        "Unable to execute command."
                    }\n\n${FOOTER}`
                );
            } catch (replyError) {
                console.error(
                    "[Voltage] Failed to send command error:",
                    replyError
                );
            }

            return message;
        }
    }

    /*
     * AI PATH
     *
     * Only normal triggered messages reach here.
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

        console.log(
            "[Voltage] AI result:",
            {
                success:
                    result?.success,
                provider:
                    result?.provider,
                model:
                    result?.model,
                type:
                    result?.type,
                error:
                    result?.error
            }
        );

        if (
            !result ||
            !result.success ||
            !result.text
        ) {
            console.error(
                "[Voltage] AI returned no usable response:",
                result
            );

            await message.reply(
                `My brain just failed to respond. Try that again.\n\n${FOOTER}`
            );

            return message;
        }

        const response =
            String(
                result.text
            ).trim();

        console.log(
            `[Voltage] AI response generated: "${response}"`
        );

        await message.reply(
            `${response}\n\n${FOOTER}`
        );

        console.log(
            "[Voltage] AI response sent."
        );

        return message;
    } catch (error) {
        console.error(
            "[Voltage] AI dispatch error:",
            error
        );

        try {
            await message.reply(
                `My brain just failed to respond. Try that again.\n\n${FOOTER}`
            );
        } catch (replyError) {
            console.error(
                "[Voltage] Failed to send AI error response:",
                replyError
            );
        }

        return message;
    }
}

module.exports = {
    dispatchMessage
};
