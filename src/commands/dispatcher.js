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

async function dispatchCommand(
    message
) {
    if (!message) {
        return false;
    }

    let command =
        message.command;

    if (!command) {
        return false;
    }

    /*
     * The command can arrive from:
     *
     * 1. triggers.js
     * 2. commandResolver.js
     */

    if (
        command.command &&
        typeof command.command === "object"
    ) {
        command =
            command.command;
    }

    if (
        typeof command !== "object"
    ) {
        command =
            getCommand(command);
    }

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
     * Make the resolved command
     * available to the command itself.
     */

    message.command =
        command;

    /*
     * commandResolver.js provides
     * extracted natural-language
     * arguments through:
     *
     * resolved.args
     */

    if (
        typeof message.args === "undefined"
    ) {
        message.args =
            "";
    }

    if (
        typeof message.commandArgs === "undefined"
    ) {
        message.commandArgs =
            message.args;
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
