import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import local from "passport-local";
import { userModel } from "../models/user.model.js";
import { cartModel } from "../models/cart.model.js";
import { hashing, passwordValidation } from "../utils/crypt.js";
import { Strategy as GitHubStrategy } from "passport-github2";

const LocalStrategy = local.Strategy;

export const initializePassport = () => {
  passport.use(
    "register",
    new LocalStrategy(
      {
        passReqToCallback: true,
        usernameField: "email",
      },
      async (req, username, password, done) => {
        const { first_name, last_name, email, age } = req.body;
        try {
          const user = await userModel.findOne({ email: username });
          if (user) {
            console.log("User already exists");
            return done(null, false);
          }
          const hashedPassword = await hashing(password);

          if (!hashedPassword) return done("Error saving password", false);

          const cart = await cartModel.create({ products: [] });

          if (!cart) {
            return done("Error creating cart", false);
          }

          const result = await userModel.create({
            first_name,
            last_name,
            email,
            age: +age,
            password: hashedPassword,
            cart: cart._id,
          });

          return done(null, result);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  passport.use(
    "login",
    new LocalStrategy(
      {
        passReqToCallback: true,
        usernameField: "email",
      },
      async (req, username, password, done) => {
        try {
          const user = await userModel.findOne({ email: username });

          if (!user) {
            console.log("Invalid credentials");
            return done(null, false);
          }

          const passwordValid = await passwordValidation(
            password,
            user.password
          );

          if (!passwordValid) {
            console.log("Invalid credentials");
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  passport.use(
    "github",
    new GitHubStrategy(
      {
        clientID: "Iv1.ae9b7572ccabcfce",
        clientSecret: "888e9693318b60c1ef29e245e908861829b814eb",
        callbackURL: "http://localhost:8080/api/session/githubcallback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await userModel.findOne({
            email: profile._json.email ?? profile.username,
          });

          const cart = await cartModel.create({ products: [] });

          if (!cart) {
            return done("Error creating cart", false);
          }

          if (!user) {
            const newUser = {
              first_name: profile._json.name.split(" ")[0],
              last_name: profile._json.name.split(" ")[1] ?? "Github last_name",
              age: 18,
              email: profile._json.email ?? profile.username,
              password: "GitHub.Generated",
              cart: cart._id,
            };
            const result = await userModel.create(newUser);

            return done(null, result);
          }

          return done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
  passport.use(
    new JWTStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: "m4t14s",
      },
      async (payload, done) => {
        try {
          const user = await userModel.findById(payload.id);

          if (!user) {
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  passport.deserializeUser(async (id, done) => {
    const user = await userModel.findById(id);
    done(null, user);
  });
};
