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
        userImage: request.user.imageUrl,
        likeCount: 0,
        commentCount: 0,
    };

    db.collection("posts")
        .add(newPost)
        .then((doc) => {
            const createdPost = newPost;
            createdPost.postId = doc.id;
            return response.json(createdPost);
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

// handler to get post with comment using post id
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

// add comment to a post using post id
exports.addComment = (request, response) => {
    // validate comment body
    if (request.body.body.trim() === "") {
        return response.status(400).json({
            error: "comment cannot be empty",
        });
    }

    // if body is valid
    const newComment = {
        body: request.body.body,
        createdAt: new Date().toISOString(),
        postId: request.params.postId,
        username: request.user.username,
        userImage: request.user.imageUrl,
    };

    db.doc(`/posts/${request.params.postId}`)
        .get()
        .then((doc) => {
            // check if the post actually exist on which we are adding comments to ...
            if (!doc.exists) {
                return response.status(404).json({
                    error: "post not found",
                });
            }

            // here means post exists
            return doc.ref.update({
                commentCount: doc.data().commentCount + 1,
            });
        })
        .then(() => {
            return db.collection("comments").add(newComment);
        })
        .then(() => {
            return response.json(newComment);
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: "something went wrong",
            });
        });
};

// handler for adding a like to post using postId
exports.likePost = (request, response) => {
    const likeDocument = db
        .collection("likes")
        .where("username", "==", request.user.username)
        .where("postId", "==", request.params.postId)
        .limit(1);

    const postDocument = db.doc(`/posts/${request.params.postId}`);

    let postData;

    // we first check if the post exists
    postDocument
        .get()
        .then((doc) => {
            if (doc.exists) {
                // means post exists...
                postData = doc.data();
                postData.postId = doc.id;

                // now we try to get the like for this post by this particular user
                // and check if it exists
                return likeDocument.get();
            }
        })
        .then((data) => {
            if (data.empty) {
                // means the like from this user does not exists
                // add a like for this post then
                return db
                    .collection("likes")
                    .add({
                        username: request.user.username,
                        postId: request.params.postId,
                    })
                    .then(() => {
                        // increase the like count in post document
                        postData.likeCount++;
                        return postDocument.update({
                            likeCount: postData.likeCount,
                        });
                    })
                    .then(() => {
                        // like has been added and post has been updated
                        // we can get response back to user
                        return response.json(postData);
                    });
            } else {
                // means we already have a like for this post from this user
                return response.status(400).json({
                    error: "post already liked",
                });
            }
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};

exports.unlikePost = (request, response) => {
    const likeDocument = db
        .collection("likes")
        .where("username", "==", request.user.username)
        .where("postId", "==", request.params.postId)
        .limit(1);

    const postDocument = db.doc(`/posts/${request.params.postId}`);

    let postData;

    // we first check if the post exists
    postDocument
        .get()
        .then((doc) => {
            if (doc.exists) {
                // means post exists...
                postData = doc.data();
                postData.postId = doc.id;

                // now we try to get the like for this post by this particular user
                // and check if it exists
                return likeDocument.get();
            }
        })
        .then((data) => {
            if (data.empty) {
                // means the like from this user does not exists
                // therefore we cannot unlike a post which is not liked
                // seems dumb na :p
                // so we return an error
                return response.status(400).json({
                    error: "post not liked",
                });
            } else {
                // means we have a like for this post from this user
                // and we can unlike it
                return db
                    .doc(`/likes/${data.docs[0].id}`)
                    .delete()
                    .then(() => {
                        postData.likeCount--;
                        return postDocument.update({
                            likeCount: postData.likeCount,
                        });
                    })
                    .then(() => {
                        return response.json(postData);
                    });
            }
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};

// handler for deleting a post using postId
exports.deletePost = (request, response) => {
    const postDocument = db.doc(`/posts/${request.params.postId}`);

    // we check if the post exists
    postDocument
        .get()
        .then((doc) => {
            if (!doc.exists) {
                // post does not exist
                // no point of deleting it, yes?
                return response.status(404).json({
                    error: "post not found",
                });
            }

            // post exists and we can delete it now

            // but ........
            // the user who sent the request to delete the post
            // is the actual owner/author of the post
            if (doc.data().username !== request.user.username) {
                // not the author/owner of post
                return response.status(403).json({
                    error: "unauthorized",
                });
            }

            // here means
            // post exists and also the user who sent the delete request is the owner of the post
            // we can proceed to delete, cheers
            return postDocument.delete();
        })
        .then(() => {
            return response.json({
                message: "post deleted",
            });
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};
