var StepperWiringPi = require("stepper-wiringpi");

var pubnub = require('pubnub').init({
  publish_key: "pub-c-00782af2-d126-4201-b58f-42af72ec526e",
  subscribe_key: "sub-c-bf5418c8-4fdf-11e9-aa90-a6f7447e8d57",
});


console.log("working pi");

var channel = 'stepper';
var pinIN1 = 17; //Port 11
var pinIN2 = 16; //Port 36
var pinIN3 = 13; //Port 33
var pinIN4 = 12; //Port 32
var motor = StepperWiringPi.setup(200, pinIN1, pinIN2, pinIN3, pinIN4);
motor.setSpeed(60);


 pubnub.subscribe({
    channel: channel,
    message: function(m) {
      console.log("received message")
      if (m.dir === "cw") {
	console.log("left 50 degree");
	motor.step(-800, function() {
		console.log("Done moving right in ccw");
	});

      } else if (m.dir === "ccw") {
	console.log(" 50 degree");
	motor.step(800, function() {
		console.log("Done moving left in ccw");
	});
      }
    },
    error: function(err) {console.log(err);}
})

