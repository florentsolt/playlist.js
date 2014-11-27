/*! playlist.js v0.0.2 - MIT license 
2014-11-27 - Florent Solt */

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

module.exports.setSongs = function(songs) {
    if (Array.isArray(songs)) {
        songs.forEach(function(song) {
            if (typeof song.src == "string" && typeof song.title == "string" && typeof song.artwork == "string") {
                ctx.songs.push(song);
            } else {
                console.log("Invalid song (src, title or artwork property missing or invalid).", song);
            }
        });
    } else {
        console.log("Playlist.setSongs only accet array of songs.");
    }
};

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

module.exports.getSongs = function() {
    return(ctx.songs);
};

module.exports.setOscillo = function(bool) {
    ctx.oscillo = !!bool;
    if (ctx.oscillo === true && ctx.interval === null) {
        ctx.interval = window.setInterval(analyze, 50);
        oscillo.show();
    } else if (ctx.interval !== null) {
        window.clearInterval(ctx.interval);
        ctx.interval = null;
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

var analyze = function(audio) {
    if (ctx.oscillo && module.exports.isPlaying()) {
        if (audio || ctx.analyser === null) {
            ctx.source = audioContext.createMediaElementSource(audio || ctx.audio);
            ctx.analyser = audioContext.createAnalyser();
            ctx.data = new Uint8Array(ctx.analyser.frequencyBinCount);
            ctx.source.connect(ctx.analyser);
            ctx.source.connect(audioContext.destination);
        }

        ctx.analyser.getByteTimeDomainData(ctx.data);
        oscillo.draw(ctx.data);
        // requestAnimationFrame(analyze);
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
    analyze(ctx.audio);
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
    sampling: 5,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYnJvd3Nlci5qcyIsInNyYy9jb3JlLmpzIiwic3JjL29zY2lsbG8uanMiLCJzcmMvdWkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5QbGF5bGlzdCA9IHJlcXVpcmUoJy4vY29yZScpO1xuXG53aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xud2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxud2luZG93LiQoZnVuY3Rpb24oKSB7XG4gICAgUGxheWxpc3QudWkuZGlzY292ZXIoKTtcbn0pOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiAtLS0tLS0tLS0gVmFycyAtLS0tLS0tLS0gKi9cblxudmFyIHVpID0gbW9kdWxlLmV4cG9ydHMudWkgPSByZXF1aXJlKCcuL3VpJyk7XG52YXIgb3NjaWxsbyA9IHJlcXVpcmUoJy4vb3NjaWxsbycpO1xuXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG5cbnZhciBjdHggPSB7XG4gICAgaW5kZXg6IDAsXG4gICAgYXVkaW86IG51bGwsXG4gICAgdm9sdW1lOiAxMDAsXG5cbiAgICBmYWRlOiA1LFxuXG4gICAgY3VycmVudEJ1ZmZlcjogbnVsbCxcbiAgICBuZXh0QnVmZmVyOiBudWxsLFxuXG4gICAgc29uZ3M6IFtdLFxuICAgIGxvb3A6IHRydWUsXG5cbiAgICBvc2NpbGxvOiBmYWxzZSxcbiAgICBpbnRlcnZhbDogbnVsbCxcbiAgICBzb3VyY2U6IG51bGwsXG4gICAgYW5hbHlzZXI6IG51bGwsXG4gICAgZGF0YTogbnVsbCxcblxuICAgIGV2ZW50czoge1xuICAgICAgICBwbGF5OiBub29wLFxuICAgICAgICBwYXVzZTogbm9vcCxcbiAgICAgICAgc3RvcDogbm9vcCxcbiAgICAgICAgbXV0ZTogbm9vcCxcbiAgICAgICAgdW5tdXRlOiBub29wLFxuICAgICAgICBuZXh0OiBub29wLFxuICAgICAgICBwcmV2OiBub29wLFxuICAgICAgICB0aW1lOiBub29wXG4gICAgfVxufTtcblxudmFyIGF1ZGlvQ29udGV4dCA9IG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KCk7XG5cbi8qIC0tLS0tLS0tLSBQdWJsaWMgLS0tLS0tLS0tICovXG5cbm1vZHVsZS5leHBvcnRzLnNldFNvbmdzID0gZnVuY3Rpb24oc29uZ3MpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb25ncykpIHtcbiAgICAgICAgc29uZ3MuZm9yRWFjaChmdW5jdGlvbihzb25nKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvbmcuc3JjID09IFwic3RyaW5nXCIgJiYgdHlwZW9mIHNvbmcudGl0bGUgPT0gXCJzdHJpbmdcIiAmJiB0eXBlb2Ygc29uZy5hcnR3b3JrID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBjdHguc29uZ3MucHVzaChzb25nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJJbnZhbGlkIHNvbmcgKHNyYywgdGl0bGUgb3IgYXJ0d29yayBwcm9wZXJ0eSBtaXNzaW5nIG9yIGludmFsaWQpLlwiLCBzb25nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQbGF5bGlzdC5zZXRTb25ncyBvbmx5IGFjY2V0IGFycmF5IG9mIHNvbmdzLlwiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBjYikge1xuICAgIGlmICh0eXBlb2YgY2IgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGlmIChjdHguZXZlbnRzW2V2ZW50XSkge1xuICAgICAgICAgICAgY3R4LmV2ZW50c1tldmVudF0gPSBjYjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBldmVudDogXCIgKyBldmVudCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBsYXlsaXN0Lm9uIG5lZWRzIGEgZnVuY2l0b24gYXMgMm5kIGFyZ3VtZW50LlwiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5nZXRTb25ncyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybihjdHguc29uZ3MpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2V0T3NjaWxsbyA9IGZ1bmN0aW9uKGJvb2wpIHtcbiAgICBjdHgub3NjaWxsbyA9ICEhYm9vbDtcbiAgICBpZiAoY3R4Lm9zY2lsbG8gPT09IHRydWUgJiYgY3R4LmludGVydmFsID09PSBudWxsKSB7XG4gICAgICAgIGN0eC5pbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbChhbmFseXplLCA1MCk7XG4gICAgICAgIG9zY2lsbG8uc2hvdygpO1xuICAgIH0gZWxzZSBpZiAoY3R4LmludGVydmFsICE9PSBudWxsKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKGN0eC5pbnRlcnZhbCk7XG4gICAgICAgIGN0eC5pbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIG9zY2lsbG8uaGlkZSgpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmdldE9zY2lsbG8gPSBmdW5jdGlvbihib29sKSB7XG4gICAgcmV0dXJuIGN0eC5vc2NpbGxvO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2V0Vm9sdW1lID0gZnVuY3Rpb24gKHZvbHVtZSkge1xuICAgIHZvbHVtZSA9IHZvbHVtZSB8fCBjdHgudm9sdW1lO1xuICAgIGlmICh0eXBlb2Ygdm9sdW1lID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgaWYgKHZvbHVtZSA+PSAwICYmIHZvbHVtZSA8PSAxMDApIHtcbiAgICAgICAgICAgIGN0eC52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBpZiAoY3R4LmF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgY3R4LmF1ZGlvLnZvbHVtZSA9IHZvbHVtZSAvIDEwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVm9sdW1lIHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kIDEwMC5cIik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkludmFsaWQgaW5kZXguXCIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmlzUGxheWluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIWN0eC5hdWRpby5wYXVzZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wbGF5ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghY3R4LmF1ZGlvKSB7XG4gICAgICAgIGN0eC5pbmRleCA9IC0xO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5uZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmF1ZGlvLnBsYXkoKTtcbiAgICAgICAgdWkudXBkYXRlKGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICAgICAgY3R4LmV2ZW50cy5wbGF5KGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICAgICAgaWYgKGN0eC5vc2NpbGxvKSB7XG4gICAgICAgICAgICBhbmFseXplKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIGN0eC5hdWRpby5jdXJyZW50VGltZSA9IDA7XG4gICAgY3R4LmV2ZW50cy5zdG9wKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICB1aS51cGRhdGUoY3R4LnNvbmdzW2N0eC5pbmRleF0pO1xuICAgIGN0eC5ldmVudHMucGF1c2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLm5leHQgID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjdHguYXV0aW8pIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIGlmIChjdHgubG9vcCkge1xuICAgICAgICBzZXRJbmRleCgoY3R4LmluZGV4ICsgMSkgJSBjdHguc29uZ3MubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKGN0eC5pbmRleCArIDEgPCBjdHguc29uZ3MubGVuZ3RoKSB7XG4gICAgICAgIHNldEluZGV4KGN0eC5pbmRleCArIDEpO1xuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cy5wbGF5KCk7XG4gICAgY3R4LmV2ZW50cy5uZXh0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wcmV2ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjdHgubG9vcCkge1xuICAgICAgICBzZXRJbmRleCgoY3R4LnNvbmdzLmxlbmd0aCArIGN0eC5pbmRleCAtIDEpICUgY3R4LnNvbmdzLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmIChjdHguaW5kZXggLSAxID49IDApIHtcbiAgICAgICAgc2V0SW5kZXgoY3R4LmluZGV4IC0gMSk7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzLnBsYXkoKTtcbiAgICBjdHguZXZlbnRzLnByZXYoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNodWZmbGUgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBqLCB4LCBpID0gY3R4LnNvbmdzLmxlbmd0aDsgaTtcbiAgICAgICAgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpLFxuICAgICAgICB4ID0gY3R4LnNvbmdzWy0taV0sXG4gICAgICAgIGN0eC5zb25nc1tpXSA9IGN0eC5zb25nc1tqXSxcbiAgICAgICAgY3R4LnNvbmdzW2pdID0geCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRMb29wID0gZnVuY3Rpb24oYm9vbCkge1xuICAgIGN0eC5sb29wID0gISFib29sO1xufTtcblxuLyogLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tICovXG5cbnZhciBhbmFseXplID0gZnVuY3Rpb24oYXVkaW8pIHtcbiAgICBpZiAoY3R4Lm9zY2lsbG8gJiYgbW9kdWxlLmV4cG9ydHMuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgaWYgKGF1ZGlvIHx8wqBjdHguYW5hbHlzZXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGN0eC5zb3VyY2UgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKGF1ZGlvIHx8IGN0eC5hdWRpbyk7XG4gICAgICAgICAgICBjdHguYW5hbHlzZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgICAgIGN0eC5kYXRhID0gbmV3IFVpbnQ4QXJyYXkoY3R4LmFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgICAgICAgICAgIGN0eC5zb3VyY2UuY29ubmVjdChjdHguYW5hbHlzZXIpO1xuICAgICAgICAgICAgY3R4LnNvdXJjZS5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBjdHguYW5hbHlzZXIuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGN0eC5kYXRhKTtcbiAgICAgICAgb3NjaWxsby5kcmF3KGN0eC5kYXRhKTtcbiAgICAgICAgLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuYWx5emUpO1xuICAgIH1cbn07XG5cbnZhciBzZXRJbmRleCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgY3R4LmluZGV4ID0gaW5kZXg7XG4gICAgaWYgKGN0eC5hdWRpbykge1xuICAgICAgICAvLyBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLmZhZGUpO1xuICAgICAgICBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLnRpbWUpO1xuICAgICAgICBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBsaXN0ZW5lci5lbmQpO1xuICAgICAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICB9XG4gICAgY3R4LmF1ZGlvID0gbmV3IEF1ZGlvKCk7XG4gICAgY3R4LmF1ZGlvLnNyYyA9IGN0eC5zb25nc1tjdHguaW5kZXhdLnNyYztcbiAgICBjdHguYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLnRpbWUpO1xuICAgIGN0eC5hdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGxpc3RlbmVyLmVuZCk7XG4gICAgLy8gY3R4LmF1ZGlvLnZvbHVtZSA9IDA7XG4gICAgbW9kdWxlLmV4cG9ydHMuc2V0Vm9sdW1lKCk7XG4gICAgYW5hbHl6ZShjdHguYXVkaW8pO1xufTtcblxudmFyIGxpc3RlbmVyID0ge1xuICAgIHRpbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3VycmVudCA9IGN0eC5hdWRpby5jdXJyZW50VGltZSB8fMKgMDtcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gY3R4LmF1ZGlvLmR1cmF0aW9uIHx8wqAwO1xuICAgICAgICB2YXIgdGltZXMgPSB7XG4gICAgICAgICAgICBjdXJyZW50OiB7XG4gICAgICAgICAgICAgICAgc2Vjb25kczogKE1hdGguZmxvb3IoY3VycmVudCAlIDYwICkgPCAxMCA/ICcwJyA6ICcnKSArIE1hdGguZmxvb3IoY3VycmVudCAlIDYwKSxcbiAgICAgICAgICAgICAgICBtaW51dGVzOiBNYXRoLmZsb29yKGN1cnJlbnQgLyA2MCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHVyYXRpb246IHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzOiAoTWF0aC5mbG9vcihkdXJhdGlvbiAlIDYwICkgPCAxMCA/ICcwJyA6ICcnKSArIE1hdGguZmxvb3IoZHVyYXRpb24gJSA2MCksXG4gICAgICAgICAgICAgICAgbWludXRlczogTWF0aC5mbG9vcihkdXJhdGlvbiAvIDYwKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0aW1lcy5jdXJyZW50LnRleHQgPSB0aW1lcy5jdXJyZW50Lm1pbnV0ZXMgKyBcIjpcIiArIHRpbWVzLmN1cnJlbnQuc2Vjb25kcztcbiAgICAgICAgdGltZXMuZHVyYXRpb24udGV4dCA9IHRpbWVzLmR1cmF0aW9uLm1pbnV0ZXMgKyBcIjpcIiArIHRpbWVzLmR1cmF0aW9uLnNlY29uZHM7XG5cbiAgICAgICAgdWkudGltZSh0aW1lcyk7XG4gICAgICAgIGN0eC5ldmVudHMudGltZSh0aW1lcyk7XG4gICAgICAgIHJldHVybiB0aW1lcztcbiAgICB9LFxuXG4gICAgZW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGN0eC5sb29wKSB7XG4gICAgICAgICAgICBtb2R1bGUuZXhwb3J0cy5uZXh0KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZmFkZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0aW1lcyA9IGxpc3RlbmVyLnRpbWUoKTtcbiAgICAgICAgdmFyIGZhZGVJbkVuZCA9IE1hdGgubWluKGN0eC5mYWRlLCB0aGlzLmR1cmF0aW9uIC0gY3R4LmZhZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lIDwgZmFkZUluRW5kKSB7XG4gICAgICAgICAgICAvLyBGYWRlIGluXG4gICAgICAgICAgICB0aGlzLnZvbHVtZSA9ICgoMSAtIChmYWRlSW5FbmQgLSB0aGlzLmN1cnJlbnRUaW1lKSAvIGZhZGVJbkVuZCkgKiBjdHgudm9sdW1lKSAvIDEwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lICsgY3R4LmZhZGUgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBpZiAodGhpcyA9PSBjdHguYXVkaW8pIHtcbiAgICAgICAgICAgICAgICBtb2R1bGUuZXhwb3J0cy5uZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGYWRlIG91dFxuICAgICAgICAgICAgdGhpcy52b2x1bWUgPSAoKHRoaXMuZHVyYXRpb24gLSB0aGlzLmN1cnJlbnRUaW1lKSAvIGN0eC5mYWRlICogY3R4LnZvbHVtZSkgLyAxMDA7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiXG52YXIgY3R4ID0ge1xuICAgIGNhbnZhczogbnVsbCxcbiAgICBjdHgyZDogbnVsbCxcbiAgICB3aWRodDogbnVsbCxcbiAgICBoZWlnaHQ6IG51bGwsXG4gICAgcXVhcnRlckhlaWdodDogbnVsbCxcbiAgICBzY2FsaW5nOiBudWxsLFxuICAgIHNhbXBsaW5nOiA1LFxuICAgIG1pbjogMTM0ICAvLyAxMjggPT0gemVyby4gIG1pbiBpcyB0aGUgXCJtaW5pbXVtIGRldGVjdGVkIHNpZ25hbFwiIGxldmVsLlxufTtcblxubW9kdWxlLmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGN0eC5jYW52YXMgPSBjYW52YXM7XG4gICAgY3R4LmN0eDJkID0gY2FudmFzLmdldCgwKS5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGN0eC53aWR0aCA9IGNhbnZhcy5hdHRyKCd3aWR0aCcpO1xuICAgIGN0eC5oZWlnaHQgPSBjYW52YXMuYXR0cignaGVpZ2h0Jyk7XG4gICAgY3R4LnF1YXJ0ZXJIZWlnaHQgPSBjdHguaGVpZ2h0IC8gNDtcbiAgICBjdHguc2NhbGluZyA9IGN0eC5oZWlnaHQgLyAyNTY7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIGN0eC5jYW52YXMuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgY3R4LmNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmRyYXcgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGN0eC5jdHgyZC5saW5lV2lkdGggPSAzO1xuICAgIGN0eC5jdHgyZC5zdHJva2VTdHlsZSA9IFwid2hpdGVcIjtcblxuICAgIGN0eC5jdHgyZC5iZWdpblBhdGgoKTtcbiAgICBjdHguY3R4MmQuY2xlYXJSZWN0KDAsIDAsIGN0eC53aWR0aCwgY3R4LmhlaWdodCk7XG5cbiAgICB2YXIgemVyb0Nyb3NzID0gZmluZEZpcnN0UG9zaXRpdmVaZXJvQ3Jvc3NpbmcoZGF0YSwgY3R4LndpZHRoKTtcblxuICAgIGN0eC5jdHgyZC5tb3ZlVG8oMCwgKDI1NiAtIGRhdGFbemVyb0Nyb3NzXSkgKiBjdHguc2NhbGluZyk7XG4gICAgZm9yICh2YXIgaSA9IHplcm9Dcm9zcywgaiA9IDA7IChqIDwgY3R4LndpZHRoKSAmJiAoaSA8IGRhdGEubGVuZ3RoKTsgaSArPSBjdHguc2FtcGxpbmcsIGorKykge1xuICAgICAgICBjdHguY3R4MmQubGluZVRvKGogKiBjdHguc2FtcGxpbmcsICgyNTYgLSBkYXRhW2ldKSAqIGN0eC5zY2FsaW5nKTtcbiAgICB9XG4gICAgY3R4LmN0eDJkLnN0cm9rZSgpO1xufTtcblxudmFyIGZpbmRGaXJzdFBvc2l0aXZlWmVyb0Nyb3NzaW5nID0gZnVuY3Rpb24gKGJ1ZiwgYnVmbGVuKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBsYXN0X3plcm8gPSAtMTtcbiAgICB2YXIgdDtcblxuICAgIC8vIGFkdmFuY2UgdW50aWwgd2UncmUgemVybyBvciBuZWdhdGl2ZVxuICAgIHdoaWxlIChpIDwgYnVmbGVuICYmIChidWZbaV0gPiAxMjggKSApIHtcbiAgICAgICAgaSsrO1xuICAgIH1cblxuICAgIGlmIChpID49IGJ1Zmxlbil7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIC8vIGFkdmFuY2UgdW50aWwgd2UncmUgYWJvdmUgbWluLCBrZWVwaW5nIHRyYWNrIG9mIGxhc3QgemVyby5cbiAgICB3aGlsZSAoaSA8IGJ1ZmxlbiAmJiAoKHQgPSBidWZbaV0pIDwgY3R4Lm1pbiApKSB7XG4gICAgICAgIGlmICh0ID49IDEyOCkge1xuICAgICAgICAgICAgaWYgKGxhc3RfemVybyA9PSAtMSkge1xuICAgICAgICAgICAgICAgIGxhc3RfemVybyA9IGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsYXN0X3plcm8gPSAtMTtcbiAgICAgICAgfVxuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgLy8gd2UgbWF5IGhhdmUganVtcGVkIG92ZXIgbWluIGluIG9uZSBzYW1wbGUuXG4gICAgaWYgKGxhc3RfemVybyA9PSAtMSkge1xuICAgICAgICBsYXN0X3plcm8gPSBpO1xuICAgIH1cblxuICAgIGlmIChpPT1idWZsZW4pIHsgLy8gV2UgZGlkbid0IGZpbmQgYW55IHBvc2l0aXZlIHplcm8gY3Jvc3NpbmdzXG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIC8vIFRoZSBmaXJzdCBzYW1wbGUgbWlnaHQgYmUgYSB6ZXJvLiAgSWYgc28sIHJldHVybiBpdC5cbiAgICBpZiAobGFzdF96ZXJvID09PSAwKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIHJldHVybiBsYXN0X3plcm87XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBjb3JlID0gcmVxdWlyZShcIi4vY29yZVwiKTtcbnZhciBvc2NpbGxvID0gcmVxdWlyZSgnLi9vc2NpbGxvJyk7XG5cbnZhciBlbGVtZW50cyA9IHtcbiAgICB0aXRsZTogbnVsbCxcbiAgICBhcnR3b3JrOiBudWxsLFxuXG4gICAgcGxheTogbnVsbCxcbiAgICBuZXh0OiBudWxsLFxuICAgIHByZXY6IG51bGwsXG4gICAgc3RvcDogbnVsbCxcblxuICAgIHZvbHVtZTogbnVsbCxcbiAgICBtdXRlOiBudWxsLFxuXG4gICAgdGltZTogbnVsbFxufTtcblxubW9kdWxlLmV4cG9ydHMuZGlzY292ZXIgPSBmdW5jdGlvbihpZCkge1xuICAgIGlkID0gaWQgfHwgXCIjcGxheWVyXCI7XG5cbiAgICB3aW5kb3cuJC5lYWNoKGVsZW1lbnRzLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIGVsZW1lbnRzW2tleV0gPSB3aW5kb3cuJChpZCArIFwiIC5cIiArIGtleSk7XG4gICAgfSk7XG5cbiAgICBlbGVtZW50cy5hcnR3b3JrLmNzcyh7XG4gICAgICAgIFwicG9zaXRpb25cIjogXCJyZWxhdGl2ZVwiLFxuICAgICAgICBcImJhY2tncm91bmQtc2l6ZVwiOiBcImNvdmVyXCIsXG4gICAgICAgIFwiYmFja2dyb3VuZC1wb3NpdGlvblwiOiBcIjUwJSA1MCVcIixcbiAgICB9KTtcblxuICAgIGVsZW1lbnRzLnBsYXkuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChjb3JlLmlzUGxheWluZygpKSB7XG4gICAgICAgICAgICBjb3JlLnBhdXNlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb3JlLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZWxlbWVudHMubmV4dC5jbGljayhjb3JlLm5leHQpO1xuICAgIGVsZW1lbnRzLnByZXYuY2xpY2soY29yZS5wcmV2KTtcblxuICAgIGVsZW1lbnRzLm9zY2lsbG8gPSB3aW5kb3cuJCgnPGNhbnZhcz4nKVxuICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICAgICAnZGlzcGxheSc6ICdub25lJyxcbiAgICAgICAgICAgICd0b3AnOiAnMHB4JyxcbiAgICAgICAgICAgICdsZWZ0JzogJzBweCcsXG4gICAgICAgICAgICAnd2lkdGgnOiAgZWxlbWVudHMuYXJ0d29yay53aWR0aCgpICsgJ3B4JyxcbiAgICAgICAgICAgICdoZWlnaHQnOiBlbGVtZW50cy5hcnR3b3JrLmhlaWdodCgpICsgJ3B4J1xuICAgICAgICB9KVxuICAgICAgICAuYXR0cignd2lkdGgnLCBlbGVtZW50cy5hcnR3b3JrLndpZHRoKCkpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCBlbGVtZW50cy5hcnR3b3JrLmhlaWdodCgpKTtcbiAgICBlbGVtZW50cy5hcnR3b3JrLnByZXBlbmQoZWxlbWVudHMub3NjaWxsbyk7XG4gICAgb3NjaWxsby5pbml0KGVsZW1lbnRzLm9zY2lsbG8pO1xufTtcblxubW9kdWxlLmV4cG9ydHMudXBkYXRlID0gZnVuY3Rpb24oc29uZykge1xuICAgIGVsZW1lbnRzLnRpdGxlLnRleHQoc29uZy50aXRsZSk7XG4gICAgZWxlbWVudHMuYXJ0d29yay5jc3MoXCJiYWNrZ3JvdW5kLWltYWdlXCIsIFwidXJsKFwiICsgc29uZy5hcnR3b3JrICsgXCIpXCIpO1xuICAgIGlmIChjb3JlLmlzUGxheWluZygpKSB7XG4gICAgICAgIGVsZW1lbnRzLnBsYXkucmVtb3ZlQ2xhc3MoJ2ZhLXBsYXknKS5hZGRDbGFzcygnZmEtcGF1c2UnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50cy5wbGF5LnJlbW92ZUNsYXNzKCdmYS1wYXVzZScpLmFkZENsYXNzKCdmYS1wbGF5Jyk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMudGltZSA9IGZ1bmN0aW9uKHRpbWVzKSB7XG4gICAgZWxlbWVudHMudGltZS5maW5kKCcuY3VycmVudCcpLnRleHQodGltZXMuY3VycmVudC50ZXh0KTtcbiAgICBlbGVtZW50cy50aW1lLmZpbmQoJy5kdXJhdGlvbicpLnRleHQodGltZXMuZHVyYXRpb24udGV4dCk7XG59O1xuIl19
