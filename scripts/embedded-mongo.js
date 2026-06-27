'use strict';

/**
 * Ephemeral MongoDB for local StaMS runs.
 *
 * webgme-engine's GmeAuth always connects via MongoClient, independent of
 * config.storage.database.type. This spins up a private mongod on a random port
 * so StaMS does not require (or collide with) a system MongoDB on :27017.
 *
 * Opt out: set STAMS_MONGO_URI to use an external instance instead.
 */

let mongoServer;

/**
 * @returns {Promise<{ uri: string }>}
 */
async function startEmbeddedMongo() {
    if (mongoServer) {
        return { uri: mongoServer.getUri() };
    }

    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    return { uri: mongoServer.getUri() };
}

async function stopEmbeddedMongo() {
    if (!mongoServer) {
        return;
    }
    const server = mongoServer;
    mongoServer = undefined;
    await server.stop();
}

module.exports = {
    startEmbeddedMongo,
    stopEmbeddedMongo
};
