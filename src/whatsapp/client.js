const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const P = require("pino");
const path = require("path");
const fs = require("fs");

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

function safeStringify(value) {
    try {
        return JSON.stringify(
            value,
            (key, val) =>
                typeof val === "bigint"
                    ? val.toString()
                    : val
        );
    } catch (error) {
        return "[unserializable]";
    }
}

class VoltageWhatsApp {
    constructor() {
        this.socket = null;
        this.state = "starting";

        this.pairingNumber = null;
        this.pairingCode = null;

        this.connectedNumber = null;
        this.lastError = null;

        this.reconnectTimer = null;
        this.starting = false;

        this.authPath = path.join(
            process.cwd(),
            "auth"
        );

        this.logger = P({
            level: "silent"
        });
    }

    async start(number = null) {
        if (this.starting) {
            console.log(
                "[Voltage] start() already in progress. Skipping."
            );

            return this.socket;
        }

        if (this.socket) {
            console.log(
                "[Voltage] WhatsApp socket already exists."
            );

            return this.socket;
        }

        this.starting = true;
        this.state = "starting";
        this.lastError = null;

        console.log(
            "[Voltage] Initializing WhatsApp..."
        );

        console.log(
            `[Voltage] Auth path: ${this.authPath}`
        );

        try {
            if (!fs.existsSync(this.authPath)) {
                fs.mkdirSync(
                    this.authPath,
                    {
                        recursive: true
                    }
                );

                console.log(
                    "[Voltage] Auth directory did not exist. Created."
                );
            }

            let authFiles = [];

            try {
                authFiles =
                    fs.readdirSync(
                        this.authPath
                    );
            } catch (error) {
                authFiles = [];
            }

            console.log(
                `[Voltage] Auth files present: ${
                    authFiles.length
                        ? authFiles.join(", ")
                        : "(none)"
                }`
            );

            const {
                state,
                saveCreds
            } = await useMultiFileAuthState(
                this.authPath
            );

            console.log(
                `[Voltage] creds.registered at startup: ${Boolean(
                    state?.creds?.registered
                )}`
            );

            let version;

            try {
                const latest =
                    await fetchLatestBaileysVersion();

                version = latest.version;

                console.log(
                    `[Voltage] Using Baileys version: ${version.join(
                        "."
                    )}`
                );
            } catch (error) {
                version = [
                    2,
                    3000,
                    1043857760
                ];

                console.log(
                    "[Voltage] Could not fetch latest Baileys version. Using fallback."
                );
            }

            const sock = makeWASocket({
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

            this.socket = sock;

            console.log(
                "[Voltage] WhatsApp socket created."
            );

            sock.ev.on(
                "creds.update",
                async () => {
                    console.log(
                        "[Voltage] creds.update event received. Saving..."
                    );

                    try {
                        await saveCreds();

                        console.log(
                            "[Voltage] Creds saved."
                        );
                    } catch (error) {
                        console.error(
                            "[Voltage] Failed to save creds:",
                            error?.stack ||
                            error
                        );
                    }
                }
            );

            sock.ev.on(
                "connection.update",
                async (update) => {
                    console.log(
                        `[Voltage] connection.update raw: ${safeStringify(
                            update
                        )}`
                    );

                    try {
                        await this.handleConnectionUpdate(
                            update,
                            number
                        );
                    } catch (error) {
                        this.lastError =
                            error.message;

                        console.error(
                            "[Voltage] Connection update error:",
                            error?.stack ||
                            error
                        );
                    }
                }
            );

            await registerWhatsAppEvents(
                sock
            );

            console.log(
                "[Voltage] WhatsApp events registered."
            );

            return sock;
        } catch (error) {
            this.socket = null;

            this.state = "failed";

            this.lastError =
                error.message;

            console.error(
                "[Voltage] Failed to create WhatsApp socket:",
                error?.stack ||
                error
            );

            throw error;
        } finally {
            this.starting = false;
        }
    }

    async handleConnectionUpdate(
        update,
        requestedNumber
    ) {
        const {
            connection,
            lastDisconnect,
            qr
        } = update || {};

        if (qr) {
            console.log(
                `[Voltage] QR payload received (length ${qr.length}).`
            );
        }

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
            const reason =
                lastDisconnect?.error
                    ?.output?.statusCode;

            const reconnect =
                shouldReconnect(
                    lastDisconnect
                );

            console.log(
                `[Voltage] Connection closed. Reason: ${
                    reason ?? "unknown"
                } | Reconnect: ${reconnect}`
            );

            if (this.socket) {
                try {
                    this.socket.ev.removeAllListeners(
                        "connection.update"
                    );
                } catch (error) {
                    // ignore cleanup errors
                }

                this.socket = null;
            }

            if (!reconnect) {
                this.state =
                    "logged_out";

                this.connectedNumber =
                    null;

                console.log(
                    "[Voltage] WhatsApp session logged out. Delete auth/ to re-pair."
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
                                error?.stack ||
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
                error?.stack ||
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
            } catch (error) {
                // ignore
            }
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
