const functions = require("firebase-functions");

// creating express app here...
const express = require("express");
const app = express();

const {
    getPosts,
    createPost,
    getPost,
    addComment,
    likePost,
    unlikePost,
    deletePost,
} = require("./handlers/post");
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
// comment on a post
app.post("/post/:postId/comment", firebaseAuthMiddleware, addComment);
// like a post
app.get("/post/:postId/like", firebaseAuthMiddleware, likePost);
// unlike a post
app.get("/post/:postId/unlike", firebaseAuthMiddleware, unlikePost);
// delete a post using postId
app.delete("/post/:postId", firebaseAuthMiddleware, deletePost);

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
