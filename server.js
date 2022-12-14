const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const methodOverride = require("method-override");
require("dotenv").config();
app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/public", express.static("public"));

app.use(methodOverride("_method"));

var db;
MongoClient.connect(
  process.env.DB_URL,
  { useUnifiedTopology: true },
  function (err, client) {
    if (err) return console.log(err);

    db = client.db("todo");

    //서버띄우는 코드
    app.listen(process.env.PORT, function () {
      console.log("listening on 8080");
    });
  }
);

app.get("/", function (req, res) {
  res.render("index.ejs");
});

app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.get("/list", function (req, res) {
  db.collection("post")
    .find()
    .toArray(function (err, result) {
      res.render("list.ejs", { posts: result });
    });
});

app.get("/detail/:id", function (req, res) {
  let id = db
    .collection("post")
    .findOne({ _id: parseInt(req.params.id) }, function (err, result) {
      if (err) {
        res.send("Sorry, we cannot find that!");
      } else res.render("detail.ejs", { data: result });
    });
});
// id가 없을때 에러처리 해결필요

app.get("/edit/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      res.render("edit.ejs", { post: result });
    }
  );
});

app.get("/mypage", confirmLogIn, function (req, res) {
  console.log(req.user);
  res.render("mypage.ejs", { user: req.user });
});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.get("/search", (req, res) => {
  var searchpar = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: req.query.value,
          path: "title", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
  ];
  console.log(req.query);
  db.collection("post")
    .aggregate(searchpar)
    .toArray((err, result) => {
      console.log(result);
      res.render("search.ejs", { posts: result });
    });
});

// app.get("/", function (req, res) {
//   res.sendFile(__dirname + "/index.html");
// });

app.post("/add", (req, res) => {
  db.collection("counter").findOne({ name: "postnum" }, function (err, result) {
    var postnum = result.totalPost;

    db.collection("post").insertOne(
      { _id: postnum + 1, title: req.body.title, date: req.body.date },
      function (err, result) {
        db.collection("counter").updateOne(
          { name: "postnum" },
          { $inc: { totalPost: 1 } },
          function (err, result) {
            if (err) {
              return console.log(err);
            }
            res.redirect("/write");
          }
        );
      }
    );
  });
});

app.delete("/delete", function (req, res) {
  req.body._id = parseInt(req.body._id);
  db.collection("post").deleteOne(req.body, function (err, result) {});
  res.send("삭제완료");
});

app.put("/edit", function (req, res) {
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { title: req.body.title, date: req.body.date } },
    function () {
      res.redirect("/list");
    }
  );
});

app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/fail" }),
  function (req, res) {
    res.redirect("/");
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (putid, putpw, done) {
      //console.log(입력한아이디, putpw);
      db.collection("login").findOne({ id: putid }, function (err, result) {
        if (err) return done(err);

        if (!result)
          return done(null, false, { message: "존재하지않는 아이디요" });
        if (putpw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
);

function confirmLogIn(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("로그인안하셨는데요?");
  }
}

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  db.collection("login").findOne({ id: id }, function (err, result) {
    done(null, result);
  });
});
