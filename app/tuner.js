// app/tuner.js

// ---- Define global Tuner constructor ----
const Tuner = function (a4) {
  this.middleA   = a4 || 440;
  this.semitone  = 69;
  this.bufferSize = 4096;
  this.noteStrings = [
    "C","C♯","D","D♯","E","F",
    "F♯","G","G♯","A","A♯","B"
  ];
};

// ---- 1) AudioContext + analyser + processor ----
Tuner.prototype.initAudioContext = function () {
  // Create/resume the audio context
  this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (this.audioContext.state === "suspended") {
    this.audioContext.resume().catch(() => {});
  }
  // Create nodes
  this.analyser = this.audioContext.createAnalyser();
  this.scriptProcessor = this.audioContext.createScriptProcessor(
    this.bufferSize, 1, 1
  );
};

// ---- 2) Connect mic → analyser → processor & aubio ----
Tuner.prototype.startRecord = function (stream) {
  // Mic → analyser → processor → output
  const source = this.audioContext.createMediaStreamSource(stream);
  source.connect(this.analyser);
  this.analyser.connect(this.scriptProcessor);
  this.scriptProcessor.connect(this.audioContext.destination);

  // Ensure context is running
  if (this.audioContext.state === "suspended") {
    this.audioContext.resume().catch(() => {});
  }

  const self = this;
  // aubio() returns a Promise that resolves with the module
  aubio().then(function (aubio) {
    self.pitchDetector = new aubio.Pitch(
      "default",
      self.bufferSize,
      1,
      self.audioContext.sampleRate
    );
    // On each audio frame, detect pitch and fire callback
    self.scriptProcessor.addEventListener("audioprocess", function (event) {
      const freq = self.pitchDetector.do(
        event.inputBuffer.getChannelData(0)
      );
      if (freq && self.onNoteDetected) {
        const noteNum = self.getNote(freq);
        self.onNoteDetected({
          name:      self.noteStrings[noteNum % 12],
          value:     noteNum,
          cents:     self.getCents(freq, noteNum),
          octave:    parseInt(noteNum / 12, 10) - 1,
          frequency: freq
        });
      }
    });
  });
};

// ---- 3) Helpers (unchanged) ----
Tuner.prototype.getNote = function (frequency) {
  const note = 12 * (Math.log(frequency / this.middleA) / Math.log(2));
  return Math.round(note) + this.semitone;
};

Tuner.prototype.getStandardFrequency = function (note) {
  return this.middleA * Math.pow(2, (note - this.semitone) / 12);
};

Tuner.prototype.getCents = function (frequency, note) {
  return Math.floor(
    (1200 * Math.log(frequency / this.getStandardFrequency(note))) /
    Math.log(2)
  );
};

Tuner.prototype.play = function (frequency) {
  if (!this.oscillator) {
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.connect(this.audioContext.destination);
    this.oscillator.start();
  }
  this.oscillator.frequency.value = frequency;
};

Tuner.prototype.stopOscillator = function () {
  if (this.oscillator) {
    this.oscillator.stop();
    this.oscillator = null;
  }
};
