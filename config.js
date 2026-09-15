require("dotenv").config();

const path = require("path");

const cleanNumber = (value) => {
    return String(value || "").replace(/\D/g, "");
};

const config = {
    ownerNumber: cleanNumber(process.env.OWNER_NUMBER),
    ownerName: process.env.OWNER_NAME || "Thereal_VoltageLord",

    name: process.env.VOLTAGE_NAME || "Voltage",
    prefix: process.env.VOLTAGE_PREFIX || ".",
    version: process.env.VOLTAGE_VERSION || "1.0.0",
    mode: process.env.VOLTAGE_MODE || "private",

    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 3000,

    paths: {
        root: __dirname,
        sessions: path.join(__dirname, "sessions"),
        plugins: path.join(__dirname, "plugins")
    }
};

module.exports = config;
