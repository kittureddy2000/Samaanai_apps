/**
 * Microsoft Graph Service
 * Handles all interactions with Microsoft Graph API for To Do tasks
 */

const GRAPH_API_BASE = process.env.MICROSOFT_GRAPH_API_BASE_URL || 'https://graph.microsoft.com/v1.0';

/**
 * Make authenticated request to Microsoft Graph API
 * @param {string} accessToken - Valid access token
 * @param {string} endpoint - API endpoint (e.g., '/me/todo/lists')
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {Object} body - Request body (for POST/PUT)
 * @returns {Promise<Object>}
 */
const makeGraphRequest = async (accessToken, endpoint, method = 'GET', body = null) => {
  try {
    const url = `${GRAPH_API_BASE}${endpoint}`;

    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Microsoft Graph API error (${response.status}):`, errorText);

      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      }

      throw new Error(`Microsoft Graph API request failed: ${response.status}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error making Microsoft Graph request:', error);
    throw error;
  }
};

/**
 * Get all To Do lists for the user
 * @param {string} accessToken - Valid access token
 * @returns {Promise<Array<{id: string, displayName: string}>>}
 */
exports.getTodoLists = async (accessToken) => {
  try {
    const data = await makeGraphRequest(accessToken, '/me/todo/lists');

    if (!data || !data.value) {
      return [];
    }

    return data.value.map(list => ({
      id: list.id,
      displayName: list.displayName,
      isOwner: list.isOwner,
      isShared: list.isShared,
      wellknownListName: list.wellknownListName
    }));
  } catch (error) {
    console.error('Error fetching To Do lists:', error);
    throw new Error('Failed to fetch Microsoft To Do lists');
  }
};

/**
 * Get the "Tasks" list ID (wellknownListName: "defaultList")
 * @param {string} accessToken - Valid access token
 * @returns {Promise<string|null>} - List ID or null if not found
 */
exports.getTasksListId = async (accessToken) => {
  try {
    const lists = await exports.getTodoLists(accessToken);

    // Find the default "Tasks" list
    const tasksList = lists.find(list =>
      list.wellknownListName === 'defaultList' ||
      list.displayName.toLowerCase() === 'tasks'
    );

    return tasksList ? tasksList.id : null;
  } catch (error) {
    console.error('Error getting Tasks list ID:', error);
    throw error;
  }
};

/**
 * Get all tasks from a specific list with pagination
 * @param {string} accessToken - Valid access token
 * @param {string} listId - To Do list ID
 * @param {boolean} excludeCompleted - Exclude completed tasks (default: true)
 * @returns {Promise<Array<Object>>} - Array of Microsoft To Do tasks
 */
exports.getTasksFromList = async (accessToken, listId, excludeCompleted = true) => {
  try {
    let allTasks = [];
    let nextLink = null;

    // Build query parameters
    const queryParams = [];

    // Filter out completed tasks if requested
    if (excludeCompleted) {
      queryParams.push("$filter=status ne 'completed'");
    }

    // Request maximum page size (999 is the max for Microsoft Graph)
    queryParams.push('$top=999');

    const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
    let endpoint = `/me/todo/lists/${listId}/tasks${queryString}`;

    // Handle pagination - keep fetching until no more pages
    do {
      const data = await makeGraphRequest(accessToken, nextLink || endpoint);

      if (data && data.value) {
        allTasks = allTasks.concat(data.value);
      }

      // Check for next page
      nextLink = data['@odata.nextLink'];

      // If there's a nextLink, extract just the path and query params
      if (nextLink) {
        const url = new URL(nextLink);
        nextLink = url.pathname + url.search;
      }
    } while (nextLink);

    console.log(`Fetched ${allTasks.length} tasks from Microsoft To Do (excludeCompleted: ${excludeCompleted})`);

    return allTasks;
  } catch (error) {
    console.error(`Error fetching tasks from list ${listId}:`, error);
    throw new Error('Failed to fetch tasks from Microsoft To Do');
  }
};

/**
 * Transform Microsoft To Do task to Samaanai task format
 * @param {Object} msTask - Microsoft To Do task object
 * @returns {Object} - Samaanai task format
 */
exports.transformMicrosoftTask = (msTask) => {
  try {
    // Extract due date if present
    let dueDate = null;
    if (msTask.dueDateTime && msTask.dueDateTime.dateTime) {
      // Microsoft returns dateTime in format: "2023-12-31T00:00:00.0000000"
      // Convert to ISO date string for Samaanai
      dueDate = new Date(msTask.dueDateTime.dateTime).toISOString().split('T')[0];
    }

    // Extract description from body
    let description = '';
    if (msTask.body && msTask.body.content) {
      // Remove HTML tags if content type is HTML
      if (msTask.body.contentType === 'html') {
        description = msTask.body.content.replace(/<[^>]*>/g, '');
      } else {
        description = msTask.body.content;
      }
    }

    // Determine completion status
    const completed = msTask.status === 'completed';

    return {
      name: msTask.title || 'Untitled Task',
      description: description.trim(),
      dueDate: dueDate,
      completed: completed,
      completedAt: completed && msTask.completedDateTime ? new Date(msTask.completedDateTime.dateTime) : null,
      microsoftTodoId: msTask.id,
      reminderType: null, // Microsoft To Do has reminders, but mapping is complex
      imageUrl: null // Attachments require separate API calls
    };
  } catch (error) {
    console.error('Error transforming Microsoft task:', error);
    throw new Error('Failed to transform Microsoft To Do task');
  }
};

/**
 * Get all tasks from the default "Tasks" list and transform them
 * @param {string} accessToken - Valid access token
 * @param {boolean} excludeCompleted - Exclude completed tasks (default: true)
 * @returns {Promise<Array<Object>>} - Array of transformed tasks
 */
exports.getAndTransformTasks = async (accessToken, excludeCompleted = true) => {
  try {
    // Get the Tasks list ID
    const listId = await exports.getTasksListId(accessToken);

    if (!listId) {
      console.warn('No "Tasks" list found for user');
      return [];
    }

    // Get all tasks from the list (excluding completed by default)
    const msTasks = await exports.getTasksFromList(accessToken, listId, excludeCompleted);

    // Transform each task to Samaanai format
    const transformedTasks = msTasks.map(msTask => exports.transformMicrosoftTask(msTask));

    console.log(`Transformed ${transformedTasks.length} tasks from Microsoft To Do`);

    return transformedTasks;
  } catch (error) {
    console.error('Error getting and transforming tasks:', error);
    throw error;
  }
};

/**
 * Get task attachments (for future use - Phase 3)
 * @param {string} accessToken - Valid access token
 * @param {string} listId - To Do list ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Array<Object>>}
 */
exports.getTaskAttachments = async (accessToken, listId, taskId) => {
  try {
    const data = await makeGraphRequest(
      accessToken,
      `/me/todo/lists/${listId}/tasks/${taskId}/attachments`
    );

    if (!data || !data.value) {
      return [];
    }

    return data.value;
  } catch (error) {
    console.error(`Error fetching attachments for task ${taskId}:`, error);
    return []; // Don't fail sync if attachments can't be fetched
  }
};

/**
 * Test connection to Microsoft Graph API
 * @param {string} accessToken - Valid access token
 * @returns {Promise<{success: boolean, user: Object|null}>}
 */
exports.testConnection = async (accessToken) => {
  try {
    const user = await makeGraphRequest(accessToken, '/me');

    return {
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.mail || user.userPrincipalName
      }
    };
  } catch (error) {
    console.error('Error testing Microsoft Graph connection:', error);
    return {
      success: false,
      user: null
    };
  }
};
