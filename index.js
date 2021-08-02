const express = require("express");
const mysql = require("mysql");
const sha256 = require("sha256");
const cors = require("cors");
const { default: axios } = require("axios");
const app = express();
require("dotenv").config();
// .env crashes the script!

app.use(express.json());
app.use(cors());

const connection = {};

connection.mysql = mysql.createConnection({
  database: "morning_routine",
  user: "root",
  password: "rootroot",
  host: "localhost",
  port: 3306,
});
connection.mysql.connect();

app.post("/register", (request, response) => {
  // Registers user and adds their details to db
  const hashpassword = sha256(request.body.password + "Morning");
  const query = `INSERT INTO users (username, email, hashpassword) VALUES (?,?,?)`;
  const values = [request.body.username, request.body.email, hashpassword];

  connection.mysql.query(query, values, (error, results) => {
    console.log(error, results);
  });
});

app.post("/login", (request, response) => {
  // Logs user in and stores a token on login
  const hashpassword = sha256(request.body.password + "Morning");
  const query = `SELECT * , userid FROM users WHERE username = ? AND hashpassword = ?`;
  const values = [request.body.username, hashpassword];

  connection.mysql.query(query, values, (error, results) => {
    if (error) {
      response.send({ error });
    }
    if (results.length > 0) {
      const token = Math.random() * 10000000000000000;

      // Adds Token to db
      const query = `INSERT INTO tokens (token, user_id) VALUES ("${token}", ${results[0].userid});`;
      connection.mysql.query(query, (error, result) => {
        console.log("token stored!");
      });

      response.json({ token });
    } else {
      response.send({ message: "Wrong Username or Password" });
    }
  });
});

app.post("/commute", async (request, response) => {
  // Works out commute time with google matrix API
  const { home, work } = request.body;

  let googURL = `${process.env.GOOGLEMAPSURL}?units=imperial&origins=${home.lat},${home.lng}&destinations=${work.lat},${work.lng}&key=${process.env.GOOGLEAPIKEY}`;

  const results = await axios.get(googURL);
  const data = results.data.rows[0].elements[0].duration.value;
  response.send({ data });
});

app.get("/check_token", (request, response) => {
  console.log("checking token");

  const query = `SELECT count(*) as count, userid FROM tokens
                    WHERE token = "${request.headers.token}";`;
  console.log(query);
});

// If the processing environment has a port use it, else use 6001
const port = process.env.PORT || 6001;

app.listen(port, () => {
  console.log("server listening " + port);
});
