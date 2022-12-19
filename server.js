const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/public", express.static("public"));
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
var db;
MongoClient.connect(
  "mongodb+srv://wadmin:admin35168@cluster0.yhehzok.mongodb.net/?retryWrites=true&w=majority",
  { useUnifiedTopology: true },
  function (err, client) {
    if (err) return console.log(err);

    db = client.db("todo");

    //서버띄우는 코드
    app.listen("8080", function () {
      console.log("listening on 8080");
    });
  }
);

app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.get("/", function (req, res) {
  res.render("index.ejs");
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
            res.send("전송완료");
          }
        );
      }
    );
  });
});

app.get("/list", function (req, res) {
  db.collection("post")
    .find()
    .toArray(function (err, result) {
      console.log(result);
      res.render("list.ejs", { posts: result });
    });
});

app.delete("/delete", function (req, res) {
  req.body._id = parseInt(req.body._id);
  db.collection("post").deleteOne(req.body, function (err, result) {});
  res.send("삭제완료");
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

app.put("/edit", function (req, res) {
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { title: req.body.title, date: req.body.date } },
    function () {
      console.log("수정완료");
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
