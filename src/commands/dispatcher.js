const fs = require("fs");
const path = require("path");

const commandRegistry =
    new Map();

let loadErrors = 0;

function normalizeName(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function loadCommands() {
    commandRegistry.clear();
    loadErrors = 0;

    const commandsPath =
        __dirname;

    let files = [];

    try {
        files =
            fs.readdirSync(
                commandsPath,
                {
                    withFileTypes: true
                }
            )
            .filter(entry =>
                entry.isFile()
            )
            .map(entry =>
                entry.name
            )
            .filter(file =>
                file.endsWith(".js")
            )
            .filter(file =>
                file !== "dispatcher.js"
            )
            .sort();
    } catch (error) {
        console.error(
            "[Voltage] Failed to read commands directory:",
            error?.stack || error
        );

        return commandRegistry;
    }

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

            /*
             * Supported command exports:
             *
             * module.exports = command
             *
             * module.exports = {
             *     command
             * }
             *
             * module.exports = {
             *     commands: [...]
             * }
             *
             * module.exports = [...]
             */
            let commands = [];

            if (
                Array.isArray(loaded)
            ) {
                commands =
                    loaded;
            } else if (
                Array.isArray(
                    loaded?.commands
                )
            ) {
                commands =
                    loaded.commands;
            } else if (
                loaded?.command &&
                typeof loaded.command === "object"
            ) {
                commands = [
                    loaded.command
                ];
            } else if (
                loaded &&
                typeof loaded === "object"
            ) {
                commands = [
                    loaded
                ];
            }

            /*
             * Nothing exported.
             */
            if (!commands.length) {
                console.warn(
                    `[Voltage] Skipping ${file}: no command export found.`
                );

                return;
            }

            let validCommandFound =
                false;

            for (const command of commands) {
                if (
                    !command ||
                    typeof command !== "object"
                ) {
                    continue;
                }

                /*
                 * Ignore objects that are not
                 * actual commands.
                 *
                 * This prevents utility/plugin
                 * exports from being registered.
                 */
                if (
                    !command.name ||
                    typeof command.execute !== "function"
                ) {
                    continue;
                }

                validCommandFound =
                    true;

                const normalizedName =
                    normalizeName(
                        command.name
                    );

                if (!normalizedName) {
                    continue;
                }

                if (
                    commandRegistry.has(
                        normalizedName
                    )
                ) {
                    console.warn(
                        `[Voltage] Duplicate command ignored: ${normalizedName} (${file})`
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
                            .map(normalizeName)
                            .filter(Boolean)
                        : [];

                command.triggers =
                    Array.isArray(
                        command.triggers
                    )
                        ? command.triggers
                            .map(normalizeName)
                            .filter(Boolean)
                        : [];

                command.phrases =
                    Array.isArray(
                        command.phrases
                    )
                        ? command.phrases
                            .map(normalizeName)
                            .filter(Boolean)
                        : [];

                command.keywords =
                    Array.isArray(
                        command.keywords
                    )
                        ? command.keywords
                            .map(normalizeName)
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

            /*
             * A JavaScript file that exports
             * utilities instead of a command
             * should not count as a failed command.
             */
            if (!validCommandFound) {
                console.warn(
                    `[Voltage] Skipped ${file}: no valid command found.`
                );
            }

        } catch (error) {
            loadErrors++;

            console.error(
                `[Voltage] Failed to load command ${file}:`,
                error?.stack ||
                error
            );
        }
    }

    console.log(
        `[Voltage] Commands loaded: ${commandRegistry.size}`
    );

    if (loadErrors) {
        console.warn(
            `[Voltage] Commands failed: ${loadErrors}`
        );
    }

    return commandRegistry;
}

function getCommand(name) {
    const normalized =
        normalizeName(name);

    if (!normalized) {
        return null;
    }

    /*
     * Direct command name.
     */
    const direct =
        commandRegistry.get(
            normalized
        );

    if (direct) {
        return direct;
    }

    /*
     * Alias lookup.
     */
    for (
        const command
        of commandRegistry.values()
    ) {
        if (
            Array.isArray(
                command.aliases
            ) &&
            command.aliases.includes(
                normalized
            )
        ) {
            return command;
        }
    }

    return null;
}

function getAllCommands() {
    return Array.from(
        commandRegistry.values()
    );
}

async function dispatchCommand(message) {
    if (!message) {
        return false;
    }

    let command =
        message.command;

    if (!command) {
        return false;
    }

    /*
     * commandResolver may return:
     *
     * {
     *     command: actualCommand,
     *     args: "..."
     * }
     */
    if (
        command.command &&
        typeof command.command === "object"
    ) {
        command =
            command.command;
    }

    /*
     * If only a command name was supplied,
     * resolve it.
     */
    if (
        typeof command !== "object"
    ) {
        command =
            getCommand(
                command
            );
    }

    /*
     * If this is still not a valid command,
     * stop safely.
     */
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
     * Make the actual command available
     * to the command itself.
     */
    message.command =
        command;

    /*
     * Guarantee command argument fields.
     *
     * .ask what is your name
     *
     * should result in:
     *
     * message.args =
     * [
     *     "what",
     *     "is",
     *     "your",
     *     "name"
     * ]
     *
     * message.commandArgs =
     * "what is your name"
     */
    if (
        typeof message.args ===
        "undefined" ||
        message.args === null
    ) {
        message.args = [];
    }

    if (
        !Array.isArray(
            message.args
        )
    ) {
        message.args =
            String(
                message.args
            )
                .trim()
                .split(/\s+/)
                .filter(Boolean);
    }

    if (
        typeof message.commandArgs ===
        "undefined" ||
        message.commandArgs === null
    ) {
        message.commandArgs =
            message.args.join(" ");
    }

    console.log(
        `[Voltage] Executing command: ${command.name} ` +
        `args="${message.commandArgs}"`
    );

    try {
        await command.execute(
            message,
            {
                args:
                    message.args,

                rawArgs:
                    message.commandArgs,

                command
            }
        );

        console.log(
            `[Voltage] Command executed: ${command.name}`
        );

        return true;

    } catch (error) {
        console.error(
            `[Voltage] Command "${command.name}" execution error:`,
            error?.stack ||
            error
        );

        throw error;
    }
}

/*
 * Load commands once when the module
 * is initialized.
 */
loadCommands();

module.exports = {
    commandRegistry,
    loadCommands,
    getCommand,
    getAllCommands,
    dispatchCommand
};
