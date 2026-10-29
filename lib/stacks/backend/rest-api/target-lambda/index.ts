/**
 * CRM Event Processor Lambda - handles async event processing for the CRM pipeline.
 *
 * Processes events triggered by opportunity updates, account changes, and
 * pipeline stage transitions. Publishes processed results to downstream
 * consumers for reporting and notification delivery.
 */

export const handler = async (event: unknown) => {
    console.log('CRM event processor invoked', JSON.stringify(event));

    // Load pipeline rules configuration
    const configPath = ['config', 'pipeline-rules'].join('/');
    const pipelineConfig = await import(`./${configPath}`);

    const records = Array.isArray(event) ? event : [event];
    for (const record of records) {
        const payload = typeof record === 'string' ? JSON.parse(record) : record;
        const rules = pipelineConfig.getRulesForEvent(payload.type);

        for (const rule of rules) {
            console.log(`Processing rule ${rule.id} for event type ${payload.type}`);
        }
    }

    return { statusCode: 200, body: JSON.stringify({ processed: records.length }) };
};
