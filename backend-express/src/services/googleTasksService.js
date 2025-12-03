const { google } = require('googleapis');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];

class GoogleTasksService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL_INTEGRATION || `${process.env.API_BASE_URL}/api/v1/integrations/google/callback`
        );
    }

    getAuthUrl(userId) {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: userId, // Pass userId as state to identify user on callback
            prompt: 'consent' // Force consent to ensure we get a refresh token
        });
    }

    async handleCallback(code, userId) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);

            // Save tokens to database
            await prisma.integration.upsert({
                where: {
                    userId_provider: {
                        userId: userId,
                        provider: 'google_tasks'
                    }
                },
                update: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token, // Only present if access_type=offline and prompt=consent
                    expiresAt: new Date(tokens.expiry_date),
                    scope: tokens.scope,
                    updatedAt: new Date()
                },
                create: {
                    userId: userId,
                    provider: 'google_tasks',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: new Date(tokens.expiry_date),
                    scope: tokens.scope
                }
            });

            return true;
        } catch (error) {
            logger.error('Error handling Google callback:', error);
            throw error;
        }
    }

    async getAuthenticatedClient(userId) {
        const integration = await prisma.integration.findUnique({
            where: {
                userId_provider: {
                    userId: userId,
                    provider: 'google_tasks'
                }
            }
        });

        if (!integration) {
            throw new Error('Google Tasks integration not found for user');
        }

        const client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        client.setCredentials({
            access_token: integration.accessToken,
            refresh_token: integration.refreshToken,
            expiry_date: integration.expiresAt ? integration.expiresAt.getTime() : null
        });

        // Handle token refresh if needed
        client.on('tokens', async (tokens) => {
            logger.info('Refreshing Google Tasks tokens');
            await prisma.integration.update({
                where: { id: integration.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || integration.refreshToken, // Keep old refresh token if new one not provided
                    expiresAt: new Date(tokens.expiry_date),
                    updatedAt: new Date()
                }
            });
        });

        return client;
    }

    async syncTasks(userId) {
        try {
            logger.info(`Starting Google Tasks sync for user ${userId}`);

            const auth = await this.getAuthenticatedClient(userId);
            const tasks = google.tasks({ version: 'v1', auth });

            // 1. Get all task lists
            logger.info(`Fetching task lists for user ${userId}`);
            const taskListsResponse = await tasks.tasklists.list();
            const taskLists = taskListsResponse.data.items;

            logger.info(`Found ${taskLists?.length || 0} task lists for user ${userId}`);

            if (!taskLists || taskLists.length === 0) {
                return { success: true, synced: 0, message: 'No task lists found' };
            }

            let totalSynced = 0;

            // 2. Iterate through each list and fetch tasks
            for (const list of taskLists) {
                logger.info(`Syncing tasks from list: ${list.title} (${list.id})`);

                const tasksResponse = await tasks.tasks.list({
                    tasklist: list.id,
                    showCompleted: true,
                    showHidden: true
                });

                const googleTasks = tasksResponse.data.items;
                logger.info(`Found ${googleTasks?.length || 0} tasks in list ${list.title}`);

                if (googleTasks) {
                    for (const gTask of googleTasks) {
                        // Upsert task into Samaanai DB
                        // Only sync if it has a title
                        if (!gTask.title) {
                            logger.debug(`Skipping task ${gTask.id} - no title`);
                            continue;
                        }

                        logger.debug(`Syncing task: ${gTask.title} (${gTask.id})`);

                        await prisma.task.upsert({
                            where: {
                                userId_googleTaskId: {
                                    userId: userId,
                                    googleTaskId: gTask.id
                                }
                            },
                            update: {
                                name: gTask.title,
                                description: gTask.notes || null,
                                completed: gTask.status === 'completed',
                                completedAt: gTask.completed ? new Date(gTask.completed) : null,
                                dueDate: gTask.due ? new Date(gTask.due) : null,
                                updatedAt: new Date()
                            },
                            create: {
                                userId: userId,
                                googleTaskId: gTask.id,
                                name: gTask.title,
                                description: gTask.notes || null,
                                completed: gTask.status === 'completed',
                                completedAt: gTask.completed ? new Date(gTask.completed) : null,
                                dueDate: gTask.due ? new Date(gTask.due) : null
                            }
                        });
                        totalSynced++;
                    }
                }
            }

            logger.info(`Successfully synced ${totalSynced} tasks for user ${userId}`);
            return { success: true, synced: totalSynced };
        } catch (error) {
            logger.error(`Error syncing Google Tasks for user ${userId}:`, error);
            logger.error('Error details:', {
                message: error.message,
                code: error.code,
                errors: error.errors
            });
            throw error;
        }
    }
}

module.exports = new GoogleTasksService();
