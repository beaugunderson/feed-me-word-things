var async = require('async');
var fs = require('fs');
var Howl = require('howler').Howl;
var nonsense = require('nonsense');
var sprintf = require('sprintf-js').sprintf;
var stringToStream = require('string-to-stream');
var $ = window.jQuery = require('jquery');
var _ = require('lodash');

var wordList = fs.readFileSync('./words.txt');
var wordStream = stringToStream(wordList);

var nonsenseWords = nonsense.words(wordStream, 4);

var ONE_SECOND = 1000;
var TEN_SECONDS = 10 * 1000;

var MINIMUM_WORDS = 3;
var LEVELS_ON_NUMBER = 4;

var GLITCH_ENABLED = true;

var preloadedWords = [];

function getNextLevel(level) {
  var words = MINIMUM_WORDS + Math.floor(level / LEVELS_ON_NUMBER);
  var length = words + (level % LEVELS_ON_NUMBER);

  return [words, length];
}

function preloadWords() {
  for (var i = 0; i < 100; i++) {
    var level = getNextLevel(i);

    console.log('XXX', level);

    preloadedWords[i] = _.times(level[0],
                                _.partial(nonsenseWords.random, level[1]));
  }

  console.log(preloadedWords);
}

function glitchIfEnabled(element, cb) {
  if (GLITCH_ENABLED) {
    $(element).glitch(function (canvas) {
      if (cb) {
        cb(canvas);
      }
    });
  } else if (cb) {
    cb('');
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
      'oxygen depravation',
      'moral outrage'
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
      'gesticulate at',
      'eat',
      'smell',
      'disrobe',
      'deep fry',
      'cook',
      'symbolize'
    ],
    nouns: [
      'hover-turtle',
      'port doors',
      'stator coil',
      'hyperclutch',
      'aft doors',
      'windshield',
      'cleaning unit',
      'cleansoid',
      'riffleskip',
      'circuits',
      'scorching unit'
    ],
    premade: [
      'sudo !!',
      'whoami',
      'reboot',
      'login',
      'thrust --max',
      'thrust --low',
      'shutdown -h now',
      'fortune'
    ],
    commands: [
      'word2vec',
      'troff',
      'nroff',
      'ps',
      'grep',
      'cat',
      'kill -9',
      'kill -HUP',
      'pip install'
    ],
    pipes: [
      '|',
      '<',
      '>',
      '>>'
    ],
    files: [
      'autoexec.bat',
      'config.sys',
      '.bashrc',
      'manifest.xml',
      'manifest.json',
      'captain.log',
      '/dev/null',
      '/dev/random',
      'config.json',
      '/var',
      'STDOUT'
    ]
  };
}

Game.prototype.zero = function () {
  this.correctWords = [];
  this.nonsenseWords = [];

  this.level = 0;

  this.feedMeLevel = 1;
  this.commandLevel = 1;

  this.words = [];
  this.wordIndex = 0;

  this.characters = [];
  this.characterIndex = 0;

  this.statistics = {
    correct: 0,
    incorrect: 0
  };
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

Game.prototype.getCommandLevel = function (cb) {
  $('#game').removeClass();
  $('#game').addClass('command');

  var commands = [this.generateCommand()];

  this.bngSound();

  $('#disaster').text(_.randomArray(this.narrative.disasters));

  this.setWords(commands);

  this.setTime(TEN_SECONDS);

  this.commandLevel++;

  if (cb) {
    cb();
  }
};

Game.prototype.getFeedMeLevel = function (cb) {
  var words = this.getWords(this.feedMeLevel);

  $('#game').removeClass();
  $('#game').addClass('feed-me');

  this.setWords(words);

  this.feedMeSound();

  this.setTime(TEN_SECONDS);

  this.feedMeLevel++;

  if (cb) {
    cb();
  }
};

Game.prototype.changeLevel = function (cb) {
  this.level++;

  if (this.level === 1 ||
      this.level % 3 === 0) {
    this.getCommandLevel(cb);
  } else {
    this.getFeedMeLevel(cb);
  }
};

Game.prototype.handleCharacter = function (character) {
  if (character !==
      this.characters[this.characterIndex].replace('&nbsp;', ' ')) {
    $('#countdown-wrapper').addClass('penalty');

    // TODO: Better way? Solely in CSS transition?
    setTimeout(function () {
      $('#countdown-wrapper').removeClass('penalty');
    }, 100);

    this.subtractTime(ONE_SECOND);

    this.statistics.incorrect++;

    this.unhSound();

    return;
  }

  if (_.random(100) > 90) {
    this.backgroundSound();
  }

  this.statistics.correct++;

  this.keySound();

  $('.word').eq(this.wordIndex)
    .find('.letter').eq(this.characterIndex).addClass('correct');

  this.characterIndex++;

  this.highlightNext();

  if (this.characterIndex === this.words[this.wordIndex].length) {
    this.correctWords.push(this.words[this.wordIndex]);

    if ($('#game').hasClass('feed-me')) {
      this.nonsenseWords.push(this.words[this.wordIndex]);
    }

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
    if (e.keyCode === 8 || e.keyCode === 32) {
      var newEvent = $.Event('keypress');

      newEvent.keyCode = e.keyCode;

      $(document).trigger(newEvent);

      return false;
    }
  });

  $(document).on('keypress', function (e) {
    // Chrome is keyCode, Firefox is charCode apparently
    var key = e.charCode || e.keyCode;

    // Discard non-alphanumeric/symbols
    if (key < 32 || key > 126) {
      return;
    }

    self.handleCharacter(String.fromCharCode(key));

    return false;
  });
};

Game.prototype.unhandleKeys = function () {
  $(document).off('keydown');
  $(document).off('keypress');
};

Game.prototype.generateCommand = function () {
  var chance = _.random(100);

  if (chance < 60) {
    return sprintf('%s the %s',
      _.randomArray(this.narrative.verbs),
      _.randomArray(this.narrative.nouns));
  }

  if (chance < 90) {
    return _.randomArray(this.narrative.premade);
  }

  return sprintf('%s %s %s',
    _.randomArray(this.narrative.commands),
    _.randomArray(this.narrative.pipes),
    _.randomArray(this.narrative.files));
};

Game.prototype.getWords = function (level) {
  return preloadedWords[level];
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

  $('#words').html('').html(this.wordTemplate({words: words}));

  this.highlightNext();
};

// When keys are typed
Game.prototype.keySound = function () {
  this.sounds.play('key' + _.random(1, 7));
};

// When keys are mistyped
Game.prototype.unhSound = function () {
  this.sounds.play('unh' + _.random(1, 9));
};

// At the start of the game
Game.prototype.bzhSound = function () {
  this.sounds.play('bzh' + _.random(1, 4));
};

// When a word is finished
Game.prototype.bngSound = function () {
  this.sounds.play('bng' + _.random(1, 2));
};

// When Feed Me mode is engaged
Game.prototype.feedMeSound = function () {
  this.sounds.play('feedMe' + _.random(1, 6));
};

// Played randomly after some keypresses
Game.prototype.backgroundSound = function () {
  var backgroundSounds = [
    'huh',
    'phlegm',
    'shwip',
    'shwippo',
    'static1',
    'staticMedium',
    'staticShort',
    'ticktock',
    'uh',
    'zheu'
  ];

  this.sounds.play(_.randomArray(backgroundSounds));
};

Game.prototype.loadSounds = function (cb) {
  this.sounds = new Howl({
    src: ['/sounds/sound-effects.mp3', '/sounds/sound-effects.ogg'],
    sprite: {
      bng1: [28256, 467],
      bng2: [29166, 403],

      bzh1: [7169, 408],
      bzh2: [25937, 578],
      bzh3: [27771, 313],
      bzh4: [46623, 435],

      feedMe1: [34705, 1562],
      feedMe2: [36786, 1721],
      feedMe3: [38911, 1866],
      feedMe4: [41244, 1190],
      feedMe5: [42841, 1260],
      feedMe6: [44388, 1289],

      huh: [3702, 459],

      key1: [50, 200],
      key2: [700, 200],
      key3: [1550, 200],
      key4: [2447, 200],
      key5: [2990, 200],
      key6: [50684, 208],
      key7: [51302, 216],

      next: [30520, 434],
      phlegm: [26955, 412],
      shwip: [48550, 209],
      shwippo: [49075, 253],

      static1: [4555, 911],
      static2: [5859, 729],
      staticLong: [54793, 2839],
      staticMedium: [53806, 595],
      staticShort: [53078, 345],

      ticktock: [45978, 279],
      uh: [31643, 372],

      unh1: [8414, 401],
      unh2: [9767, 350],
      unh3: [14308, 430],
      unh4: [15855, 495],
      unh5: [17290, 369],
      unh6: [18474, 342],
      unh7: [19853, 550],
      unh8: [20895, 461],
      unh9: [22229, 469],

      wahwah: [23290, 2090],
      whistle: [49798, 348],
      youLose: [33746, 578],
      zheu: [47395, 546],
    },
    volume: 0.75,
    onload: cb,
    onloaderror: function (err) {
      console.log('Ignoring sound loading error', err);

      cb();
    }
  });
};

Game.prototype.start = function () {
  $('body').scrollTop(0);
  $('body').addClass('live');

  this.zero();

  this.handleKeys();
  this.handleScoreInteraction();

  var self = this;

  this.changeLevel(function () {
    self.startTimer(function (remaining) {
      var secondsLeft = Math.max(0, remaining / 1000);

      $('#countdown').text(sprintf('%.02f', secondsLeft));
    },
    function (now) {
      self.statistics.survivalTime = (now - self.statistics.startTime) / 1000;
      self.stop();
    });
  });
};

Game.prototype.handleScoreInteraction = function () {
  var self = this;

  $('#after').on('click', 'li', function () {
    $.getJSON('/favorite/' + $(this).text());

    $('#after').hide();

    self.start();
  });
};

Game.prototype.showScore = function () {
  $('#level').text(this.level);

  var cps = this.statistics.correct / this.statistics.survivalTime;
  var cpm = cps * 60;
  var wpm = cpm / 5;

  $('#cpm').text(sprintf('%.01f', cpm));
  $('#wpm').text(sprintf('%.01f', wpm));

  $('#seconds').text(sprintf('%.02f', this.statistics.survivalTime));

  $('#correct').text(this.statistics.correct);
  $('#incorrect').text(this.statistics.incorrect);

  $('#correct-words').text(this.correctWords.length);

  $('#accuracy').text(sprintf('%.02f',
    (this.statistics.correct /
      (this.statistics.correct + this.statistics.incorrect)) * 100));

  $('#correct-words-list').html('');

  this.nonsenseWords.sort().forEach(function (word) {
    $('#correct-words-list').append(sprintf('<li>%s</li>', word));
  });

  $('#after').show();
  $('#after').scrollTop(0);
};

Game.prototype.stop = function () {
  $('body').removeClass('live');

  this.unhandleKeys();

  glitchIfEnabled('body', function (canvas) {
    $('#background').html(canvas);

    glitchIfEnabled('body', function (canvas) {
      $('#background').html(canvas);
    });
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
    self.bzhSound();

    cb();
  });
};

$(function () {
  var initializing = true;

  game = new Game();

  wordStream.on('end', function () {
    preloadWords();

    initializing = false;

    $('#press-enter').html('PRESS ENTER &#9632');
  });

  // Show instructions and wait for enter to be pressed
  $(document).on('keydown', function (e) {
    if (e.keyCode === 13) {
      if (initializing) {
        return;
      }

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
