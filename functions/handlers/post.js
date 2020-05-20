const { db } = require("../util/firebaseAdmin");

// handler for creating a new post
exports.createPost = (request, response) => {
    // request now has a user property
    // this is added via middleware
    // upon successful validation of token
    const newPost = {
        username: request.user.username,
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
};

// handler for getting all the posts
exports.getPosts = (request, response) => {
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
};

// handler to get post with commentn using post id
exports.getPost = (request, response) => {
    let postData = {};

    db.doc(`/posts/${request.params.postId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return response.status(404).json({
                    error: "post not found",
                });
            }

            // doc exists
            // add post data to postData object
            postData = doc.data();
            postData.postId = doc.id;

            // now here we can get the comments of the post
            return db
                .collection("comments")
                .orderBy("createdAt", "desc")
                .where("postId", "==", request.params.postId)
                .get();
        })
        .then((data) => {
            postData.comments = [];
            data.forEach((doc) => {
                postData.comments.push(doc.data());
            });

            return response.json(postData);
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};
