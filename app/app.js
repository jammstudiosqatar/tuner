// app/app.js
import { SmoothingModes } from './smoothing.js';

const Application = function () {
  this.initA4();
  this.tuner         = new Tuner(this.a4);
  this.notes         = new Notes('.notes', this.tuner);
  this.meter         = new Meter('.meter');
  this.frequencyBars = new FrequencyBars('.frequency-bars');

  this.lastSmoothedCents = 0;
  // ← Switch here to springDamper
  this.smoothingMode     = 'springDamper';

  // seed initial display
  this.update({ name:'A', frequency:this.a4, octave:4, value:69, cents:0 });
};

Application.prototype.initA4 = function () {
  this.$a4 = document.querySelector('.a4 span');
  this.a4  = parseInt(localStorage.getItem('a4')) || 440;
  this.$a4.textContent = this.a4;
};

Application.prototype.start = function () {
  const self = this;

  this.tuner.onNoteDetected = function (note) {
    if (!self.notes.isAutoMode) return;
    if (self.lastNote === note.name) {
      self.update(note);
    } else {
      self.lastNote = note.name;
    }
  };

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      this.tuner.initAudioContext();
      this.tuner.startRecord(stream);
      this.frequencyData = new Uint8Array(this.tuner.analyser.frequencyBinCount);
      this.updateFrequencyBars();
    })
    .catch(() => {
      swal.fire('Microphone access is required to use the tuner.');
    });

  this.$a4.parentNode.addEventListener('click', () => {
    swal
      .fire({ input: 'number', inputValue: this.a4 })
      .then(({ value }) => {
        const newA4 = parseInt(value);
        if (newA4 && newA4 !== this.a4) {
          this.a4 = newA4;
          this.$a4.textContent = this.a4;
          this.tuner.middleA = this.a4;
          this.notes.createNotes();
          this.update({ name:'A', frequency:this.a4, octave:4, value:69, cents:0 });
          localStorage.setItem('a4', this.a4);
        }
      });
  });

  document.querySelector('.auto input').addEventListener('change', () => {
    this.notes.toggleAutoMode();
  });
};

Application.prototype.updateFrequencyBars = function () {
  if (this.tuner.analyser) {
    this.tuner.analyser.getByteFrequencyData(this.frequencyData);
    this.frequencyBars.update(this.frequencyData);
  }
  requestAnimationFrame(this.updateFrequencyBars.bind(this));
};

Application.prototype.update = function (note) {
  this.notes.update(note);

  // apply spring-damper smoothing
  this.lastSmoothedCents = SmoothingModes[this.smoothingMode](
    note.cents,
    this.lastSmoothedCents,
    {
      stiffness: 0.25,  // tweak between 0.1–0.5
      damping:   0.8    // tweak between 0.5–0.9
    }
  );

  const deg = (this.lastSmoothedCents / 50) * 45;
  this.meter.update(deg);
};

// kick things off
const app = new Application();
app.start();
