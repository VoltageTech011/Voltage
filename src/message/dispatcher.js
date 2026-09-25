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
commandRegistry,
getCommand
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
 * Ignore protocol/system messages.
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
 * Never process Voltage's own messages.
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
     * Copy the arguments produced
     * by triggers.js onto the message.
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

    const commandName =
        String(
            parsedCommand.name || ""
        )
            .trim()
            .toLowerCase();

    /*
     * Resolve command names AND aliases.
     *
     * This is important because:
     *
     * .ask
     * .ai
     * .chat
     *
     * can all resolve to the same
     * command.
     */
    const registeredCommand =
        getCommand(
            commandName
        );

    /*
     * Unknown prefix command.
     *
     * Do not silently ignore it.
     */
    if (!registeredCommand) {
        console.log(
            `[Voltage] Unknown prefix command: ${commandName}`
        );

        try {
            await message.reply(
                `Unknown command: .${commandName}\n\n` +
                `Use .menu to see available commands.\n\n` +
                FOOTER
            );
        } catch (error) {
            console.error(
                "[Voltage] Failed to send unknown-command response:",
                error?.stack || error
            );
        }

        return message;
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
 * Voltage hi
 * Voltage what is your name
 * Voltage explain quantum computing
 * Voltage ask who created you
 */
if (
    trigger.reason === "voltage"
) {
    const voltageCommand =
        trigger.command;

    const commandQuery =
        String(
            voltageCommand?.rawArgs ||
            ""
        ).trim();

    /*
     * Bare "Voltage".
     */
    if (!commandQuery) {
        console.log(
            "[Voltage] Voltage was called without text."
        );

        return message;
    }

    console.log(
        `[Voltage] Natural query: "${commandQuery}"`
    );

    /*
     * First check whether the text is
     * actually asking for a known command.
     *
     * Example:
     *
     * Voltage ping
     * Voltage menu
     * Voltage status
     */
    let resolved = null;

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
    }

    /*
     * Strong command match.
     */
    if (
        resolved?.type === "match" &&
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
            await dispatchCommand(
                message
            );

            return message;

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

            return message;
        }
    }

    /*
     * IMPORTANT:
     *
     * If the natural text does not match
     * a command, send the ENTIRE text to
     * the ask command.
     *
     * Voltage hi
     *       ↓
     * ask("hi")
     *
     * Voltage what is your name
     *       ↓
     * ask("what is your name")
     *
     * This fixes the previous:
     *
     * "Say what you want me to do."
     */
    const askCommand =
        getCommand("ask");

    if (!askCommand) {
        console.error(
            "[Voltage] Ask command is not loaded."
        );

        try {
            await message.reply(
                `Voltage's AI command is currently unavailable.\n\n${FOOTER}`
            );
        } catch (error) {
            console.error(
                "[Voltage] Failed to send AI unavailable response:",
                error?.stack || error
            );
        }

        return message;
    }

    message.trigger = {
        respond: true,
        reason: "natural_ai",
        command: {
            name: "ask",
            args:
                commandQuery
                    .split(/\s+/)
                    .filter(Boolean),
            rawArgs:
                commandQuery
        }
    };

    message.command =
        askCommand;

    message.args =
        commandQuery
            .split(/\s+/)
            .filter(Boolean);

    message.commandArgs =
        commandQuery;

    console.log(
        `[Voltage] Routing natural text to ask: ` +
        `args="${message.commandArgs}"`
    );

    try {
        await dispatchCommand(
            message
        );

        return message;

    } catch (error) {
        console.error(
            "[Voltage] Natural AI command error:",
            error?.stack || error
        );

        try {
            await message.reply(
                `Command error: ${
                    error?.message ||
                    "Unable to process your request."
                }\n\n${FOOTER}`
            );
        } catch (replyError) {
            console.error(
                "[Voltage] Failed to send AI error:",
                replyError?.stack ||
                replyError
            );
        }

        return message;
    }
}

/*
 * ==========================
 * GROUP MENTION / REPLY
 * ==========================
 *
 * These remain available for
 * the future AI brain.
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
     * here later.
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
