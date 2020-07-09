const sqlite = require('sqlite3');
var db = new sqlite.Database('./database.db', (err) => {
  if (err) {
    console.error(err.message);
  }
});


module.exports = {
    sendQuery: function(sqlQuery, showError=true){
        return new Promise(function(resolve){
            db.run(sqlQuery, [], function(err){
                if (err && showError){
                    console.error(err.message);
                    resolve(err.message);
                } else {
                    resolve("success");
                }
            });
        });
    },
    addUserPoints: function(id, name, points){
        checkIfUserExists(id)
            .then((result) => {
                if (result){
                    sql = 'UPDATE USER SET points = points + ? WHERE id = ?';
                    db.run(sql, [points, id], function(err){
                        if (err){
                            return console.error(err.message);
                        }
                    });
                } else {
                    insertNewUser(id, name, points);
                }                    
            })
            .catch((err) => {
                console.error(err);
            });
    },
    closeDB: function(){
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
        });
    },
    getTopUsers: function(top, channel, sayFunc){
        let sql = 'SELECT display_name, points FROM USER ORDER BY points DESC LIMIT ?';
        db.all(sql, [top], (err, row) => {
            if (err){
                return console.error(err.message);
            }
        
            sayFunc(channel, row.map((user, index) => index+1 + '. ' + user.display_name + ' - ' + user.points).join(', '));
        });
    },
    getPoints: function(channelObj, attribute, value, callback){
        let sql = 'SELECT points FROM USER WHERE LOWER('+attribute+') = LOWER(?)';
        db.get(sql, [value], (err, row) => {
            if (err){
                reject(err.message);
            }
            if (typeof row === 'undefined'){
                callback(channelObj, value, 0);
            } else {
                callback(channelObj, value, row.points);
            }
        });
    }
};

function insertNewUser(id, name, points){
    let sql = 'INSERT INTO USER(id, display_name, points) VALUES (?, ?, ?)';
    db.run(sql, [id, name, points], function(err){
        if (err) {
            return console.error(err.message);
        }
        console.log('New user inserted: ' + name);
    });
}

function checkIfUserExists(id){
    return new Promise(function(resolve, reject){
        let sql = 'SELECT EXISTS (SELECT * FROM USER WHERE id = ?) AS result';
        db.get(sql, [id], (err, row) => {
            if (err){
                reject(err.message);
            }

            if (row.result === 1){
                resolve(true);
            } else {
                resolve(false);
            }
        });  
    });
    
}