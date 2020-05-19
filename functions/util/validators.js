// Some helper funtions...
const isEmpty = (string) => {
    return string.trim() === "";
};

const isEmail = (email) => {
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

module.exports = { validateSignupData, validateLoginData };
