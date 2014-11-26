/*! playlist.js v0.0.1 - MIT license 
2014-11-26 - Florent Solt */

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

var analyze = function() {
    ctx.analyser.getByteTimeDomainData(ctx.data);
    oscillo.draw(ctx.data);
    requestAnimationFrame(analyze);
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
    if (ctx.oscillo) {
        ctx.source = audioContext.createMediaElementSource(ctx.audio);
        ctx.analyser = audioContext.createAnalyser();
        ctx.data = new Uint8Array(ctx.analyser.frequencyBinCount);
        ctx.source.connect(ctx.analyser);
        ctx.source.connect(audioContext.destination);
    }
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
    min: 134  // 128 == zero.  min is the "minimum detected signal" level.
};

module.exports.init = function(canvas) {
    ctx.canvas = canvas.get(0);
    ctx.ctx2d = ctx.canvas.getContext('2d');
    ctx.width = canvas.attr('width');
    ctx.height = canvas.attr('height');
    ctx.quarterHeight = ctx.height / 4;
    ctx.scaling = ctx.height / 256;
};

module.exports.draw = function (data) {
    ctx.ctx2d.clearRect (0, 0, ctx.width, ctx.height);
    ctx.ctx2d.lineWidth = 3;
    ctx.ctx2d.strokeStyle = "white";

    ctx.ctx2d.beginPath();

    var zeroCross = findFirstPositiveZeroCrossing(data, ctx.width);

    ctx.ctx2d.moveTo(0, (256 - data[zeroCross]) * ctx.scaling);
    for (var i = zeroCross, j = 0; (j < ctx.width) && (i < data.length); i++, j++) {
        ctx.ctx2d.lineTo(j, (256 - data[i]) * ctx.scaling);
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
        .attr('width', elements.artwork.width())
        .attr('height', elements.artwork.height());
    elements.artwork.append(elements.oscillo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYnJvd3Nlci5qcyIsInNyYy9jb3JlLmpzIiwic3JjL29zY2lsbG8uanMiLCJzcmMvdWkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LlBsYXlsaXN0ID0gcmVxdWlyZSgnLi9jb3JlJyk7XG5cbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG53aW5kb3cuJChmdW5jdGlvbigpIHtcbiAgICBQbGF5bGlzdC51aS5kaXNjb3ZlcigpO1xufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIC0tLS0tLS0tLSBWYXJzIC0tLS0tLS0tLSAqL1xuXG52YXIgdWkgPSBtb2R1bGUuZXhwb3J0cy51aSA9IHJlcXVpcmUoJy4vdWknKTtcbnZhciBvc2NpbGxvID0gcmVxdWlyZSgnLi9vc2NpbGxvJyk7XG5cbnZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcblxudmFyIGN0eCA9IHtcbiAgICBpbmRleDogMCxcbiAgICBhdWRpbzogbnVsbCxcbiAgICB2b2x1bWU6IDEwMCxcblxuICAgIGZhZGU6IDUsXG5cbiAgICBjdXJyZW50QnVmZmVyOiBudWxsLFxuICAgIG5leHRCdWZmZXI6IG51bGwsXG5cbiAgICBzb25nczogW10sXG4gICAgbG9vcDogdHJ1ZSxcblxuICAgIG9zY2lsbG86IGZhbHNlLFxuXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIHBsYXk6IG5vb3AsXG4gICAgICAgIHBhdXNlOiBub29wLFxuICAgICAgICBzdG9wOiBub29wLFxuICAgICAgICBtdXRlOiBub29wLFxuICAgICAgICB1bm11dGU6IG5vb3AsXG4gICAgICAgIG5leHQ6IG5vb3AsXG4gICAgICAgIHByZXY6IG5vb3AsXG4gICAgICAgIHRpbWU6IG5vb3BcbiAgICB9XG59O1xuXG52YXIgYXVkaW9Db250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKTtcblxuLyogLS0tLS0tLS0tIFB1YmxpYyAtLS0tLS0tLS0gKi9cblxubW9kdWxlLmV4cG9ydHMuc2V0U29uZ3MgPSBmdW5jdGlvbihzb25ncykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHNvbmdzKSkge1xuICAgICAgICBzb25ncy5mb3JFYWNoKGZ1bmN0aW9uKHNvbmcpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc29uZy5zcmMgPT0gXCJzdHJpbmdcIiAmJiB0eXBlb2Ygc29uZy50aXRsZSA9PSBcInN0cmluZ1wiICYmIHR5cGVvZiBzb25nLmFydHdvcmsgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIGN0eC5zb25ncy5wdXNoKHNvbmcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkludmFsaWQgc29uZyAoc3JjLCB0aXRsZSBvciBhcnR3b3JrIHByb3BlcnR5IG1pc3Npbmcgb3IgaW52YWxpZCkuXCIsIHNvbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBsYXlsaXN0LnNldFNvbmdzIG9ubHkgYWNjZXQgYXJyYXkgb2Ygc29uZ3MuXCIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLm9uID0gZnVuY3Rpb24oZXZlbnQsIGNiKSB7XG4gICAgaWYgKHR5cGVvZiBjYiA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgaWYgKGN0eC5ldmVudHNbZXZlbnRdKSB7XG4gICAgICAgICAgICBjdHguZXZlbnRzW2V2ZW50XSA9IGNiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbmtub3duIGV2ZW50OiBcIiArIGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUGxheWxpc3Qub24gbmVlZHMgYSBmdW5jaXRvbiBhcyAybmQgYXJndW1lbnQuXCIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmdldFNvbmdzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuKGN0eC5zb25ncyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRPc2NpbGxvID0gZnVuY3Rpb24oYm9vbCkge1xuICAgIGN0eC5vc2NpbGxvID0gISFib29sO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2V0Vm9sdW1lID0gZnVuY3Rpb24gKHZvbHVtZSkge1xuICAgIHZvbHVtZSA9IHZvbHVtZSB8fCBjdHgudm9sdW1lO1xuICAgIGlmICh0eXBlb2Ygdm9sdW1lID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgaWYgKHZvbHVtZSA+PSAwICYmIHZvbHVtZSA8PSAxMDApIHtcbiAgICAgICAgICAgIGN0eC52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBpZiAoY3R4LmF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgY3R4LmF1ZGlvLnZvbHVtZSA9IHZvbHVtZSAvIDEwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVm9sdW1lIHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kIDEwMC5cIik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkludmFsaWQgaW5kZXguXCIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmlzUGxheWluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIWN0eC5hdWRpby5wYXVzZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wbGF5ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghY3R4LmF1ZGlvKSB7XG4gICAgICAgIGN0eC5pbmRleCA9IC0xO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5uZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmF1ZGlvLnBsYXkoKTtcbiAgICAgICAgdWkudXBkYXRlKGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICAgICAgY3R4LmV2ZW50cy5wbGF5KGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICAgICAgaWYgKGN0eC5vc2NpbGxvKSB7XG4gICAgICAgICAgICBhbmFseXplKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIGN0eC5hdWRpby5jdXJyZW50VGltZSA9IDA7XG4gICAgY3R4LmV2ZW50cy5zdG9wKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICB1aS51cGRhdGUoY3R4LnNvbmdzW2N0eC5pbmRleF0pO1xuICAgIGN0eC5ldmVudHMucGF1c2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLm5leHQgID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjdHguYXV0aW8pIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIGlmIChjdHgubG9vcCkge1xuICAgICAgICBzZXRJbmRleCgoY3R4LmluZGV4ICsgMSkgJSBjdHguc29uZ3MubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKGN0eC5pbmRleCArIDEgPCBjdHguc29uZ3MubGVuZ3RoKSB7XG4gICAgICAgIHNldEluZGV4KGN0eC5pbmRleCArIDEpO1xuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cy5wbGF5KCk7XG4gICAgY3R4LmV2ZW50cy5uZXh0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wcmV2ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjdHgubG9vcCkge1xuICAgICAgICBzZXRJbmRleCgoY3R4LnNvbmdzLmxlbmd0aCArIGN0eC5pbmRleCAtIDEpICUgY3R4LnNvbmdzLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmIChjdHguaW5kZXggLSAxID49IDApIHtcbiAgICAgICAgc2V0SW5kZXgoY3R4LmluZGV4IC0gMSk7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzLnBsYXkoKTtcbiAgICBjdHguZXZlbnRzLnByZXYoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNodWZmbGUgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBqLCB4LCBpID0gY3R4LnNvbmdzLmxlbmd0aDsgaTtcbiAgICAgICAgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpLFxuICAgICAgICB4ID0gY3R4LnNvbmdzWy0taV0sXG4gICAgICAgIGN0eC5zb25nc1tpXSA9IGN0eC5zb25nc1tqXSxcbiAgICAgICAgY3R4LnNvbmdzW2pdID0geCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRMb29wID0gZnVuY3Rpb24oYm9vbCkge1xuICAgIGN0eC5sb29wID0gISFib29sO1xufTtcblxuLyogLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tICovXG5cbnZhciBhbmFseXplID0gZnVuY3Rpb24oKSB7XG4gICAgY3R4LmFuYWx5c2VyLmdldEJ5dGVUaW1lRG9tYWluRGF0YShjdHguZGF0YSk7XG4gICAgb3NjaWxsby5kcmF3KGN0eC5kYXRhKTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5hbHl6ZSk7XG59O1xuXG52YXIgc2V0SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGN0eC5pbmRleCA9IGluZGV4O1xuICAgIGlmIChjdHguYXVkaW8pIHtcbiAgICAgICAgLy8gY3R4LmF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBsaXN0ZW5lci5mYWRlKTtcbiAgICAgICAgY3R4LmF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBsaXN0ZW5lci50aW1lKTtcbiAgICAgICAgY3R4LmF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgbGlzdGVuZXIuZW5kKTtcbiAgICAgICAgY3R4LmF1ZGlvLnBhdXNlKCk7XG4gICAgfVxuICAgIGN0eC5hdWRpbyA9IG5ldyBBdWRpbygpO1xuICAgIGN0eC5hdWRpby5zcmMgPSBjdHguc29uZ3NbY3R4LmluZGV4XS5zcmM7XG4gICAgY3R4LmF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBsaXN0ZW5lci50aW1lKTtcbiAgICBjdHguYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBsaXN0ZW5lci5lbmQpO1xuICAgIC8vIGN0eC5hdWRpby52b2x1bWUgPSAwO1xuICAgIG1vZHVsZS5leHBvcnRzLnNldFZvbHVtZSgpO1xuICAgIGlmIChjdHgub3NjaWxsbykge1xuICAgICAgICBjdHguc291cmNlID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZShjdHguYXVkaW8pO1xuICAgICAgICBjdHguYW5hbHlzZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgY3R4LmRhdGEgPSBuZXcgVWludDhBcnJheShjdHguYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICBjdHguc291cmNlLmNvbm5lY3QoY3R4LmFuYWx5c2VyKTtcbiAgICAgICAgY3R4LnNvdXJjZS5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxufTtcblxudmFyIGxpc3RlbmVyID0ge1xuICAgIHRpbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3VycmVudCA9IGN0eC5hdWRpby5jdXJyZW50VGltZSB8fMKgMDtcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gY3R4LmF1ZGlvLmR1cmF0aW9uIHx8wqAwO1xuICAgICAgICB2YXIgdGltZXMgPSB7XG4gICAgICAgICAgICBjdXJyZW50OiB7XG4gICAgICAgICAgICAgICAgc2Vjb25kczogKE1hdGguZmxvb3IoY3VycmVudCAlIDYwICkgPCAxMCA/ICcwJyA6ICcnKSArIE1hdGguZmxvb3IoY3VycmVudCAlIDYwKSxcbiAgICAgICAgICAgICAgICBtaW51dGVzOiBNYXRoLmZsb29yKGN1cnJlbnQgLyA2MCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHVyYXRpb246IHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzOiAoTWF0aC5mbG9vcihkdXJhdGlvbiAlIDYwICkgPCAxMCA/ICcwJyA6ICcnKSArIE1hdGguZmxvb3IoZHVyYXRpb24gJSA2MCksXG4gICAgICAgICAgICAgICAgbWludXRlczogTWF0aC5mbG9vcihkdXJhdGlvbiAvIDYwKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0aW1lcy5jdXJyZW50LnRleHQgPSB0aW1lcy5jdXJyZW50Lm1pbnV0ZXMgKyBcIjpcIiArIHRpbWVzLmN1cnJlbnQuc2Vjb25kcztcbiAgICAgICAgdGltZXMuZHVyYXRpb24udGV4dCA9IHRpbWVzLmR1cmF0aW9uLm1pbnV0ZXMgKyBcIjpcIiArIHRpbWVzLmR1cmF0aW9uLnNlY29uZHM7XG5cbiAgICAgICAgdWkudGltZSh0aW1lcyk7XG4gICAgICAgIGN0eC5ldmVudHMudGltZSh0aW1lcyk7XG4gICAgICAgIHJldHVybiB0aW1lcztcbiAgICB9LFxuXG4gICAgZW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGN0eC5sb29wKSB7XG4gICAgICAgICAgICBtb2R1bGUuZXhwb3J0cy5uZXh0KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZmFkZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0aW1lcyA9IGxpc3RlbmVyLnRpbWUoKTtcbiAgICAgICAgdmFyIGZhZGVJbkVuZCA9IE1hdGgubWluKGN0eC5mYWRlLCB0aGlzLmR1cmF0aW9uIC0gY3R4LmZhZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lIDwgZmFkZUluRW5kKSB7XG4gICAgICAgICAgICAvLyBGYWRlIGluXG4gICAgICAgICAgICB0aGlzLnZvbHVtZSA9ICgoMSAtIChmYWRlSW5FbmQgLSB0aGlzLmN1cnJlbnRUaW1lKSAvIGZhZGVJbkVuZCkgKiBjdHgudm9sdW1lKSAvIDEwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lICsgY3R4LmZhZGUgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBpZiAodGhpcyA9PSBjdHguYXVkaW8pIHtcbiAgICAgICAgICAgICAgICBtb2R1bGUuZXhwb3J0cy5uZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGYWRlIG91dFxuICAgICAgICAgICAgdGhpcy52b2x1bWUgPSAoKHRoaXMuZHVyYXRpb24gLSB0aGlzLmN1cnJlbnRUaW1lKSAvIGN0eC5mYWRlICogY3R4LnZvbHVtZSkgLyAxMDA7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiXG52YXIgY3R4ID0ge1xuICAgIGNhbnZhczogbnVsbCxcbiAgICBjdHgyZDogbnVsbCxcbiAgICB3aWRodDogbnVsbCxcbiAgICBoZWlnaHQ6IG51bGwsXG4gICAgcXVhcnRlckhlaWdodDogbnVsbCxcbiAgICBzY2FsaW5nOiBudWxsLFxuICAgIG1pbjogMTM0ICAvLyAxMjggPT0gemVyby4gIG1pbiBpcyB0aGUgXCJtaW5pbXVtIGRldGVjdGVkIHNpZ25hbFwiIGxldmVsLlxufTtcblxubW9kdWxlLmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGN0eC5jYW52YXMgPSBjYW52YXMuZ2V0KDApO1xuICAgIGN0eC5jdHgyZCA9IGN0eC5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHgud2lkdGggPSBjYW52YXMuYXR0cignd2lkdGgnKTtcbiAgICBjdHguaGVpZ2h0ID0gY2FudmFzLmF0dHIoJ2hlaWdodCcpO1xuICAgIGN0eC5xdWFydGVySGVpZ2h0ID0gY3R4LmhlaWdodCAvIDQ7XG4gICAgY3R4LnNjYWxpbmcgPSBjdHguaGVpZ2h0IC8gMjU2O1xufTtcblxubW9kdWxlLmV4cG9ydHMuZHJhdyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgY3R4LmN0eDJkLmNsZWFyUmVjdCAoMCwgMCwgY3R4LndpZHRoLCBjdHguaGVpZ2h0KTtcbiAgICBjdHguY3R4MmQubGluZVdpZHRoID0gMztcbiAgICBjdHguY3R4MmQuc3Ryb2tlU3R5bGUgPSBcIndoaXRlXCI7XG5cbiAgICBjdHguY3R4MmQuYmVnaW5QYXRoKCk7XG5cbiAgICB2YXIgemVyb0Nyb3NzID0gZmluZEZpcnN0UG9zaXRpdmVaZXJvQ3Jvc3NpbmcoZGF0YSwgY3R4LndpZHRoKTtcblxuICAgIGN0eC5jdHgyZC5tb3ZlVG8oMCwgKDI1NiAtIGRhdGFbemVyb0Nyb3NzXSkgKiBjdHguc2NhbGluZyk7XG4gICAgZm9yICh2YXIgaSA9IHplcm9Dcm9zcywgaiA9IDA7IChqIDwgY3R4LndpZHRoKSAmJiAoaSA8IGRhdGEubGVuZ3RoKTsgaSsrLCBqKyspIHtcbiAgICAgICAgY3R4LmN0eDJkLmxpbmVUbyhqLCAoMjU2IC0gZGF0YVtpXSkgKiBjdHguc2NhbGluZyk7XG4gICAgfVxuICAgIGN0eC5jdHgyZC5zdHJva2UoKTtcbn07XG5cbnZhciBmaW5kRmlyc3RQb3NpdGl2ZVplcm9Dcm9zc2luZyA9IGZ1bmN0aW9uIChidWYsIGJ1Zmxlbikge1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGFzdF96ZXJvID0gLTE7XG4gICAgdmFyIHQ7XG5cbiAgICAvLyBhZHZhbmNlIHVudGlsIHdlJ3JlIHplcm8gb3IgbmVnYXRpdmVcbiAgICB3aGlsZSAoaSA8IGJ1ZmxlbiAmJiAoYnVmW2ldID4gMTI4ICkgKSB7XG4gICAgICAgIGkrKztcbiAgICB9XG5cbiAgICBpZiAoaSA+PSBidWZsZW4pe1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICAvLyBhZHZhbmNlIHVudGlsIHdlJ3JlIGFib3ZlIG1pbiwga2VlcGluZyB0cmFjayBvZiBsYXN0IHplcm8uXG4gICAgd2hpbGUgKGkgPCBidWZsZW4gJiYgKCh0ID0gYnVmW2ldKSA8IGN0eC5taW4gKSkge1xuICAgICAgICBpZiAodCA+PSAxMjgpIHtcbiAgICAgICAgICAgIGlmIChsYXN0X3plcm8gPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBsYXN0X3plcm8gPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGFzdF96ZXJvID0gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaSsrO1xuICAgIH1cblxuICAgIC8vIHdlIG1heSBoYXZlIGp1bXBlZCBvdmVyIG1pbiBpbiBvbmUgc2FtcGxlLlxuICAgIGlmIChsYXN0X3plcm8gPT0gLTEpIHtcbiAgICAgICAgbGFzdF96ZXJvID0gaTtcbiAgICB9XG5cbiAgICBpZiAoaT09YnVmbGVuKSB7IC8vIFdlIGRpZG4ndCBmaW5kIGFueSBwb3NpdGl2ZSB6ZXJvIGNyb3NzaW5nc1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICAvLyBUaGUgZmlyc3Qgc2FtcGxlIG1pZ2h0IGJlIGEgemVyby4gIElmIHNvLCByZXR1cm4gaXQuXG4gICAgaWYgKGxhc3RfemVybyA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gbGFzdF96ZXJvO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY29yZSA9IHJlcXVpcmUoXCIuL2NvcmVcIik7XG52YXIgb3NjaWxsbyA9IHJlcXVpcmUoJy4vb3NjaWxsbycpO1xuXG52YXIgZWxlbWVudHMgPSB7XG4gICAgdGl0bGU6IG51bGwsXG4gICAgYXJ0d29yazogbnVsbCxcblxuICAgIHBsYXk6IG51bGwsXG4gICAgbmV4dDogbnVsbCxcbiAgICBwcmV2OiBudWxsLFxuICAgIHN0b3A6IG51bGwsXG5cbiAgICB2b2x1bWU6IG51bGwsXG4gICAgbXV0ZTogbnVsbCxcblxuICAgIHRpbWU6IG51bGxcbn07XG5cbm1vZHVsZS5leHBvcnRzLmRpc2NvdmVyID0gZnVuY3Rpb24oaWQpIHtcbiAgICBpZCA9IGlkIHx8IFwiI3BsYXllclwiO1xuXG4gICAgd2luZG93LiQuZWFjaChlbGVtZW50cywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICBlbGVtZW50c1trZXldID0gd2luZG93LiQoaWQgKyBcIiAuXCIgKyBrZXkpO1xuICAgIH0pO1xuXG4gICAgZWxlbWVudHMuYXJ0d29yay5jc3Moe1xuICAgICAgICBcImJhY2tncm91bmQtc2l6ZVwiOiBcImNvdmVyXCIsXG4gICAgICAgIFwiYmFja2dyb3VuZC1wb3NpdGlvblwiOiBcIjUwJSA1MCVcIixcbiAgICB9KTtcblxuICAgIGVsZW1lbnRzLnBsYXkuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChjb3JlLmlzUGxheWluZygpKSB7XG4gICAgICAgICAgICBjb3JlLnBhdXNlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb3JlLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZWxlbWVudHMubmV4dC5jbGljayhjb3JlLm5leHQpO1xuICAgIGVsZW1lbnRzLnByZXYuY2xpY2soY29yZS5wcmV2KTtcblxuICAgIGVsZW1lbnRzLm9zY2lsbG8gPSB3aW5kb3cuJCgnPGNhbnZhcz4nKVxuICAgICAgICAuYXR0cignd2lkdGgnLCBlbGVtZW50cy5hcnR3b3JrLndpZHRoKCkpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCBlbGVtZW50cy5hcnR3b3JrLmhlaWdodCgpKTtcbiAgICBlbGVtZW50cy5hcnR3b3JrLmFwcGVuZChlbGVtZW50cy5vc2NpbGxvKTtcbiAgICBvc2NpbGxvLmluaXQoZWxlbWVudHMub3NjaWxsbyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy51cGRhdGUgPSBmdW5jdGlvbihzb25nKSB7XG4gICAgZWxlbWVudHMudGl0bGUudGV4dChzb25nLnRpdGxlKTtcbiAgICBlbGVtZW50cy5hcnR3b3JrLmNzcyhcImJhY2tncm91bmQtaW1hZ2VcIiwgXCJ1cmwoXCIgKyBzb25nLmFydHdvcmsgKyBcIilcIik7XG4gICAgaWYgKGNvcmUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgZWxlbWVudHMucGxheS5yZW1vdmVDbGFzcygnZmEtcGxheScpLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnRzLnBsYXkucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJykuYWRkQ2xhc3MoJ2ZhLXBsYXknKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50aW1lID0gZnVuY3Rpb24odGltZXMpIHtcbiAgICBlbGVtZW50cy50aW1lLmZpbmQoJy5jdXJyZW50JykudGV4dCh0aW1lcy5jdXJyZW50LnRleHQpO1xuICAgIGVsZW1lbnRzLnRpbWUuZmluZCgnLmR1cmF0aW9uJykudGV4dCh0aW1lcy5kdXJhdGlvbi50ZXh0KTtcbn07XG4iXX0=
