function cleanNumber(value) {
    return String(value || "")
        .replace(/\D/g, "");
}

function numberToJid(value) {
    const number =
        cleanNumber(value);

    if (!number) {
        return null;
    }

    return `${number}@s.whatsapp.net`;
}

function getQuotedSender(message) {
    return (
        message?.quoted?.participant ||
        null
    );
}

function getTargetFromMention(
    message
) {
    if (
        Array.isArray(message?.mentions) &&
        message.mentions.length > 0
    ) {
        return message.mentions[0];
    }

    return null;
}

function getTarget(
    message,
    args = []
) {
    const mentioned =
        getTargetFromMention(message);

    if (mentioned) {
        return mentioned;
    }

    const quoted =
        getQuotedSender(message);

    if (quoted) {
        return quoted;
    }

    const number =
        cleanNumber(args[0]);

    if (number) {
        return numberToJid(number);
    }

    return null;
}

function getDisplayNumber(jid) {
    if (!jid) {
        return "unknown";
    }

    return String(jid)
        .split("@")[0]
        .split(":")[0];
}

function permissionMessage(
    reason
) {
    if (reason === "group") {
        return "This command can only be used inside a group.";
    }

    if (reason === "requester") {
        return "Only group admins can use this command.";
    }

    if (reason === "bot") {
        return "I need to be a group admin to perform this action.";
    }

    return "This action is not allowed.";
}

module.exports = {
    cleanNumber,
    numberToJid,
    getTarget,
    getDisplayNumber,
    permissionMessage
};
