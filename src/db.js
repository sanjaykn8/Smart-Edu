const mysql = require('mysql2/promise'); 
const pool = mysql.createPool({ 
    host: 'localhost', 
    user: 'root', 
    password: '$@njayKN8', 
    database: 'eduquiz', 
    waitForConnections: true, 
    connectionLimit: 20 
}); 
module.exports = pool;