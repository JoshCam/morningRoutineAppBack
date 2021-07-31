const express = require("express");
const mysql = require("mysql");
const sha256 = require("sha256");
const cors = require("cors");
const { default: axios } = require("axios");
const app = express();
// require("dotenv").config();
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
  const hashpassword = sha256(request.body.password + "Morning");
  const query = `INSERT INTO users (username, email, hashpassword) VALUES (?,?,?)`;
  const values = [request.body.username, request.body.email, hashpassword];

  connection.mysql.query(query, values, (error, results) => {
    console.log(error, results);
  });
});

app.post("/login", (request, response) => {
  const hashpassword = sha256(request.body.password + "Morning");
  const query = `SELECT * FROM users WHERE username = ? AND hashpassword = ?`;
  const values = [request.body.username, hashpassword];

  connection.mysql.query(query, values, (error, results) => {
    if (error) {
      response.send({ error });
    }
    if (results.length > 0) {
      const token = Math.random() * 10000000000000000;

      // Adds Token to db
      // const query = `INSERT INTO tokens (token) VALUES ("${token}");`;
      // connection.mysql.query(query, (error, result) => {
      //   console.log("token stored!");
      // });

      response.json({ token });
    } else {
      response.send({ message: "Wrong Username or Password" });
    }
  });
});

app.post("/commute", (request, response) => {
  const home = request.body.home;
  const work = request.body.work;
  // console.log(home);
  // console.log(work);

  let googURL =
    "https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=" +
    home.lat +
    "," +
    home.lng +
    "&destinations=" +
    work.lat +
    "," +
    work.lng +
    "&key=AIzaSyDvGymWobmXGa0CtbocnF1jwGt0AX9mkeM";

  async function asyncFunc() {
    // fetch data from a url endpoint
    const response = await axios.get(googURL);
    const data = await response.data.rows[0].elements[0].duration.value;

    return data;
  }
  (async function sendData() {
    // console.log(await asyncFunc());
    response.send({ data: await asyncFunc() });
  })();
});

// If the processing environment has a port use it, else use 6001
const port = process.env.PORT || 6001;

app.listen(port, () => {
  console.log("server listening " + port);
});
