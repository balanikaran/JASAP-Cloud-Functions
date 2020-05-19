const functions = require("firebase-functions");

// this is for firebase firestore database
const admin = require("firebase-admin");
admin.initializeApp();

// codfiguring firebase for authentication...
const firebase = require("firebase");
const firebaseConfig = {
    apiKey: "AIzaSyB_PIPQwETOcrwZ-xf5pKx7EBPw23Lg6Hg",
    authDomain: "jasap-kb.firebaseapp.com",
    databaseURL: "https://jasap-kb.firebaseio.com",
    projectId: "jasap-kb",
    storageBucket: "jasap-kb.appspot.com",
    messagingSenderId: "918057637446",
    appId: "1:918057637446:web:d6cd83a72a5de4750e9c47",
    measurementId: "G-LGC4Z85C0B",
};
firebase.initializeApp(firebaseConfig);

// creating express app here...
const express = require("express");
const app = express();

// to simply call db for database...
const db = admin.firestore();

// Get posts route
app.get("/getPosts", (request, response) => {
    db.collection("posts")
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
            let posts = [];
            data.forEach((doc) => {
                posts.push({
                    ...doc.data(),
                    postId: doc.id,
                });
            });
            return response.json(posts);
        })
        .catch((err) => {
            console.error(err);
        });
});

// Create new post route
app.post("/createPost", (request, response) => {
    const newPost = {
        username: request.body.username,
        body: request.body.body,
        createdAt: new Date().toISOString(),
    };
    db.collection("posts")
        .add(newPost)
        .then((doc) => {
            return response.json({
                message: `document ${doc.id} created`,
            });
        })
        .catch((err) => {
            console.log(err);
            return response
                .status(500)
                .json({ error: `something went wrong... => ${err}` });
        });
});

// User signup route
app.post("/signup", (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        username: request.body.username,
    };

    // TODO: validate data here...

    // Note:
    // We need the email and username to be unique in this application
    // We can be smart here, how?
    // We are using firebase authentication (email and password based...)
    // Which will ensure one account for each email id
    // Now, we can create a 'users' (see databaseSchema.js) database
    // let the user node document id be equal to the username, which will ensure it to be unique...
    // Smart huh! :)
    // Nice...

    let userToken, uid;

    db.doc(`/users/${newUser.username}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return response.status(400).json({
                    username: "this username is already taken",
                });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(
                        newUser.email,
                        newUser.password
                    );
            }
        })
        .then((data) => {
            uid = data.user.uid;
            return data.user.getIdToken();
        })
        .then((token) => {
            userToken = token;

            const newUserCredentials = {
                email: newUser.email,
                createdAt: new Date().toISOString(),
                uid,
            };

            return db.doc(`/users/${newUser.username}`).set(newUserCredentials);
        })
        .then(() => {
            return response.status(201).json({
                token: userToken,
            });
        })
        .catch((err) => {
            console.error(err);

            if (err.code === "auth/email-already-in-use") {
                return response.status(400).json({
                    email: "this email is already in use",
                });
            }

            return response.status(500).json({
                error: err.code,
            });
        });
});

exports.api = functions.https.onRequest(app);
