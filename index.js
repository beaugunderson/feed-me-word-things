var express = require('express');
var fs = require('fs');
var nonsense = require('nonsense');
var _ = require('lodash');

var words = nonsense.words(fs.createReadStream('/usr/share/dict/words'), 4);

var app = express();

app.use(express.static(__dirname + '/static'));

app.get('/words/:number/:length', function (req, res) {
  var number = parseInt(req.param('number'), 10);
  var length = parseInt(req.param('length'), 10);

  res.json(_.times(number, _.partial(words.random, length)));
});

// Wait until the nonsense dictionary is loaded
words.on('end', function () {
  console.log('listening on lvh.me:5000');

  app.listen(5000);
});
