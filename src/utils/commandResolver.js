function normalizeText(value = "") {
    return String(value)
        .toLowerCase()
        .replace(/[^\w\s']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function levenshtein(a, b) {
    const left = normalizeText(a);
    const right = normalizeText(b);

    if (!left) return right.length;
    if (!right) return left.length;

    const previous =
        Array.from(
            { length: right.length + 1 },
            (_, i) => i
        );

    for (
        let i = 1;
        i <= left.length;
        i++
    ) {
        const current = [i];

        for (
            let j = 1;
            j <= right.length;
            j++
        ) {
            const cost =
                left[i - 1] === right[j - 1]
                    ? 0
                    : 1;

            current[j] =
                Math.min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + cost
                );
        }

        for (
            let j = 0;
            j < current.length;
            j++
        ) {
            previous[j] =
                current[j];
        }
    }

    return previous[right.length];
}

function similarity(a, b) {
    const left = normalizeText(a);
    const right = normalizeText(b);

    if (!left || !right) {
        return 0;
    }

    if (left === right) {
        return 100;
    }

    if (
        left.includes(right) ||
        right.includes(left)
    ) {
        return 90;
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

    return Math.max(
        0,
        Math.round(
            (1 - distance / length) * 100
        )
    );
}

function tokenize(value = "") {
    return normalizeText(value)
        .split(/\s+/)
        .filter(Boolean);
}

function getCommandPhrases(command) {
    const phrases = [];

    if (command?.name) {
        phrases.push(command.name);
    }

    if (
        Array.isArray(command?.aliases)
    ) {
        phrases.push(
            ...command.aliases
        );
    }

    if (
        Array.isArray(command?.triggers)
    ) {
        phrases.push(
            ...command.triggers
        );
    }

    if (
        Array.isArray(command?.phrases)
    ) {
        phrases.push(
            ...command.phrases
        );
    }

    return [
        ...new Set(
            phrases
                .map(normalizeText)
                .filter(Boolean)
        )
    ];
}

function getCommandKeywords(command) {
    if (
        !Array.isArray(
            command?.keywords
        )
    ) {
        return [];
    }

    return [
        ...new Set(
            command.keywords
                .map(normalizeText)
                .filter(Boolean)
        )
    ];
}

function scorePhrase(
    query,
    phrase
) {
    const normalizedQuery =
        normalizeText(query);

    const normalizedPhrase =
        normalizeText(phrase);

    if (
        !normalizedQuery ||
        !normalizedPhrase
    ) {
        return 0;
    }

    if (
        normalizedQuery ===
        normalizedPhrase
    ) {
        return 100;
    }

    if (
        normalizedQuery.includes(
            normalizedPhrase
        )
    ) {
        return 95;
    }

    if (
        normalizedPhrase.includes(
            normalizedQuery
        )
    ) {
        return 90;
    }

    const queryWords =
        tokenize(normalizedQuery);

    const phraseWords =
        tokenize(normalizedPhrase);

    let matched = 0;

    for (const word of queryWords) {
        if (
            phraseWords.some(
                phraseWord =>
                    similarity(
                        word,
                        phraseWord
                    ) >= 80
            )
        ) {
            matched++;
        }
    }

    if (!queryWords.length) {
        return 0;
    }

    const wordScore =
        (matched / queryWords.length) * 100;

    const fuzzyScore =
        similarity(
            normalizedQuery,
            normalizedPhrase
        );

    return Math.round(
        Math.max(
            wordScore,
            fuzzyScore
        )
    );
}

function scoreCommand(
    query,
    command
) {
    const phrases =
        getCommandPhrases(
            command
        );

    const keywords =
        getCommandKeywords(
            command
        );

    let bestScore = 0;
    let matchedPhrase = null;
    let matchedKeywords = [];

    for (const phrase of phrases) {
        const score =
            scorePhrase(
                query,
                phrase
            );

        if (score > bestScore) {
            bestScore = score;
            matchedPhrase = phrase;
        }
    }

    const queryWords =
        tokenize(query);

    for (const keyword of keywords) {
        const keywordWords =
            tokenize(keyword);

        const matches =
            keywordWords.filter(
                keywordWord =>
                    queryWords.some(
                        queryWord =>
                            similarity(
                                queryWord,
                                keywordWord
                            ) >= 80
                    )
            );

        if (
            matches.length ===
            keywordWords.length
        ) {
            matchedKeywords.push(
                keyword
            );
        }
    }

    if (matchedKeywords.length) {
        bestScore =
            Math.max(
                bestScore,
                85
            );
    }

    return {
        score: bestScore,
        matchedPhrase,
        matchedKeywords
    };
}

function getCandidates(registry) {
    const candidates = [];

    if (!registry) {
        return candidates;
    }

    const commands =
        typeof registry.values === "function"
            ? Array.from(
                registry.values()
            )
            : Array.isArray(registry)
                ? registry
                : [];

    for (const command of commands) {
        if (!command?.name) {
            continue;
        }

        candidates.push(command);
    }

    return candidates;
}

function stripVoltagePrefix(input) {
    const text =
        String(input || "")
            .trim();

    return text.replace(
        /^voltage\b[\s,:-]*/i,
        ""
    ).trim();
}

function resolveCommand(
    input,
    registry,
    options = {}
) {
    const original =
        String(input || "").trim();

    if (!original) {
        return null;
    }

    const query =
        stripVoltagePrefix(
            original
        );

    if (!query) {
        return null;
    }

    const candidates =
        getCandidates(
            registry
        );

    if (!candidates.length) {
        return {
            type: "none",
            input: query,
            command: null,
            name: null,
            score: 0,
            args: "",
            matchedPhrase: null,
            alternatives: []
        };
    }

    const results =
        candidates
            .map(command => {
                const result =
                    scoreCommand(
                        query,
                        command
                    );

                return {
                    command,
                    name:
                        String(
                            command.name
                        )
                            .toLowerCase(),
                    score:
                        result.score,
                    matchedPhrase:
                        result.matchedPhrase,
                    matchedKeywords:
                        result.matchedKeywords
                };
            })
            .sort(
                (a, b) =>
                    b.score - a.score
            );

    const best =
        results[0];

    const strongThreshold =
        options.strongThreshold ?? 72;

    const possibleThreshold =
        options.possibleThreshold ?? 55;

    const resultBase = {
        input: query,
        command: best.command,
        name: best.name,
        score: best.score,
        matchedPhrase:
            best.matchedPhrase,
        matchedKeywords:
            best.matchedKeywords,
        args: extractArguments(
            query,
            best.matchedPhrase
        )
    };

    if (
        best.score >=
        strongThreshold
    ) {
        return {
            type: "match",
            ...resultBase
        };
    }

    if (
        best.score >=
        possibleThreshold
    ) {
        return {
            type: "possible",
            ...resultBase,
            alternatives:
                results
                    .slice(0, 3)
                    .map(result => ({
                        name:
                            result.name,
                        score:
                            result.score
                    }))
        };
    }

    return {
        type: "none",
        input: query,
        command: null,
        name: null,
        score: best.score,
        args: "",
        matchedPhrase: null,
        alternatives: []
    };
}

function extractArguments(
    query,
    matchedPhrase
) {
    if (!query) {
        return "";
    }

    if (!matchedPhrase) {
        return query;
    }

    const normalizedQuery =
        normalizeText(query);

    const normalizedPhrase =
        normalizeText(
            matchedPhrase
        );

    if (
        normalizedQuery ===
        normalizedPhrase
    ) {
        return "";
    }

    const index =
        normalizedQuery.indexOf(
            normalizedPhrase
        );

    if (index !== -1) {
        return normalizedQuery
            .slice(
                index +
                normalizedPhrase.length
            )
            .trim();
    }

    const phraseWords =
        tokenize(
            normalizedPhrase
        );

    const queryWords =
        tokenize(
            normalizedQuery
        );

    let start = 0;

    for (
        let i = 0;
        i < queryWords.length;
        i++
    ) {
        const section =
            queryWords
                .slice(
                    i,
                    i + phraseWords.length
                )
                .join(" ");

        if (
            similarity(
                section,
                normalizedPhrase
            ) >= 80
        ) {
            start =
                i +
                phraseWords.length;

            break;
        }
    }

    return queryWords
        .slice(start)
        .join(" ");
}

module.exports = {
    normalizeText,
    levenshtein,
    similarity,
    getCommandPhrases,
    getCommandKeywords,
    resolveCommand,
    extractArguments
};
