const { db } = require("../util/firebaseAdmin");

const firebaseConfig = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

const {
    validateSignupData,
    validateLoginData,
    reduceUserDetails,
} = require("../util/validators");

// handler for creating new user
exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        username: request.body.username,
    };

    // validate data here...
    const { errors, valid } = validateSignupData(newUser);
    // We now only proceed when the errors object above is empty
    if (!valid) {
        return response.status(400).json(errors);
    }

    // Note:
    // We need the email and username to be unique in this application
    // We can be smart here, how?
    // We are using firebase authentication (email and password based...)
    // Which will ensure one account for each email id
    // Now, we can create a 'users' (see databaseSchema.js) database
    // let the user node document id be equal to the username, which will ensure it to be unique...
    // Smart huh! :)
    // Nice...

    // new user image default
    // this is when user has not uplaoded any profile pic
    // no-img.png is uploaded in out storage bucket
    const noImg = "no-img.png";

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
                username: newUser.username,
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
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

            if (err.code === "auth/weak-password") {
                return response.status(400).json({
                    password: "weak password combination",
                });
            }

            return response.status(500).json({
                error: err.code,
            });
        });
};

// handler for loggin user in
exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password,
    };

    // validating user
    const { errors, valid } = validateLoginData(user);
    if (!valid) {
        return response.status(400).json(errors);
    }

    // Here means we have valid user inputs
    // Now we can login the user

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return response.status(200).json({
                token,
            });
        })
        .catch((err) => {
            console.error(err);

            // wrong possword
            if (err.code === "auth/wrong-password") {
                return response.status(403).json({
                    general: "invalid username/password, try again...",
                });
            }

            return response.status(500).json({
                error: err.code,
            });
        });
};

// handler for user image upload
exports.uploadImage = (request, response) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new BusBoy({ headers: request.headers });

    let imageFileToBeUploaded = {};
    let imageFileName;

    // busboy is used to parse image file from html request here
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        console.log({
            fieldname,
            file,
            filename,
            encoding,
            mimetype,
        });

        if (mimetype !== "image/png" || mimetype !== "image/jpeg") {
            return response.status(400).json({
                error: "wrong file type submitted",
            });
        }

        // suppose the file name is like - 'something.image.png'
        // we need the extension 'png'
        const fileExtenstion = filename.split(".")[
            filename.split(".").length - 1
        ];

        // now we need a random temp file name to store image temperorily on server
        // for uploading it to storage bucket on firebase
        // this gives file name as something like -> '31727318131381.png'
        // very random huh...
        imageFileName = `${Math.round(
            Math.random() * 1000000000000
        )}.${fileExtenstion}`;

        // now we need a file path to temp directory of the server to store temp image file
        // this give something like
        // pathOfTempDir/367163716371267.png
        const imageFilePath = path.join(os.tmpdir(), imageFileName);

        // creating image file to be uploaded
        imageFileToBeUploaded = {
            imageFilePath,
            mimetype,
        };

        // now writing the file in the path
        // 'file' is what we get as parameter here...
        // so the user image will be written in the below file path
        // ready to be uploaded to the bucket in firebase
        file.pipe(fs.createWriteStream(imageFilePath));
    });

    // when the file is finally created and, ready to be uploaded
    // this function is called
    busboy.on("finish", () => {
        admin
            .storage()
            .bucket()
            .upload(imageFileToBeUploaded.imageFilePath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageFileToBeUploaded.mimetype,
                    },
                },
            })
            .then(() => {
                // when the file is uploaded to storage bucket
                // we need to get its url and
                // add it to the user document in database
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;

                return db.doc(`/users/${request.user.username}`).update({
                    imageUrl,
                });
            })
            .then(() => {
                return response.json({
                    message: "image uploaded successfully",
                });
            })
            .catch((err) => {
                console.error(err);
                return response.status(500).json({
                    error: err.code,
                });
            });
    });

    // now to end the operation
    busboy.end(request.rawBody);
};

// handler for adding user details to database
exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body);

    // update/add the userdetails
    db.doc(`/users/${request.user.username}`)
        .update(userDetails)
        .then(() => {
            return response.json({
                message: "details added successfully",
            });
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};

// hander for getting authenticated user details
exports.getAuthenticatedUserData = (request, response) => {
    let userData = {};

    // here in this function
    // we will be returning the data about the user
    // USER DOCUMENT
    // also the likes done by user to any posts
    // FROM LIKES COLLECTION
    // also any notifications for the user
    // FROM THE NOTIFICATIONS COLLECTION

    // we need to check if user exists
    db.doc(`/users/${request.user.username}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                // exists

                // add user data to userData object
                userData.credentials = doc.data();

                // fetch likes done by user to any post
                return db
                    .collection("likes")
                    .where("username", "==", request.user.username)
                    .get();
            } else {
                // does not exists
                return response.status(404).json({
                    error: "user not found",
                });
            }
        })
        .then((data) => {
            userData.likes = [];
            // add all the likes to the userData object
            data.forEach((doc) => {
                userData.likes.push(doc.data());
            });

            // fetch all the notifications for the user
            return db
                .collection("notifications")
                .where("recipient", "==", request.user.username)
                .orderBy("createdAt", "desc")
                .limit(10)
                .get();
        })
        .then((data) => {
            userData.notifications = [];
            // add the last 10 (limit applied in above then())
            // notifications to the userData object
            data.forEach((doc) => {
                userData.notifications.push({
                    ...doc.data(),
                    notificationId: doc.id,
                });
            });

            // send user data back to client
            return response.json(userData);
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};

exports.getUserDetails = (request, response) => {
    let userData = {};

    // here in this function we will return user data,
    // and there posts based on the username provided

    // get the user document
    db.doc(`/users/${request.params.username}`)
        .get()
        .then((doc) => {
            // check if the user exists
            if (doc.exists) {
                // adding user data to userData object
                userData.user = doc.data();

                // fetching the posts done by the user whose username is provided
                return db
                    .collection("posts")
                    .where("username", "==", request.params.username)
                    .orderBy("createdAt", "desc")
                    .get();
            } else {
                // user does not exists
                return response.status(404).json({
                    error: "user not found",
                });
            }
        })
        .then((data) => {
            userData.posts = [];
            // adding all the posts by the user to userData object
            data.forEach((doc) => {
                userData.posts.push({
                    ...doc.data(),
                    postId: doc.id,
                });
            });

            return response.json(userData);
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};

exports.markNotificationsAsRead = (request, response) => {
    let batch = db.batch();
    request.body.forEach((notificationId) => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, {
            read: true,
        });
    });
    batch
        .commit()
        .then(() => {
            return response.json({
                message: "notifications marked as read",
            });
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({
                error: err.code,
            });
        });
};
