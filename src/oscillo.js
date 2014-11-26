
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
