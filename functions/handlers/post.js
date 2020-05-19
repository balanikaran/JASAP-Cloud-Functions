const { db } = require("../util/firebaseAdmin");

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
