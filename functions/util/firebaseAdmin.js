// this is for firebase firestore database
const admin = require("firebase-admin");
admin.initializeApp();

// to simply call db for database...
const db = admin.firestore();

module.exports = { admin, db };
