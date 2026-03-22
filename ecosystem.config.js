// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
    apps: [
        {
            name: 'v2-app',
            script: './backend/dist/server.js',

            // # Instances & Clustering
            instances: 1,           // Use 'max' for cluster mode across all CPU cores
            exec_mode: 'fork',      // 'cluster' for multi-core (requires stateless app)

            // # Auto-restart Policy
            autorestart: true,
            watch: false,           // Never watch in production
            max_memory_restart: '512M',

            // # Logging
            output: './logs/out.log',
            error: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,

            // # Environment
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
        },
    ],
};
