var express = require('express');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var nonsense = require('nonsense');
var _ = require('lodash');

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

  favorites.update({id: 'words'}, {$inc: update}, {safe: true}, () => {
    res.send(200);
  });
});

// Wait until the nonsense dictionary is loaded
MongoClient.connect(process.env.MONGOLAB_URI, function (err, db) {
  db.collection('favorites', function (err, collection) {
    favorites = collection;

    words.on('end', function () {
      console.log('finished creating nonsense words');

      app.listen(process.env.PORT || 5000);
    });
  });
});
