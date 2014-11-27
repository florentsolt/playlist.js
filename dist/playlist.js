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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYnJvd3Nlci5qcyIsInNyYy9jb3JlLmpzIiwic3JjL29zY2lsbG8uanMiLCJzcmMvdWkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuUGxheWxpc3QgPSByZXF1aXJlKCcuL2NvcmUnKTtcblxud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cbndpbmRvdy4kKGZ1bmN0aW9uKCkge1xuICAgIFBsYXlsaXN0LnVpLmRpc2NvdmVyKCk7XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogLS0tLS0tLS0tIFZhcnMgLS0tLS0tLS0tICovXG5cbnZhciB1aSA9IG1vZHVsZS5leHBvcnRzLnVpID0gcmVxdWlyZSgnLi91aScpO1xudmFyIG9zY2lsbG8gPSByZXF1aXJlKCcuL29zY2lsbG8nKTtcblxudmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuXG52YXIgY3R4ID0ge1xuICAgIGluZGV4OiAwLFxuICAgIGF1ZGlvOiBudWxsLFxuICAgIHZvbHVtZTogMTAwLFxuXG4gICAgZmFkZTogNSxcblxuICAgIGN1cnJlbnRCdWZmZXI6IG51bGwsXG4gICAgbmV4dEJ1ZmZlcjogbnVsbCxcblxuICAgIHNvbmdzOiBbXSxcbiAgICBsb29wOiB0cnVlLFxuXG4gICAgb3NjaWxsbzogZmFsc2UsXG4gICAgaW50ZXJ2YWw6IG51bGwsXG4gICAgc291cmNlOiBudWxsLFxuICAgIGFuYWx5c2VyOiBudWxsLFxuICAgIGRhdGE6IG51bGwsXG5cbiAgICBldmVudHM6IHtcbiAgICAgICAgcGxheTogbm9vcCxcbiAgICAgICAgcGF1c2U6IG5vb3AsXG4gICAgICAgIHN0b3A6IG5vb3AsXG4gICAgICAgIG11dGU6IG5vb3AsXG4gICAgICAgIHVubXV0ZTogbm9vcCxcbiAgICAgICAgbmV4dDogbm9vcCxcbiAgICAgICAgcHJldjogbm9vcCxcbiAgICAgICAgdGltZTogbm9vcFxuICAgIH1cbn07XG5cbnZhciBhdWRpb0NvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpO1xuXG4vKiAtLS0tLS0tLS0gUHVibGljIC0tLS0tLS0tLSAqL1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRTb25ncyA9IGZ1bmN0aW9uKHNvbmdzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc29uZ3MpKSB7XG4gICAgICAgIHNvbmdzLmZvckVhY2goZnVuY3Rpb24oc29uZykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb25nLnNyYyA9PSBcInN0cmluZ1wiICYmIHR5cGVvZiBzb25nLnRpdGxlID09IFwic3RyaW5nXCIgJiYgdHlwZW9mIHNvbmcuYXJ0d29yayA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgY3R4LnNvbmdzLnB1c2goc29uZyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSW52YWxpZCBzb25nIChzcmMsIHRpdGxlIG9yIGFydHdvcmsgcHJvcGVydHkgbWlzc2luZyBvciBpbnZhbGlkKS5cIiwgc29uZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUGxheWxpc3Quc2V0U29uZ3Mgb25seSBhY2NldCBhcnJheSBvZiBzb25ncy5cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMub24gPSBmdW5jdGlvbihldmVudCwgY2IpIHtcbiAgICBpZiAodHlwZW9mIGNiID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBpZiAoY3R4LmV2ZW50c1tldmVudF0pIHtcbiAgICAgICAgICAgIGN0eC5ldmVudHNbZXZlbnRdID0gY2I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gZXZlbnQ6IFwiICsgZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQbGF5bGlzdC5vbiBuZWVkcyBhIGZ1bmNpdG9uIGFzIDJuZCBhcmd1bWVudC5cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuZ2V0U29uZ3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4oY3R4LnNvbmdzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNldE9zY2lsbG8gPSBmdW5jdGlvbihib29sKSB7XG4gICAgY3R4Lm9zY2lsbG8gPSAhIWJvb2w7XG4gICAgaWYgKGN0eC5vc2NpbGxvID09PSB0cnVlLyogJiYgY3R4LmludGVydmFsID09PSBudWxsKi8pIHtcbiAgICAgICAgLy8gY3R4LmludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGFuYWx5emUsIDUwKTtcbiAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICBvc2NpbGxvLnNob3coKTtcbiAgICB9IGVsc2UgLyogaWYgKGN0eC5pbnRlcnZhbCAhPT0gbnVsbCkqLyB7XG4gICAgICAgIC8vIHdpbmRvdy5jbGVhckludGVydmFsKGN0eC5pbnRlcnZhbCk7XG4gICAgICAgIC8vIGN0eC5pbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIG9zY2lsbG8uaGlkZSgpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmdldE9zY2lsbG8gPSBmdW5jdGlvbihib29sKSB7XG4gICAgcmV0dXJuIGN0eC5vc2NpbGxvO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2V0Vm9sdW1lID0gZnVuY3Rpb24gKHZvbHVtZSkge1xuICAgIHZvbHVtZSA9IHZvbHVtZSB8fCBjdHgudm9sdW1lO1xuICAgIGlmICh0eXBlb2Ygdm9sdW1lID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgaWYgKHZvbHVtZSA+PSAwICYmIHZvbHVtZSA8PSAxMDApIHtcbiAgICAgICAgICAgIGN0eC52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICBpZiAoY3R4LmF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgY3R4LmF1ZGlvLnZvbHVtZSA9IHZvbHVtZSAvIDEwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVm9sdW1lIHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kIDEwMC5cIik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkludmFsaWQgaW5kZXguXCIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmlzUGxheWluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIWN0eC5hdWRpbykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiAhY3R4LmF1ZGlvLnBhdXNlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnBsYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFjdHguYXVkaW8pIHtcbiAgICAgICAgY3R4LmluZGV4ID0gLTE7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLm5leHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjdHguYXVkaW8ucGxheSgpO1xuICAgICAgICB1aS51cGRhdGUoY3R4LnNvbmdzW2N0eC5pbmRleF0pO1xuICAgICAgICBjdHguZXZlbnRzLnBsYXkoY3R4LnNvbmdzW2N0eC5pbmRleF0pO1xuICAgICAgICBpZiAoY3R4Lm9zY2lsbG8pIHtcbiAgICAgICAgICAgIGFuYWx5emUoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgY3R4LmF1ZGlvLnBhdXNlKCk7XG4gICAgY3R4LmF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcbiAgICBjdHguZXZlbnRzLnN0b3AoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnBhdXNlID0gZnVuY3Rpb24gKCkge1xuICAgIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIHVpLnVwZGF0ZShjdHguc29uZ3NbY3R4LmluZGV4XSk7XG4gICAgY3R4LmV2ZW50cy5wYXVzZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMubmV4dCAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGN0eC5hdXRpbykgY3R4LmF1ZGlvLnBhdXNlKCk7XG4gICAgaWYgKGN0eC5sb29wKSB7XG4gICAgICAgIHNldEluZGV4KChjdHguaW5kZXggKyAxKSAlIGN0eC5zb25ncy5sZW5ndGgpO1xuICAgIH0gZWxzZSBpZiAoY3R4LmluZGV4ICsgMSA8IGN0eC5zb25ncy5sZW5ndGgpIHtcbiAgICAgICAgc2V0SW5kZXgoY3R4LmluZGV4ICsgMSk7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzLnBsYXkoKTtcbiAgICBjdHguZXZlbnRzLm5leHQoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnByZXYgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGN0eC5sb29wKSB7XG4gICAgICAgIHNldEluZGV4KChjdHguc29uZ3MubGVuZ3RoICsgY3R4LmluZGV4IC0gMSkgJSBjdHguc29uZ3MubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKGN0eC5pbmRleCAtIDEgPj0gMCkge1xuICAgICAgICBzZXRJbmRleChjdHguaW5kZXggLSAxKTtcbiAgICB9XG4gICAgbW9kdWxlLmV4cG9ydHMucGxheSgpO1xuICAgIGN0eC5ldmVudHMucHJldigpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2h1ZmZsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGosIHgsIGkgPSBjdHguc29uZ3MubGVuZ3RoOyBpO1xuICAgICAgICBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSksXG4gICAgICAgIHggPSBjdHguc29uZ3NbLS1pXSxcbiAgICAgICAgY3R4LnNvbmdzW2ldID0gY3R4LnNvbmdzW2pdLFxuICAgICAgICBjdHguc29uZ3Nbal0gPSB4KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNldExvb3AgPSBmdW5jdGlvbihib29sKSB7XG4gICAgY3R4Lmxvb3AgPSAhIWJvb2w7XG59O1xuXG4vKiAtLS0tLS0tLS0gUHJpdmF0ZSAtLS0tLS0tLS0gKi9cblxudmFyIGFuYWx5emUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoY3R4Lm9zY2lsbG8gJiYgbW9kdWxlLmV4cG9ydHMuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgaWYgKGN0eC5hbmFseXNlciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY3R4LnNvdXJjZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UoY3R4LmF1ZGlvKTtcbiAgICAgICAgICAgIGN0eC5hbmFseXNlciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICAgICAgY3R4LmRhdGEgPSBuZXcgVWludDhBcnJheShjdHguYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICAgICAgY3R4LnNvdXJjZS5jb25uZWN0KGN0eC5hbmFseXNlcik7XG4gICAgICAgICAgICBjdHguc291cmNlLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGN0eC5hbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoY3R4LmRhdGEpO1xuICAgICAgICBvc2NpbGxvLmRyYXcoY3R4LmRhdGEpO1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5hbHl6ZSk7XG4gICAgfVxufTtcblxudmFyIHNldEluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICBjdHguaW5kZXggPSBpbmRleDtcbiAgICBpZiAoY3R4LmF1ZGlvKSB7XG4gICAgICAgIC8vIGN0eC5hdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgbGlzdGVuZXIuZmFkZSk7XG4gICAgICAgIGN0eC5hdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgbGlzdGVuZXIudGltZSk7XG4gICAgICAgIGN0eC5hdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIGxpc3RlbmVyLmVuZCk7XG4gICAgICAgIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIH1cbiAgICBjdHguYXVkaW8gPSBuZXcgQXVkaW8oKTtcbiAgICBjdHguYXVkaW8uc3JjID0gY3R4LnNvbmdzW2N0eC5pbmRleF0uc3JjO1xuICAgIGN0eC5hdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgbGlzdGVuZXIudGltZSk7XG4gICAgY3R4LmF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgbGlzdGVuZXIuZW5kKTtcbiAgICAvLyBjdHguYXVkaW8udm9sdW1lID0gMDtcbiAgICBtb2R1bGUuZXhwb3J0cy5zZXRWb2x1bWUoKTtcbiAgICBjdHguYW5hbHlzZXIgPSBudWxsO1xuICAgIGFuYWx5emUoKTtcbn07XG5cbnZhciBsaXN0ZW5lciA9IHtcbiAgICB0aW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBjdHguYXVkaW8uY3VycmVudFRpbWUgfHzCoDA7XG4gICAgICAgIHZhciBkdXJhdGlvbiA9IGN0eC5hdWRpby5kdXJhdGlvbiB8fMKgMDtcbiAgICAgICAgdmFyIHRpbWVzID0ge1xuICAgICAgICAgICAgY3VycmVudDoge1xuICAgICAgICAgICAgICAgIHNlY29uZHM6IChNYXRoLmZsb29yKGN1cnJlbnQgJSA2MCApIDwgMTAgPyAnMCcgOiAnJykgKyBNYXRoLmZsb29yKGN1cnJlbnQgJSA2MCksXG4gICAgICAgICAgICAgICAgbWludXRlczogTWF0aC5mbG9vcihjdXJyZW50IC8gNjApLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgc2Vjb25kczogKE1hdGguZmxvb3IoZHVyYXRpb24gJSA2MCApIDwgMTAgPyAnMCcgOiAnJykgKyBNYXRoLmZsb29yKGR1cmF0aW9uICUgNjApLFxuICAgICAgICAgICAgICAgIG1pbnV0ZXM6IE1hdGguZmxvb3IoZHVyYXRpb24gLyA2MClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGltZXMuY3VycmVudC50ZXh0ID0gdGltZXMuY3VycmVudC5taW51dGVzICsgXCI6XCIgKyB0aW1lcy5jdXJyZW50LnNlY29uZHM7XG4gICAgICAgIHRpbWVzLmR1cmF0aW9uLnRleHQgPSB0aW1lcy5kdXJhdGlvbi5taW51dGVzICsgXCI6XCIgKyB0aW1lcy5kdXJhdGlvbi5zZWNvbmRzO1xuXG4gICAgICAgIHVpLnRpbWUodGltZXMpO1xuICAgICAgICBjdHguZXZlbnRzLnRpbWUodGltZXMpO1xuICAgICAgICByZXR1cm4gdGltZXM7XG4gICAgfSxcblxuICAgIGVuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChjdHgubG9vcCkge1xuICAgICAgICAgICAgbW9kdWxlLmV4cG9ydHMubmV4dCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGZhZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdGltZXMgPSBsaXN0ZW5lci50aW1lKCk7XG4gICAgICAgIHZhciBmYWRlSW5FbmQgPSBNYXRoLm1pbihjdHguZmFkZSwgdGhpcy5kdXJhdGlvbiAtIGN0eC5mYWRlKTtcblxuICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZSA8IGZhZGVJbkVuZCkge1xuICAgICAgICAgICAgLy8gRmFkZSBpblxuICAgICAgICAgICAgdGhpcy52b2x1bWUgPSAoKDEgLSAoZmFkZUluRW5kIC0gdGhpcy5jdXJyZW50VGltZSkgLyBmYWRlSW5FbmQpICogY3R4LnZvbHVtZSkgLyAxMDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZSArIGN0eC5mYWRlID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgaWYgKHRoaXMgPT0gY3R4LmF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgbW9kdWxlLmV4cG9ydHMubmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmFkZSBvdXRcbiAgICAgICAgICAgIHRoaXMudm9sdW1lID0gKCh0aGlzLmR1cmF0aW9uIC0gdGhpcy5jdXJyZW50VGltZSkgLyBjdHguZmFkZSAqIGN0eC52b2x1bWUpIC8gMTAwO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsIlxudmFyIGN0eCA9IHtcbiAgICBjYW52YXM6IG51bGwsXG4gICAgY3R4MmQ6IG51bGwsXG4gICAgd2lkaHQ6IG51bGwsXG4gICAgaGVpZ2h0OiBudWxsLFxuICAgIHF1YXJ0ZXJIZWlnaHQ6IG51bGwsXG4gICAgc2NhbGluZzogbnVsbCxcbiAgICBzYW1wbGluZzogMSxcbiAgICBtaW46IDEzNCAgLy8gMTI4ID09IHplcm8uICBtaW4gaXMgdGhlIFwibWluaW11bSBkZXRlY3RlZCBzaWduYWxcIiBsZXZlbC5cbn07XG5cbm1vZHVsZS5leHBvcnRzLmluaXQgPSBmdW5jdGlvbihjYW52YXMpIHtcbiAgICBjdHguY2FudmFzID0gY2FudmFzO1xuICAgIGN0eC5jdHgyZCA9IGNhbnZhcy5nZXQoMCkuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHgud2lkdGggPSBjYW52YXMuYXR0cignd2lkdGgnKTtcbiAgICBjdHguaGVpZ2h0ID0gY2FudmFzLmF0dHIoJ2hlaWdodCcpO1xuICAgIGN0eC5xdWFydGVySGVpZ2h0ID0gY3R4LmhlaWdodCAvIDQ7XG4gICAgY3R4LnNjYWxpbmcgPSBjdHguaGVpZ2h0IC8gMjU2O1xufTtcblxubW9kdWxlLmV4cG9ydHMuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguY2FudmFzLmNzcygnZGlzcGxheScsICdub25lJyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGN0eC5jYW52YXMuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5kcmF3ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBjdHguY3R4MmQubGluZVdpZHRoID0gMztcbiAgICBjdHguY3R4MmQuc3Ryb2tlU3R5bGUgPSBcIndoaXRlXCI7XG5cbiAgICBjdHguY3R4MmQuYmVnaW5QYXRoKCk7XG4gICAgY3R4LmN0eDJkLmNsZWFyUmVjdCgwLCAwLCBjdHgud2lkdGgsIGN0eC5oZWlnaHQpO1xuXG4gICAgdmFyIHplcm9Dcm9zcyA9IGZpbmRGaXJzdFBvc2l0aXZlWmVyb0Nyb3NzaW5nKGRhdGEsIGN0eC53aWR0aCk7XG5cbiAgICBjdHguY3R4MmQubW92ZVRvKDAsICgyNTYgLSBkYXRhW3plcm9Dcm9zc10pICogY3R4LnNjYWxpbmcpO1xuICAgIGZvciAodmFyIGkgPSB6ZXJvQ3Jvc3MsIGogPSAwOyAoaiA8IGN0eC53aWR0aCkgJiYgKGkgPCBkYXRhLmxlbmd0aCk7IGkgKz0gY3R4LnNhbXBsaW5nLCBqKyspIHtcbiAgICAgICAgY3R4LmN0eDJkLmxpbmVUbyhqICogY3R4LnNhbXBsaW5nLCAoMjU2IC0gZGF0YVtpXSkgKiBjdHguc2NhbGluZyk7XG4gICAgfVxuICAgIGN0eC5jdHgyZC5zdHJva2UoKTtcbn07XG5cbnZhciBmaW5kRmlyc3RQb3NpdGl2ZVplcm9Dcm9zc2luZyA9IGZ1bmN0aW9uIChidWYsIGJ1Zmxlbikge1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGFzdF96ZXJvID0gLTE7XG4gICAgdmFyIHQ7XG5cbiAgICAvLyBhZHZhbmNlIHVudGlsIHdlJ3JlIHplcm8gb3IgbmVnYXRpdmVcbiAgICB3aGlsZSAoaSA8IGJ1ZmxlbiAmJiAoYnVmW2ldID4gMTI4ICkgKSB7XG4gICAgICAgIGkrKztcbiAgICB9XG5cbiAgICBpZiAoaSA+PSBidWZsZW4pe1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICAvLyBhZHZhbmNlIHVudGlsIHdlJ3JlIGFib3ZlIG1pbiwga2VlcGluZyB0cmFjayBvZiBsYXN0IHplcm8uXG4gICAgd2hpbGUgKGkgPCBidWZsZW4gJiYgKCh0ID0gYnVmW2ldKSA8IGN0eC5taW4gKSkge1xuICAgICAgICBpZiAodCA+PSAxMjgpIHtcbiAgICAgICAgICAgIGlmIChsYXN0X3plcm8gPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBsYXN0X3plcm8gPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGFzdF96ZXJvID0gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaSsrO1xuICAgIH1cblxuICAgIC8vIHdlIG1heSBoYXZlIGp1bXBlZCBvdmVyIG1pbiBpbiBvbmUgc2FtcGxlLlxuICAgIGlmIChsYXN0X3plcm8gPT0gLTEpIHtcbiAgICAgICAgbGFzdF96ZXJvID0gaTtcbiAgICB9XG5cbiAgICBpZiAoaT09YnVmbGVuKSB7IC8vIFdlIGRpZG4ndCBmaW5kIGFueSBwb3NpdGl2ZSB6ZXJvIGNyb3NzaW5nc1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICAvLyBUaGUgZmlyc3Qgc2FtcGxlIG1pZ2h0IGJlIGEgemVyby4gIElmIHNvLCByZXR1cm4gaXQuXG4gICAgaWYgKGxhc3RfemVybyA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gbGFzdF96ZXJvO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY29yZSA9IHJlcXVpcmUoXCIuL2NvcmVcIik7XG52YXIgb3NjaWxsbyA9IHJlcXVpcmUoJy4vb3NjaWxsbycpO1xuXG52YXIgZWxlbWVudHMgPSB7XG4gICAgdGl0bGU6IG51bGwsXG4gICAgYXJ0d29yazogbnVsbCxcblxuICAgIHBsYXk6IG51bGwsXG4gICAgbmV4dDogbnVsbCxcbiAgICBwcmV2OiBudWxsLFxuICAgIHN0b3A6IG51bGwsXG5cbiAgICB2b2x1bWU6IG51bGwsXG4gICAgbXV0ZTogbnVsbCxcblxuICAgIHRpbWU6IG51bGxcbn07XG5cbm1vZHVsZS5leHBvcnRzLmRpc2NvdmVyID0gZnVuY3Rpb24oaWQpIHtcbiAgICBpZCA9IGlkIHx8IFwiI3BsYXllclwiO1xuXG4gICAgd2luZG93LiQuZWFjaChlbGVtZW50cywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICBlbGVtZW50c1trZXldID0gd2luZG93LiQoaWQgKyBcIiAuXCIgKyBrZXkpO1xuICAgIH0pO1xuXG4gICAgZWxlbWVudHMuYXJ0d29yay5jc3Moe1xuICAgICAgICBcInBvc2l0aW9uXCI6IFwicmVsYXRpdmVcIixcbiAgICAgICAgXCJiYWNrZ3JvdW5kLXNpemVcIjogXCJjb3ZlclwiLFxuICAgICAgICBcImJhY2tncm91bmQtcG9zaXRpb25cIjogXCI1MCUgNTAlXCIsXG4gICAgfSk7XG5cbiAgICBlbGVtZW50cy5wbGF5LmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY29yZS5pc1BsYXlpbmcoKSkge1xuICAgICAgICAgICAgY29yZS5wYXVzZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29yZS5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVsZW1lbnRzLm5leHQuY2xpY2soY29yZS5uZXh0KTtcbiAgICBlbGVtZW50cy5wcmV2LmNsaWNrKGNvcmUucHJldik7XG5cbiAgICBlbGVtZW50cy5vc2NpbGxvID0gd2luZG93LiQoJzxjYW52YXM+JylcbiAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAgICAgJ2Rpc3BsYXknOiAnbm9uZScsXG4gICAgICAgICAgICAndG9wJzogJzBweCcsXG4gICAgICAgICAgICAnbGVmdCc6ICcwcHgnLFxuICAgICAgICAgICAgJ3dpZHRoJzogIGVsZW1lbnRzLmFydHdvcmsud2lkdGgoKSArICdweCcsXG4gICAgICAgICAgICAnaGVpZ2h0JzogZWxlbWVudHMuYXJ0d29yay5oZWlnaHQoKSArICdweCdcbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoJ3dpZHRoJywgZWxlbWVudHMuYXJ0d29yay53aWR0aCgpKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgZWxlbWVudHMuYXJ0d29yay5oZWlnaHQoKSk7XG4gICAgZWxlbWVudHMuYXJ0d29yay5wcmVwZW5kKGVsZW1lbnRzLm9zY2lsbG8pO1xuICAgIG9zY2lsbG8uaW5pdChlbGVtZW50cy5vc2NpbGxvKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnVwZGF0ZSA9IGZ1bmN0aW9uKHNvbmcpIHtcbiAgICBlbGVtZW50cy50aXRsZS50ZXh0KHNvbmcudGl0bGUpO1xuICAgIGVsZW1lbnRzLmFydHdvcmsuY3NzKFwiYmFja2dyb3VuZC1pbWFnZVwiLCBcInVybChcIiArIHNvbmcuYXJ0d29yayArIFwiKVwiKTtcbiAgICBpZiAoY29yZS5pc1BsYXlpbmcoKSkge1xuICAgICAgICBlbGVtZW50cy5wbGF5LnJlbW92ZUNsYXNzKCdmYS1wbGF5JykuYWRkQ2xhc3MoJ2ZhLXBhdXNlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudHMucGxheS5yZW1vdmVDbGFzcygnZmEtcGF1c2UnKS5hZGRDbGFzcygnZmEtcGxheScpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLnRpbWUgPSBmdW5jdGlvbih0aW1lcykge1xuICAgIGVsZW1lbnRzLnRpbWUuZmluZCgnLmN1cnJlbnQnKS50ZXh0KHRpbWVzLmN1cnJlbnQudGV4dCk7XG4gICAgZWxlbWVudHMudGltZS5maW5kKCcuZHVyYXRpb24nKS50ZXh0KHRpbWVzLmR1cmF0aW9uLnRleHQpO1xufTtcbiJdfQ==
