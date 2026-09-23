const {
dispatchMessage
} = require("../message/dispatcher");

async function registerWhatsAppEvents(sock) {
if (!sock || !sock.ev) {
throw new Error(
"Cannot register WhatsApp events without a valid socket."
);
}

console.log(
    "[Voltage] Registering WhatsApp message events..."
);

sock.ev.on(
    "messages.upsert",
    async (event) => {
        console.log(
            "[Voltage] messages.upsert event received."
        );

        try {
            const messages =
                Array.isArray(event?.messages)
                    ? event.messages
                    : [];

            console.log(
                `[Voltage] messages.upsert type: ${
                    event?.type || "unknown"
                } | messages: ${messages.length}`
            );

            if (!messages.length) {
                return;
            }

            for (const raw of messages) {
                try {
                    console.log(
                        `[Voltage] Incoming message: ${
                            raw?.key?.id ||
                            "unknown"
                        }`
                    );

                    console.log(
                        `[Voltage] From: ${
                            raw?.key?.remoteJid ||
                            "unknown"
                        } | FromMe: ${
                            Boolean(
                                raw?.key?.fromMe
                            )
                        }`
                    );

                    if (!raw?.message) {
                        console.log(
                            "[Voltage] Message has no message payload. Skipping."
                        );

                        continue;
                    }

                    console.log(
                        "[Voltage] Dispatching message..."
                    );

                    await dispatchMessage(
                        sock,
                        raw
                    );

                    console.log(
                        "[Voltage] Message dispatch completed."
                    );
                } catch (error) {
                    console.error(
                        "[Voltage] Message processing error:",
                        error?.stack ||
                        error
                    );
                }
            }
        } catch (error) {
            console.error(
                "[Voltage] messages.upsert handler error:",
                error?.stack ||
                error
            );
        }
    }
);

sock.ev.on(
    "messages.update",
    updates => {
        try {
            if (!Array.isArray(updates)) {
                return;
            }

            for (const update of updates) {
                console.log(
                    `[Voltage] Message update: ${
                        update?.key?.id ||
                        "unknown"
                    }`
                );
            }
        } catch (error) {
            console.error(
                "[Voltage] messages.update error:",
                error?.stack ||
                error
            );
        }
    }
);

sock.ev.on(
    "messages.delete",
    update => {
        try {
            console.log(
                "[Voltage] Message deletion event."
            );
        } catch (error) {
            console.error(
                "[Voltage] messages.delete error:",
                error?.stack ||
                error
            );
        }
    }
);

sock.ev.on(
    "group-participants.update",
    update => {
        try {
            console.log(
                `[Voltage] Group participant event: ${
                    update?.action ||
                    "unknown"
                } ${
                    update?.id ||
                    ""
                }`
            );
        } catch (error) {
            console.error(
                "[Voltage] group-participants.update error:",
                error?.stack ||
                error
            );
        }
    }
);

console.log(
    "[Voltage] WhatsApp message events registered."
);

}

module.exports = {
registerWhatsAppEvents
};
