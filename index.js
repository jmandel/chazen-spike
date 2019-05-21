console.log("Start");

const QUEUE_DELAY = 0.05;
const FADE_TIME = 0.1;

if (module.hot) {
  module.hot.accept(function () {
    location.reload();
  });
}

window.audioCtx = new window.AudioContext();

var mapped = [...Array(10).keys()]
  .map(k => ("" + (k + 1)).padStart(2, "0"))
  .map(k => `sitting/sitting.${k}.ogg`)
  .map(o => fetch(o).then(or => or.arrayBuffer()).then(buffer => {
    return new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(buffer, function (decodedData) {
        resolve(decodedData);
      });
    })
  }))

Promise.all(mapped).then(soundBuffers => {

  console.log(soundBuffers);
  var startTime = audioCtx.currentTime;
  window.soundBuffers = soundBuffers

  var duration = Math.min.apply(null, soundBuffers.map(b => b.duration));
  console.log("midur", duration)
  var durationMs = duration * 1000;
  var currentIteration = 0;

  var plays = [];

  enqueue(currentIteration);
  setTimeout(() => (setInterval(() => {
    ensureNextSegment(currentIteration);
  }, durationMs * .50)), 100)

  function nextSegmentFrom(which) {
    return which;
  }

  function ensureNextSegment() {
    var now = audioCtx.currentTime + QUEUE_DELAY;
    var absoluteOffset = (now - startTime);
    var nextSegmentTime = startTime + duration * Math.ceil(absoluteOffset / duration);

    var source = audioCtx.createBufferSource();
    console.log("Ensure next", currentIteration, nextSegmentTime);
    source.buffer = soundBuffers[nextSegmentFrom(currentIteration)];
    var gainNode = audioCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
    source.start(nextSegmentTime, 0, duration);
    plays.filter(p => p[0] == nextSegmentTime).forEach(p => p[2].stop())
    plays = plays.filter(p => p[0] !== nextSegmentTime || p[0] < now - duration).concat([
      [nextSegmentTime, gainNode, source]
    ]);
  }

  function enqueue(iteration) {
    var source = audioCtx.createBufferSource();
    currentIteration = iteration;
    source.buffer = soundBuffers[iteration];
    var gainNode = audioCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    console.log("gmx", gainNode.gain.maxValue)

    var now = audioCtx.currentTime;
    var absoluteOffset = (now - startTime);
    var offset = absoluteOffset - duration * Math.floor(absoluteOffset / duration);

    gainNode.gain.exponentialRampToValueAtTime(1.0, now + QUEUE_DELAY + FADE_TIME);
    source.start(now + QUEUE_DELAY, offset + QUEUE_DELAY, duration - offset - QUEUE_DELAY);
    console.log(plays)
    plays.forEach(p => p[1].gain.exponentialRampToValueAtTime(0.0001, now + QUEUE_DELAY + FADE_TIME) && p[2].stop(now + QUEUE_DELAY + 2 * FADE_TIME));
    plays = [
      [now + QUEUE_DELAY, gainNode, source]
    ];
    ensureNextSegment();
  }

  window.enqueue = enqueue;
})