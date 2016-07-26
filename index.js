var express = require('express');
var MongoClient = require('mongodb').MongoClient;

var favorites;

var app = express();

app.use(express.static(__dirname + '/static'));

app.get('/favorite/:word', function (req, res) {
  var update = {};

  update[req.params.word] = 1;

  favorites.update({id: 'words'}, {$inc: update}, {safe: true}, () => {
    res.sendStatus(200);
  });
});

// Wait until the nonsense dictionary is loaded
MongoClient.connect(process.env.MONGOLAB_URI, function (err, db) {
  db.collection('favorites', function (err, collection) {
    favorites = collection;

    app.listen(process.env.PORT || 5000);
  });
});
