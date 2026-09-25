const fs = require("fs");
const path = require("path");

const commandRegistry =
    new Map();

function loadCommands() {
    commandRegistry.clear();

    const commandsPath =
        __dirname;

    const files =
        fs.readdirSync(
            commandsPath
        )
        .filter(file =>
            file.endsWith(".js") &&
            file !== "dispatcher.js"
        )
        .sort();

    for (const file of files) {
        const filePath =
            path.join(
                commandsPath,
                file
            );

        try {
            delete require.cache[
                require.resolve(filePath)
            ];

            const loaded =
                require(filePath);

            const commands =
                Array.isArray(loaded)
                    ? loaded
                    : Array.isArray(
                        loaded?.commands
                    )
                        ? loaded.commands
                        : loaded?.command
                            ? [loaded.command]
                            : [loaded];

            for (const command of commands) {
                if (
                    !command ||
                    typeof command !== "object" ||
                    !command.name ||
                    typeof command.execute !== "function"
                ) {
                    continue;
                }

                const normalizedName =
                    String(
                        command.name
                    )
                        .trim()
                        .toLowerCase();

                if (
                    commandRegistry.has(
                        normalizedName
                    )
                ) {
                    console.warn(
                        `[Voltage] Duplicate command ignored: ${normalizedName}`
                    );

                    continue;
                }

                command.name =
                    normalizedName;

                command.aliases =
                    Array.isArray(
                        command.aliases
                    )
                        ? command.aliases
                            .map(String)
                            .map(value =>
                                value
                                    .trim()
                                    .toLowerCase()
                            )
                            .filter(Boolean)
                        : [];

                command.triggers =
                    Array.isArray(
                        command.triggers
                    )
                        ? command.triggers
                            .map(String)
                            .map(value =>
                                value
                                    .trim()
                                    .toLowerCase()
                            )
                            .filter(Boolean)
                        : [];

                command.phrases =
                    Array.isArray(
                        command.phrases
                    )
                        ? command.phrases
                            .map(String)
                            .map(value =>
                                value
                                    .trim()
                                    .toLowerCase()
                            )
                            .filter(Boolean)
                        : [];

                command.keywords =
                    Array.isArray(
                        command.keywords
                    )
                        ? command.keywords
                            .map(String)
                            .map(value =>
                                value
                                    .trim()
                                    .toLowerCase()
                            )
                            .filter(Boolean)
                        : [];

                commandRegistry.set(
                    normalizedName,
                    command
                );

                console.log(
                    `[Voltage] Loaded command: ${normalizedName}`
                );
            }

        } catch (error) {
            console.error(
                `[Voltage] Failed to load command ${file}:`,
                error
            );
        }
    }

    console.log(
        `[Voltage] Commands loaded: ${commandRegistry.size}`
    );

    return commandRegistry;
}

function getCommand(name) {
    if (!name) {
        return null;
    }

    return commandRegistry.get(
        String(name)
            .trim()
            .toLowerCase()
    ) || null;
}

function getAllCommands() {
    return Array.from(
        commandRegistry.values()
    );
}

function resolveCommandObject(value) {
    if (!value) {
        return null;
    }

    /*
     * Already a real command definition.
     */
    if (
        typeof value === "object" &&
        typeof value.execute === "function"
    ) {
        return value;
    }

    /*
     * Metadata produced by triggers.js:
     *
     * {
     *   name,
     *   args,
     *   rawArgs,
     *   text
     * }
     */
    if (
        typeof value === "object" &&
        value.name
    ) {
        return getCommand(
            value.name
        );
    }

    /*
     * Direct command name.
     */
    if (
        typeof value === "string"
    ) {
        return getCommand(
            value
        );
    }

    return null;
}

async function dispatchCommand(
    message
) {
    if (!message) {
        return false;
    }

    const originalCommand =
        message.command;

    if (!originalCommand) {
        return false;
    }

    /*
     * Resolve:
     *
     * .ping
     *   ↓
     * triggers.js metadata
     *   ↓
     * { name: "ping" }
     *   ↓
     * commandRegistry
     *   ↓
     * actual ping command
     */
    const command =
        resolveCommandObject(
            originalCommand
        );

    if (
        !command ||
        typeof command.execute !== "function"
    ) {
        console.log(
            "[Voltage] Command handler unavailable."
        );

        return false;
    }

    /*
     * Make the actual command
     * available to the command itself.
     */
    message.command =
        command;

    /*
     * Preserve arguments generated
     * by triggers.js / commandResolver.js.
     */
    if (
        typeof message.args === "undefined"
    ) {
        if (
            originalCommand &&
            typeof originalCommand === "object" &&
            Array.isArray(
                originalCommand.args
            )
        ) {
            message.args =
                originalCommand.args;
        } else {
            message.args =
                "";
        }
    }

    if (
        typeof message.commandArgs === "undefined"
    ) {
        if (
            originalCommand &&
            typeof originalCommand === "object" &&
            typeof originalCommand.rawArgs === "string"
        ) {
            message.commandArgs =
                originalCommand.rawArgs;
        } else {
            message.commandArgs =
                message.args;
        }
    }

    console.log(
        `[Voltage] Executing command: ${command.name}`
    );

    try {
        await command.execute(
            message
        );

        console.log(
            `[Voltage] Command executed: ${command.name}`
        );

        return true;

    } catch (error) {
        console.error(
            `[Voltage] Command "${command.name}" execution error:`,
            error
        );

        throw error;
    }
}

loadCommands();

module.exports = {
    commandRegistry,
    loadCommands,
    getCommand,
    getAllCommands,
    dispatchCommand
};
