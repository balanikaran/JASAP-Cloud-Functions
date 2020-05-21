const functions = require("firebase-functions");

const { db } = require("./util/firebaseAdmin");

// creating express app here...
const express = require("express");
const app = express();

const {
    getAllPosts,
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
app.get("/posts", getAllPosts);
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
        return db
            .doc(`/posts/${snapshot.data().postId}`)
            .get()
            .then((doc) => {
                // check if the post really exists
                if (
                    doc.exists &&
                    doc.data().username !== snapshot.data().username
                ) {
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
            .catch((err) => {
                console.error(err);
            });
    });

exports.createNotificationOnComment = functions.firestore
    .document("comments/{id}")
    .onCreate((snapshot) => {
        // getting the post for which notification has to be generated
        return db
            .doc(`/posts/${snapshot.data().postId}`)
            .get()
            .then((doc) => {
                // check if the post really exists
                if (
                    doc.exists &&
                    doc.data().username !== snapshot.data().username
                ) {
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
            .catch((err) => {
                console.error(err);
            });
    });

exports.deleteNotificationOnUnlike = functions.firestore
    .document("likes/{id}")
    .onDelete((snapshot) => {
        return db
            .doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err);
            });
    });

exports.onUserImageChange = functions.firestore
    .document("/users/{username}")
    .onUpdate((snapshot, context) => {
        if (
            snapshot.before.data().imageUrl !== snapshot.after.data().imageUrl
        ) {
            console.log("user image has changed");
            const batch = db.batch();
            return db
                .collection("posts")
                .where("username", "==", snapshot.before.data().username)
                .get()
                .then((data) => {
                    data.forEach((doc) => {
                        const post = db.doc(`/posts/${doc.id}`);
                        batch.update(post, {
                            userImage: snapshot.after.data().imageUrl,
                        });
                    });
                    return batch.commit();
                });
        } else {
            console.log(
                "user image has not changed, why to do the computation"
            );
            return null;
        }
    });

exports.onPostDelete = functions.firestore
    .document("/posts/{postId}")
    .onDelete((snapshot, context) => {
        const postId = context.params.postId;
        const batch = db.batch();
        return db
            .collection("likes")
            .where("postId", "==", postId)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                });

                return db
                    .collection("comments")
                    .where("postId", "==", postId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                });

                return db
                    .collection("notifications")
                    .where("postId", "==", postId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                return batch.commit();
            })
            .catch((err) => {
                console.error(err);
            });
    });
