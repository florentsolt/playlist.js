"use strict";

var ui = module.exports.ui = require('./ui');

var noop = function() {};

var ctx = {

    index: 0,
    audio: new Audio(),
    songs: [],
    loop: true,

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

var addSongs = module.exports.setSongs = function(songs) {
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

var setVolume = module.exports.setVolume = function (volume) {
    if (typeof volume == "number") {
        if (volume >= 0 && volume <= 100) {
            ctx.audio.volume = volume / 100;
        } else {
            console.log("Volume should be between 0 and 100.");
        }
    } else {
        console.log("Invalid index.");
    }
};

var isPlaying = module.exports.isPlaying = function () {
    return !ctx.audio.paused;
};

var play = module.exports.play = function () {
    if (!ctx.audio.src) {
        // Only do it the 1st time, if not it resets currentTime
        ctx.audio.src = ctx.songs[ctx.index].src;
    }
    ctx.audio.play();
    ui.update(ctx.songs[ctx.index]);
    ctx.events.play(ctx.songs[ctx.index]);
};

var stop = module.exports.stop = function () {
    ctx.audio.pause();
    ctx.audio.currentTime = 0;
    ctx.events.stop();
};

var pause = module.exports.pause = function () {
    ctx.audio.pause();
    ui.update(ctx.songs[ctx.index]);
    ctx.events.pause();
};

var next = module.exports.next  = function () {
    if (ctx.loop) {
      ctx.index = (ctx.index + 1) % ctx.songs.length;
    } else {
        ctx.index++;
        if (ctx.index > ctx.songs.length) {
            ctx.index = ctx.songs.length - 1;
        }
    }
    ctx.audio.src = ctx.songs[ctx.index].src;
    play();
    ctx.events.next();
};

var prev = module.exports.prev = function () {
    if (ctx.loop) {
        ctx.index = (ctx.songs.length + ctx.index - 1) % ctx.songs.length;
    } else {
        ctx.index++;
        if (ctx.index < 0) {
            ctx.index = 0;
        }
    }
    ctx.audio.src = ctx.songs[ctx.index].src;
    play();
    ctx.events.prev();
};

var shuffle = module.exports.shuffle = function() {
    for (var j, x, i = ctx.songs.length; i;
        j = Math.floor(Math.random() * i),
        x = ctx.songs[--i],
        ctx.songs[i] = ctx.songs[j],
        ctx.songs[j] = x);
};

module.exports.setLoop = function(bool) {
    ctx.loop = !!bool;
};

var time = function() {
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
};

/* Events */

ctx.audio.addEventListener('timeupdate', function(){
    time();
});

ctx.audio.addEventListener("ended", function() {
    next();
});