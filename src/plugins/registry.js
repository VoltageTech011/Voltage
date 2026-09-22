const commands = new Map();

function register(plugin) {
    if (!plugin || typeof plugin !== "object") {
        throw new Error("Invalid plugin.");
    }

    if (!plugin.name) {
        throw new Error("Plugin is missing a name.");
    }

    if (typeof plugin.execute !== "function") {
        throw new Error(
            `Plugin "${plugin.name}" is missing execute().`
        );
    }

    const name = String(plugin.name)
        .trim()
        .toLowerCase();

    commands.set(name, plugin);

    if (Array.isArray(plugin.aliases)) {
        for (const alias of plugin.aliases) {
            const normalized =
                String(alias)
                    .trim()
                    .toLowerCase();

            if (normalized) {
                commands.set(normalized, plugin);
            }
        }
    }

    return plugin;
}

function get(name) {
    if (!name) {
        return null;
    }

    return commands.get(
        String(name).trim().toLowerCase()
    ) || null;
}

function has(name) {
    return Boolean(get(name));
}

function all() {
    return [
        ...new Set(commands.values())
    ];
}

function clear() {
    commands.clear();
}

function size() {
    return all().length;
}

module.exports = {
    register,
    get,
    has,
    all,
    clear,
    size
};
