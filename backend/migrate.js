const mongoose = require('mongoose');

async function migrate() {
    await mongoose.connect('mongodb://127.0.0.1:27017/lexicore');
    console.log('Connected');
    const db = mongoose.connection.db;
    
    const result = await db.collection('courses').updateMany(
        { type: { $exists: false } },
        { $set: { type: 'flashcard' } }
    );
    console.log(`Updated ${result.modifiedCount} documents`);
    mongoose.disconnect();
}

migrate().catch(console.error);
