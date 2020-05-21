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


// -------------------- Database Triggers --------------------

// this is invoked when user likes on some post
// we are also checking here if the user has liked his own post
// if so we do not create any notification
// because it is dumb idea...
exports.createNotificationOnLike = functions.firestore
    .document("likes/{id}")
    .onCreate((snapshot) => {
        // getting the post for which notification has to be generated
        return db
            .doc(`/posts/${snapshot.data().postId}`)
            .get()
            .then((doc) => {
                // check if the post really exists
                // and the user has not liked his own post
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


// this function is invoked when user comments on some 
// post, we also check if the user has commented on his own post
// if so we do not create any notification for that
exports.createNotificationOnComment = functions.firestore
    .document("comments/{id}")
    .onCreate((snapshot) => {
        // getting the post for which notification has to be generated
        return db
            .doc(`/posts/${snapshot.data().postId}`)
            .get()
            .then((doc) => {
                // check if the post really exists
                // also check if the user has commented on his own post
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


// this is invoked when user unlikes some post
// NOTE: here we do not have to check if the user has un-liked his own 
// post because we never created a notification for that
// SMART HUH! DAB...
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


// this is invoked when user updates his profile picture
// we need to update the user image url in all the user's posts
exports.onUserImageChange = functions.firestore
    .document("/users/{username}")
    .onUpdate((snapshot, context) => {
        // check if the image is really changed or not...
        // because this function will be invoked whenever the users document
        // is updated, so yeah, you get it...
        if (
            snapshot.before.data().imageUrl !== snapshot.after.data().imageUrl
        ) {
            console.log("user image has changed");
            const batch = db.batch();
            // get all the posts by the user
            return db
                .collection("posts")
                .where("username", "==", snapshot.before.data().username)
                .get()
                .then((data) => {
                    // for each user's post
                    // we get the posts reference and update the 'userImage' property
                    data.forEach((doc) => {
                        const post = db.doc(`/posts/${doc.id}`);
                        batch.update(post, {
                            userImage: snapshot.after.data().imageUrl,
                        });
                    });
                    return batch.commit();
                });
        } else {
            // the user image is not changed
            console.log(
                "user image has not changed, why to do the computation"
            );
            return null;
        }
    });


// this is invoked when the user deletes his own post
// we have to delete all the 
// LIKES, COMMENTS, and NOTIFICATIONS
// related to that post
exports.onPostDelete = functions.firestore
    .document("/posts/{postId}")
    .onDelete((snapshot, context) => {
        // we get the post id from the url
        // which can be retrived from context
        const postId = context.params.postId;
        const batch = db.batch();
        // we get all the likes for the post which is deleted
        return db
            .collection("likes")
            .where("postId", "==", postId)
            .get()
            .then((data) => {
                // delete the every like document for that post
                data.forEach((doc) => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                });

                // now we get all the comments for the post which is deleted
                return db
                    .collection("comments")
                    .where("postId", "==", postId)
                    .get();
            })
            .then((data) => {
                // here we delete every comment document for the deleted post
                data.forEach((doc) => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                });

                // now after likes and comments
                // we get all the notifications created for thr deleted post
                return db
                    .collection("notifications")
                    .where("postId", "==", postId)
                    .get();
            })
            .then((data) => {
                // here we delete every notification document for the deleted post
                data.forEach((doc) => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                // and we are finally done
                // we commit the changes <3
                return batch.commit();
            })
            .catch((err) => {
                console.error(err);
            });
    });
