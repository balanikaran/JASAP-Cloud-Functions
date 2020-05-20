const { admin, db } = require("./firebaseAdmin");

// Firebase Authorization Middleware
const firebaseAuthMiddleware = (request, response, next) => {
    let userToken;
    if (
        request.headers.authorization &&
        request.headers.authorization.startsWith("Bearer ")
    ) {
        userToken = request.headers.authorization.split("Bearer ")[1];
    } else {
        console.error("no token found...");
        return response.status(403).json({
            error: "unauthorized",
        });
    }

    // now we have our token
    // we can now validate the token
    admin
        .auth()
        .verifyIdToken(userToken)
        .then((decodedUserToken) => {
            // console.log(decodedUserToken);
            request.user = decodedUserToken;
            return db
                .collection("users")
                .where("uid", "==", request.user.uid)
                .limit(1)
                .get();
        })
        .then((data) => {
            request.user.username = data.docs[0].data().username;
            request.user.imageUrl = data.docs[0].data().imageUrl;
            // next is called here means token is valid
            // we can proceed for whatever task we sent the request for
            return next();
        })
        .catch((err) => {
            console.error(err);
            // err is already a json
            return response.status(403).json(err);
        });
};

module.exports = { firebaseAuthMiddleware };
