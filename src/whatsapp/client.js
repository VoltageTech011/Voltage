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

class VoltageWhatsApp {
    constructor() {
        this.socket = null;
        this.state = "starting";
        this.pairingNumber = null;
        this.pairingCode = null;
        this.connectedNumber = null;
        this.lastError = null;
        this.reconnectTimer = null;

        this.authPath = path.join(process.cwd(), "auth");
        this.logger = P({ level: "silent" });
    }

    async start(number = null) {
        if (this.socket) {
            return;
        }

        this.state = "starting";
        this.lastError = null;

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(this.authPath);

        let version;

        try {
            const latest = await fetchLatestBaileysVersion();
            version = latest.version;
        } catch {
            version = [2, 3000, 1015901307];
        }

        this.socket = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    this.logger
                )
            },
            logger: this.logger,
            printQRInTerminal: false,
            browser: Browsers.ubuntu("Chrome"),
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: false,
            syncFullHistory: false
        });

        this.socket.ev.on("creds.update", saveCreds);

        this.socket.ev.on(
            "connection.update",
            async (update) => {
                await this.handleConnectionUpdate(
                    update,
                    state.creds,
                    number
                );
            }
        );

        return this.socket;
    }

    async handleConnectionUpdate(update, creds, requestedNumber) {
        const {
            connection,
            lastDisconnect
        } = update;

        if (connection) {
            this.state = getConnectionState(connection);
        }

        if (connection === "open") {
            this.connectedNumber =
                this.socket?.user?.id?.split(":")[0] ||
                this.socket?.user?.lid ||
                null;

            this.state = "connected";
            this.pairingCode = null;

            console.log(
                `[Voltage] WhatsApp connected: ${this.connectedNumber || "unknown"}`
            );

            return;
        }

        if (connection === "close") {
            this.socket = null;

            if (!shouldReconnect(lastDisconnect)) {
                this.state = "logged_out";
                this.connectedNumber = null;

                console.log(
                    "[Voltage] WhatsApp session logged out."
                );

                return;
            }

            this.state = "disconnected";

            console.log(
                "[Voltage] Connection closed. Reconnecting..."
            );

            clearTimeout(this.reconnectTimer);

            this.reconnectTimer = setTimeout(() => {
                this.start(requestedNumber).catch((error) => {
                    this.lastError = error.message;
                    this.state = "failed";

                    console.error(
                        "[Voltage] Reconnection failed:",
                        error.message
                    );
                });
            }, 3000);
        }
    }

    async requestPairing(number) {
        const normalized = normalizeNumber(number);

        if (!isValidPhoneNumber(normalized)) {
            throw new Error("Invalid WhatsApp phone number.");
        }

        if (!this.socket) {
            await this.start(normalized);
        }

        if (this.state === "connected") {
            throw new Error("Voltage is already connected.");
        }

        if (this.socket.authState?.creds?.registered) {
            throw new Error(
                "This session is already registered. Remove the auth session before pairing another number."
            );
        }

        this.pairingNumber = normalized;
        this.state = "waiting_for_pairing";

        try {
            const code = await this.socket.requestPairingCode(
                normalized
            );

            this.pairingCode = code;

            this.state = "pairing";

            console.log(
                `[Voltage] Pairing code generated: ${code}`
            );

            return code;
        } catch (error) {
            this.lastError = error.message;
            this.state = "failed";

            throw error;
        }
    }

    getStatus() {
        return {
            name: process.env.VOLTAGE_NAME || "Voltage",
            state: this.state,
            connected: this.state === "connected",
            number: this.connectedNumber,
            pairingNumber: this.pairingNumber,
            pairingCode: this.pairingCode,
            lastError: this.lastError
        };
    }

    async stop() {
        clearTimeout(this.reconnectTimer);

        if (this.socket) {
            try {
                this.socket.end(undefined);
            } catch {}

            this.socket = null;
        }

        this.state = "disconnected";
    }
}

module.exports = VoltageWhatsApp;
