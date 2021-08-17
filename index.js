const express = require("express");
const mysql = require("mysql");
const sha256 = require("sha256");
const cors = require("cors");
const { default: axios } = require("axios");
const { request } = require("express");
const app = express();
require("dotenv").config();

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
  const query = `INSERT IGNORE users (username, email, hashpassword) VALUES (?,?,?)`;
  const values = [request.body.username, request.body.email, hashpassword];

  connection.mysql.query(query, values, (error, results) => {
    // console.log(error, results);
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
  const getTasksQuery = `SELECT task, length FROM tokens
	                            LEFT JOIN tasks ON tokens.user_id = tasks.user_id
	                            WHERE token = "${request.body.token}";`;

  connection.mysql.query(getTasksQuery, (error, results) => {
    if (!error) {
      results.reverse();
      response.json({ results });
    } else {
      console.log("GET TASKS ERROR", error);
    }
  });
});

app.post("/commute", async (request, response) => {
  // Works out commute time with google matrix API
  const { home, work } = request.body;
  if (Object.keys(work).length === 0 || Object.keys(home).length === 0) return;
  let googURL = `${process.env.GOOGLEMAPSURL}?units=imperial&origins=${home.lat},${home.lng}
                    &destinations=${work.lat},${work.lng}&key=${process.env.GOOGLEAPIKEY}`;

  const results = await axios.get(googURL);
  try {
    const data = results.data.rows[0].elements[0].duration.value;
    response.send({ data, success: true });
  } catch (error) {
    response.send({ success: false });
  }
});

app.get("/check_token", (request, response) => {
  // Sends users ID using their current token
  const query = `SELECT user_id FROM tokens
                    WHERE token = "${request.headers.token}";`;
  connection.mysql.query(query, (error, result) => {
    response.json(result[0].user_id);
  });
});

app.post("/add_task", (request, response) => {
  // Adds a task to tasks DB and links it to their user ID
  const query = `INSERT IGNORE tasks (user_id, task, length) VALUES
                       ("${request.body.user_id}", "${request.body.task}", "${request.body.time}");`;
  connection.mysql.query(query, (error, results) => {
    console.log("Added task", error, results);
  });
});

app.get("/users_tasks", (request, response) => {
  // Gets users tasks from tasks db using their user ID
  const query = `SELECT task, length FROM tasks
	                  WHERE user_id = ${request.headers.user_id}`;
  connection.mysql.query(query, (error, result) => {
    if (!error) {
      response.send(result);
      console.log(result);
    } else {
      console.log("USERS TASKS ERROR", error);
    }
  });
});

app.post("/remove_task", (request, response) => {
  const query = `DELETE FROM tasks WHERE user_id = "${request.body.user_id}" AND task = "${request.body.task}";`;

  connection.mysql.query(query, (error, result) => {
    console.log(
      "removed task " + request.body.task + " for user " + request.body.user_id
    );
  });
});

app.get("/get_time/:user_id", (request, response) => {
  const query = `SELECT SUM(length) as length FROM tasks
	WHERE user_id = ${request.params.user_id};`;
  connection.mysql.query(query, (error, results) => {
    response.json(results);
  });
});

app.post("/add_user_info", (request, response) => {
  // Adds users info to db
  const query = `INSERT IGNORE user_info
                 (user_id, start_work, work_lat, work_lng)
                  values (${request.body.user_id}, "${request.body.start_work}",
                  ${request.body.work_location.lat}, ${request.body.work_location.lng});`;

  // const query = `UPDATE user_info
  //                 SET start_work = "${request.body.start_work}", work_lat = ${request.body.work_location.lat}, work_lng = ${request.body.work_location.lng}
  //                 WHERE user_id = ${request.body.user_id};`;

  //   const query = `INSERT INTO subs
  //   (subs_name, subs_email, subs_birthday)
  // VALUES
  //   (?, ?, ?)
  // ON DUPLICATE KEY UPDATE
  //   subs_name     = VALUES(subs_name),
  //   subs_birthday = VALUES(subs_birthday)`;

  connection.mysql.query(query, (error, results) => {
    console.log("added user Info");
  });
});

app.put("/update_user_info", (request, response) => {
  // Updates users commute info i.e. when they wake up, if they commute and where they work!
  const query = `UPDATE user_info
                  SET start_work = "${request.body.start_work}", work_lat = ${request.body.work_location.lat}, work_lng = ${request.body.work_location.lng}
                  WHERE user_id = ${request.body.user_id};`;
  connection.mysql.query(query, (error, results) => {
    console.log("Updated user Info");
  });
});

app.get("/get_user_info/:user_id", (request, response) => {
  if (request.params.user_id == null) return;
  // Gets Users info from db
  const query = `SELECT start_work, work_lat, work_lng FROM morning_routine.user_info
	                WHERE user_id = ${request.params.user_id};`;
  connection.mysql.query(query, (error, results) => {
    response.send(results);
  });
});

// If the processing environment has a port use it, else use 6001
const port = process.env.PORT || 6001;

app.listen(port, () => {
  console.log("server listening " + port);
});
