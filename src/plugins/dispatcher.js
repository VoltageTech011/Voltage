const registry =
    require("./registry");

const {
    reply
} = require("../message/response");

async function dispatchCommand(message) {
    const command =
        message.command;

    if (!command?.name) {
        return false;
    }

    const plugin =
        registry.get(command.name);

    if (!plugin) {
        return false;
    }

    try {
        await plugin.execute(
            message,
            {
                args: command.args || [],
                rawArgs:
                    command.rawArgs || "",
                command: command.name
            }
        );

        return true;
    } catch (error) {
        console.error(
            `[Voltage] Command "${command.name}" failed:`,
            error
        );

        await reply(
            message,
            "Something went wrong while running that command."
        );

        return true;
    }
}

module.exports = {
    dispatchCommand
};
