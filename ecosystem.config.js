// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js --env production
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
    apps: [
        {
            name: 'v2-app',

            // Path is relative to cwd below
            script: './dist/server.js',

            // !! Critical: run from backend/ so dotenv finds .env in the right place
            cwd: './backend',

            // # Instances & Clustering
            instances: 1,           // Use 'max' for cluster mode across all CPU cores
            exec_mode: 'fork',      // 'cluster' for multi-core (requires stateless app)

            // # Auto-restart Policy
            autorestart: true,
            watch: false,           // Never watch in production
            max_memory_restart: '512M',

            // # Logging (relative to repo root)
            output: '../logs/out.log',
            error: '../logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,

            // # Environment — passed directly so they're available even before dotenv runs
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
        },
        {
            // Next.js storefront + admin (app-next.js). nginx routes / here and
            // /api, /videos, /sliders to v2-app — see deploy/nginx/v2enterprise.conf
            name: 'v2-frontend',

            script: './node_modules/next/dist/bin/next',
            args: 'start -p 3001 -H 127.0.0.1',
            cwd: './app-next.js',

            instances: 1,
            exec_mode: 'fork',

            autorestart: true,
            watch: false,
            max_memory_restart: '512M',

            output: '../logs/frontend-out.log',
            error: '../logs/frontend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,

            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};

