const {
    dispatchMessage
} = require("../message/dispatcher");

async function registerWhatsAppEvents(sock) {
    if (!sock) {
        throw new Error(
            "Cannot register events without a WhatsApp socket."
        );
    }

    sock.ev.on(
        "messages.upsert",
        async (event) => {
            try {
                const messages =
                    event?.messages || [];

                if (!messages.length) {
                    return;
                }

                console.log(
                    `[Voltage] Received ${messages.length} WhatsApp message(s).`
                );

                for (const raw of messages) {
                    try {
                        if (!raw?.message) {
                            continue;
                        }

                        console.log(
                            `[Voltage] Processing message ${raw.key?.id || "unknown"}`
                        );

                        await dispatchMessage(
                            sock,
                            raw
                        );
                    } catch (error) {
                        console.error(
                            "[Voltage] Message processing error:",
                            error
                        );
                    }
                }
            } catch (error) {
                console.error(
                    "[Voltage] messages.upsert error:",
                    error
                );
            }
        }
    );

    sock.ev.on(
        "messages.update",
        updates => {
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
        }
    );

    sock.ev.on(
        "messages.delete",
        update => {
            console.log(
                "[Voltage] Message deletion event."
            );
        }
    );

    sock.ev.on(
        "group-participants.update",
        update => {
            console.log(
                `[Voltage] Group participant event: ${
                    update?.action ||
                    "unknown"
                } ${update?.id || ""}`
            );
        }
    );

    console.log(
        "[Voltage] WhatsApp message events registered."
    );
}

module.exports = {
    registerWhatsAppEvents
};
