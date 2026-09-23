const {
    normalizeJid
} = require("./jid");

const PREFIX =
    process.env.PREFIX || ".";

const VOLTAGE_NAME =
    process.env.VOLTAGE_NAME || "Voltage";

function escapeRegExp(value) {
    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

function hasVoltageWord(text = "") {
    const pattern = new RegExp(
        `\\b${escapeRegExp(VOLTAGE_NAME)}\\b`,
        "i"
    );

    return pattern.test(
        String(text)
    );
}

function isCommand(text = "") {
    return String(text)
        .trim()
        .startsWith(PREFIX);
}

function getCommand(text = "") {
    const trimmed =
        String(text)
            .trim();

    if (!trimmed.startsWith(PREFIX)) {
        return null;
    }

    const withoutPrefix =
        trimmed
            .slice(PREFIX.length)
            .trim();

    if (!withoutPrefix) {
        return null;
    }

    const parts =
        withoutPrefix.split(/\s+/);

    return {
        name:
            parts[0].toLowerCase(),

        args:
            parts.slice(1),

        rawArgs:
            parts.slice(1).join(" "),

        text:
            withoutPrefix
    };
}

function getVoltageCommand(text = "") {
    const value =
        String(text)
            .trim();

    const match =
        value.match(
            new RegExp(
                `^${escapeRegExp(VOLTAGE_NAME)}(?:\\s+([\\s\\S]*))?$`,
                "i"
            )
        );

    if (!match) {
        return null;
    }

    const rawArgs =
        (match[1] || "").trim();

    return {
        name: "voltage",
        args:
            rawArgs
                ? rawArgs.split(/\s+/)
                : [],
        rawArgs,
        text: value
    };
}

function isReplyToVoltage(message) {
    const quoted =
        message?.quoted;

    if (!quoted) {
        return false;
    }

    const botJid =
        normalizeJid(
            message?.sock?.user?.id
        );

    const participant =
        normalizeJid(
            quoted.participant
        );

    const remoteJid =
        normalizeJid(
            quoted.remoteJid
        );

    return Boolean(
        botJid &&
        (
            participant === botJid ||
            remoteJid === botJid
        )
    );
}

function isVoltageMentioned(message) {
    if (!message?.mentions?.length) {
        return false;
    }

    const botJid =
        normalizeJid(
            message?.sock?.user?.id
        );

    if (!botJid) {
        return false;
    }

    return message.mentions.some(
        jid =>
            normalizeJid(jid) === botJid
    );
}

function shouldRespond(message) {
    const text =
        String(
            message?.text || ""
        ).trim();

    if (!text) {
        return {
            respond: false,
            reason: "empty"
        };
    }

    /*
     * Normal prefixed commands.
     */
    if (isCommand(text)) {
        const command =
            getCommand(text);

        return {
            respond: true,
            reason: "command",
            command
        };
    }

    /*
     * Voltage without prefix.
     *
     * Example:
     * Voltage hi
     * Voltage explain this
     */
    const voltageCommand =
        getVoltageCommand(text);

    if (voltageCommand) {
        return {
            respond: true,
            reason: "voltage",
            command: voltageCommand
        };
    }

    /*
     * Group replies / mentions.
     *
     * These go directly to AI.
     */
    if (message?.isGroup) {
        if (isVoltageMentioned(message)) {
            return {
                respond: true,
                reason: "mention"
            };
        }

        if (isReplyToVoltage(message)) {
            return {
                respond: true,
                reason: "reply"
            };
        }
    }

    return {
        respond: false,
        reason: "ignored"
    };
}

module.exports = {
    hasVoltageWord,
    isCommand,
    getCommand,
    getVoltageCommand,
    isReplyToVoltage,
    isVoltageMentioned,
    shouldRespond
};
