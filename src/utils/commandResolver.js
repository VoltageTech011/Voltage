function levenshtein(a, b) {
    const left =
        String(a || "").toLowerCase();

    const right =
        String(b || "").toLowerCase();

    const matrix =
        Array.from(
            {
                length: left.length + 1
            },
            () =>
                Array(
                    right.length + 1
                ).fill(0)
        );

    for (
        let i = 0;
        i <= left.length;
        i++
    ) {
        matrix[i][0] = i;
    }

    for (
        let j = 0;
        j <= right.length;
        j++
    ) {
        matrix[0][j] = j;
    }

    for (
        let i = 1;
        i <= left.length;
        i++
    ) {
        for (
            let j = 1;
            j <= right.length;
            j++
        ) {
            const cost =
                left[i - 1] ===
                right[j - 1]
                    ? 0
                    : 1;

            matrix[i][j] =
                Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
        }
    }

    return matrix
        [left.length]
        [right.length];
}

function similarity(a, b) {
    const left =
        String(a || "").toLowerCase();

    const right =
        String(b || "").toLowerCase();

    if (!left || !right) {
        return 0;
    }

    if (left === right) {
        return 100;
    }

    const distance =
        levenshtein(
            left,
            right
        );

    const length =
        Math.max(
            left.length,
            right.length
        );

    return Math.round(
        (1 - distance / length) * 100
    );
}

function getCandidates(registry) {
    const candidates = [];
    const seen = new Set();

    if (
        !registry ||
        typeof registry !== "object"
    ) {
        return candidates;
    }

    const commands =
        typeof registry.values === "function"
            ? registry.values()
            : [];

    for (const command of commands) {
        if (!command?.name) {
            continue;
        }

        const names = [
            command.name,
            ...(Array.isArray(command.aliases)
                ? command.aliases
                : [])
        ];

        for (const name of names) {
            const normalized =
                String(name)
                    .trim()
                    .toLowerCase();

            if (
                !normalized ||
                seen.has(normalized)
            ) {
                continue;
            }

            seen.add(normalized);

            candidates.push({
                name: normalized,
                command: command
            });
        }
    }

    return candidates;
}

function resolveCommand(
    input,
    registry
) {
    const query =
        String(input || "")
            .trim()
            .toLowerCase();

    if (!query) {
        return null;
    }

    const candidates =
        getCandidates(registry);

    const results =
        candidates
            .map(candidate => ({
                ...candidate,
                score:
                    similarity(
                        query,
                        candidate.name
                    )
            }))
            .sort(
                (a, b) =>
                    b.score - a.score
            );

    if (!results.length) {
        return null;
    }

    const best =
        results[0];

    if (best.score >= 75) {
        return {
            type: "suggestion",
            input: query,
            command: best.command,
            name: best.name,
            score: best.score
        };
    }

    if (best.score >= 50) {
        return {
            type: "possible",
            input: query,
            command: best.command,
            name: best.name,
            score: best.score,
            alternatives:
                results
                    .slice(0, 3)
                    .filter(
                        result =>
                            result.score >= 50
                    )
                    .map(
                        result => ({
                            name:
                                result.name,
                            score:
                                result.score
                        })
                    )
        };
    }

    return {
        type: "none",
        input: query,
        command: null,
        name: null,
        score: best.score
    };
}

module.exports = {
    levenshtein,
    similarity,
    resolveCommand
};
