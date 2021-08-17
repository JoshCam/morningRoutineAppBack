export const login = (request, response) => {
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
};
