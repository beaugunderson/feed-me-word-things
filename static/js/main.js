/*globals $:true, _:true, sprintf:true*/

var TEN_SECONDS = 10 * 1000;

function Game() {
  this.wordTemplate = _.template($('#word-template').html());

  this.characters = [];
  this.index = 0;
}

Game.prototype.startTimer = function (cbInterval, cbDone) {
  var start = new Date().getTime();

  function timerInterval() {
    var now = new Date().getTime();

    cbInterval(now - start);

    if (now > start + TEN_SECONDS) {
      return cbDone();
    }

    setTimeout(function () {
      timerInterval();
    }, 16);
  }

  timerInterval();
};

Game.prototype.handleCharacter = function (character) {
  if (character === this.characters[this.index]) {
    $('#word .letter').eq(this.index).addClass('correct');

    this.index++;
  }
};

Game.prototype.handleKeys = function () {
  var self = this;

  $(document).on('keypress', function (e) {
    // XXX
    if (e.keyCode >= 127) {
      return;
    }

    self.handleCharacter(String.fromCharCode(e.keyCode));

    console.log(e);
    console.log(String.fromCharCode(e.keyCode));
  });

  $(document).on('keydown', function (e) {
    if (e.keyCode === 8) {
      console.log('backspace');
    }
  });
};

Game.prototype.getWords = function (cb) {
  $.getJSON('/words/5/6', function (words) {
    cb(words);
  });
};

Game.prototype.setWord = function (word) {
  this.characters = word.split('');
  this.index = 0;

  $('#word').html(this.wordTemplate({ word: word }));
};

$(function () {
  var game = new Game();

  game.handleKeys();

  game.getWords(function (words) {
    game.setWord(words.join(' '));

    game.startTimer(function (elapsed) {
      var secondsLeft = Math.max(0, 10 - (elapsed / 1000));

      $('#countdown').text(sprintf('%.02f', secondsLeft));
    },
    function () {
      console.log('10 seconds elapsed');
    });
  });
});
