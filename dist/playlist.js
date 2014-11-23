/*! playlist.js v0.0.1 - MIT license 
2014-11-23 - Florent Solt */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Playlist = require('./core');

window.$(function() {
    Playlist.ui.discover();
});
},{"./core":2}],2:[function(require,module,exports){
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
},{"./ui":3}],3:[function(require,module,exports){
"use strict";

var core = require("./core");

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

},{"./core":2}]},{},[1,2,3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYnJvd3Nlci5qcyIsInNyYy9jb3JlLmpzIiwic3JjL3VpLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5QbGF5bGlzdCA9IHJlcXVpcmUoJy4vY29yZScpO1xuXG53aW5kb3cuJChmdW5jdGlvbigpIHtcbiAgICBQbGF5bGlzdC51aS5kaXNjb3ZlcigpO1xufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1aSA9IG1vZHVsZS5leHBvcnRzLnVpID0gcmVxdWlyZSgnLi91aScpO1xuXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG5cbnZhciBjdHggPSB7XG5cbiAgICBpbmRleDogMCxcbiAgICBhdWRpbzogbmV3IEF1ZGlvKCksXG4gICAgc29uZ3M6IFtdLFxuICAgIGxvb3A6IHRydWUsXG5cbiAgICBldmVudHM6IHtcbiAgICAgICAgcGxheTogbm9vcCxcbiAgICAgICAgcGF1c2U6IG5vb3AsXG4gICAgICAgIHN0b3A6IG5vb3AsXG4gICAgICAgIG11dGU6IG5vb3AsXG4gICAgICAgIHVubXV0ZTogbm9vcCxcbiAgICAgICAgbmV4dDogbm9vcCxcbiAgICAgICAgcHJldjogbm9vcCxcbiAgICAgICAgdGltZTogbm9vcFxuICAgIH1cbn07XG5cbnZhciBhZGRTb25ncyA9IG1vZHVsZS5leHBvcnRzLnNldFNvbmdzID0gZnVuY3Rpb24oc29uZ3MpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb25ncykpIHtcbiAgICAgICAgc29uZ3MuZm9yRWFjaChmdW5jdGlvbihzb25nKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvbmcuc3JjID09IFwic3RyaW5nXCIgJiYgdHlwZW9mIHNvbmcudGl0bGUgPT0gXCJzdHJpbmdcIiAmJiB0eXBlb2Ygc29uZy5hcnR3b3JrID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBjdHguc29uZ3MucHVzaChzb25nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJJbnZhbGlkIHNvbmcgKHNyYywgdGl0bGUgb3IgYXJ0d29yayBwcm9wZXJ0eSBtaXNzaW5nIG9yIGludmFsaWQpLlwiLCBzb25nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQbGF5bGlzdC5zZXRTb25ncyBvbmx5IGFjY2V0IGFycmF5IG9mIHNvbmdzLlwiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBjYikge1xuICAgIGlmICh0eXBlb2YgY2IgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGlmIChjdHguZXZlbnRzW2V2ZW50XSkge1xuICAgICAgICAgICAgY3R4LmV2ZW50c1tldmVudF0gPSBjYjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBldmVudDogXCIgKyBldmVudCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBsYXlsaXN0Lm9uIG5lZWRzIGEgZnVuY2l0b24gYXMgMm5kIGFyZ3VtZW50LlwiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5nZXRTb25ncyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybihjdHguc29uZ3MpO1xufTtcblxudmFyIHNldFZvbHVtZSA9IG1vZHVsZS5leHBvcnRzLnNldFZvbHVtZSA9IGZ1bmN0aW9uICh2b2x1bWUpIHtcbiAgICBpZiAodHlwZW9mIHZvbHVtZSA9PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGlmICh2b2x1bWUgPj0gMCAmJiB2b2x1bWUgPD0gMTAwKSB7XG4gICAgICAgICAgICBjdHguYXVkaW8udm9sdW1lID0gdm9sdW1lIC8gMTAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJWb2x1bWUgc2hvdWxkIGJlIGJldHdlZW4gMCBhbmQgMTAwLlwiKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiSW52YWxpZCBpbmRleC5cIik7XG4gICAgfVxufTtcblxudmFyIGlzUGxheWluZyA9IG1vZHVsZS5leHBvcnRzLmlzUGxheWluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIWN0eC5hdWRpby5wYXVzZWQ7XG59O1xuXG52YXIgcGxheSA9IG1vZHVsZS5leHBvcnRzLnBsYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFjdHguYXVkaW8uc3JjKSB7XG4gICAgICAgIC8vIE9ubHkgZG8gaXQgdGhlIDFzdCB0aW1lLCBpZiBub3QgaXQgcmVzZXRzIGN1cnJlbnRUaW1lXG4gICAgICAgIGN0eC5hdWRpby5zcmMgPSBjdHguc29uZ3NbY3R4LmluZGV4XS5zcmM7XG4gICAgfVxuICAgIGN0eC5hdWRpby5wbGF5KCk7XG4gICAgdWkudXBkYXRlKGN0eC5zb25nc1tjdHguaW5kZXhdKTtcbiAgICBjdHguZXZlbnRzLnBsYXkoY3R4LnNvbmdzW2N0eC5pbmRleF0pO1xufTtcblxudmFyIHN0b3AgPSBtb2R1bGUuZXhwb3J0cy5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgIGN0eC5hdWRpby5wYXVzZSgpO1xuICAgIGN0eC5hdWRpby5jdXJyZW50VGltZSA9IDA7XG4gICAgY3R4LmV2ZW50cy5zdG9wKCk7XG59O1xuXG52YXIgcGF1c2UgPSBtb2R1bGUuZXhwb3J0cy5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjdHguYXVkaW8ucGF1c2UoKTtcbiAgICB1aS51cGRhdGUoY3R4LnNvbmdzW2N0eC5pbmRleF0pO1xuICAgIGN0eC5ldmVudHMucGF1c2UoKTtcbn07XG5cbnZhciBuZXh0ID0gbW9kdWxlLmV4cG9ydHMubmV4dCAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGN0eC5sb29wKSB7XG4gICAgICBjdHguaW5kZXggPSAoY3R4LmluZGV4ICsgMSkgJSBjdHguc29uZ3MubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eC5pbmRleCsrO1xuICAgICAgICBpZiAoY3R4LmluZGV4ID4gY3R4LnNvbmdzLmxlbmd0aCkge1xuICAgICAgICAgICAgY3R4LmluZGV4ID0gY3R4LnNvbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY3R4LmF1ZGlvLnNyYyA9IGN0eC5zb25nc1tjdHguaW5kZXhdLnNyYztcbiAgICBwbGF5KCk7XG4gICAgY3R4LmV2ZW50cy5uZXh0KCk7XG59O1xuXG52YXIgcHJldiA9IG1vZHVsZS5leHBvcnRzLnByZXYgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGN0eC5sb29wKSB7XG4gICAgICAgIGN0eC5pbmRleCA9IChjdHguc29uZ3MubGVuZ3RoICsgY3R4LmluZGV4IC0gMSkgJSBjdHguc29uZ3MubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eC5pbmRleCsrO1xuICAgICAgICBpZiAoY3R4LmluZGV4IDwgMCkge1xuICAgICAgICAgICAgY3R4LmluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjdHguYXVkaW8uc3JjID0gY3R4LnNvbmdzW2N0eC5pbmRleF0uc3JjO1xuICAgIHBsYXkoKTtcbiAgICBjdHguZXZlbnRzLnByZXYoKTtcbn07XG5cbnZhciBzaHVmZmxlID0gbW9kdWxlLmV4cG9ydHMuc2h1ZmZsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGosIHgsIGkgPSBjdHguc29uZ3MubGVuZ3RoOyBpO1xuICAgICAgICBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSksXG4gICAgICAgIHggPSBjdHguc29uZ3NbLS1pXSxcbiAgICAgICAgY3R4LnNvbmdzW2ldID0gY3R4LnNvbmdzW2pdLFxuICAgICAgICBjdHguc29uZ3Nbal0gPSB4KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNldExvb3AgPSBmdW5jdGlvbihib29sKSB7XG4gICAgY3R4Lmxvb3AgPSAhIWJvb2w7XG59O1xuXG52YXIgdGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXJyZW50ID0gY3R4LmF1ZGlvLmN1cnJlbnRUaW1lIHx8wqAwO1xuICAgIHZhciBkdXJhdGlvbiA9IGN0eC5hdWRpby5kdXJhdGlvbiB8fMKgMDtcbiAgICB2YXIgdGltZXMgPSB7XG4gICAgICAgIGN1cnJlbnQ6IHtcbiAgICAgICAgICAgIHNlY29uZHM6IChNYXRoLmZsb29yKGN1cnJlbnQgJSA2MCApIDwgMTAgPyAnMCcgOiAnJykgKyBNYXRoLmZsb29yKGN1cnJlbnQgJSA2MCksXG4gICAgICAgICAgICBtaW51dGVzOiBNYXRoLmZsb29yKGN1cnJlbnQgLyA2MCksXG4gICAgICAgIH0sXG4gICAgICAgIGR1cmF0aW9uOiB7XG4gICAgICAgICAgICBzZWNvbmRzOiAoTWF0aC5mbG9vcihkdXJhdGlvbiAlIDYwICkgPCAxMCA/ICcwJyA6ICcnKSArIE1hdGguZmxvb3IoZHVyYXRpb24gJSA2MCksXG4gICAgICAgICAgICBtaW51dGVzOiBNYXRoLmZsb29yKGR1cmF0aW9uIC8gNjApXG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRpbWVzLmN1cnJlbnQudGV4dCA9IHRpbWVzLmN1cnJlbnQubWludXRlcyArIFwiOlwiICsgdGltZXMuY3VycmVudC5zZWNvbmRzO1xuICAgIHRpbWVzLmR1cmF0aW9uLnRleHQgPSB0aW1lcy5kdXJhdGlvbi5taW51dGVzICsgXCI6XCIgKyB0aW1lcy5kdXJhdGlvbi5zZWNvbmRzO1xuXG4gICAgdWkudGltZSh0aW1lcyk7XG4gICAgY3R4LmV2ZW50cy50aW1lKHRpbWVzKTtcbn07XG5cbi8qIEV2ZW50cyAqL1xuXG5jdHguYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIGZ1bmN0aW9uKCl7XG4gICAgdGltZSgpO1xufSk7XG5cbmN0eC5hdWRpby5hZGRFdmVudExpc3RlbmVyKFwiZW5kZWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgbmV4dCgpO1xufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBjb3JlID0gcmVxdWlyZShcIi4vY29yZVwiKTtcblxudmFyIGVsZW1lbnRzID0ge1xuICAgIHRpdGxlOiBudWxsLFxuICAgIGFydHdvcms6IG51bGwsXG5cbiAgICBwbGF5OiBudWxsLFxuICAgIG5leHQ6IG51bGwsXG4gICAgcHJldjogbnVsbCxcbiAgICBzdG9wOiBudWxsLFxuXG4gICAgdm9sdW1lOiBudWxsLFxuICAgIG11dGU6IG51bGwsXG5cbiAgICB0aW1lOiBudWxsXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5kaXNjb3ZlciA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWQgPSBpZCB8fCBcIiNwbGF5ZXJcIjtcblxuICAgIHdpbmRvdy4kLmVhY2goZWxlbWVudHMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgZWxlbWVudHNba2V5XSA9IHdpbmRvdy4kKGlkICsgXCIgLlwiICsga2V5KTtcbiAgICB9KTtcblxuICAgIGVsZW1lbnRzLmFydHdvcmsuY3NzKHtcbiAgICAgICAgXCJiYWNrZ3JvdW5kLXNpemVcIjogXCJjb3ZlclwiLFxuICAgICAgICBcImJhY2tncm91bmQtcG9zaXRpb25cIjogXCI1MCUgNTAlXCIsXG4gICAgfSk7XG5cbiAgICBlbGVtZW50cy5wbGF5LmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY29yZS5pc1BsYXlpbmcoKSkge1xuICAgICAgICAgICAgY29yZS5wYXVzZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29yZS5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVsZW1lbnRzLm5leHQuY2xpY2soY29yZS5uZXh0KTtcbiAgICBlbGVtZW50cy5wcmV2LmNsaWNrKGNvcmUucHJldik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy51cGRhdGUgPSBmdW5jdGlvbihzb25nKSB7XG4gICAgZWxlbWVudHMudGl0bGUudGV4dChzb25nLnRpdGxlKTtcbiAgICBlbGVtZW50cy5hcnR3b3JrLmNzcyhcImJhY2tncm91bmQtaW1hZ2VcIiwgXCJ1cmwoXCIgKyBzb25nLmFydHdvcmsgKyBcIilcIik7XG4gICAgaWYgKGNvcmUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgZWxlbWVudHMucGxheS5yZW1vdmVDbGFzcygnZmEtcGxheScpLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnRzLnBsYXkucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJykuYWRkQ2xhc3MoJ2ZhLXBsYXknKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50aW1lID0gZnVuY3Rpb24odGltZXMpIHtcbiAgICBlbGVtZW50cy50aW1lLmZpbmQoJy5jdXJyZW50JykudGV4dCh0aW1lcy5jdXJyZW50LnRleHQpO1xuICAgIGVsZW1lbnRzLnRpbWUuZmluZCgnLmR1cmF0aW9uJykudGV4dCh0aW1lcy5kdXJhdGlvbi50ZXh0KTtcbn07XG4iXX0=
