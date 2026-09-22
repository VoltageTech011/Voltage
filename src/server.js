require("dotenv").config();

const express = require("express");
const path = require("path");

const VoltageWhatsApp =
    require("./whatsapp/client");

const {
    loadCommands
} = require("./plugins/loader");

const registry =
    require("./plugins/registry");

const app =
    express();

const whatsapp =
    new VoltageWhatsApp();

const PORT =
    Number(process.env.PORT) || 3000;

app.use(
    express.json()
);

app.use(
    express.static(
        path.join(
            process.cwd(),
            "public"
        )
    )
);

app.get("/", (req, res) => {
    res.json({
        name:
            process.env.VOLTAGE_NAME ||
            "Voltage",

        status: "online",

        owner:
            process.env.OWNER_NAME ||
            "Thereal_VoltageLord",

        platform: "WhatsApp",

        runtime: "Node.js",

        version:
            process.env.VERSION ||
            "1.0.0"
    });
});

app.get(
    "/api/health",
    (req, res) => {
        res.json({
            status: "ok",
            service: "Voltage",
            uptime: process.uptime(),
            commands:
                registry.size()
        });
    }
);

app.get(
    "/api/whatsapp",
    (req, res) => {
        res.json(
            whatsapp.getStatus()
        );
    }
);

app.post(
    "/api/whatsapp/pair",
    async (req, res) => {
        try {
            const {
                number
            } = req.body;

            if (!number) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "WhatsApp number is required."
                    });
            }

            const code =
                await whatsapp.requestPairing(
                    number
                );

            return res.json({
                success: true,
                code,
                status:
                    whatsapp.getStatus()
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        error.message
                });
        }
    }
);

app.get(
    "/api/status",
    (req, res) => {
        res.json(
            whatsapp.getStatus()
        );
    }
);

const server =
    app.listen(
        PORT,
        async () => {
            console.log(
                `[Voltage] Server running on port ${PORT}`
            );

            const result =
                loadCommands();

            console.log(
                `[Voltage] Commands loaded: ${result.loaded}`
            );

            if (result.failed) {
                console.log(
                    `[Voltage] Commands failed: ${result.failed}`
                );
            }

            try {
                await whatsapp.start();

                console.log(
                    "[Voltage] WhatsApp engine initialized."
                );
            } catch (error) {
                console.error(
                    "[Voltage] WhatsApp initialization failed:",
                    error.message
                );
            }
        }
    );

const shutdown =
    async (signal) => {
        console.log(
            `[Voltage] ${signal} received.`
        );

        await whatsapp.stop();

        server.close(() => {
            process.exit(0);
        });
    };

process.once(
    "SIGINT",
    () => shutdown("SIGINT")
);

process.once(
    "SIGTERM",
    () => shutdown("SIGTERM")
);
