const {
    normalizeJid
} = require("./jid");

const PREFIX =
    process.env.PREFIX || ".";

const VOLTAGE_NAME =
    process.env.VOLTAGE_NAME || "Voltage";

function hasVoltageWord(text = "") {
    const pattern = new RegExp(
        `\\b${escapeRegExp(VOLTAGE_NAME)}\\b`,
        "i"
    );

    return pattern.test(text);
}

function escapeRegExp(value) {
    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

function isCommand(text = "") {
    return text.trim().startsWith(PREFIX);
}

function getCommand(text = "") {
    const trimmed = text.trim();

    if (!trimmed.startsWith(PREFIX)) {
        return null;
    }

    const withoutPrefix =
        trimmed.slice(PREFIX.length).trim();

    if (!withoutPrefix) {
        return null;
    }

    const parts =
        withoutPrefix.split(/\s+/);

    return {
        name: parts[0].toLowerCase(),
        args: parts.slice(1),
        rawArgs: parts.slice(1).join(" "),
        text: withoutPrefix
    };
}

function isReplyToVoltage(message) {
    const quoted =
        message.quoted;

    if (!quoted) {
        return false;
    }

    const botJid =
        normalizeJid(
            message.sock?.user?.id
        );

    const quotedParticipant =
        normalizeJid(
            quoted.participant
        );

    const quotedRemote =
        normalizeJid(
            quoted.remoteJid
        );

    return Boolean(
        botJid &&
        (
            quotedParticipant === botJid ||
            quotedRemote === botJid
        )
    );
}

function isVoltageMentioned(message) {
    if (!message.mentions?.length) {
        return false;
    }

    const botJid =
        normalizeJid(
            message.sock?.user?.id
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
        message.text || "";

    if (isCommand(text)) {
        return {
            respond: true,
            reason: "command",
            command: getCommand(text)
        };
    }

    if (!message.isGroup) {
        return {
            respond: hasVoltageWord(text),
            reason: hasVoltageWord(text)
                ? "dm_voltage"
                : "ignored"
        };
    }

    if (hasVoltageWord(text)) {
        return {
            respond: true,
            reason: "group_voltage"
        };
    }

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

    return {
        respond: false,
        reason: "ignored"
    };
}

module.exports = {
    hasVoltageWord,
    isCommand,
    getCommand,
    isReplyToVoltage,
    isVoltageMentioned,
    shouldRespond
};
