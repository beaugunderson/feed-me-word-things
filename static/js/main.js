/*globals $:true, _:true, Howl:true*/

var TEN_SECONDS = 10 * 1000;

var MINIMUM_WORDS = 3;
var LEVELS_ON_NUMBER = 4;

function Game() {
  this.correctWords = [];

  this.wordTemplate = _.template($('#word-template').html());

  this.level = 1;

  this.words = [];
  this.wordIndex = 0;

  this.characters = [];
  this.characterIndex = 0;
}

Game.prototype.getNextLevel = function (level) {
  var words = MINIMUM_WORDS + Math.floor(level / LEVELS_ON_NUMBER);
  var length = words + (level % LEVELS_ON_NUMBER);

  return [words, length];
};

Game.prototype.startTimer = function (cbInterval, cbDone) {
  var start = new Date().getTime();

  this.timeEnd = start + TEN_SECONDS;

  var self = this;

  function timerInterval() {
    var now = new Date().getTime();

    cbInterval(self.timeEnd - now);

    if (now > self.timeEnd) {
      clearInterval(self.timer);

      return cbDone();
    }
  }

  this.timer = setInterval(timerInterval, 16);
};

Game.prototype.changeLevel = function (cb) {
  var self = this;

  this.getWords(this.getNextLevel(this.level), function (words) {
    self.setWords(words);

    self.timeEnd = new Date().getTime() + TEN_SECONDS;
    self.level++;

    if (cb) {
      cb();
    }
  });
};

Game.prototype.handleCharacter = function (character) {
  if (character !== this.characters[this.characterIndex]) {
    $('#countdown-wrapper').addClass('penalty');

    // TODO: Better way? Solely in CSS transition?
    setTimeout(function () {
      $('#countdown-wrapper').removeClass('penalty');
    }, 100);

    this.timeEnd -= 1000;

    this.sounds.play('blast');

    return;
  }

  this.sounds.play('laser');

  $('.word').eq(this.wordIndex)
    .find('.letter').eq(this.characterIndex).addClass('correct');

  this.characterIndex++;

  this.highlightNext();

  if (this.characterIndex === this.words[this.wordIndex].length) {
    this.correctWords.push(this.words[this.wordIndex]);

    this.wordIndex++;

    if (this.wordIndex === this.words.length) {
      return this.changeLevel();
    }

    this.characters = this.words[this.wordIndex].split('');
    this.characterIndex = 0;

    this.highlightNext();
  }
};

Game.prototype.handleKeys = function () {
  var self = this;

  // Handle backspace to prevent browser navigation to the previous page
  $(document).on('keydown', function (e) {
    if (e.keyCode === 8) {
      return false;
    }
  });

  $(document).on('keypress', function (e) {
    // XXX: Just an assumption
    if (e.keyCode >= 127) {
      return;
    }

    self.handleCharacter(String.fromCharCode(e.keyCode));
  });
};

Game.prototype.unhandleKeys = function () {
  $(document).off('keydown');
  $(document).off('keypress');
};

Game.prototype.getWords = function (level, cb) {
  $.getJSON(_.string.sprintf('/words/%d/%d', level[0], level[1]), cb);
};

Game.prototype.highlightNext = function () {
  $('#words .next').removeClass('next');

  $('#words .word').eq(this.wordIndex)
    .find('.letter').eq(this.characterIndex).addClass('next');
};

Game.prototype.setWords = function (words) {
  this.words = words;
  this.wordIndex = 0;

  this.characters = words[0].split('');
  this.characterIndex = 0;

  $('#words').html('');

  $('#words').html(this.wordTemplate({ words: words }));

  this.highlightNext();
};

// TODO: key press, 'unh', 'ya' sounds
Game.prototype.loadSounds = function () {
  this.sounds = new Howl({
    urls: ['/sounds/sounds.mp3'],
    sprite: {
      blast: [0, 2000],
      laser: [3000, 700],
      winner: [5000, 9000]
    },
    volume: 0.5
  });
};

Game.prototype.start = function () {
  var self = this;

  this.loadSounds();
  this.handleKeys();

  this.changeLevel(function () {
    self.startTimer(function (remaining) {
      var secondsLeft = Math.max(0, remaining / 1000);

      $('#countdown').text(_.string.sprintf('%.02f', secondsLeft));
    },
    function () {
      self.stop();
    });
  });
};

Game.prototype.stop = function () {
  this.unhandleKeys();

  console.log('Game over', this.level, this.wordIndex, this.characterIndex);
  console.log('Correct words', this.correctWords);

  alert('Game over.');
};

$(function () {
  var game = new Game();

  game.start();

  _.times(50, game.getNextLevel).forEach(function (level) {
    console.log(level);
  });
});
