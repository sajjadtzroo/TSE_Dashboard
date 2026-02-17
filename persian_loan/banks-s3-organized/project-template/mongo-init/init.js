// MongoDB Initialization Script
// This script runs when the container is first created

db = db.getSiblingDB('iranian_banks');

// Create collections
db.createCollection('banks');
db.createCollection('loans');
db.createCollection('analytics');

// Create indexes
db.banks.createIndex({ "id": 1 }, { unique: true });
db.banks.createIndex({ "category": 1 });
db.banks.createIndex({ "type": 1 });
db.banks.createIndex({ "loansCount": 1 });

// Create text index for search
db.banks.createIndex({
    "nameFA": "text",
    "nameEN": "text",
    "descriptionFA": "text",
    "description": "text"
});

print('Database initialized successfully');
