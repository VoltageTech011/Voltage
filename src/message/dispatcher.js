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
            error?.stack || error
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
        `text=${JSON.stringify(message.text)} ` +
        `from=${message.sender} ` +
        `number=${message.senderNumber} ` +
        `fromMe=${message.isFromMe}`
    );

    /*
     * Ignore unsupported protocol/system
     * messages.
     */
    if (
        message.type === "protocol" ||
        message.type === "senderKeyDistribution"
    ) {
        console.log(
            `[Voltage] Ignoring ${message.type} message.`
        );

        return null;
    }

    /*
     * Never process Voltage's own outgoing
     * messages as new commands.
     *
     * This prevents infinite response loops.
     */
    if (message.isFromMe) {
        console.log(
            "[Voltage] Ignoring own outgoing message."
        );

        return null;
    }

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
     * ==========================
     * TRIGGER DETECTION
     * ==========================
     */
    const trigger =
        shouldRespond(message);

    console.log(
        `[Voltage] Trigger: ` +
        `respond=${trigger.respond} ` +
        `reason=${trigger.reason}`
    );

    if (!trigger.respond) {
        console.log(
            "[Voltage] Message ignored by trigger."
        );

        return null;
    }

    /*
     * ==========================
     * PREFIX COMMAND
     * ==========================
     *
     * Examples:
     *
     * .ping
     * .menu
     * .ask what is your name
     * .ai explain quantum computing
     *
     * triggers.js returns:
     *
     * {
     *   name: "ask",
     *   args: ["what", "is", "your", "name"],
     *   rawArgs: "what is your name"
     * }
     */
    if (
        trigger.reason === "command" &&
        trigger.command
    ) {
        const parsedCommand =
            trigger.command;

        message.trigger =
            trigger;

        /*
         * Keep the actual command object
         * separate from the parsed command
         * information.
         */
        const commandName =
            String(
                parsedCommand.name || ""
            )
                .trim()
                .toLowerCase();

        /*
         * CRITICAL:
         *
         * dispatchCommand() expects
         * message.args to contain the
         * command arguments.
         *
         * Previously this was not being
         * copied from triggers.js, causing:
         *
         * .ask what is your name
         *
         * to become:
         *
         * ""
         */
        message.args =
            Array.isArray(
                parsedCommand.args
            )
                ? parsedCommand.args
                : String(
                    parsedCommand.rawArgs ||
                    ""
                )
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

        message.commandArgs =
            String(
                parsedCommand.rawArgs ||
                message.args.join(" ")
            ).trim();

        /*
         * Resolve the actual registered
         * command.
         */
        const registeredCommand =
            commandRegistry.get(
                commandName
            );

        if (!registeredCommand) {
            console.log(
                `[Voltage] Unknown prefix command: ${commandName}`
            );

            return null;
        }

        message.command =
            registeredCommand;

        console.log(
            `[Voltage] Prefix command detected: ` +
            `${registeredCommand.name} ` +
            `args="${message.commandArgs}"`
        );

        try {
            const handled =
                await dispatchCommand(
                    message
                );

            console.log(
                `[Voltage] Command handled=${Boolean(
                    handled
                )}`
            );

            if (handled) {
                return message;
            }

            console.log(
                "[Voltage] Command was not handled."
            );

            return message;

        } catch (error) {
            console.error(
                "[Voltage] Command error:",
                error?.stack || error
            );

            try {
                await message.reply(
                    `Command error: ${
                        error?.message ||
                        "Unable to execute command."
                    }\n\n${FOOTER}`
                );
            } catch (replyError) {
                console.error(
                    "[Voltage] Failed to send command error:",
                    replyError?.stack ||
                    replyError
                );
            }

            return message;
        }
    }

    /*
     * ==========================
     * VOLTAGE NATURAL COMMAND
     * ==========================
     *
     * Examples:
     *
     * Voltage ping
     * Voltage menu
     * Voltage ask what is your name
     * Voltage hi
     *
     * Only messages actually addressing
     * Voltage reach this section.
     */
    if (
        trigger.reason === "voltage"
    ) {
        const voltageCommand =
            trigger.command;

        /*
         * "Voltage hi"
         *
         * becomes:
         *
         * "hi"
         */
        const commandQuery =
            String(
                voltageCommand?.rawArgs ||
                ""
            ).trim();

        if (!commandQuery) {
            console.log(
                "[Voltage] Voltage was called without a command."
            );

            /*
             * If there is a dedicated
             * Voltage/AI handler later,
             * it can handle bare "Voltage".
             *
             * For now do not dispatch an
             * empty command.
             */
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
                error?.stack || error
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
         * STRONG NATURAL MATCH
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
                String(
                    resolved.args || ""
                )
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

            message.commandArgs =
                String(
                    resolved.args || ""
                ).trim();

            console.log(
                `[Voltage] Natural command matched: ` +
                `${resolved.name} ` +
                `score=${resolved.score} ` +
                `args="${message.commandArgs}"`
            );

            try {
                const handled =
                    await dispatchCommand(
                        message
                    );

                console.log(
                    `[Voltage] Natural command handled=${Boolean(
                        handled
                    )}`
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
                    error?.stack || error
                );

                try {
                    await message.reply(
                        `Command error: ${
                            error?.message ||
                            "Unable to execute command."
                        }\n\n${FOOTER}`
                    );
                } catch (replyError) {
                    console.error(
                        "[Voltage] Failed to send command error:",
                        replyError?.stack ||
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
         * Do not execute uncertain
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
         * No natural command matched.
         *
         * This is intentionally left
         * untouched so the future AI
         * brain can handle:
         *
         * Voltage explain this
         * Voltage who are you
         * Voltage write me a song
         */
        console.log(
            `[Voltage] No command matched: "${commandQuery}"`
        );

        return message;
    }

    /*
     * ==========================
     * GROUP MENTION / REPLY
     * ==========================
     *
     * These triggers are deliberately
     * not sent through the command
     * resolver.
     *
     * The AI brain can handle them later.
     */
    if (
        trigger.reason === "mention" ||
        trigger.reason === "reply"
    ) {
        console.log(
            `[Voltage] ${trigger.reason} trigger detected.`
        );

        /*
         * AI handling can be connected
         * here without affecting prefix
         * command execution.
         */
        return message;
    }

    /*
     * Safety fallback.
     */
    console.log(
        `[Voltage] No handler matched for message: "${text}"`
    );

    return message;
}

module.exports = {
    dispatchMessage
};
