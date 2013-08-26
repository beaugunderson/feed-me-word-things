var express = require('express');
var fs = require('fs');
var mongo = require('mongodb');
var nonsense = require('nonsense');
var _ = require('lodash');

var mongoUri = process.env.MONGOLAB_URI;

var favorites;

var words = nonsense.words(fs.createReadStream('./words.txt'), 4);

var app = express();

app.use(express.static(__dirname + '/static'));

app.get('/words/:number/:length', function (req, res) {
  var number = parseInt(req.param('number'), 10);
  var length = parseInt(req.param('length'), 10);

  res.json(_.times(number, _.partial(words.random, length)));
});

app.get('/favorite/:word', function (req, res) {
  var update = {};

  update[req.param('word')] = 1;

  favorites.update({ id: 'words' }, { $inc: update }, { safe: true },
    function () {
    res.send(200);
  });
});

// Wait until the nonsense dictionary is loaded
mongo.Db.connect(mongoUri, function (err, db) {
  db.collection('favorites', function (err, collection) {
    favorites = collection;

    words.on('end', function () {
      console.log('listening on lvh.me:5000');

      app.listen(process.env.PORT);
    });
  });
});
