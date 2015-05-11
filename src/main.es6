"use strict";

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.4;

var source, audioBuffer;

document.querySelector('input[type="file"]').addEventListener('change', (e) => {
    var reader = new FileReader();
    reader.onload = function(e) {
        initSound(e.target.result);
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
    }
}

function playSound() {
    source = audioCtx.createBufferSource(); // Global so we can .noteOff() later.
    source.buffer = audioBuffer;
    source.loop = false;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    source.start();
}


var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 800;

analyser.fftSize = 2048;
var bufferLength = analyser.frequencyBinCount;
var dataTimeArray = new Uint8Array(bufferLength);
var dataFreqArray = new Uint8Array(bufferLength);
var sliceWidth = 10.0 / bufferLength;

// draw an oscilloscope of the current audio source
var x = canvas.width / 2, y = canvas.height / 2;
var angle = 0;

function draw() {
    var drawVisual = requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataFreqArray);
    analyser.getByteTimeDomainData(dataTimeArray);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.01)';

    angle = Math.PI * audioCtx.currentTime / 60;

    ctx.beginPath();

    for (var i = 0; i < bufferLength; i++) {
        var vt = dataTimeArray[i] / 256.0;
        var vf = dataFreqArray[i] / 256.0;

        if (vt !== 0) {
            x += vt - 0.5;
        }

        if (vf !== 0) {
            y += vf - 0.5;
        }

        if (i === 0) {
            ctx.moveTo(canvas.width / 2 + x * Math.cos(angle), canvas.width / 2 + y * Math.sin(angle));
        } else {
            ctx.lineTo(canvas.width / 2 + x * Math.cos(angle), canvas.width / 2 + y * Math.sin(angle));
        }
    }
    x = 300; y = 300;

    ctx.stroke();
};

draw();
