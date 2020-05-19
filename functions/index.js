const functions = require("firebase-functions");

const admin = require("firebase-admin");
admin.initializeApp();

// const express = require("express");
// const app = express()

exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

exports.getPosts = functions.https.onRequest((request, response) => {
    admin
        .firestore()
        .collection("posts")
        .get()
        .then((data) => {
            let posts = [];
            data.forEach((doc) => {
                posts.push(doc.data());
            });
            return response.json(posts);
        })
        .catch((err) => {
            console.error(err);
        });
});

exports.createPost = functions.https.onRequest((request, response) => {
    // check if only post request is made
    if (request.method !== "POST") {
        return response.status(400).json({
            error: "Method not allowed. Try again with POST request.",
        });
    }

    const newPost = {
        username: request.body.username,
        body: request.body.body,
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
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
