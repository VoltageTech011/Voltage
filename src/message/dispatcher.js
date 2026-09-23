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
            "[Voltage] Serialization returned null."
        );

        return null;
    }

    console.log(
        `[Voltage] Message: type=${message.type} ` +
        `text="${message.text}" ` +
        `from=${message.sender} ` +
        `number=${message.senderNumber} ` +
        `fromMe=${message.isFromMe}`
    );

    if (
        message.type === "unknown" &&
        !message.text
    ) {
        console.log(
            "[Voltage] Ignoring unsupported message."
        );

        return null;
    }

    const trigger =
        shouldRespond(message);

    console.log(
        `[Voltage] Trigger: respond=${trigger.respond} ` +
        `reason=${trigger.reason}`
    );

    if (!trigger.respond) {
        return null;
    }

    message.trigger =
        trigger;

    message.command =
        trigger.command || null;

    /*
     * ==========================
     * NORMAL COMMANDS
     * ==========================
     */

    if (
        trigger.reason === "command" &&
        message.command
    ) {
        console.log(
            `[Voltage] Command detected: .${message.command.name}`
        );

        try {
            const handled =
                await dispatchCommand(
                    message
                );

            console.log(
                `[Voltage] Command handled=${Boolean(handled)}`
            );

            if (handled) {
                return message;
            }

        } catch (error) {
            console.error(
                "[Voltage] Command error:",
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
                    "[Voltage] Command error reply failed:",
                    replyError
                );
            }

            return message;
        }
    }

    /*
     * ==========================
     * VOLTAGE AI
     * ==========================
     */

    if (
        trigger.reason === "voltage" ||
        trigger.reason === "mention" ||
        trigger.reason === "reply"
    ) {
        console.log(
            "[Voltage] AI trigger accepted."
        );

        let aiMessage =
            message.text;

        /*
         * Remove "Voltage" from the
         * beginning before sending
         * the actual request to the brain.
         *
         * Voltage hi
         * becomes:
         * hi
         */

        if (
            trigger.reason === "voltage"
        ) {
            aiMessage =
                trigger.command?.rawArgs || "";
        }

        /*
         * If the user only says
         * "Voltage", still let the
         * personality handle it.
         */

        if (!aiMessage.trim()) {
            aiMessage =
                "The user called your name. Respond naturally.";
        }

        const aiInput = {
            ...message,
            text: aiMessage
        };

        console.log(
            `[Voltage] Sending to brain: "${aiMessage}"`
        );

        try {
            const result =
                await generateResponse(
                    aiInput
                );

            console.log(
                "[Voltage] Brain result:",
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
                !result?.success ||
                !result?.text
            ) {
                console.error(
                    "[Voltage] Brain returned no usable response."
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
                `[Voltage] Brain response: "${response}"`
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
                "[Voltage] AI error:",
                error
            );

            try {
                await message.reply(
                    `My brain just failed to respond. Try that again.\n\n${FOOTER}`
                );
            } catch (replyError) {
                console.error(
                    "[Voltage] Failed to send AI error:",
                    replyError
                );
            }

            return message;
        }
    }

    return message;
}

module.exports = {
    dispatchMessage
};
