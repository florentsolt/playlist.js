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

var analyze = function() {
    if (module.exports.isPlaying()) {
        ctx.analyser.getByteTimeDomainData(ctx.data);
        oscillo.draw(ctx.data);
        // requestAnimationFrame(analyze);
    }
    return true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYnJvd3Nlci5qcyIsInNyYy9jb3JlLmpzIiwic3JjL29zY2lsbG8uanMiLCJzcmMvdWkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuUGxheWxpc3QgPSByZXF1aXJlKCcuL2NvcmUnKTtcblxud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cbndpbmRvdy4kKGZ1bmN0aW9uKCkge1xuICAgIFBsYXlsaXN0LnVpLmRpc2NvdmVyKCk7XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogLS0tLS0tLS0tIFZhcnMgLS0tLS0tLS0tICovXG5cbnZhciB1aSA9IG1vZHVsZS5leHBvcnRzLnVpID0gcmVxdWlyZSgnLi91aScpO1xudmFyIG9zY2lsbG8gPSByZXF1aXJlKCcuL29zY2lsbG8nKTtcblxudmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuXG52YXIgY3R4ID0ge1xuICAgIGluZGV4OiAwLFxuICAgIGF1ZGlvOiBudWxsLFxuICAgIHZvbHVtZTogMTAwLFxuXG4gICAgZmFkZTogNSxcblxuICAgIGN1cnJlbnRCdWZmZXI6IG51bGwsXG4gICAgbmV4dEJ1ZmZlcjogbnVsbCxcblxuICAgIHNvbmdzOiBbXSxcbiAgICBsb29wOiB0cnVlLFxuXG4gICAgb3NjaWxsbzogZmFsc2UsXG4gICAgaW50ZXJ2YWw6IG51bGwsXG5cbiAgICBldmVudHM6IHtcbiAgICAgICAgcGxheTogbm9vcCxcbiAgICAgICAgcGF1c2U6IG5vb3AsXG4gICAgICAgIHN0b3A6IG5vb3AsXG4gICAgICAgIG11dGU6IG5vb3AsXG4gICAgICAgIHVubXV0ZTogbm9vcCxcbiAgICAgICAgbmV4dDogbm9vcCxcbiAgICAgICAgcHJldjogbm9vcCxcbiAgICAgICAgdGltZTogbm9vcFxuICAgIH1cbn07XG5cbnZhciBhdWRpb0NvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpO1xuXG4vKiAtLS0tLS0tLS0gUHVibGljIC0tLS0tLS0tLSAqL1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRTb25ncyA9IGZ1bmN0aW9uKHNvbmdzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc29uZ3MpKSB7XG4gICAgICAgIHNvbmdzLmZvckVhY2goZnVuY3Rpb24oc29uZykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb25nLnNyYyA9PSBcInN0cmluZ1wiICYmIHR5cGVvZiBzb25nLnRpdGxlID09IFwic3RyaW5nXCIgJiYgdHlwZW9mIHNvbmcuYXJ0d29yayA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgY3R4LnNvbmdzLnB1c2goc29uZyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSW52YWxpZCBzb25nIChzcmMsIHRpdGxlIG9yIGFydHdvcmsgcHJvcGVydHkgbWlzc2luZyBvciBpbnZhbGlkKS5cIiwgc29uZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUGxheWxpc3Quc2V0U29uZ3Mgb25seSBhY2NldCBhcnJheSBvZiBzb25ncy5cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMub24gPSBmdW5jdGlvbihldmVudCwgY2IpIHtcbiAgICBpZiAodHlwZW9mIGNiID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBpZiAoY3R4LmV2ZW50c1tldmVudF0pIHtcbiAgICAgICAgICAgIGN0eC5ldmVudHNbZXZlbnRdID0gY2I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gZXZlbnQ6IFwiICsgZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQbGF5bGlzdC5vbiBuZWVkcyBhIGZ1bmNpdG9uIGFzIDJuZCBhcmd1bWVudC5cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuZ2V0U29uZ3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4oY3R4LnNvbmdzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNldE9zY2lsbG8gPSBmdW5jdGlvbihib29sKSB7XG4gICAgY3R4Lm9zY2lsbG8gPSAhIWJvb2w7XG4gICAgaWYgKGN0eC5vc2NpbGxvID09PSB0cnVlICYmIGN0eC5pbnRlcnZhbCA9PT0gbnVsbCkge1xuICAgICAgICBjdHguaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoYW5hbHl6ZSwgNTApO1xuICAgICAgICBvc2NpbGxvLnNob3coKTtcbiAgICB9IGVsc2UgaWYgKGN0eC5pbnRlcnZhbCAhPT0gbnVsbCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbChjdHguaW50ZXJ2YWwpO1xuICAgICAgICBjdHguaW50ZXJ2YWwgPSBudWxsO1xuICAgICAgICBvc2NpbGxvLmhpZGUoKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5nZXRPc2NpbGxvID0gZnVuY3Rpb24oYm9vbCkge1xuICAgIHJldHVybiBjdHgub3NjaWxsbztcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNldFZvbHVtZSA9IGZ1bmN0aW9uICh2b2x1bWUpIHtcbiAgICB2b2x1bWUgPSB2b2x1bWUgfHwgY3R4LnZvbHVtZTtcbiAgICBpZiAodHlwZW9mIHZvbHVtZSA9PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGlmICh2b2x1bWUgPj0gMCAmJiB2b2x1bWUgPD0gMTAwKSB7XG4gICAgICAgICAgICBjdHgudm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgaWYgKGN0eC5hdWRpbykge1xuICAgICAgICAgICAgICAgIGN0eC5hdWRpby52b2x1bWUgPSB2b2x1bWUgLyAxMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZvbHVtZSBzaG91bGQgYmUgYmV0d2VlbiAwIGFuZCAxMDAuXCIpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJJbnZhbGlkIGluZGV4LlwiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5pc1BsYXlpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICFjdHguYXVkaW8ucGF1c2VkO1xufTtcblxubW9kdWxlLmV4cG9ydHMucGxheSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIWN0eC5hdWRpbykge1xuICAgICAgICBjdHguaW5kZXggPSAtMTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMubmV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eC5hdWRpby5wbGF5KCk7XG4gICAgICAgIHVpLnVwZGF0ZShjdHguc29uZ3NbY3R4LmluZGV4XSk7XG4gICAgICAgIGN0eC5ldmVudHMucGxheShjdHguc29uZ3NbY3R4LmluZGV4XSk7XG4gICAgICAgIGlmIChjdHgub3NjaWxsbykge1xuICAgICAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICBjdHguYXVkaW8uY3VycmVudFRpbWUgPSAwO1xuICAgIGN0eC5ldmVudHMuc3RvcCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgY3R4LmF1ZGlvLnBhdXNlKCk7XG4gICAgdWkudXBkYXRlKGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICBjdHguZXZlbnRzLnBhdXNlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5uZXh0ICA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoY3R4LmF1dGlvKSBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICBpZiAoY3R4Lmxvb3ApIHtcbiAgICAgICAgc2V0SW5kZXgoKGN0eC5pbmRleCArIDEpICUgY3R4LnNvbmdzLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmIChjdHguaW5kZXggKyAxIDwgY3R4LnNvbmdzLmxlbmd0aCkge1xuICAgICAgICBzZXRJbmRleChjdHguaW5kZXggKyAxKTtcbiAgICB9XG4gICAgbW9kdWxlLmV4cG9ydHMucGxheSgpO1xuICAgIGN0eC5ldmVudHMubmV4dCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMucHJldiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoY3R4Lmxvb3ApIHtcbiAgICAgICAgc2V0SW5kZXgoKGN0eC5zb25ncy5sZW5ndGggKyBjdHguaW5kZXggLSAxKSAlIGN0eC5zb25ncy5sZW5ndGgpO1xuICAgIH0gZWxzZSBpZiAoY3R4LmluZGV4IC0gMSA+PSAwKSB7XG4gICAgICAgIHNldEluZGV4KGN0eC5pbmRleCAtIDEpO1xuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cy5wbGF5KCk7XG4gICAgY3R4LmV2ZW50cy5wcmV2KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zaHVmZmxlID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaiwgeCwgaSA9IGN0eC5zb25ncy5sZW5ndGg7IGk7XG4gICAgICAgIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKSxcbiAgICAgICAgeCA9IGN0eC5zb25nc1stLWldLFxuICAgICAgICBjdHguc29uZ3NbaV0gPSBjdHguc29uZ3Nbal0sXG4gICAgICAgIGN0eC5zb25nc1tqXSA9IHgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2V0TG9vcCA9IGZ1bmN0aW9uKGJvb2wpIHtcbiAgICBjdHgubG9vcCA9ICEhYm9vbDtcbn07XG5cbi8qIC0tLS0tLS0tLSBQcml2YXRlIC0tLS0tLS0tLSAqL1xuXG52YXIgYW5hbHl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChtb2R1bGUuZXhwb3J0cy5pc1BsYXlpbmcoKSkge1xuICAgICAgICBjdHguYW5hbHlzZXIuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGN0eC5kYXRhKTtcbiAgICAgICAgb3NjaWxsby5kcmF3KGN0eC5kYXRhKTtcbiAgICAgICAgLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuYWx5emUpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBzZXRJbmRleCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgY3R4LmluZGV4ID0gaW5kZXg7XG4gICAgaWYgKGN0eC5hdWRpbykge1xuICAgICAgICAvLyBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLmZhZGUpO1xuICAgICAgICBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLnRpbWUpO1xuICAgICAgICBjdHguYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBsaXN0ZW5lci5lbmQpO1xuICAgICAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICB9XG4gICAgY3R4LmF1ZGlvID0gbmV3IEF1ZGlvKCk7XG4gICAgY3R4LmF1ZGlvLnNyYyA9IGN0eC5zb25nc1tjdHguaW5kZXhdLnNyYztcbiAgICBjdHguYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGxpc3RlbmVyLnRpbWUpO1xuICAgIGN0eC5hdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGxpc3RlbmVyLmVuZCk7XG4gICAgLy8gY3R4LmF1ZGlvLnZvbHVtZSA9IDA7XG4gICAgbW9kdWxlLmV4cG9ydHMuc2V0Vm9sdW1lKCk7XG4gICAgaWYgKGN0eC5vc2NpbGxvKSB7XG4gICAgICAgIGN0eC5zb3VyY2UgPSBhdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKGN0eC5hdWRpbyk7XG4gICAgICAgIGN0eC5hbmFseXNlciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICBjdHguZGF0YSA9IG5ldyBVaW50OEFycmF5KGN0eC5hbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudCk7XG4gICAgICAgIGN0eC5zb3VyY2UuY29ubmVjdChjdHguYW5hbHlzZXIpO1xuICAgICAgICBjdHguc291cmNlLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9XG59O1xuXG52YXIgbGlzdGVuZXIgPSB7XG4gICAgdGltZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gY3R4LmF1ZGlvLmN1cnJlbnRUaW1lIHx8wqAwO1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBjdHguYXVkaW8uZHVyYXRpb24gfHzCoDA7XG4gICAgICAgIHZhciB0aW1lcyA9IHtcbiAgICAgICAgICAgIGN1cnJlbnQ6IHtcbiAgICAgICAgICAgICAgICBzZWNvbmRzOiAoTWF0aC5mbG9vcihjdXJyZW50ICUgNjAgKSA8IDEwID8gJzAnIDogJycpICsgTWF0aC5mbG9vcihjdXJyZW50ICUgNjApLFxuICAgICAgICAgICAgICAgIG1pbnV0ZXM6IE1hdGguZmxvb3IoY3VycmVudCAvIDYwKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkdXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIHNlY29uZHM6IChNYXRoLmZsb29yKGR1cmF0aW9uICUgNjAgKSA8IDEwID8gJzAnIDogJycpICsgTWF0aC5mbG9vcihkdXJhdGlvbiAlIDYwKSxcbiAgICAgICAgICAgICAgICBtaW51dGVzOiBNYXRoLmZsb29yKGR1cmF0aW9uIC8gNjApXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHRpbWVzLmN1cnJlbnQudGV4dCA9IHRpbWVzLmN1cnJlbnQubWludXRlcyArIFwiOlwiICsgdGltZXMuY3VycmVudC5zZWNvbmRzO1xuICAgICAgICB0aW1lcy5kdXJhdGlvbi50ZXh0ID0gdGltZXMuZHVyYXRpb24ubWludXRlcyArIFwiOlwiICsgdGltZXMuZHVyYXRpb24uc2Vjb25kcztcblxuICAgICAgICB1aS50aW1lKHRpbWVzKTtcbiAgICAgICAgY3R4LmV2ZW50cy50aW1lKHRpbWVzKTtcbiAgICAgICAgcmV0dXJuIHRpbWVzO1xuICAgIH0sXG5cbiAgICBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY3R4Lmxvb3ApIHtcbiAgICAgICAgICAgIG1vZHVsZS5leHBvcnRzLm5leHQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBmYWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRpbWVzID0gbGlzdGVuZXIudGltZSgpO1xuICAgICAgICB2YXIgZmFkZUluRW5kID0gTWF0aC5taW4oY3R4LmZhZGUsIHRoaXMuZHVyYXRpb24gLSBjdHguZmFkZSk7XG5cbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWUgPCBmYWRlSW5FbmQpIHtcbiAgICAgICAgICAgIC8vIEZhZGUgaW5cbiAgICAgICAgICAgIHRoaXMudm9sdW1lID0gKCgxIC0gKGZhZGVJbkVuZCAtIHRoaXMuY3VycmVudFRpbWUpIC8gZmFkZUluRW5kKSAqIGN0eC52b2x1bWUpIC8gMTAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWUgKyBjdHguZmFkZSA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGlmICh0aGlzID09IGN0eC5hdWRpbykge1xuICAgICAgICAgICAgICAgIG1vZHVsZS5leHBvcnRzLm5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZhZGUgb3V0XG4gICAgICAgICAgICB0aGlzLnZvbHVtZSA9ICgodGhpcy5kdXJhdGlvbiAtIHRoaXMuY3VycmVudFRpbWUpIC8gY3R4LmZhZGUgKiBjdHgudm9sdW1lKSAvIDEwMDtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJcbnZhciBjdHggPSB7XG4gICAgY2FudmFzOiBudWxsLFxuICAgIGN0eDJkOiBudWxsLFxuICAgIHdpZGh0OiBudWxsLFxuICAgIGhlaWdodDogbnVsbCxcbiAgICBxdWFydGVySGVpZ2h0OiBudWxsLFxuICAgIHNjYWxpbmc6IG51bGwsXG4gICAgc2FtcGxpbmc6IDUsXG4gICAgbWluOiAxMzQgIC8vIDEyOCA9PSB6ZXJvLiAgbWluIGlzIHRoZSBcIm1pbmltdW0gZGV0ZWN0ZWQgc2lnbmFsXCIgbGV2ZWwuXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgY3R4LmNhbnZhcyA9IGNhbnZhcztcbiAgICBjdHguY3R4MmQgPSBjYW52YXMuZ2V0KDApLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LndpZHRoID0gY2FudmFzLmF0dHIoJ3dpZHRoJyk7XG4gICAgY3R4LmhlaWdodCA9IGNhbnZhcy5hdHRyKCdoZWlnaHQnKTtcbiAgICBjdHgucXVhcnRlckhlaWdodCA9IGN0eC5oZWlnaHQgLyA0O1xuICAgIGN0eC5zY2FsaW5nID0gY3R4LmhlaWdodCAvIDI1Njtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgY3R4LmNhbnZhcy5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguY2FudmFzLmNzcygnZGlzcGxheScsICdibG9jaycpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuZHJhdyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgY3R4LmN0eDJkLmxpbmVXaWR0aCA9IDM7XG4gICAgY3R4LmN0eDJkLnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xuXG4gICAgY3R4LmN0eDJkLmJlZ2luUGF0aCgpO1xuICAgIGN0eC5jdHgyZC5jbGVhclJlY3QoMCwgMCwgY3R4LndpZHRoLCBjdHguaGVpZ2h0KTtcblxuICAgIHZhciB6ZXJvQ3Jvc3MgPSBmaW5kRmlyc3RQb3NpdGl2ZVplcm9Dcm9zc2luZyhkYXRhLCBjdHgud2lkdGgpO1xuXG4gICAgY3R4LmN0eDJkLm1vdmVUbygwLCAoMjU2IC0gZGF0YVt6ZXJvQ3Jvc3NdKSAqIGN0eC5zY2FsaW5nKTtcbiAgICBmb3IgKHZhciBpID0gemVyb0Nyb3NzLCBqID0gMDsgKGogPCBjdHgud2lkdGgpICYmIChpIDwgZGF0YS5sZW5ndGgpOyBpICs9IGN0eC5zYW1wbGluZywgaisrKSB7XG4gICAgICAgIGN0eC5jdHgyZC5saW5lVG8oaiAqIGN0eC5zYW1wbGluZywgKDI1NiAtIGRhdGFbaV0pICogY3R4LnNjYWxpbmcpO1xuICAgIH1cbiAgICBjdHguY3R4MmQuc3Ryb2tlKCk7XG59O1xuXG52YXIgZmluZEZpcnN0UG9zaXRpdmVaZXJvQ3Jvc3NpbmcgPSBmdW5jdGlvbiAoYnVmLCBidWZsZW4pIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGxhc3RfemVybyA9IC0xO1xuICAgIHZhciB0O1xuXG4gICAgLy8gYWR2YW5jZSB1bnRpbCB3ZSdyZSB6ZXJvIG9yIG5lZ2F0aXZlXG4gICAgd2hpbGUgKGkgPCBidWZsZW4gJiYgKGJ1ZltpXSA+IDEyOCApICkge1xuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgaWYgKGkgPj0gYnVmbGVuKXtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgLy8gYWR2YW5jZSB1bnRpbCB3ZSdyZSBhYm92ZSBtaW4sIGtlZXBpbmcgdHJhY2sgb2YgbGFzdCB6ZXJvLlxuICAgIHdoaWxlIChpIDwgYnVmbGVuICYmICgodCA9IGJ1ZltpXSkgPCBjdHgubWluICkpIHtcbiAgICAgICAgaWYgKHQgPj0gMTI4KSB7XG4gICAgICAgICAgICBpZiAobGFzdF96ZXJvID09IC0xKSB7XG4gICAgICAgICAgICAgICAgbGFzdF96ZXJvID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxhc3RfemVybyA9IC0xO1xuICAgICAgICB9XG4gICAgICAgIGkrKztcbiAgICB9XG5cbiAgICAvLyB3ZSBtYXkgaGF2ZSBqdW1wZWQgb3ZlciBtaW4gaW4gb25lIHNhbXBsZS5cbiAgICBpZiAobGFzdF96ZXJvID09IC0xKSB7XG4gICAgICAgIGxhc3RfemVybyA9IGk7XG4gICAgfVxuXG4gICAgaWYgKGk9PWJ1ZmxlbikgeyAvLyBXZSBkaWRuJ3QgZmluZCBhbnkgcG9zaXRpdmUgemVybyBjcm9zc2luZ3NcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgLy8gVGhlIGZpcnN0IHNhbXBsZSBtaWdodCBiZSBhIHplcm8uICBJZiBzbywgcmV0dXJuIGl0LlxuICAgIGlmIChsYXN0X3plcm8gPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxhc3RfemVybztcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGNvcmUgPSByZXF1aXJlKFwiLi9jb3JlXCIpO1xudmFyIG9zY2lsbG8gPSByZXF1aXJlKCcuL29zY2lsbG8nKTtcblxudmFyIGVsZW1lbnRzID0ge1xuICAgIHRpdGxlOiBudWxsLFxuICAgIGFydHdvcms6IG51bGwsXG5cbiAgICBwbGF5OiBudWxsLFxuICAgIG5leHQ6IG51bGwsXG4gICAgcHJldjogbnVsbCxcbiAgICBzdG9wOiBudWxsLFxuXG4gICAgdm9sdW1lOiBudWxsLFxuICAgIG11dGU6IG51bGwsXG5cbiAgICB0aW1lOiBudWxsXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5kaXNjb3ZlciA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWQgPSBpZCB8fCBcIiNwbGF5ZXJcIjtcblxuICAgIHdpbmRvdy4kLmVhY2goZWxlbWVudHMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgZWxlbWVudHNba2V5XSA9IHdpbmRvdy4kKGlkICsgXCIgLlwiICsga2V5KTtcbiAgICB9KTtcblxuICAgIGVsZW1lbnRzLmFydHdvcmsuY3NzKHtcbiAgICAgICAgXCJwb3NpdGlvblwiOiBcInJlbGF0aXZlXCIsXG4gICAgICAgIFwiYmFja2dyb3VuZC1zaXplXCI6IFwiY292ZXJcIixcbiAgICAgICAgXCJiYWNrZ3JvdW5kLXBvc2l0aW9uXCI6IFwiNTAlIDUwJVwiLFxuICAgIH0pO1xuXG4gICAgZWxlbWVudHMucGxheS5jbGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGNvcmUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgICAgIGNvcmUucGF1c2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvcmUucGxheSgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbGVtZW50cy5uZXh0LmNsaWNrKGNvcmUubmV4dCk7XG4gICAgZWxlbWVudHMucHJldi5jbGljayhjb3JlLnByZXYpO1xuXG4gICAgZWxlbWVudHMub3NjaWxsbyA9IHdpbmRvdy4kKCc8Y2FudmFzPicpXG4gICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgICdkaXNwbGF5JzogJ25vbmUnLFxuICAgICAgICAgICAgJ3RvcCc6ICcwcHgnLFxuICAgICAgICAgICAgJ2xlZnQnOiAnMHB4JyxcbiAgICAgICAgICAgICd3aWR0aCc6ICBlbGVtZW50cy5hcnR3b3JrLndpZHRoKCkgKyAncHgnLFxuICAgICAgICAgICAgJ2hlaWdodCc6IGVsZW1lbnRzLmFydHdvcmsuaGVpZ2h0KCkgKyAncHgnXG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKCd3aWR0aCcsIGVsZW1lbnRzLmFydHdvcmsud2lkdGgoKSlcbiAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGVsZW1lbnRzLmFydHdvcmsuaGVpZ2h0KCkpO1xuICAgIGVsZW1lbnRzLmFydHdvcmsucHJlcGVuZChlbGVtZW50cy5vc2NpbGxvKTtcbiAgICBvc2NpbGxvLmluaXQoZWxlbWVudHMub3NjaWxsbyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy51cGRhdGUgPSBmdW5jdGlvbihzb25nKSB7XG4gICAgZWxlbWVudHMudGl0bGUudGV4dChzb25nLnRpdGxlKTtcbiAgICBlbGVtZW50cy5hcnR3b3JrLmNzcyhcImJhY2tncm91bmQtaW1hZ2VcIiwgXCJ1cmwoXCIgKyBzb25nLmFydHdvcmsgKyBcIilcIik7XG4gICAgaWYgKGNvcmUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgZWxlbWVudHMucGxheS5yZW1vdmVDbGFzcygnZmEtcGxheScpLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnRzLnBsYXkucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJykuYWRkQ2xhc3MoJ2ZhLXBsYXknKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50aW1lID0gZnVuY3Rpb24odGltZXMpIHtcbiAgICBlbGVtZW50cy50aW1lLmZpbmQoJy5jdXJyZW50JykudGV4dCh0aW1lcy5jdXJyZW50LnRleHQpO1xuICAgIGVsZW1lbnRzLnRpbWUuZmluZCgnLmR1cmF0aW9uJykudGV4dCh0aW1lcy5kdXJhdGlvbi50ZXh0KTtcbn07XG4iXX0=
