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
