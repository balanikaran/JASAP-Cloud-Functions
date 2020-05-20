// This is a dummy file which represents how our data is stored in the database...

let db = {
    posts: [
        {
            username: "user",
            body: "body of post",
            createdAt: "2020-05-19T20:38:34.523Z",
            likesCount: 2,
            commentsCount: 1,
        },
    ],
    users: [
        {
            uid: "user uid",
            email: "user@email.com",
            username: "username",
            createdAt: "",
            imageUrl: "url to user profile pic in storage bucket",
            bio: "bio, lol!",
            website: "https://krnblni.github.io",
            lcoation: "Delhi, India",
        },
    ],
    comments: [
        {
            username: "username",
            postId: "actually it is post document id (AUTO-ID)",
            body: "comment body - hey this is awesome",
            createdAt: "2020-05-19T20:38:34.523Z",
        },
    ],
    likes: [
        {
            postId: "for which post the like is",
            username: "by whom - username",
        },
    ],
    notifications: [
        {
            recipient: "user",
            sender: "john",
            read: true | false,
            postId: "7b13h21hg12hj",
            type: like | comment,
            createdAt: "2020-05-19T20:38:34.523Z",
        },
    ],
};
