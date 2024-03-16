const prepareResponse = async (_request, _options, response) => {
    const statsClient = _options.statsContext ? .statsClient;
    const modifiedResponse = response;
    let content;
    if (_options.skipResponseCloning) {
        content = await response.text();
    } else {
        statsClient ? .incr('before-response-clone', 1);
        const clone = response.clone();
        content = await clone.text();
        statsClient ? .incr('after-response-clone', 1);
    }
    const agent = _options.agent;
    if (agent) {
        agent.destroy();
    }
    let data;
    try {
        if (modifiedResponse.headers.get('content-type') ? .includes('application/json')) {
            data = JSON.parse(content);
        } else {
            data = content;
        }
    } catch (_error) {}
    modifiedResponse.content = content;
    modifiedResponse.data = data;
    return modifiedResponse;
};
export default prepareResponse;
//# sourceMappingURL=prepare-response.js.map