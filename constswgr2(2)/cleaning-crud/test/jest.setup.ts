// Set environment variables before modules are loaded
process.env.FIS_EPN_KEY = 'test-api-key-e2e';
process.env.DB_PATH = 'test-e2e.sqlite';
process.env.DB_SYNCHRONIZE = 'true';
process.env.LOGICAL_DELETE = 'true';
process.env.EVENT_HUB_URL = 'http://localhost:9999/events';
process.env.LOG_LEVEL = 'error'; // suppress logs during tests
