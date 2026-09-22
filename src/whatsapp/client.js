const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const P = require("pino");
const path = require("path");

const {
    normalizeNumber,
    isValidPhoneNumber
} = require("./pairing");

const {
    shouldReconnect,
    getConnectionState
} = require("./connection");

const {
    registerWhatsAppEvents
} = require("./events");

class VoltageWhatsApp {
    constructor() {
        this.socket = null;

        this.state = "starting";

        this.pairingNumber = null;
        this.pairingCode = null;

        this.connectedNumber = null;
        this.lastError = null;

        this.reconnectTimer = null;

        this.authPath = path.join(
            process.cwd(),
            "auth"
        );

        this.logger = P({
            level: "silent"
        });
    }

    async start(number = null) {
        if (this.socket) {
            console.log(
                "[Voltage] WhatsApp socket already exists."
            );

            return this.socket;
        }

        this.state = "starting";
        this.lastError = null;

        console.log(
            "[Voltage] Initializing WhatsApp..."
        );

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(
            this.authPath
        );

        let version;

        try {
            const latest =
                await fetchLatestBaileysVersion();

            version = latest.version;

            console.log(
                `[Voltage] Using Baileys version: ${version.join(".")}`
            );
        } catch (error) {
            version = [
                2,
                3000,
                1015901307
            ];

            console.log(
                "[Voltage] Could not fetch latest Baileys version. Using fallback version."
            );
        }

        try {
            this.socket = makeWASocket({
                version,

                auth: {
                    creds: state.creds,

                    keys:
                        makeCacheableSignalKeyStore(
                            state.keys,
                            this.logger
                        )
                },

                logger: this.logger,

                printQRInTerminal: false,

                browser:
                    Browsers.ubuntu("Chrome"),

                generateHighQualityLinkPreview:
                    false,

                markOnlineOnConnect:
                    false,

                syncFullHistory:
                    false
            });

            console.log(
                "[Voltage] WhatsApp socket created."
            );

            this.socket.ev.on(
                "creds.update",
                saveCreds
            );

            await registerWhatsAppEvents(
                this.socket
            );

            this.socket.ev.on(
                "connection.update",
                async (update) => {
                    try {
                        await this.handleConnectionUpdate(
                            update,
                            state.creds,
                            number
                        );
                    } catch (error) {
                        this.lastError =
                            error.message;

                        console.error(
                            "[Voltage] Connection update error:",
                            error
                        );
                    }
                }
            );

            console.log(
                "[Voltage] WhatsApp events registered."
            );

            return this.socket;
        } catch (error) {
            this.socket = null;

            this.state = "failed";

            this.lastError =
                error.message;

            console.error(
                "[Voltage] Failed to create WhatsApp socket:",
                error
            );

            throw error;
        }
    }

    async handleConnectionUpdate(
        update,
        creds,
        requestedNumber
    ) {
        const {
            connection,
            lastDisconnect
        } = update;

        if (connection) {
            this.state =
                getConnectionState(
                    connection
                );

            console.log(
                `[Voltage] Connection state: ${this.state}`
            );
        }

        if (connection === "open") {
            this.connectedNumber =
                this.socket?.user?.id
                    ?.split(":")[0] ||
                this.socket?.user?.lid ||
                null;

            this.state =
                "connected";

            this.pairingCode =
                null;

            this.lastError =
                null;

            console.log(
                `[Voltage] WhatsApp connected: ${
                    this.connectedNumber ||
                    "unknown"
                }`
            );

            return;
        }

        if (connection === "close") {
            const reconnect =
                shouldReconnect(
                    lastDisconnect
                );

            console.log(
                `[Voltage] Connection closed. Reconnect: ${reconnect}`
            );

            this.socket = null;

            if (!reconnect) {
                this.state =
                    "logged_out";

                this.connectedNumber =
                    null;

                console.log(
                    "[Voltage] WhatsApp session logged out."
                );

                return;
            }

            this.state =
                "disconnected";

            clearTimeout(
                this.reconnectTimer
            );

            this.reconnectTimer =
                setTimeout(
                    async () => {
                        try {
                            console.log(
                                "[Voltage] Attempting WhatsApp reconnection..."
                            );

                            await this.start(
                                requestedNumber
                            );
                        } catch (error) {
                            this.lastError =
                                error.message;

                            this.state =
                                "failed";

                            console.error(
                                "[Voltage] Reconnection failed:",
                                error
                            );
                        }
                    },
                    3000
                );
        }
    }

    async requestPairing(number) {
        const normalized =
            normalizeNumber(number);

        if (
            !isValidPhoneNumber(
                normalized
            )
        ) {
            throw new Error(
                "Invalid WhatsApp phone number."
            );
        }

        if (
            this.state === "connected"
        ) {
            throw new Error(
                "Voltage is already connected."
            );
        }

        if (!this.socket) {
            await this.start(
                normalized
            );
        }

        if (
            this.socket?.authState?.creds
                ?.registered
        ) {
            throw new Error(
                "This session is already registered. Remove the auth session before pairing another number."
            );
        }

        this.pairingNumber =
            normalized;

        this.state =
            "waiting_for_pairing";

        try {
            console.log(
                `[Voltage] Requesting pairing code for ${normalized}`
            );

            const code =
                await this.socket.requestPairingCode(
                    normalized
                );

            this.pairingCode =
                code;

            this.state =
                "pairing";

            console.log(
                `[Voltage] Pairing code generated: ${code}`
            );

            return code;
        } catch (error) {
            this.lastError =
                error.message;

            this.state =
                "failed";

            console.error(
                "[Voltage] Pairing failed:",
                error
            );

            throw error;
        }
    }

    getStatus() {
        return {
            name:
                process.env.VOLTAGE_NAME ||
                "Voltage",

            state:
                this.state,

            connected:
                this.state === "connected",

            number:
                this.connectedNumber,

            pairingNumber:
                this.pairingNumber,

            pairingCode:
                this.pairingCode,

            lastError:
                this.lastError
        };
    }

    async stop() {
        clearTimeout(
            this.reconnectTimer
        );

        if (this.socket) {
            try {
                this.socket.end(
                    undefined
                );
            } catch {}
        }

        this.socket = null;

        this.state =
            "disconnected";

        console.log(
            "[Voltage] WhatsApp stopped."
        );
    }
}

module.exports =
    VoltageWhatsApp;
