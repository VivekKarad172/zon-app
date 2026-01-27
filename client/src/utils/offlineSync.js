export const CACHE_KEY_TASKS = 'offline_tasks_cache';
export const CACHE_KEY_QUEUE = 'offline_action_queue';

export const saveTasksToCache = (tasks) => {
    try {
        localStorage.setItem(CACHE_KEY_TASKS, JSON.stringify(tasks));
        localStorage.setItem(CACHE_KEY_TASKS + '_timestamp', Date.now());
    } catch (e) {
        console.error('Failed to cache tasks', e);
    }
};

export const getCachedTasks = () => {
    try {
        const tasks = localStorage.getItem(CACHE_KEY_TASKS);
        return tasks ? JSON.parse(tasks) : null;
    } catch (e) {
        return null;
    }
};

export const queueOfflineAction = (action) => {
    // action: { type: 'COMPLETE' | 'BATCH', payload: {...}, timestamp: number, id: string }
    try {
        const queue = getOfflineQueue();
        const newAction = {
            ...action,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        queue.push(newAction);
        localStorage.setItem(CACHE_KEY_QUEUE, JSON.stringify(queue));
        return newAction;
    } catch (e) {
        console.error('Failed to queue action', e);
        return null;
    }
};

export const getOfflineQueue = () => {
    try {
        const queue = localStorage.getItem(CACHE_KEY_QUEUE);
        return queue ? JSON.parse(queue) : [];
    } catch (e) {
        return [];
    }
};

export const clearOfflineQueue = () => {
    localStorage.removeItem(CACHE_KEY_QUEUE);
};

export const removeActionFromQueue = (id) => {
    const queue = getOfflineQueue();
    const newQueue = queue.filter(a => a.id !== id);
    localStorage.setItem(CACHE_KEY_QUEUE, JSON.stringify(newQueue));
};
