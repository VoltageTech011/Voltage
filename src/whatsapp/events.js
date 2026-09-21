const {
    dispatchMessage
} = require("../message/dispatcher");

function registerWhatsAppEvents(sock) {
    sock.ev.on(
        "messages.upsert",
        async ({ messages, type }) => {
            if (type !== "notify") {
                return;
            }

            for (const raw of messages) {
                try {
                    await dispatchMessage(
                        sock,
                        raw
                    );
                } catch (error) {
                    console.error(
                        "[Voltage] Message processing error:",
                        error.message
                    );
                }
            }
        }
    );

    sock.ev.on(
        "messages.update",
        async (updates) => {
            for (const update of updates) {
                if (
                    update.update?.status
                ) {
                    continue;
                }
            }
        }
    );

    sock.ev.on(
        "group-participants.update",
        async (update) => {
            console.log(
                "[Voltage] Group participant event:",
                update.action,
                update.id
            );
        }
    );
}

module.exports = {
    registerWhatsAppEvents
};
