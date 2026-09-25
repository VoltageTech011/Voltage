const {
    serializeMessage
} = require("./serializer");

const {
    shouldRespond
} = require("./triggers");

const {
    resolveCommand
} = require("../utils/commandResolver");

const {
    dispatchCommand,
    commandRegistry
} = require("../commands/dispatcher");

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
        `[Voltage] Message: ` +
        `type=${message.type} ` +
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

    /*
     * ==========================
     * TRIGGER CHECK
     * ==========================
     */

    const trigger =
        shouldRespond(message);

    console.log(
        `[Voltage] Trigger: ` +
        `respond=${trigger.respond} ` +
        `reason=${trigger.reason}`
    );

    /*
     * IMPORTANT:
     *
     * If the trigger system says
     * this message should not receive
     * a response, stop processing here.
     *
     * This prevents Voltage from
     * processing its own outgoing
     * AI responses and creating an
     * infinite response loop.
     */

    if (!trigger.respond) {
        console.log(
            `[Voltage] Message ignored by trigger: ${trigger.reason}`
        );

        return null;
    }

    /*
     * ==========================
     * PREFIX COMMAND
     * ==========================
     *
     * .ping
     * .menu
     * .ask hello
     */

    if (
        trigger.reason === "command" &&
        trigger.command
    ) {
        message.trigger =
            trigger;

        message.command =
            trigger.command;

        message.args =
            Array.isArray(
                trigger.command.args
            )
                ? trigger.command.args.join(" ")
                : String(
                    trigger.command.rawArgs ||
                    ""
                );

        message.commandArgs =
            message.args;

        console.log(
            `[Voltage] Prefix command detected: ` +
            `${message.command.name}`
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

            console.log(
                "[Voltage] Command was not handled."
            );

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
                    "[Voltage] Failed to send command error:",
                    replyError
                );
            }

            return message;
        }

        return message;
    }

    /*
     * ==========================
     * NATURAL COMMAND RESOLUTION
     * ==========================
     *
     * Voltage ping
     * Voltage analyze this document
     * Voltage ask something
     */

    const text =
        String(
            message.text || ""
        ).trim();

    if (!text) {
        console.log(
            "[Voltage] Message has no usable text."
        );

        return null;
    }

    /*
     * At this point shouldRespond()
     * has already confirmed that the
     * message is allowed to continue.
     *
     * Natural command resolution is
     * therefore only performed for
     * Voltage-addressed messages.
     */

    const containsVoltage =
        /\bvoltage\b/i.test(text);

    if (
        !containsVoltage &&
        !message.isGroup
    ) {
        console.log(
            "[Voltage] Message is not addressed to Voltage."
        );

        return null;
    }

    if (
        message.isGroup &&
        !containsVoltage &&
        trigger.reason !== "mention" &&
        trigger.reason !== "reply"
    ) {
        console.log(
            "[Voltage] Group message does not directly address Voltage."
        );

        return null;
    }

    /*
     * Remove the Voltage trigger
     * before resolving the command.
     *
     * Voltage ask something
     * becomes:
     * ask something
     */

    const commandQuery =
        text.replace(
            /^voltage\b[\s,:-]*/i,
            ""
        ).trim();

    /*
     * If Voltage was addressed without
     * a command, leave it for the AI
     * layer rather than trying to resolve
     * an empty command.
     */

    if (!commandQuery) {
        console.log(
            "[Voltage] Voltage was called without a command."
        );

        return message;
    }

    console.log(
        `[Voltage] Resolving natural command: "${commandQuery}"`
    );

    let resolved;

    try {
        resolved =
            resolveCommand(
                commandQuery,
                commandRegistry
            );
    } catch (error) {
        console.error(
            "[Voltage] Command resolver error:",
            error
        );

        return message;
    }

    if (!resolved) {
        console.log(
            "[Voltage] Command resolver returned nothing."
        );

        return message;
    }

    console.log(
        `[Voltage] Resolver result: ` +
        `type=${resolved.type} ` +
        `name=${resolved.name || "none"} ` +
        `score=${resolved.score}`
    );

    /*
     * ==========================
     * STRONG COMMAND MATCH
     * ==========================
     */

    if (
        resolved.type === "match" &&
        resolved.command
    ) {
        message.trigger = {
            respond: true,
            reason: "natural_command",
            command: resolved
        };

        message.command =
            resolved.command;

        message.args =
            resolved.args || "";

        message.commandArgs =
            resolved.args || "";

        console.log(
            `[Voltage] Natural command matched: ` +
            `${resolved.name} ` +
            `score=${resolved.score} ` +
            `args="${resolved.args || ""}"`
        );

        try {
            const handled =
                await dispatchCommand(
                    message
                );

            console.log(
                `[Voltage] Natural command handled=${Boolean(handled)}`
            );

            if (handled) {
                return message;
            }

            console.log(
                "[Voltage] Natural command was not handled."
            );

        } catch (error) {
            console.error(
                "[Voltage] Natural command error:",
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
        }

        return message;
    }

    /*
     * ==========================
     * POSSIBLE MATCH
     * ==========================
     *
     * Don't execute uncertain
     * commands automatically.
     */

    if (
        resolved.type === "possible"
    ) {
        console.log(
            `[Voltage] Possible command match: ` +
            `${resolved.name} ` +
            `score=${resolved.score}`
        );

        return message;
    }

    /*
     * ==========================
     * NO COMMAND
     * ==========================
     */

    console.log(
        `[Voltage] No command matched: "${commandQuery}"`
    );

    return message;
}

module.exports = {
    dispatchMessage
};
