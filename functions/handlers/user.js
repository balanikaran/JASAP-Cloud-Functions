const { db } = require("../util/firebaseAdmin");

const firebaseConfig = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

const { validateSignupData, validateLoginData } = require("../util/validators");

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
