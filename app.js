require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose= require('passport-local-mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require("mongoose-findOrCreate");
const FacebookStrategy = require("passport-facebook").Strategy;
 
const app = express();
 
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({
    extended:true
}));
 
//setting up the session module that has various options, explained.
app.use(session({
  secret: "Our Little Secret", 
 
  resave: false,
 
  saveUninitialized:false  
}));
 
 
 
 
app.use(passport.initialize());
app.use(passport.session());
 
 
main().catch(err => console.log(err));
 
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB')
}
 
 
const userSchema = new mongoose.Schema({
email: String,
password: String,
googleId: String,
facebookId: String,
secret: String
});
 
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
 
const User = mongoose.model("User",userSchema);
 
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


//GOOGLE STRATEGY

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileUrl: "https://www.googleleapis.com/oauth2/v3/userinfo",
},
function(request, accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

//FACEBOOK STRATEGY 

passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets",
  enableProof: true
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id },
    function (err, user) {
    return cb(err, user);
  });
}
));

 
 
 
app.get("/",function (req,res) {
    res.render("home");
});

//GOOGLE AUTHENTICATOR
app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile"]
    })
 );
app.get(
    "/auth/google/secrets",
    passport.authenticate("google", {
      failureRedirect: "/login"
    }),
    function(req, res) {
      res.redirect("/secrets");
    }
);

//FACEBOOK AUTHENTICATE

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ["email"] }));
 
 
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.get("/login",function (req,res) {
    res.render("login");
});
 
 
app.get("/register",function (req,res) {
    res.render("register");
 });
 
app.get("/secrets",function (req,res){
  if(req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});



// app.get("/secrets",function(req,res){
//   User.find({"secret":{$ne:null}})
//   .then(function (foundUsers) {
//     res.render("secrets",{usersWithSecrets:foundUsers});
//     })
//   .catch(function (err) {
//     console.log(err);
//     })
// });


app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});
 
// **** *** ** Posting, Rendering, Redirecting Section ** *** ****
app.post("/submit", function (req, res) {
  console.log(req.user);
  User.findById(req.user)
    .then(foundUser => {
      if (foundUser) {
        foundUser.secret = req.body.secret;
        return foundUser.save();
      }
      return null;
    })
    .then(() => {
      res.redirect("/secrets");
    })
    .catch(err => {
      console.log(err);
    });
});

 
app.get("/logout",function(req,res){
  req.logOut(function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect("/");
})
 
 
app.post("/register",function (req,res) {
 
  User.register({username:req.body.username}, req.body.password, function(err, user) {
    if (err) { 
      console.log(err);
      res.redirect("/register");
     } else {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      })
      
     }
   
    });
 
});
 
 
app.post("/login",function(req,res){
    const user = new User({
      username:req.body.username,
      password:req.body.password
    })
 
    req.login(user,function(err){
 
      if (err) { 
        console.log(err);
        res.redirect("/login");
       } else {
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        })
        
       }
     
    });
})
 
 
 
 
 
 
 
app.listen(3000,function () {
    console.log("Server Running at port 3000.");
  })