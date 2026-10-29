/**
 * SQS Queue Consumer Lambda - processes messages from the CRM notification queue.
 * 
 * Handles asynchronous CRM events: opportunity stage changes, account update
 * notifications, lead assignment workflows, and automated follow-up triggers.
 * 
 * This function is triggered by an SQS event source mapping and processes
 * messages in batches. Failed messages are retried up to 3 times before
 * being sent to the dead-letter queue.
 */

import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const batchItemFailures: SQSBatchItemFailure[] = [];

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            console.log(`Processing message ${record.messageId}`, JSON.stringify({
                type: body.type || 'unknown',
                timestamp: body.timestamp,
                messageId: record.messageId,
            }));

            // Simulate real processing work
            // In production this would route to downstream services:
            //   - opportunity stage change → notify assigned rep via WebSocket
            //   - account update → refresh cached account data
            //   - lead assignment → trigger welcome email sequence
            //   - follow-up reminder → push notification to mobile app
            const processingStart = Date.now();
            await processMessage(body);
            const elapsed = Date.now() - processingStart;

            console.log(`Successfully processed message ${record.messageId} in ${elapsed}ms`);
        } catch (error) {
            console.error(`Failed to process message ${record.messageId}:`, error);
            batchItemFailures.push({ itemIdentifier: record.messageId });
        }
    }

    return { batchItemFailures };
};

async function processMessage(body: Record<string, unknown>): Promise<void> {
    // Small delay to simulate downstream processing
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    const messageType = (body.type as string) || 'unknown';

    switch (messageType) {
        case 'opportunity_stage_change':
            console.log(`Routing stage change notification for opportunity ${body.opportunityId}`);
            break;
        case 'account_update':
            console.log(`Refreshing cached data for account ${body.accountId}`);
            break;
        case 'lead_assignment':
            console.log(`Triggering welcome sequence for lead ${body.leadId}`);
            break;
        default:
            console.log(`Processing generic notification: ${messageType}`);
            break;
    }
}
