const fs = require("fs");
const path = require("path");

const commandRegistry = new Map();

function loadCommands() {
    commandRegistry.clear();

    const commandsPath = __dirname;

    const files = fs
        .readdirSync(commandsPath)
        .filter(file =>
            file.endsWith(".js") &&
            file !== "dispatcher.js"
        )
        .sort();

    for (const file of files) {
        const filePath = path.join(
            commandsPath,
            file
        );

        try {
            delete require.cache[
                require.resolve(filePath)
            ];

            const loaded = require(filePath);

            const commands =
                Array.isArray(loaded)
                    ? loaded
                    : Array.isArray(loaded?.commands)
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
                    String(command.name)
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
                    Array.isArray(command.aliases)
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
                    Array.isArray(command.triggers)
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
                    Array.isArray(command.phrases)
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
                    Array.isArray(command.keywords)
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

    const normalized =
        String(name)
            .trim()
            .toLowerCase();

    const direct =
        commandRegistry.get(normalized);

    if (direct) {
        return direct;
    }

    for (
        const command
        of commandRegistry.values()
    ) {
        if (
            Array.isArray(command.aliases) &&
            command.aliases.includes(normalized)
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

    message.command =
        command;

    let args = [];

    if (Array.isArray(message.args)) {
        args = message.args;
    } else if (
        typeof message.args === "string" &&
        message.args.trim()
    ) {
        args =
            message.args
                .trim()
                .split(/\s+/);
    }

    let rawArgs =
        typeof message.commandArgs === "string"
            ? message.commandArgs.trim()
            : "";

    if (!rawArgs && args.length) {
        rawArgs =
            args.join(" ");
    }

    message.args = args;
    message.commandArgs = rawArgs;

    console.log(
        `[Voltage] Executing command: ${command.name}`
    );

    console.log(
        `[Voltage] Command args: ${JSON.stringify(args)}`
    );

    console.log(
        `[Voltage] Command raw args: "${rawArgs}"`
    );

    try {
        await command.execute(
            message,
            {
                args,
                rawArgs,
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
