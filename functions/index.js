const functions = require("firebase-functions");

// creating express app here...
const express = require("express");
const app = express();

const { getPosts, createPost } = require("./handlers/post");
const { signup, login } = require("./handlers/user");

const { firebaseAuthMiddleware } = require("./util/firebaseAuthMiddleware");

// Get posts route
app.get("/getPosts", getPosts);

// Create new post route
app.post("/createPost", firebaseAuthMiddleware, createPost);

// User signup route
app.post("/signup", signup);

// Login route
app.post("/login", login);

exports.api = functions.https.onRequest(app);
