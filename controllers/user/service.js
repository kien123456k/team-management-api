const {successResponseCreator} = require("../../helpers/response");

const User = require("../../models/user");

const emailReg = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/;

class UserService {
    constructor(fastify) {
        this.fastify = fastify;
    }

    async register_user(name, email, password) {
        if (!emailReg.test(email)) {
            throw this.fastify.httpErrors.badRequest("Email is invalid");
        }

        const existedUser = await User.findOne({email});
        if (existedUser) {
            throw this.fastify.httpErrors.badRequest("Email is already exists");
        }

        const hashedPassword = await this.fastify.bcrypt.hash(password);
        const createdUser = await User.create({
            name,
            email,
            password: hashedPassword,
            description: "",
            avatarUrl: "",
        });
        if (!createdUser) {
            throw this.fastify.httpErrors.internalServerError("Something went wrong");
        }

        const token = await this.fastify.jwt.sign({name, email});
        if (!token) {
            throw this.fastify.httpErrors.internalServerError("Something went wrong");
        }

        return successResponseCreator(201, "Register successfully", {token});
    }

    async login_user(email, password) {
        if (!emailReg.test(email)) {
            throw this.fastify.httpErrors.badRequest("Email is invalid");
        }

        const existedUser = await User.findOne({email});
        if (!existedUser) {
            throw this.fastify.httpErrors.notFound("Email is not exist");
        }

        const isMatchedPassword = await this.fastify.bcrypt.compare(password, existedUser.password);
        if (!isMatchedPassword) {
            throw this.fastify.httpErrors.badRequest("Password is incorrect");
        }

        const token = await this.fastify.jwt.sign({name: existedUser.name, email});
        if (!token) {
            throw this.fastify.httpErrors.internalServerError("Something went wrong");
        }

        return successResponseCreator(200, "Login successfully", {token});
    }

    async getProfile_user(user) {
        const {name, description, avatarUrl} = user;
        return successResponseCreator(200, "Get profile successfully", {
            name,
            description,
            avatarUrl,
        });
    }

    async updateProfile_user(user, name, description, avatarUrl) {
        user.name = name;
        user.description = description;
        user.avatarUrl = avatarUrl;
        const updatedUser = await user.save();
        if (updatedUser !== user) {
            throw this.fastify.httpErrors.internalServerError("Something went wrong");
        }

        return successResponseCreator(200, "Update profile successfully", {
            name,
            email: user.email,
            description,
            avatarUrl,
        });
    }

    async changePassword_user(user, password, newPassword) {
        if (password === newPassword) {
            throw this.fastify.httpErrors.badRequest(
                "New password must different from your current password"
            );
        }

        const isMatchedPassword = await this.fastify.bcrypt.compare(password, user.password);
        if (!isMatchedPassword) {
            throw this.fastify.httpErrors.badRequest("Password is incorrect");
        }

        const hashedPassword = await this.fastify.bcrypt.hash(newPassword);
        user.password = hashedPassword;
        const updatedUser = await user.save();
        if (updatedUser !== user) {
            throw this.fastify.httpErrors.internalServerError("Something went wrong");
        }

        return successResponseCreator(200, "Change password successfully");
    }
}

module.exports = UserService;
