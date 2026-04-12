'use strict';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set.');
}

// The rest of your seed script goes here...
