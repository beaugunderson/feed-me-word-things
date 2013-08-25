/*globals $:true, _:true, Howl:true, async:true*/

var ONE_SECOND = 1000;
var TEN_SECONDS = 10 * 1000;

var MINIMUM_WORDS = 3;
var LEVELS_ON_NUMBER = 4;

var GLITCH_ENABLED = true;

function glitchIfEnabled(element, cb) {
  if (GLITCH_ENABLED) {
    $(element).glitch(function (canvas) {
      if (cb) {
        cb(canvas);
      }
    });
  } else {
    if (cb) {
      cb('');
    }
  }
}

// Global for debugging purposes
var game;

_.mixin({
  randomArray: function (array) {
    return array[_.random(array.length - 1)];
  }
});

function Game() {
  this.wordTemplate = _.template($('#word-template').html());

  this.narrative = {
    disasters: [
      'impact',
      'sentience breach',
      'reality dysfunction',
      'hull depletion',
      'oxygen depravation'
    ],
    verbs: [
      'rotate',
      'remove',
      'disengage',
      'unfrob',
      'tighten',
      'arm',
      'disarm',
      're-rotate',
      're-tighten',
      'un-loosen',
      'clean',
      'polish',
      'pray to',
      'gesticulate at'
    ],
    nouns: [
      'hover-turtle',
      'port doors',
      'stator coil',
      'hyperclutch'
    ],
    premade: [
      'sudo !!',
      'whoami',
      'reboot',
      'login',
      'thrust max',
      'thrust low'
    ],
    commands: [
      'word2vec',
      'troff',
      'nroff',
      'ps',
      'grep'
    ],
    pipes: [
      '|',
      '<',
      '>'
    ],
    files: [
      'autoexec.bat',
      'config.sys',
      '.bashrc',
      'manifest.xml',
      'manifest.json',
      'captain.log'
    ]
  };
}

Game.prototype.zero = function () {
  this.correctWords = [];

  this.level = 1;

  this.words = [];
  this.wordIndex = 0;

  this.characters = [];
  this.characterIndex = 0;

  this.statistics = {
    correct: 0,
    incorrect: 0
  };
};

Game.prototype.getNextLevel = function (level) {
  var words = MINIMUM_WORDS + Math.floor(level / LEVELS_ON_NUMBER);
  var length = words + (level % LEVELS_ON_NUMBER);

  return [words, length];
};

Game.prototype.startTimer = function (cbInterval, cbDone) {
  this.statistics.startTime = new Date().getTime();

  this.timeEnd = this.statistics.startTime + TEN_SECONDS;

  var self = this;

  function timerInterval() {
    var now = new Date().getTime();

    cbInterval(self.timeEnd - now);

    if (now > self.timeEnd) {
      clearInterval(self.timer);

      return cbDone(now);
    }
  }

  this.timer = setInterval(timerInterval, 16);
};

Game.prototype.setTime = function (time) {
  this.timeEnd = new Date().getTime() + time;
};

Game.prototype.subtractTime = function (time) {
  this.timeEnd -= time;
};

Game.prototype.changeLevel = function (cb) {
  var self = this;

  this.getWords(this.getNextLevel(this.level), function (words) {
    self.setWords(words);

    $('#disaster').text(_.randomArray(self.narrative.disasters));

    self.setTime(TEN_SECONDS);

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

    this.subtractTime(ONE_SECOND);

    this.statistics.incorrect++;

    this.sounds.play('blast');

    return;
  }

  this.statistics.correct++;

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
    console.log('keypress', e);

    // Chrome is keyCode, Firefox is charCode apparently
    var key = e.charCode || e.keyCode;

    // Discard non-alphanumeric/symbols
    if (key < 33 || key > 126) {
      return;
    }

    self.handleCharacter(String.fromCharCode(key));
  });
};

Game.prototype.unhandleKeys = function () {
  $(document).off('keydown');
  $(document).off('keypress');
};

Game.prototype.generateCommand = function () {
  var chance = _.random(100);

  if (chance < 60) {
    return _.string.sprintf('%s the %s',
      _.randomArray(this.narrative.verbs),
      _.randomArray(this.narrative.nouns));
  }

  if (chance < 90) {
    return _.randomArray(this.narrative.premade);
  }

  return _.string.sprintf('%s %s %s',
    _.randomArray(this.narrative.commands),
    _.randomArray(this.narrative.pipes),
    _.randomArray(this.narrative.files));
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

  $('#words').html('').html(this.wordTemplate({ words: words }));

  this.highlightNext();
};

// TODO: key press, 'unh', 'ya' sounds
Game.prototype.loadSounds = function (cb) {
  this.sounds = new Howl({
    urls: ['/sounds/sounds.mp3'],
    sprite: {
      blast: [0, 2000],
      laser: [3000, 700],
      winner: [5000, 9000]
    },
    volume: 0.5,
    onload: cb,
    onloaderror: function (err) {
      console.log('Ignoring sound loading error', err);
      cb();
    }
  });
};

Game.prototype.start = function () {
  var self = this;

  $(document).scrollTop(0);

  this.zero();
  this.handleKeys();

  this.changeLevel(function () {
    self.startTimer(function (remaining) {
      var secondsLeft = Math.max(0, remaining / 1000);

      $('#countdown').text(_.string.sprintf('%.02f', secondsLeft));
    },
    function (now) {
      self.statistics.survivalTime = (now - self.statistics.startTime) / 1000;
      self.stop();
    });
  });
};

Game.prototype.showScore = function () {
  $('#level').text(this.level);

  $('#seconds').text(this.statistics.survivalTime);

  $('#correct').text(this.statistics.correct);
  $('#incorrect').text(this.statistics.incorrect);

  $('#correct-words').text(this.correctWords.length);

  $('#accuracy').text(_.string.sprintf('%.02f',
    (this.statistics.correct /
      (this.statistics.correct + this.statistics.incorrect)) * 100));

  $('#correct-words-list').html('');

  this.correctWords.sort().forEach(function (word) {
    $('#correct-words-list').append(_.string.sprintf('<li>%s</li>', word));
  });

  $('#after').on('click', 'li', function () {
    $('#after').hide();

    game.start();
  });

  $('#after').scrollTop(0);
  $('#after').show();
};

Game.prototype.stop = function () {
  this.unhandleKeys();

  glitchIfEnabled('body', function (canvas) {
    $('#background').html(canvas);
  });

  this.showScore();
};

Game.prototype.initialize = function (cb) {
  $('#initializing').show();

  glitchIfEnabled('#background', function (canvas) {
    $('#background').html(canvas);

    cb();
  });
};

Game.prototype.load = function (cb) {
  var self = this;

  console.log('Loading assets');

  async.parallel([
    function (cbParallel) {
      self.loadSounds(cbParallel);
    },
    function (cbParallel) {
      self.initialize(cbParallel);
    }
  ], function () {
    console.log('Finished loading');

    self.sounds.play('laser');

    cb();
  });
};

$(function () {
  game = new Game();

  // Show instructions and wait for enter to be pressed
  $(document).on('keydown', function (e) {
    if (e.keyCode === 13) {
      $(document).off('keydown');

      $('#instructions').hide();

      game.load(function () {
        $('#game').show();

        game.start();
      });

      return false;
    }
  });
});
