

const volume = document.getElementById('volume')
const bass = document.getElementById('bass')
const mid = document.getElementById('mid')
const treble = document.getElementById('treble')
const visualizer = document.getElementById('visualizer')
const context = new AudioContext() //create the audioContext
const analyserNode = new AnalyserNode(context, {fftSize: 256})
const gainNode = new GainNode (context, {gain: volume.value})
const bassEQ = new BiquadFilterNode(context, {
type:'lowshelf',
frequency: 500,
gain: bass.value
})

const midEQ = new BiquadFilterNode(context, {
type: 'peaking',
Q: Math.SQRT1_2,
frequency: 1500,
gain: mid.value
})

const trebleEQ = new BiquadFilterNode(context, {
type: 'highshelf',
frequency: 3000,
gain: treble.value
})

let source;


window.addEventListener('DOMContentLoaded', setupEvents, false);
var target = null;
function setupEvents(){
  if(window.File && window.FileList && window.FileReader) {
      target = document.getElementById('dropArea');
      target.addEventListener('dragenter', dragEnter, false);
      target.addEventListener('dragover', dragOver, false);
      target.addEventListener('dragleave', dragLeave, false);
      target.addEventListener('drop', dropFile, false);
    }else alert('HTML 5 File API not supported');
  }
function dragEnter(evt){
    evt.stopPropagation();
    evt.preventDefault();
    target.style.backgroundColor = 'red';
  }
  function dragLeave(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    target.style.backgroundColor = 'white';
  }
  function dragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  }
  function dropFile(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    target.style.backgroundColor = 'white';
  }




//fetch the audio file
fetch("./sound/PrinzhornDanceSchool_Reign.mp3")
        .then(data => data.arrayBuffer())
        .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
        .then(decodedAudio =>{
        source = decodedAudio;
      });




let offset;

  var sourceNode = null,
      startedAt = 0,
      pausedAt = 0,
      playing = false;


let playSound;
function start(){
    if (playSound != null && context.state == "suspended"){
        context.resume();
      }
    else{
        playSound = context.createBufferSource();
        playSound.buffer = source;
        playSound
          .connect(bassEQ)
          .connect(gainNode)
          .connect(analyserNode)
          .connect(context.destination);
          playSound.start(context.currentTime);
        }
    console.log(context.state);


    //calculate the BPM
    var audioData = [];
    audioData = source.getChannelData(0);
    var mt = new MusicTempo(audioData);
    console.log(mt.tempo);
    console.log(mt.beats);
    document.getElementById("tempo").innerHTML = mt.tempo;
    document.getElementById("beats").innerHTML = mt.beats;
  }



function pause(){
  if (context.state === "running"){
    context.suspend();
  }
  console.log(context.state);
}

function stop(){

    playSound.stop();

  console.log(context.state);
}

document.getElementById("play").addEventListener("click", start);
document.getElementById("pause").addEventListener("click", pause);
document.getElementById("stop").addEventListener("click", stop);


//window.addEventListener("mousedown", start);
// function pause(){
//
// }





setupEventListeners()

resize()
drawVisualizer()
console.log(context.sampleRate)

function setupEventListeners(){
  window.addEventListener('resize', resize)

  volume.addEventListener('input', e => {
    const value = parseFloat(e.target.value)
    gainNode.gain.setTargetAtTime(value, context.currentTime, .01)
  })

  bass.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    bassEQ.gain.setTargetAtTime(value, context.currentTime, .01)
  })

  mid.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    midEQ.gain.setTargetAtTime(value, context.currentTime, .01)
  })

  treble.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    trebleEQ.gain.setTargetAtTime(value, context.currentTime, .01)
  })

}



// //get audio function
// function getAudio(){
//   return navigator.mediaDevices.getUserMedia({
//     audio:{
//       echoCancellation: false,
//       autoGainControl: false,
//       noiseSuppression: false,
//       latency: 0
//     }
//   })
// }

function drawVisualizer(){
    requestAnimationFrame(drawVisualizer)
    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserNode.getByteFrequencyData(dataArray)
    const width = visualizer.width
    const height = visualizer.height
    const barWidth = width / bufferLength
    const canvasContext = visualizer.getContext('2d')
    canvasContext.clearRect(0, 0, width, height)
    dataArray.forEach((item, index) => {
    const y = item / 255 * height / 2
    const x = barWidth * index
    canvasContext.fillStyle = `hsl(${y / height * 400}, 100%, 50%)`
    canvasContext.fillRect(x, height - y, barWidth, y)

    // var peaks = getPeaks([audioSource.getChannelData(0), audioSource.getChannelData(1)]);
    // var groups = getIntervals(peaks);

  })
}

function resize(){
  visualizer.width = visualizer.clientWidth * window.devicePixelRatio
  visualizer.height = visualizer.clientHeight * window.devicePixelRatio
}


function getPeaks(data) {

  // What we're going to do here, is to divide up our audio into parts.

  // We will then identify, for each part, what the loudest sample is in that
  // part.

  // It's implied that that sample would represent the most likely 'beat'
  // within that part.

  // Each part is 0.5 seconds long - or 22,050 samples.

  // This will give us 60 'beats' - we will only take the loudest half of
  // those.

  // This will allow us to ignore breaks, and allow us to address tracks with
  // a BPM below 120.

  var partSize = 22050,
      parts = data[0].length / partSize,
      peaks = [];

  for (var i = 0; i < parts; i++) {
    var max = 0;
    for (var j = i * partSize; j < (i + 1) * partSize; j++) {
      var volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
      if (!max || (volume > max.volume)) {
        max = {
          position: j,
          volume: volume
        };
      }
    }
    peaks.push(max);
  }

  // We then sort the peaks according to volume...

  peaks.sort(function(a, b) {
    return b.volume - a.volume;
  });

  // ...take the loundest half of those...

  peaks = peaks.splice(0, peaks.length * 0.5);

  // ...and re-sort it back based on position.

  peaks.sort(function(a, b) {
    return a.position - b.position;
  });

  return peaks;
}

function getIntervals(peaks) {

  // What we now do is get all of our peaks, and then measure the distance to
  // other peaks, to create intervals.  Then based on the distance between
  // those peaks (the distance of the intervals) we can calculate the BPM of
  // that particular interval.

  // The interval that is seen the most should have the BPM that corresponds
  // to the track itself.

  var groups = [];

  peaks.forEach(function(peak, index) {
    for (var i = 1; (index + i) < peaks.length && i < 10; i++) {
      var group = {
        tempo: (60 * 44100) / (peaks[index + i].position - peak.position),
        count: 1
      };

      while (group.tempo < 90) {
        group.tempo *= 2;
      }

      while (group.tempo > 180) {
        group.tempo /= 2;
      }

      group.tempo = Math.round(group.tempo);

      if (!(groups.some(function(interval) {
        return (interval.tempo === group.tempo ? interval.count++ : 0);
      }))) {
        groups.push(group);
      }
    }
  });
  return groups;
}

//calculate tempo
// function calcTempo(buffer) {
//
//   var audioData = [];
//   // Take the average of the two channels
//   if(buffer.numberOfChannels == 2) {
//       var channel1Data = buffer.getChannelData(0);
//       var channel2Data = buffer.getChannelData(1);
//       var length = channel1Data.length;
//       for (var i = 0; i < length; i++) {
//         audioData[i] = (channel1Data[i] + channel2Data[i]) / 2;
//       }
//   } else {
//       audioData = buffer.getChannelData(0);
//   }
//   var mt = new MusicTempo(audioData);
//
//   console.log(mt.tempo);
//   console.log(mt.beats);
// }





// calcTempo(audioSource);
