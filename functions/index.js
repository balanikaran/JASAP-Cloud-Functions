const functions = require("firebase-functions");

const admin = require("firebase-admin");
admin.initializeApp();

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

const express = require("express");
const app = express();

// Get posts route
app.get("/getPosts", (request, response) => {
    admin
        .firestore()
        .collection("posts")
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
    admin
        .firestore()
        .collection("posts")
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
    // TODO: do further ...
});

exports.api = functions.https.onRequest(app);
