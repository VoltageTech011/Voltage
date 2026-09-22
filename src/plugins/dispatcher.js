const registry =
    require("./registry");

const {
    reply
} = require("../message/response");

const {
    resolveCommand
} = require("../utils/commandResolver");

async function dispatchCommand(
    message
) {
    const command =
        message?.command;

    if (!command?.name) {
        return false;
    }

    let plugin =
        registry.get(
            command.name
        );

    if (!plugin) {
        const result =
            resolveCommand(
                command.name,
                registry
            );

        if (
            result?.type ===
            "suggestion"
        ) {
            return reply(
                message,
                `Unknown command: \`${command.name}\`\n\nDid you mean \`${result.name}\`?`
            );
        }

        if (
            result?.type ===
            "possible"
        ) {
            const suggestions =
                result.alternatives
                    .map(
                        item =>
                            `\`${item.name}\``
                    )
                    .join(", ");

            return reply(
                message,
                `Unknown command: \`${command.name}\`\n\nPossible matches: ${suggestions}`
            );
        }

        return false;
    }

    try {
        return await plugin.execute(
            message,
            {
                args:
                    command.args || [],

                rawArgs:
                    command.rawArgs || "",

                command
            }
        );
    } catch (error) {
        console.error(
            `[Voltage] Command "${command.name}" failed:`,
            error
        );

        return reply(
            message,
            "Something went wrong while executing that command."
        );
    }
}

module.exports = {
    dispatchCommand
};
