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
  const checkPasswordQuery = `SELECT * , user_id FROM users WHERE username = ? AND hashpassword = ?`;
  const values = [request.body.username, hashpassword];

  connection.mysql.query(checkPasswordQuery, values, (error, results) => {
    if (error) {
      response.send({ error });
    }
    if (results.length > 0) {
      const token = Math.random() * 10000000000000000;

      // Adds Token to db
      const insertTokenQuery = `INSERT INTO tokens (token, user_id) VALUES ("${token}", ${results[0].user_id});`;
      connection.mysql.query(insertTokenQuery, (error, results) => {
        //
      });

      response.json({ token, loginSuccess: true });
    } else {
      response.json({ loginSuccess: false });
    }
  });
});

app.post("/get_tasks", (request, response) => {
  // Logs user in and stores a token on login

  const getTasksQuery = `SELECT DISTINCT task, length FROM tokens
	                            LEFT JOIN tasks ON tokens.user_id = tokens.user_id
	                            WHERE token = "${request.body.token}";`;
  console.log(getTasksQuery);

  connection.mysql.query(getTasksQuery, (error, results) => {
    console.log(error, results);
    response.json({ results });
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
  const query = `SELECT user_id FROM tokens
                    WHERE token = "${request.headers.token}";`;
  connection.mysql.query(query, (error, result) => {
    response.json(result[0].user_id);
  });
});

app.post("/add_task", (request, response) => {
  const query = `INSERT INTO tasks (user_id, task, length) VALUES
                       ("${request.body.user_id}", "${request.body.task}", "${request.body.time}");`;
  console.log(query);
  connection.mysql.query(query, (error, result) => {
    console.log("Added task");
  });
  // THINGS I WANT TO DO NEXT:
  // -make it so duplicates are removed - Might be able to just use the "selectedTasks" reducer?
  // On loading check if the user has any tasks associated with them in the DB and load them through as default
});

app.get("/users_tasks", (request, response) => {
  const query = `SELECT task, length FROM tasks
	                  WHERE user_id = ${request.headers.user_id};`;
  connection.mysql.query(query, (error, result) => {
    console.log(error, result);
    response.send(result);
  });
});

// If the processing environment has a port use it, else use 6001
const port = process.env.PORT || 6001;

app.listen(port, () => {
  console.log("server listening " + port);
});
