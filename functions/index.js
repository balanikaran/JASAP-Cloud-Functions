const functions = require("firebase-functions");

// creating express app here...
const express = require("express");
const app = express();

const { getPosts, createPost, getPost } = require("./handlers/post");
const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUserData,
} = require("./handlers/user");

const { firebaseAuthMiddleware } = require("./util/firebaseAuthMiddleware");

// -------------------- Routes for Posts Operations --------------------
// Get posts route
app.get("/posts", getPosts);
// Create new post route
app.post("/post", firebaseAuthMiddleware, createPost);
// get post with comments using postId
app.get("/post/:postId", getPost);
// TODO: comment on a post

// TODO: delete a post
// TODO: like a post
// TODO: unline a post

// -------------------- Routes for User Operations --------------------
// User signup route
app.post("/signup", signup);
// Login route
app.post("/login", login);
// User image upload route
app.post("/user/image", firebaseAuthMiddleware, uploadImage);
// add/update user details
app.post("/user", firebaseAuthMiddleware, addUserDetails);
// get user details
app.get("/user", firebaseAuthMiddleware, getAuthenticatedUserData);

exports.api = functions.https.onRequest(app);
