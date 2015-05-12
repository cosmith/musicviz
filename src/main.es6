"use strict";

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.4;

var source, audioBuffer, STOP = true;

document.querySelector('input[type="file"]').addEventListener('change', (e) => {
    var reader = new FileReader();
    reader.onload = function(e) {
        initSound(e.target.result);
        console.log("Sample rate: ", audioCtx.sampleRate);
    };
    reader.readAsArrayBuffer(e.target.files[0]);
}, false);

function initSound(arrayBuffer) {
    audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
        audioBuffer = buffer;
    }, (error) => {
        console.log('Error decoding', error);
    });
}

function stopSound() {
    if (source) {
       source.stop();
       STOP = true;
    }
}

function playSound() {
    source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = false;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    source.start();

    STOP = false;
    draw();
}


var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var link = document.createElement('a');
link.innerHTML = 'download image';
link.addEventListener('click', function(ev) {
    link.href = canvas.toDataURL();
    link.download = "image.png";
}, false);
document.body.appendChild(link);

let SIZE = 6000;

canvas.width = SIZE;
canvas.height = SIZE;

analyser.fftSize = 2048;
var bufferLength = analyser.frequencyBinCount;
var dataTimeArray = new Uint8Array(bufferLength);
var dataFreqArray = new Uint8Array(bufferLength);
var sliceWidth = 10.0 / bufferLength;

var x = canvas.width / 2, y = canvas.height / 2;
var FREQ_ARRAY = [];


function draw() {
    if (!STOP) {
        var drawVisual = requestAnimationFrame(draw);
    }

    analyser.getByteFrequencyData(dataFreqArray);
    analyser.getByteTimeDomainData(dataTimeArray);

    visualizationNarratives(ctx, dataTimeArray, dataFreqArray);
    // visualizationSpectrogram(ctx, dataTimeArray, dataFreqArray);
    // visualizationGoodCircle(ctx, dataTimeArray, dataFreqArray);
    // visualizationWeirdCircle(ctx, dataTimeArray, dataFreqArray);
    // visualizationHorizontalLines(ctx, dataTimeArray, dataFreqArray);
};


function visualizationNarratives(ctx, dataTime, dataFreq) {
    for (var i = Math.floor(bufferLength * 0.01); i < bufferLength * 0.4; i++) {
        FREQ_ARRAY[i].draw(dataFreq[i], i);
    }
}


class Frequence {
    constructor(number) {
        this.x = 3000 + number * 5;
        this.y = SIZE / 2;

        this.length = 0.3;
        this.rotation = Math.PI/2;
    }

    draw(value, number) {
        let angle = value / 40 + this.rotation;// + Math.PI / (bufferLength * 0.3) * number + this.rotation;
        let dx = this.length * Math.cos(angle);
        let dy = this.length * Math.sin(angle);

        ctx.lineWidth = 1;
        ctx.strokeStyle = value < 130 ? 'hsla(0, 80%, 0%, 0.1)' : 'hsla(50, 80%, 50%, 0.1)';

        if (true) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + dx, this.y + dy);
            ctx.stroke();
        }

        this.x += dx;
        this.y += dy;
    }

    static init() {
        var freqs = [];
        for (var i = Math.floor(bufferLength * 0.01); i < bufferLength * 0.4; i++) {
            FREQ_ARRAY[i] = new Frequence(i);
        }
    }
}

Frequence.init();

function visualizationSpectrogram(ctx, dataTime, dataFreq) {
    let SCALING = 5,
        startX = 100,
        startY = 100;

    var theta;

    var avgTime = Utils.sum(dataTime) / bufferLength;
    var avgFreq = Utils.sum(dataFreq) / bufferLength;

    var lastX = startX,
        lastY = startY;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'hsla(' + (avgFreq * avgTime) / 100 + ', 80%, 50%, 0.1)';

    ctx.beginPath();
    for (var i = 0; i < bufferLength; i++) {
        var vt = dataTime[i] / 256.0 * SCALING;
        var vf = dataFreq[i] / 256.0 * SCALING;

        var freq = 100 + i * audioCtx.sampleRate / bufferLength / 20000 * SIZE / 2;

        theta = vf * 10;

        x = freq;
        y = audioCtx.currentTime * 10 + theta;

        if (i === 0 || vf < 0.01) {
            ctx.moveTo(x, y);
        } else {
            ctx.quadraticCurveTo(lastX, lastY, x, y);
        }

        lastX = x;
        lastY = y;
    }

    ctx.stroke();
}




function visualizationGoodCircle(ctx, dataTime, dataFreq) {
    analyser.fftSize = 512;

    let SCALING = 5;
    var r, theta;

    var angle = 2 * Math.PI * audioCtx.currentTime / (3.6 * 60);

    var avgTime = Utils.sum(dataTime) / bufferLength;
    var avgFreq = Utils.sum(dataFreq) / bufferLength;
    // console.log(sumTime / bufferLength, sumFreq / bufferLength);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'hsla(' + (avgFreq * avgTime) / 100 + ', 80%, 50%, 0.1)';

    ctx.beginPath();

    var lastX = SIZE / 2, lastY = SIZE / 2;
    for (var i = 0; i < bufferLength; i++) {
        var vt = dataTime[i] / 256.0 * SCALING;
        var vf = dataFreq[i] / 256.0 * SCALING;

        var freq = 100 + i * audioCtx.sampleRate / bufferLength / 20000 * SIZE / 5;

        r = freq;
        theta = vf / (SCALING * SCALING);

        x = SIZE / 2 + r * Math.cos(angle - theta);
        y = SIZE / 2 + r * Math.sin(angle - theta);

        if (i === 0 || vf < 0.01) {
            ctx.moveTo(x, y);
        } else {
            ctx.quadraticCurveTo(lastX, lastY, x, y);
        }

        lastX = x;
        lastY = y;
    }

    ctx.stroke();
}


function visualizationHorizontalLines(ctx, dataTime, dataFreq) {
    let scaling = 1;

    ctx.fillStyle = "white";

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';

    var baseX = audioCtx.currentTime * 3;
    x = baseX;

    ctx.beginPath();
    ctx.moveTo(baseX, y);

    for (var i = 0; i < bufferLength; i++) {
        var vt = dataTime[i] / 256.0 * scaling;
        var vf = dataFreq[i] / 256.0 * scaling;

        if (vt !== 0) {
            x += vt - scaling / 2;
        }

        if (vf !== 0) {
            y += vf;
        }

        if (i === 0) {
            ctx.moveTo(baseX + x, y);
        } else {
            ctx.lineTo(baseX + x, y);
        }

        if (y > SIZE) {
            y = 0;
        }
    }

    ctx.stroke();
}

function visualizationWeirdCircle(ctx, dataTime, dataFreq) {
    let SCALING = 5;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';

    var angle = Math.PI * audioCtx.currentTime / 60;

    ctx.beginPath();

    for (var i = 0; i < bufferLength; i++) {
        var vt = dataTime[i] / 256.0 * SCALING;
        var vf = dataFreq[i] / 256.0 * SCALING;

        if (vt !== 0) {
            x += vt - SCALING / 2;
        }

        if (vf !== 0) {
            y += vf - SCALING / 2;
        }

        if (i === 0) {
            ctx.moveTo(SIZE / 2 + x * Math.cos(angle), SIZE / 2 + y * Math.sin(angle));
        } else {
            ctx.lineTo(SIZE / 2 + x * Math.cos(angle), SIZE / 2 + y * Math.sin(angle));
        }
    }

    ctx.stroke();

    x = 0.375 * SIZE;
    y = 0.375 * SIZE;
}


class Utils {
    static sum(arr) {
        let s = 0;
        for (let el of arr) {
            s += el;
        }

        return s;
    }
}
