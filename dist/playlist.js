/*! playlist.js v0.0.2 - MIT license 
2014-11-28 - Florent Solt */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Playlist = require('./core');

window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;

window.$(function() {
    Playlist.ui.discover();
});
},{"./core":2}],2:[function(require,module,exports){
"use strict";

/* --------- Vars --------- */

var ui = module.exports.ui = require('./ui');
var oscillo = require('./oscillo');

var noop = function() {};

var ctx = {
    index: 0,
    audio: null,
    volume: 100,

    fade: 5,

    currentBuffer: null,
    nextBuffer: null,

    songs: [],
    allSongs: [],

    loop: true,

    oscillo: false,
    interval: null,
    source: null,
    analyser: null,
    data: null,

    events: {
        play: noop,
        pause: noop,
        stop: noop,
        mute: noop,
        unmute: noop,
        next: noop,
        prev: noop,
        time: noop
    }
};

var audioContext = new window.AudioContext();

/* --------- Public --------- */

module.exports.on = function(event, cb) {
    if (typeof cb == "function") {
        if (ctx.events[event]) {
            ctx.events[event] = cb;
        } else {
            console.log("Unknown event: " + event);
        }
    } else {
        console.log("Playlist.on needs a funciton as 2nd argument.");
    }
};

module.exports.setSongs = function(songs) {
    if (Array.isArray(songs)) {
        songs.forEach(function(song) {
            if (typeof song.src == "string" && typeof song.title == "string" && typeof song.artwork == "string") {
                ctx.allSongs.push(song);
            } else {
                console.log("Invalid song (src, title or artwork property missing or invalid).", song);
            }
            ctx.songs = ctx.allSongs;
        });
    } else {
        console.log("Playlist.setSongs only accet array of songs.");
    }
};

module.exports.getSongs = function() {
    return(ctx.songs);
};

module.exports.filterSongs = function(cb) {
    if (cb === false || typeof cb != "function") {
        ctx.songs = ctx.allSongs;
    } else {
        ctx.songs = ctx.allSongs.filter(cb);
    }
};

module.exports.setOscillo = function(bool) {
    ctx.oscillo = !!bool;
    if (ctx.oscillo === true/* && ctx.interval === null*/) {
        // ctx.interval = window.setInterval(analyze, 50);
        analyze();
        oscillo.show();
    } else /* if (ctx.interval !== null)*/ {
        // window.clearInterval(ctx.interval);
        // ctx.interval = null;
        oscillo.hide();
    }
};

module.exports.getOscillo = function(bool) {
    return ctx.oscillo;
};

module.exports.setVolume = function (volume) {
    volume = volume || ctx.volume;
    if (typeof volume == "number") {
        if (volume >= 0 && volume <= 100) {
            ctx.volume = volume;
            if (ctx.audio) {
                ctx.audio.volume = volume / 100;
            }
        } else {
            console.log("Volume should be between 0 and 100.");
        }
    } else {
        console.log("Invalid index.");
    }
};

module.exports.isPlaying = function () {
    if (!ctx.audio) {
        return false;
    }
    return !ctx.audio.paused;
};

module.exports.play = function () {
    if (!ctx.audio) {
        ctx.index = -1;
        module.exports.next();
    } else {
        ctx.audio.play();
        ui.update(ctx.songs[ctx.index]);
        ctx.events.play(ctx.songs[ctx.index]);
        if (ctx.oscillo) {
            analyze();
        }
    }
};

module.exports.stop = function () {
    ctx.audio.pause();
    ctx.audio.currentTime = 0;
    ctx.events.stop();
};

module.exports.pause = function () {
    ctx.audio.pause();
    ui.update(ctx.songs[ctx.index]);
    ctx.events.pause();
};

module.exports.next  = function () {
    if (ctx.autio) ctx.audio.pause();
    if (ctx.loop) {
        setIndex((ctx.index + 1) % ctx.songs.length);
    } else if (ctx.index + 1 < ctx.songs.length) {
        setIndex(ctx.index + 1);
    }
    module.exports.play();
    ctx.events.next();
};

module.exports.prev = function () {
    if (ctx.loop) {
        setIndex((ctx.songs.length + ctx.index - 1) % ctx.songs.length);
    } else if (ctx.index - 1 >= 0) {
        setIndex(ctx.index - 1);
    }
    module.exports.play();
    ctx.events.prev();
};

module.exports.shuffle = function() {
    for (var j, x, i = ctx.songs.length; i;
        j = Math.floor(Math.random() * i),
        x = ctx.songs[--i],
        ctx.songs[i] = ctx.songs[j],
        ctx.songs[j] = x);
};

module.exports.setLoop = function(bool) {
    ctx.loop = !!bool;
};

/* --------- Private --------- */

var analyze = function() {
    if (ctx.oscillo && module.exports.isPlaying()) {
        if (ctx.analyser === null) {
            ctx.source = audioContext.createMediaElementSource(ctx.audio);
            ctx.analyser = audioContext.createAnalyser();
            ctx.data = new Uint8Array(ctx.analyser.frequencyBinCount);
            ctx.source.connect(ctx.analyser);
            ctx.source.connect(audioContext.destination);
        }

        ctx.analyser.getByteTimeDomainData(ctx.data);
        oscillo.draw(ctx.data);
        requestAnimationFrame(analyze);
    }
};

var setIndex = function(index) {
    ctx.index = index;
    if (ctx.audio) {
        // ctx.audio.removeEventListener('timeupdate', listener.fade);
        ctx.audio.removeEventListener('timeupdate', listener.time);
        ctx.audio.removeEventListener('ended', listener.end);
        ctx.audio.pause();
    }
    ctx.audio = new Audio();
    ctx.audio.src = ctx.songs[ctx.index].src;
    ctx.audio.addEventListener('timeupdate', listener.time);
    ctx.audio.addEventListener('ended', listener.end);
    // ctx.audio.volume = 0;
    module.exports.setVolume();
    ctx.analyser = null;
    analyze();
};

var listener = {
    time: function() {
        var current = ctx.audio.currentTime || 0;
        var duration = ctx.audio.duration || 0;
        var times = {
            current: {
                seconds: (Math.floor(current % 60 ) < 10 ? '0' : '') + Math.floor(current % 60),
                minutes: Math.floor(current / 60),
            },
            duration: {
                seconds: (Math.floor(duration % 60 ) < 10 ? '0' : '') + Math.floor(duration % 60),
                minutes: Math.floor(duration / 60)
            }
        };
        times.current.text = times.current.minutes + ":" + times.current.seconds;
        times.duration.text = times.duration.minutes + ":" + times.duration.seconds;

        ui.time(times);
        ctx.events.time(times);
        return times;
    },

    end: function() {
        if (ctx.loop) {
            module.exports.next();
        }
    },

    fade: function() {
        var times = listener.time();
        var fadeInEnd = Math.min(ctx.fade, this.duration - ctx.fade);

        if (this.currentTime < fadeInEnd) {
            // Fade in
            this.volume = ((1 - (fadeInEnd - this.currentTime) / fadeInEnd) * ctx.volume) / 100;
        }

        if (this.currentTime + ctx.fade > this.duration) {
            if (this == ctx.audio) {
                module.exports.next();
            }
            // Fade out
            this.volume = ((this.duration - this.currentTime) / ctx.fade * ctx.volume) / 100;
        }
    }
};

},{"./oscillo":3,"./ui":4}],3:[function(require,module,exports){

var ctx = {
    canvas: null,
    ctx2d: null,
    widht: null,
    height: null,
    quarterHeight: null,
    scaling: null,
    sampling: 1,
    min: 134  // 128 == zero.  min is the "minimum detected signal" level.
};

module.exports.init = function(canvas) {
    ctx.canvas = canvas;
    ctx.ctx2d = canvas.get(0).getContext('2d');
    ctx.width = canvas.attr('width');
    ctx.height = canvas.attr('height');
    ctx.quarterHeight = ctx.height / 4;
    ctx.scaling = ctx.height / 256;
};

module.exports.hide = function () {
    ctx.canvas.css('display', 'none');
};

module.exports.show = function () {
    ctx.canvas.css('display', 'block');
};

module.exports.draw = function (data) {
    ctx.ctx2d.lineWidth = 3;
    ctx.ctx2d.strokeStyle = "white";

    ctx.ctx2d.beginPath();
    ctx.ctx2d.clearRect(0, 0, ctx.width, ctx.height);

    var zeroCross = findFirstPositiveZeroCrossing(data, ctx.width);

    ctx.ctx2d.moveTo(0, (256 - data[zeroCross]) * ctx.scaling);
    for (var i = zeroCross, j = 0; (j < ctx.width) && (i < data.length); i += ctx.sampling, j++) {
        ctx.ctx2d.lineTo(j * ctx.sampling, (256 - data[i]) * ctx.scaling);
    }
    ctx.ctx2d.stroke();
};

var findFirstPositiveZeroCrossing = function (buf, buflen) {
    var i = 0;
    var last_zero = -1;
    var t;

    // advance until we're zero or negative
    while (i < buflen && (buf[i] > 128 ) ) {
        i++;
    }

    if (i >= buflen){
        return 0;
    }

    // advance until we're above min, keeping track of last zero.
    while (i < buflen && ((t = buf[i]) < ctx.min )) {
        if (t >= 128) {
            if (last_zero == -1) {
                last_zero = i;
            }
        } else {
            last_zero = -1;
        }
        i++;
    }

    // we may have jumped over min in one sample.
    if (last_zero == -1) {
        last_zero = i;
    }

    if (i==buflen) { // We didn't find any positive zero crossings
        return 0;
    }

    // The first sample might be a zero.  If so, return it.
    if (last_zero === 0) {
        return 0;
    }

    return last_zero;
};

},{}],4:[function(require,module,exports){
"use strict";

var core = require("./core");
var oscillo = require('./oscillo');

var elements = {
    title: null,
    artwork: null,

    play: null,
    next: null,
    prev: null,
    stop: null,

    volume: null,
    mute: null,

    time: null
};

module.exports.discover = function(id) {
    id = id || "#player";

    window.$.each(elements, function(key, value) {
        elements[key] = window.$(id + " ." + key);
    });

    elements.artwork.css({
        "position": "relative",
        "background-size": "cover",
        "background-position": "50% 50%",
    });

    elements.play.click(function() {
        if (core.isPlaying()) {
            core.pause();
        } else {
            core.play();
        }
    });

    elements.next.click(core.next);
    elements.prev.click(core.prev);

    elements.oscillo = window.$('<canvas>')
        .css({
            'position': 'absolute',
            'display': 'none',
            'top': '0px',
            'left': '0px',
            'width':  elements.artwork.width() + 'px',
            'height': elements.artwork.height() + 'px'
        })
        .attr('width', elements.artwork.width())
        .attr('height', elements.artwork.height());
    elements.artwork.prepend(elements.oscillo);
    oscillo.init(elements.oscillo);
};

module.exports.update = function(song) {
    elements.title.text(song.title);
    elements.artwork.css("background-image", "url(" + song.artwork + ")");
    if (core.isPlaying()) {
        elements.play.removeClass('fa-play').addClass('fa-pause');
    } else {
        elements.play.removeClass('fa-pause').addClass('fa-play');
    }
};

module.exports.time = function(times) {
    elements.time.find('.current').text(times.current.text);
    elements.time.find('.duration').text(times.duration.text);
};

},{"./core":2,"./oscillo":3}]},{},[1,2,3,4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYnJvd3Nlci5qcyIsInNyYy9jb3JlLmpzIiwic3JjL29zY2lsbG8uanMiLCJzcmMvdWkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LlBsYXlsaXN0ID0gcmVxdWlyZSgnLi9jb3JlJyk7XG5cbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG53aW5kb3cuJChmdW5jdGlvbigpIHtcbiAgICBQbGF5bGlzdC51aS5kaXNjb3ZlcigpO1xufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIC0tLS0tLS0tLSBWYXJzIC0tLS0tLS0tLSAqL1xuXG52YXIgdWkgPSBtb2R1bGUuZXhwb3J0cy51aSA9IHJlcXVpcmUoJy4vdWknKTtcbnZhciBvc2NpbGxvID0gcmVxdWlyZSgnLi9vc2NpbGxvJyk7XG5cbnZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcblxudmFyIGN0eCA9IHtcbiAgICBpbmRleDogMCxcbiAgICBhdWRpbzogbnVsbCxcbiAgICB2b2x1bWU6IDEwMCxcblxuICAgIGZhZGU6IDUsXG5cbiAgICBjdXJyZW50QnVmZmVyOiBudWxsLFxuICAgIG5leHRCdWZmZXI6IG51bGwsXG5cbiAgICBzb25nczogW10sXG4gICAgYWxsU29uZ3M6IFtdLFxuXG4gICAgbG9vcDogdHJ1ZSxcblxuICAgIG9zY2lsbG86IGZhbHNlLFxuICAgIGludGVydmFsOiBudWxsLFxuICAgIHNvdXJjZTogbnVsbCxcbiAgICBhbmFseXNlcjogbnVsbCxcbiAgICBkYXRhOiBudWxsLFxuXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIHBsYXk6IG5vb3AsXG4gICAgICAgIHBhdXNlOiBub29wLFxuICAgICAgICBzdG9wOiBub29wLFxuICAgICAgICBtdXRlOiBub29wLFxuICAgICAgICB1bm11dGU6IG5vb3AsXG4gICAgICAgIG5leHQ6IG5vb3AsXG4gICAgICAgIHByZXY6IG5vb3AsXG4gICAgICAgIHRpbWU6IG5vb3BcbiAgICB9XG59O1xuXG52YXIgYXVkaW9Db250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKTtcblxuLyogLS0tLS0tLS0tIFB1YmxpYyAtLS0tLS0tLS0gKi9cblxubW9kdWxlLmV4cG9ydHMub24gPSBmdW5jdGlvbihldmVudCwgY2IpIHtcbiAgICBpZiAodHlwZW9mIGNiID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBpZiAoY3R4LmV2ZW50c1tldmVudF0pIHtcbiAgICAgICAgICAgIGN0eC5ldmVudHNbZXZlbnRdID0gY2I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gZXZlbnQ6IFwiICsgZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQbGF5bGlzdC5vbiBuZWVkcyBhIGZ1bmNpdG9uIGFzIDJuZCBhcmd1bWVudC5cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuc2V0U29uZ3MgPSBmdW5jdGlvbihzb25ncykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHNvbmdzKSkge1xuICAgICAgICBzb25ncy5mb3JFYWNoKGZ1bmN0aW9uKHNvbmcpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc29uZy5zcmMgPT0gXCJzdHJpbmdcIiAmJiB0eXBlb2Ygc29uZy50aXRsZSA9PSBcInN0cmluZ1wiICYmIHR5cGVvZiBzb25nLmFydHdvcmsgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIGN0eC5hbGxTb25ncy5wdXNoKHNvbmcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkludmFsaWQgc29uZyAoc3JjLCB0aXRsZSBvciBhcnR3b3JrIHByb3BlcnR5IG1pc3Npbmcgb3IgaW52YWxpZCkuXCIsIHNvbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4LnNvbmdzID0gY3R4LmFsbFNvbmdzO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBsYXlsaXN0LnNldFNvbmdzIG9ubHkgYWNjZXQgYXJyYXkgb2Ygc29uZ3MuXCIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmdldFNvbmdzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuKGN0eC5zb25ncyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5maWx0ZXJTb25ncyA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgaWYgKGNiID09PSBmYWxzZSB8fCB0eXBlb2YgY2IgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGN0eC5zb25ncyA9IGN0eC5hbGxTb25ncztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjdHguc29uZ3MgPSBjdHguYWxsU29uZ3MuZmlsdGVyKGNiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRPc2NpbGxvID0gZnVuY3Rpb24oYm9vbCkge1xuICAgIGN0eC5vc2NpbGxvID0gISFib29sO1xuICAgIGlmIChjdHgub3NjaWxsbyA9PT0gdHJ1ZS8qICYmIGN0eC5pbnRlcnZhbCA9PT0gbnVsbCovKSB7XG4gICAgICAgIC8vIGN0eC5pbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbChhbmFseXplLCA1MCk7XG4gICAgICAgIGFuYWx5emUoKTtcbiAgICAgICAgb3NjaWxsby5zaG93KCk7XG4gICAgfSBlbHNlIC8qIGlmIChjdHguaW50ZXJ2YWwgIT09IG51bGwpKi8ge1xuICAgICAgICAvLyB3aW5kb3cuY2xlYXJJbnRlcnZhbChjdHguaW50ZXJ2YWwpO1xuICAgICAgICAvLyBjdHguaW50ZXJ2YWwgPSBudWxsO1xuICAgICAgICBvc2NpbGxvLmhpZGUoKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5nZXRPc2NpbGxvID0gZnVuY3Rpb24oYm9vbCkge1xuICAgIHJldHVybiBjdHgub3NjaWxsbztcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNldFZvbHVtZSA9IGZ1bmN0aW9uICh2b2x1bWUpIHtcbiAgICB2b2x1bWUgPSB2b2x1bWUgfHwgY3R4LnZvbHVtZTtcbiAgICBpZiAodHlwZW9mIHZvbHVtZSA9PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGlmICh2b2x1bWUgPj0gMCAmJiB2b2x1bWUgPD0gMTAwKSB7XG4gICAgICAgICAgICBjdHgudm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgaWYgKGN0eC5hdWRpbykge1xuICAgICAgICAgICAgICAgIGN0eC5hdWRpby52b2x1bWUgPSB2b2x1bWUgLyAxMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZvbHVtZSBzaG91bGQgYmUgYmV0d2VlbiAwIGFuZCAxMDAuXCIpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJJbnZhbGlkIGluZGV4LlwiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5pc1BsYXlpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFjdHguYXVkaW8pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gIWN0eC5hdWRpby5wYXVzZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wbGF5ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghY3R4LmF1ZGlvKSB7XG4gICAgICAgIGN0eC5pbmRleCA9IC0xO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5uZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmF1ZGlvLnBsYXkoKTtcbiAgICAgICAgdWkudXBkYXRlKGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICAgICAgY3R4LmV2ZW50cy5wbGF5KGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICAgICAgaWYgKGN0eC5vc2NpbGxvKSB7XG4gICAgICAgICAgICBhbmFseXplKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIGN0eC5hdWRpby5jdXJyZW50VGltZSA9IDA7XG4gICAgY3R4LmV2ZW50cy5zdG9wKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICB1aS51cGRhdGUoY3R4LnNvbmdzW2N0eC5pbmRleF0pO1xuICAgIGN0eC5ldmVudHMucGF1c2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLm5leHQgID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjdHguYXV0aW8pIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIGlmIChjdHgubG9vcCkge1xuICAgICAgICBzZXRJbmRleCgoY3R4LmluZGV4ICsgMSkgJSBjdHguc29uZ3MubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKGN0eC5pbmRleCArIDEgPCBjdHguc29uZ3MubGVuZ3RoKSB7XG4gICAgICAgIHNldEluZGV4KGN0eC5pbmRleCArIDEpO1xuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cy5wbGF5KCk7XG4gICAgY3R4LmV2ZW50cy5uZXh0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wcmV2ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjdHgubG9vcCkge1xuICAgICAgICBzZXRJbmRleCgoY3R4LnNvbmdzLmxlbmd0aCArIGN0eC5pbmRleCAtIDEpICUgY3R4LnNvbmdzLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmIChjdHguaW5kZXggLSAxID49IDApIHtcbiAgICAgICAgc2V0SW5kZXgoY3R4LmluZGV4IC0gMSk7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzLnBsYXkoKTtcbiAgICBjdHguZXZlbnRzLnByZXYoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNodWZmbGUgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBqLCB4LCBpID0gY3R4LnNvbmdzLmxlbmd0aDsgaTtcbiAgICAgICAgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpLFxuICAgICAgICB4ID0gY3R4LnNvbmdzWy0taV0sXG4gICAgICAgIGN0eC5zb25nc1tpXSA9IGN0eC5zb25nc1tqXSxcbiAgICAgICAgY3R4LnNvbmdzW2pdID0geCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRMb29wID0gZnVuY3Rpb24oYm9vbCkge1xuICAgIGN0eC5sb29wID0gISFib29sO1xufTtcblxuLyogLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tICovXG5cbnZhciBhbmFseXplID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKGN0eC5vc2NpbGxvICYmIG1vZHVsZS5leHBvcnRzLmlzUGxheWluZygpKSB7XG4gICAgICAgIGlmIChjdHguYW5hbHlzZXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGN0eC5zb3VyY2UgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKGN0eC5hdWRpbyk7XG4gICAgICAgICAgICBjdHguYW5hbHlzZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgICAgIGN0eC5kYXRhID0gbmV3IFVpbnQ4QXJyYXkoY3R4LmFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgICAgICAgICAgIGN0eC5zb3VyY2UuY29ubmVjdChjdHguYW5hbHlzZXIpO1xuICAgICAgICAgICAgY3R4LnNvdXJjZS5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBjdHguYW5hbHlzZXIuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGN0eC5kYXRhKTtcbiAgICAgICAgb3NjaWxsby5kcmF3KGN0eC5kYXRhKTtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuYWx5emUpO1xuICAgIH1cbn07XG5cbnZhciBzZXRJbmRleCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgY3R4LmluZGV4ID0gaW5kZXg7XG4gICAgaWYgKGN0eC5hdWRpbykge1xuICAgICAgICAvLyBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLmZhZGUpO1xuICAgICAgICBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLnRpbWUpO1xuICAgICAgICBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBsaXN0ZW5lci5lbmQpO1xuICAgICAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICB9XG4gICAgY3R4LmF1ZGlvID0gbmV3IEF1ZGlvKCk7XG4gICAgY3R4LmF1ZGlvLnNyYyA9IGN0eC5zb25nc1tjdHguaW5kZXhdLnNyYztcbiAgICBjdHguYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLnRpbWUpO1xuICAgIGN0eC5hdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGxpc3RlbmVyLmVuZCk7XG4gICAgLy8gY3R4LmF1ZGlvLnZvbHVtZSA9IDA7XG4gICAgbW9kdWxlLmV4cG9ydHMuc2V0Vm9sdW1lKCk7XG4gICAgY3R4LmFuYWx5c2VyID0gbnVsbDtcbiAgICBhbmFseXplKCk7XG59O1xuXG52YXIgbGlzdGVuZXIgPSB7XG4gICAgdGltZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gY3R4LmF1ZGlvLmN1cnJlbnRUaW1lIHx8wqAwO1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBjdHguYXVkaW8uZHVyYXRpb24gfHzCoDA7XG4gICAgICAgIHZhciB0aW1lcyA9IHtcbiAgICAgICAgICAgIGN1cnJlbnQ6IHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzOiAoTWF0aC5mbG9vcihjdXJyZW50ICUgNjAgKSA8IDEwID8gJzAnIDogJycpICsgTWF0aC5mbG9vcihjdXJyZW50ICUgNjApLFxuICAgICAgICAgICAgICAgIG1pbnV0ZXM6IE1hdGguZmxvb3IoY3VycmVudCAvIDYwKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIHNlY29uZHM6IChNYXRoLmZsb29yKGR1cmF0aW9uICUgNjAgKSA8IDEwID8gJzAnIDogJycpICsgTWF0aC5mbG9vcihkdXJhdGlvbiAlIDYwKSxcbiAgICAgICAgICAgICAgICBtaW51dGVzOiBNYXRoLmZsb29yKGR1cmF0aW9uIC8gNjApXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHRpbWVzLmN1cnJlbnQudGV4dCA9IHRpbWVzLmN1cnJlbnQubWludXRlcyArIFwiOlwiICsgdGltZXMuY3VycmVudC5zZWNvbmRzO1xuICAgICAgICB0aW1lcy5kdXJhdGlvbi50ZXh0ID0gdGltZXMuZHVyYXRpb24ubWludXRlcyArIFwiOlwiICsgdGltZXMuZHVyYXRpb24uc2Vjb25kcztcblxuICAgICAgICB1aS50aW1lKHRpbWVzKTtcbiAgICAgICAgY3R4LmV2ZW50cy50aW1lKHRpbWVzKTtcbiAgICAgICAgcmV0dXJuIHRpbWVzO1xuICAgIH0sXG5cbiAgICBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY3R4Lmxvb3ApIHtcbiAgICAgICAgICAgIG1vZHVsZS5leHBvcnRzLm5leHQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBmYWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRpbWVzID0gbGlzdGVuZXIudGltZSgpO1xuICAgICAgICB2YXIgZmFkZUluRW5kID0gTWF0aC5taW4oY3R4LmZhZGUsIHRoaXMuZHVyYXRpb24gLSBjdHguZmFkZSk7XG5cbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWUgPCBmYWRlSW5FbmQpIHtcbiAgICAgICAgICAgIC8vIEZhZGUgaW5cbiAgICAgICAgICAgIHRoaXMudm9sdW1lID0gKCgxIC0gKGZhZGVJbkVuZCAtIHRoaXMuY3VycmVudFRpbWUpIC8gZmFkZUluRW5kKSAqIGN0eC52b2x1bWUpIC8gMTAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWUgKyBjdHguZmFkZSA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGlmICh0aGlzID09IGN0eC5hdWRpbykge1xuICAgICAgICAgICAgICAgIG1vZHVsZS5leHBvcnRzLm5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZhZGUgb3V0XG4gICAgICAgICAgICB0aGlzLnZvbHVtZSA9ICgodGhpcy5kdXJhdGlvbiAtIHRoaXMuY3VycmVudFRpbWUpIC8gY3R4LmZhZGUgKiBjdHgudm9sdW1lKSAvIDEwMDtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJcbnZhciBjdHggPSB7XG4gICAgY2FudmFzOiBudWxsLFxuICAgIGN0eDJkOiBudWxsLFxuICAgIHdpZGh0OiBudWxsLFxuICAgIGhlaWdodDogbnVsbCxcbiAgICBxdWFydGVySGVpZ2h0OiBudWxsLFxuICAgIHNjYWxpbmc6IG51bGwsXG4gICAgc2FtcGxpbmc6IDEsXG4gICAgbWluOiAxMzQgIC8vIDEyOCA9PSB6ZXJvLiAgbWluIGlzIHRoZSBcIm1pbmltdW0gZGV0ZWN0ZWQgc2lnbmFsXCIgbGV2ZWwuXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgY3R4LmNhbnZhcyA9IGNhbnZhcztcbiAgICBjdHguY3R4MmQgPSBjYW52YXMuZ2V0KDApLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LndpZHRoID0gY2FudmFzLmF0dHIoJ3dpZHRoJyk7XG4gICAgY3R4LmhlaWdodCA9IGNhbnZhcy5hdHRyKCdoZWlnaHQnKTtcbiAgICBjdHgucXVhcnRlckhlaWdodCA9IGN0eC5oZWlnaHQgLyA0O1xuICAgIGN0eC5zY2FsaW5nID0gY3R4LmhlaWdodCAvIDI1Njtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgY3R4LmNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguY2FudmFzLmNzcygnZGlzcGxheScsICdibG9jaycpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuZHJhdyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgY3R4LmN0eDJkLmxpbmVXaWR0aCA9IDM7XG4gICAgY3R4LmN0eDJkLnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xuXG4gICAgY3R4LmN0eDJkLmJlZ2luUGF0aCgpO1xuICAgIGN0eC5jdHgyZC5jbGVhclJlY3QoMCwgMCwgY3R4LndpZHRoLCBjdHguaGVpZ2h0KTtcblxuICAgIHZhciB6ZXJvQ3Jvc3MgPSBmaW5kRmlyc3RQb3NpdGl2ZVplcm9Dcm9zc2luZyhkYXRhLCBjdHgud2lkdGgpO1xuXG4gICAgY3R4LmN0eDJkLm1vdmVUbygwLCAoMjU2IC0gZGF0YVt6ZXJvQ3Jvc3NdKSAqIGN0eC5zY2FsaW5nKTtcbiAgICBmb3IgKHZhciBpID0gemVyb0Nyb3NzLCBqID0gMDsgKGogPCBjdHgud2lkdGgpICYmIChpIDwgZGF0YS5sZW5ndGgpOyBpICs9IGN0eC5zYW1wbGluZywgaisrKSB7XG4gICAgICAgIGN0eC5jdHgyZC5saW5lVG8oaiAqIGN0eC5zYW1wbGluZywgKDI1NiAtIGRhdGFbaV0pICogY3R4LnNjYWxpbmcpO1xuICAgIH1cbiAgICBjdHguY3R4MmQuc3Ryb2tlKCk7XG59O1xuXG52YXIgZmluZEZpcnN0UG9zaXRpdmVaZXJvQ3Jvc3NpbmcgPSBmdW5jdGlvbiAoYnVmLCBidWZsZW4pIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGxhc3RfemVybyA9IC0xO1xuICAgIHZhciB0O1xuXG4gICAgLy8gYWR2YW5jZSB1bnRpbCB3ZSdyZSB6ZXJvIG9yIG5lZ2F0aXZlXG4gICAgd2hpbGUgKGkgPCBidWZsZW4gJiYgKGJ1ZltpXSA+IDEyOCApICkge1xuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgaWYgKGkgPj0gYnVmbGVuKXtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgLy8gYWR2YW5jZSB1bnRpbCB3ZSdyZSBhYm92ZSBtaW4sIGtlZXBpbmcgdHJhY2sgb2YgbGFzdCB6ZXJvLlxuICAgIHdoaWxlIChpIDwgYnVmbGVuICYmICgodCA9IGJ1ZltpXSkgPCBjdHgubWluICkpIHtcbiAgICAgICAgaWYgKHQgPj0gMTI4KSB7XG4gICAgICAgICAgICBpZiAobGFzdF96ZXJvID09IC0xKSB7XG4gICAgICAgICAgICAgICAgbGFzdF96ZXJvID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxhc3RfemVybyA9IC0xO1xuICAgICAgICB9XG4gICAgICAgIGkrKztcbiAgICB9XG5cbiAgICAvLyB3ZSBtYXkgaGF2ZSBqdW1wZWQgb3ZlciBtaW4gaW4gb25lIHNhbXBsZS5cbiAgICBpZiAobGFzdF96ZXJvID09IC0xKSB7XG4gICAgICAgIGxhc3RfemVybyA9IGk7XG4gICAgfVxuXG4gICAgaWYgKGk9PWJ1ZmxlbikgeyAvLyBXZSBkaWRuJ3QgZmluZCBhbnkgcG9zaXRpdmUgemVybyBjcm9zc2luZ3NcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgLy8gVGhlIGZpcnN0IHNhbXBsZSBtaWdodCBiZSBhIHplcm8uICBJZiBzbywgcmV0dXJuIGl0LlxuICAgIGlmIChsYXN0X3plcm8gPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxhc3RfemVybztcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGNvcmUgPSByZXF1aXJlKFwiLi9jb3JlXCIpO1xudmFyIG9zY2lsbG8gPSByZXF1aXJlKCcuL29zY2lsbG8nKTtcblxudmFyIGVsZW1lbnRzID0ge1xuICAgIHRpdGxlOiBudWxsLFxuICAgIGFydHdvcms6IG51bGwsXG5cbiAgICBwbGF5OiBudWxsLFxuICAgIG5leHQ6IG51bGwsXG4gICAgcHJldjogbnVsbCxcbiAgICBzdG9wOiBudWxsLFxuXG4gICAgdm9sdW1lOiBudWxsLFxuICAgIG11dGU6IG51bGwsXG5cbiAgICB0aW1lOiBudWxsXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5kaXNjb3ZlciA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWQgPSBpZCB8fCBcIiNwbGF5ZXJcIjtcblxuICAgIHdpbmRvdy4kLmVhY2goZWxlbWVudHMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgZWxlbWVudHNba2V5XSA9IHdpbmRvdy4kKGlkICsgXCIgLlwiICsga2V5KTtcbiAgICB9KTtcblxuICAgIGVsZW1lbnRzLmFydHdvcmsuY3NzKHtcbiAgICAgICAgXCJwb3NpdGlvblwiOiBcInJlbGF0aXZlXCIsXG4gICAgICAgIFwiYmFja2dyb3VuZC1zaXplXCI6IFwiY292ZXJcIixcbiAgICAgICAgXCJiYWNrZ3JvdW5kLXBvc2l0aW9uXCI6IFwiNTAlIDUwJVwiLFxuICAgIH0pO1xuXG4gICAgZWxlbWVudHMucGxheS5jbGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGNvcmUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgICAgIGNvcmUucGF1c2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvcmUucGxheSgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbGVtZW50cy5uZXh0LmNsaWNrKGNvcmUubmV4dCk7XG4gICAgZWxlbWVudHMucHJldi5jbGljayhjb3JlLnByZXYpO1xuXG4gICAgZWxlbWVudHMub3NjaWxsbyA9IHdpbmRvdy4kKCc8Y2FudmFzPicpXG4gICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgICdkaXNwbGF5JzogJ25vbmUnLFxuICAgICAgICAgICAgJ3RvcCc6ICcwcHgnLFxuICAgICAgICAgICAgJ2xlZnQnOiAnMHB4JyxcbiAgICAgICAgICAgICd3aWR0aCc6ICBlbGVtZW50cy5hcnR3b3JrLndpZHRoKCkgKyAncHgnLFxuICAgICAgICAgICAgJ2hlaWdodCc6IGVsZW1lbnRzLmFydHdvcmsuaGVpZ2h0KCkgKyAncHgnXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKCd3aWR0aCcsIGVsZW1lbnRzLmFydHdvcmsud2lkdGgoKSlcbiAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGVsZW1lbnRzLmFydHdvcmsuaGVpZ2h0KCkpO1xuICAgIGVsZW1lbnRzLmFydHdvcmsucHJlcGVuZChlbGVtZW50cy5vc2NpbGxvKTtcbiAgICBvc2NpbGxvLmluaXQoZWxlbWVudHMub3NjaWxsbyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy51cGRhdGUgPSBmdW5jdGlvbihzb25nKSB7XG4gICAgZWxlbWVudHMudGl0bGUudGV4dChzb25nLnRpdGxlKTtcbiAgICBlbGVtZW50cy5hcnR3b3JrLmNzcyhcImJhY2tncm91bmQtaW1hZ2VcIiwgXCJ1cmwoXCIgKyBzb25nLmFydHdvcmsgKyBcIilcIik7XG4gICAgaWYgKGNvcmUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgZWxlbWVudHMucGxheS5yZW1vdmVDbGFzcygnZmEtcGxheScpLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnRzLnBsYXkucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJykuYWRkQ2xhc3MoJ2ZhLXBsYXknKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50aW1lID0gZnVuY3Rpb24odGltZXMpIHtcbiAgICBlbGVtZW50cy50aW1lLmZpbmQoJy5jdXJyZW50JykudGV4dCh0aW1lcy5jdXJyZW50LnRleHQpO1xuICAgIGVsZW1lbnRzLnRpbWUuZmluZCgnLmR1cmF0aW9uJykudGV4dCh0aW1lcy5kdXJhdGlvbi50ZXh0KTtcbn07XG4iXX0=
