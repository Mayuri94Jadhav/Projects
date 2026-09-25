if(process.env.NODE_ENV != "production"){
require('dotenv').config();
}
const express = require("express");
const app = express();
const mongoose = require("mongoose"); 
const dns = require("dns");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError= require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").MongoStore || require("connect-mongo").default;
const flash = require("connect-flash");
const  passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./modules/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// const MONGO_URL = 'mongodb://127.0.0.1:27017/wanderlust';
const dbUrl = process.env.ATLASDB_URL;
dns.setServers(["1.1.1.1", "8.8.8.8"]);


async function main() {
    await mongoose.connect(dbUrl, {
        serverSelectionTimeoutMS: 5000,
    });
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = { 
    store,
    secret: process.env.SECRET,
    resave:false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};
 

// Middlewares
app.use(session(sessionOptions));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



// middleware to display message on screen that listing is created
app.use((req,res,next) =>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next(); // must write next() to not stuck in this route
})

// // creating demo user
// app.get("/demouser", async(req,res)=>{
//     let fakeUser = new User({
//         email:"mayuri@gmail.com",
//         username: "mayuri",
//     });

//     let registeredUser = await User.register(fakeUser,"hello guys");
//     res.send( registeredUser);
// })

// connecting the routes
app.use("/listings",listingRouter);    // ...important line... 
app.use("/listings/:id/reviews" , reviewRouter);
app.use("/",userRouter);


// test by throwing expresserror .. error handling middleware
app.use((req,res,next)=>{
    next(new ExpressError(404,"page not found!"));
});
app.use((err, req, res, next) => {
    console.error(err);
    let{statusCode=500, message ="something went wrong"} = err;
    res.status(statusCode).render("error.ejs",{message});
    // res.status(statusCode).send(message);
});

main()
    .then(() => {
        console.log("connected to DB");
        app.listen(8080, () => {
            console.log("server is listening to port 8080");
        });
    })
    .catch((err) => {
        console.error("Unable to connect to MongoDB:", err.message);
        process.exitCode = 1;
    });