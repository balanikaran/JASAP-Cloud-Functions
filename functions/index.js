const functions = require("firebase-functions");

const { db } = require("./util/firebaseAdmin");

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
    getUserDetails,
    markNotificationsAsRead,
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
// get details for profile page using username
app.get("/user/:username", getUserDetails);
// mark users notifications as read
app.post("/notifications", firebaseAuthMiddleware, markNotificationsAsRead);

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions.firestore
    .document("likes/{id}")
    .onCreate((snapshot) => {
        // getting the post for which notification has to be generated
        db.doc(`/posts/${snapshot.data().postId}`)
            .get()
            .then((doc) => {
                // check if the post really exists
                if (doc.exists) {
                    // we can now create a new notification
                    const likeNotification = {
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().username,
                        sender: snapshot.data().username,
                        type: "like",
                        read: false,
                        postId: doc.id,
                    };

                    // add this new likeNotification to the database
                    // NOTE: here we are adding a new notification
                    // with the same id as of like document
                    return db
                        .doc(`/notifications/${snapshot.id}`)
                        .set(likeNotification);
                } else {
                    return;
                }
            })
            .then(() => {
                // we don't need to send back anything because this is a database trigger
                return;
            })
            .catch((err) => {
                console.error(err);
                return;
            });
    });

exports.createNotificationOnComment = functions.firestore
    .document("comments/{id}")
    .onCreate((snapshot) => {
        // getting the post for which notification has to be generated
        db.doc(`/posts/${snapshot.data().postId}`)
            .get()
            .then((doc) => {
                // check if the post really exists
                if (doc.exists) {
                    // we can now create a new notification
                    const commentNotification = {
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().username,
                        sender: snapshot.data().username,
                        type: "comment",
                        read: false,
                        postId: doc.id,
                    };

                    // add this new commentNotification to the database
                    // NOTE: here we are adding a new notification
                    // with the same id as of comment document
                    return db
                        .doc(`/notifications/${snapshot.id}`)
                        .set(commentNotification);
                } else {
                    return;
                }
            })
            .then(() => {
                // we don't need to send back anything because this is a database trigger
                return;
            })
            .catch((err) => {
                console.error(err);
                return;
            });
    });

exports.deleteNotificationOnUnlike = functions.firestore
    .document("likes/{id}")
    .onDelete((snapshot) => {
        db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .then(() => {
                return;
            })
            .catch((err) => {
                console.error(err);
                return;
            });
    });
