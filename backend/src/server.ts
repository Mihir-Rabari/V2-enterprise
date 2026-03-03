import './config/env'; // Must be first — validates env vars
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const PORT = parseInt(env.PORT, 10);

const start = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`🚀 V2 Enterprise API running on http://localhost:${PORT}`);
            console.log(`📡 Environment: ${env.NODE_ENV}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

process.on('SIGINT', async () => {
    process.exit(0);
});

start();
