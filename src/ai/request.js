async function request(
    url,
    options = {},
    timeout = 30000
) {
    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {
        const response =
            await fetch(
                url,
                {
                    ...options,
                    signal:
                        controller.signal
                }
            );

        const text =
            await response.text();

        let data = null;

        try {
            data =
                text
                    ? JSON.parse(text)
                    : null;
        } catch {
            data = text;
        }

        if (!response.ok) {
            const error =
                data?.error?.message ||
                data?.error ||
                data?.message ||
                `HTTP ${response.status}`;

            throw new Error(
                String(error)
            );
        }

        return data;

    } finally {
        clearTimeout(timer);
    }
}

module.exports = {
    request
};
