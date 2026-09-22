const fs =
    require("fs");

const path =
    require("path");

const {
    DatabaseSync
} = require("node:sqlite");

const {
    reply
} = require("../message/response");

const databaseDirectory =
    path.join(
        process.cwd(),
        "database"
    );

const databasePath =
    path.join(
        databaseDirectory,
        "rps.db"
    );

if (
    !fs.existsSync(
        databaseDirectory
    )
) {
    fs.mkdirSync(
        databaseDirectory,
        {
            recursive: true
        }
    );
}

const db =
    new DatabaseSync(
        databasePath
    );

db.exec(`
    CREATE TABLE IF NOT EXISTS rps_stats (
        player TEXT PRIMARY KEY,
        name TEXT,
        games INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
    )
`);

const choices = [
    "rock",
    "paper",
    "scissors"
];

const symbols = {
    rock: "ROCK",
    paper: "PAPER",
    scissors: "SCISSORS"
};

function getPlayerId(message) {
    return (
        message.senderNumber ||
        message.sender ||
        "unknown"
    );
}

function getPlayerName(message) {
    return (
        message.pushName ||
        message.senderNumber ||
        "Player"
    );
}

function getStats(
    player
) {
    return db
        .prepare(`
            SELECT
                player,
                name,
                games,
                wins,
                losses,
                draws
            FROM rps_stats
            WHERE player = ?
        `)
        .get(player);
}

function ensurePlayer(
    message
) {
    const player =
        getPlayerId(message);

    const name =
        getPlayerName(message);

    db.prepare(`
        INSERT INTO rps_stats (
            player,
            name,
            games,
            wins,
            losses,
            draws,
            updated_at
        )
        VALUES (?, ?, 0, 0, 0, 0, ?)
        ON CONFLICT(player)
        DO UPDATE SET
            name = excluded.name,
            updated_at = excluded.updated_at
    `).run(
        player,
        name,
        Date.now()
    );

    return player;
}

function updateStats(
    player,
    result
) {
    const column =
        result === "win"
            ? "wins"
            : result === "loss"
                ? "losses"
                : "draws";

    db.prepare(`
        UPDATE rps_stats
        SET
            games = games + 1,
            ${column} = ${column} + 1,
            updated_at = ?
        WHERE player = ?
    `).run(
        Date.now(),
        player
    );
}

function calculateResult(
    player,
    bot
) {
    if (player === bot) {
        return "draw";
    }

    if (
        (
            player === "rock" &&
            bot === "scissors"
        ) ||
        (
            player === "paper" &&
            bot === "rock"
        ) ||
        (
            player === "scissors" &&
            bot === "paper"
        )
    ) {
        return "win";
    }

    return "loss";
}

function randomChoice() {
    return choices[
        Math.floor(
            Math.random() *
            choices.length
        )
    ];
}

function formatStats(
    message,
    stats
) {
    const games =
        stats?.games || 0;

    const wins =
        stats?.wins || 0;

    const losses =
        stats?.losses || 0;

    const draws =
        stats?.draws || 0;

    const winRate =
        games > 0
            ? (
                (wins / games) *
                100
            ).toFixed(1)
            : "0.0";

    return (
`╭──〔 VOLTAGE // RPS STATS 〕──╮
│                             │
│  PLAYER                     │
│  └─ ${message.pushName || message.senderNumber || "Unknown"}
│                             │
│  GAMES PLAYED  ${games}
│  WINS          ${wins}
│  LOSSES        ${losses}
│  DRAWS         ${draws}
│                             │
│  WIN RATE      ${winRate}%
│                             │
│  RECORD        ${wins}-${losses}-${draws}
│                             │
╰─────────────────────────────╯`
    );
}

async function editMessage(
    message,
    sent,
    text
) {
    if (!sent?.key) {
        return null;
    }

    return message.sock.sendMessage(
        message.from,
        {
            text,
            edit: sent.key
        }
    );
}

function sleep(ms) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

module.exports = {
    name: "rps",

    aliases: [
        "rockpaperscissors"
    ],

    description:
        "Play Rock Paper Scissors against Voltage.",

    usage:
        ".rps rock",

    async execute(
        message,
        { args = [] } = {}
    ) {
        const input =
            String(
                args[0] || ""
            )
                .trim()
                .toLowerCase();

        const player =
            ensurePlayer(message);

        if (
            input === "stats"
        ) {
            const stats =
                getStats(player);

            return reply(
                message,
                formatStats(
                    message,
                    stats
                )
            );
        }

        if (
            !choices.includes(input)
        ) {
            return reply(
                message,
`╭──〔 VOLTAGE // RPS 〕──╮
│                       │
│  ROCK • PAPER •       │
│  SCISSORS             │
│                       │
│  PLAY                 │
│  ├─ .rps rock         │
│  ├─ .rps paper        │
│  └─ .rps scissors     │
│                       │
│  STATS                │
│  └─ .rps stats        │
│                       │
╰───────────────────────╯`
            );
        }

        const sent =
            await reply(
                message,
`╭──〔 VOLTAGE // ARENA 〕──╮
│                         │
│  CONNECTION ESTABLISHED │
│                         │
│  PLAYER INPUT           │
│  └─ ${symbols[input]}
│                         │
│  VOLTAGE IS THINKING... │
│                         │
│  [░░░░░░░░░░] 0%        │
│                         │
╰─────────────────────────╯`
            );

        if (!sent?.key) {
            return sent;
        }

        await sleep(350);

        await editMessage(
            message,
            sent,
`╭──〔 VOLTAGE // ARENA 〕──╮
│                         │
│  CONNECTION ESTABLISHED │
│                         │
│  PLAYER INPUT           │
│  └─ ${symbols[input]}
│                         │
│  ANALYZING MOVE...      │
│                         │
│  [██░░░░░░░░] 25%       │
│                         │
╰─────────────────────────╯`
        );

        await sleep(350);

        await editMessage(
            message,
            sent,
`╭──〔 VOLTAGE // ARENA 〕──╮
│                         │
│  CONNECTION ESTABLISHED │
│                         │
│  PLAYER INPUT           │
│  └─ ${symbols[input]}
│                         │
│  GENERATING COUNTER...  │
│                         │
│  [█████░░░░░] 50%       │
│                         │
╰─────────────────────────╯`
        );

        await sleep(350);

        await editMessage(
            message,
            sent,
`╭──〔 VOLTAGE // ARENA 〕──╮
│                         │
│  PLAYER MOVE LOCKED     │
│  └─ ${symbols[input]}
│                         │
│  VOLTAGE MOVE LOCKED    │
│  └─ ???                 │
│                         │
│  [███████░░░] 75%       │
│                         │
╰─────────────────────────╯`
        );

        await sleep(350);

        const bot =
            randomChoice();

        const result =
            calculateResult(
                input,
                bot
            );

        updateStats(
            player,
            result
        );

        const resultText =
            result === "win"
                ? "YOU WIN"
                : result === "loss"
                    ? "VOLTAGE WINS"
                    : "DRAW";

        const resultSymbol =
            result === "win"
                ? "PLAYER"
                : result === "loss"
                    ? "VOLTAGE"
                    : "NEUTRAL";

        const stats =
            getStats(player);

        await editMessage(
            message,
            sent,
`╭──〔 VOLTAGE // ARENA 〕──╮
│                         │
│  FINAL RESULT           │
│                         │
│  PLAYER                │
│  └─ ${symbols[input]}
│                         │
│  VOLTAGE               │
│  └─ ${symbols[bot]}
│                         │
│  ═══════════════════    │
│                         │
│  ${resultText}          │
│  └─ ${resultSymbol}
│                         │
│  RECORD                 │
│  └─ ${stats.wins}-${stats.losses}-${stats.draws}
│                         │
│  GAMES: ${stats.games}                 │
│                         │
╰─────────────────────────╯`
        );

        return sent;
    }
};
