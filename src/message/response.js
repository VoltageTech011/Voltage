const FOOTER =
    "Powered by Thereal_VoltageLord";

function withFooter(text) {
    const content =
        String(text ?? "").trim();

    if (!content) {
        return FOOTER;
    }

    if (
        content
            .toLowerCase()
            .includes(FOOTER.toLowerCase())
    ) {
        return content;
    }

    return `${content}\n\n${FOOTER}`;
}

async function reply(message, text, options = {}) {
    return message.reply(
        withFooter(text),
        options
    );
}

async function send(message, content, options = {}) {
    if (typeof content === "string") {
        return message.send(
            withFooter(content),
            options
        );
    }

    return message.send(
        content,
        options
    );
}

async function react(message, emoji) {
    return message.react(emoji);
}

module.exports = {
    FOOTER,
    withFooter,
    reply,
    send,
    react
};
