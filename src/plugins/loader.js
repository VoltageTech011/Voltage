const fs = require("fs");
const path = require("path");

const registry =
    require("./registry");

const SKIP_FILES = new Set([
    "dispatcher.js"
]);

function loadCommands() {
    const directory =
        path.join(
            process.cwd(),
            "src",
            "commands"
        );

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        });

        return {
            loaded: 0,
            failed: 0
        };
    }

    const files =
        fs.readdirSync(directory)
            .filter(file =>
                file.endsWith(".js")
            )
            .filter(file =>
                !SKIP_FILES.has(file)
            )
            .sort();

    let loaded = 0;
    let failed = 0;

    for (const file of files) {
        const fullPath =
            path.join(directory, file);

        try {
            delete require.cache[
                require.resolve(fullPath)
            ];

            const plugin =
                require(fullPath);

            registry.register(plugin);

            loaded++;

            console.log(
                `[Voltage] Loaded command: ${plugin.name}`
            );
        } catch (error) {
            failed++;

            console.error(
                `[Voltage] Failed to load ${file}:`,
                error.message
            );
        }
    }

    return {
        loaded,
        failed
    };
}

module.exports = {
    loadCommands
};
