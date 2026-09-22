const FOOTER =
    "> *©️ Powered by Thereal_VoltageLord*";

function withFooter(text) {
    const content =
        String(text ?? "").trim();

    if (!content) {
        return FOOTER;
    }

    if (
        content
            .toLowerCase()
            .includes(
                "powered by thereal_voltagelord"
            )
    ) {
        return content;
    }

    return `${content}\n\n${FOOTER}`;
}

async function reply(
    message,
    text,
    options = {}
) {
    const content =
        options.footer === false
            ? String(text ?? "").trim()
            : withFooter(text);

    const cleanOptions = {
        ...options
    };

    delete cleanOptions.footer;

    return message.reply(
        content,
        cleanOptions
    );
}

async function send(
    message,
    content,
    options = {}
) {
    if (
        typeof content === "string"
    ) {
        const finalContent =
            options.footer === false
                ? content
                : withFooter(content);

        const cleanOptions = {
            ...options
        };

        delete cleanOptions.footer;

        return message.send(
            finalContent,
            cleanOptions
        );
    }

    return message.send(
        content,
        options
    );
}

async function edit(
    message,
    sent,
    text,
    options = {}
) {
    if (!message?.sock) {
        throw new Error(
            "Cannot edit message: socket unavailable."
        );
    }

    if (!sent?.key) {
        throw new Error(
            "Cannot edit message: message key unavailable."
        );
    }

    const content =
        options.footer === false
            ? String(text ?? "").trim()
            : withFooter(text);

    const cleanOptions = {
        ...options
    };

    delete cleanOptions.footer;

    return message.sock.sendMessage(
        message.from,
        {
            text: content
        },
        {
            edit: sent.key,
            ...cleanOptions
        }
    );
}

async function react(
    message,
    emoji
) {
    return message.react(emoji);
}

module.exports = {
    FOOTER,
    withFooter,
    reply,
    send,
    edit,
    react
};
