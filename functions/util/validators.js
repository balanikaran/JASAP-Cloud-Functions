// Some helper funtions...
const isEmpty = (string) => {
    return string.trim() === "";
};

const isEmail = (email) => {
    //eslint-disable-next-line
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return email.match(regEx);
};

const validateSignupData = (data) => {
    let errors = {};

    if (isEmpty(data.email)) {
        errors.email = "email cannot be empty";
    } else if (!isEmail(data.email)) {
        errors.email = "invalid email address";
    }

    if (isEmpty(data.password)) {
        errors.password = "password cannot be empty";
    }

    if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "passwords must match";
    }

    if (isEmpty(data.username)) {
        errors.username = "username cannot be empty";
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false,
    };
};

const validateLoginData = (user) => {
    let errors = {};

    // validating user
    if (isEmpty(user.email)) {
        errors.email = "email cannot be empty";
    } else if (!isEmail(user.email)) {
        errors.email = "invalid email address";
    }

    if (isEmpty(user.password)) {
        errors.password = "password cannot be empty";
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false,
    };
};

const reduceUserDetails = (data) => {
    let userDetails = {};

    if (!isEmpty(data.bio.trim())) {
        userDetails.bio = data.bio;
    }

    if (!isEmpty(data.website.trim())) {
        // if the user has not added https or http
        // we will be adding http only
        // bacause http can redirect to https but not vice versa
        if (data.website.trim().substring(0, 4) !== "http") {
            userDetails.website = `http://${data.website.trim()}`;
        } else {
            userDetails.website = data.website.trim();
        }
    }

    if (!isEmpty(data.location.trim())) {
        userDetails.location = data.location;
    }

    return userDetails;
};

module.exports = { validateSignupData, validateLoginData, reduceUserDetails };
