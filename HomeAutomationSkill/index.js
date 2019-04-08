const Alexa = require('ask-sdk');
const PubNub = require('pubnub');
const aws = require('aws-sdk');
var cloudwatchevents = new aws.CloudWatchEvents({apiVersion: '2015-10-07'});

//initialize PubNub client
var pubnub = new PubNub({
    publishKey: "pub-c-00782af2-d126-4201-b58f-42af72ec526e",
    subscribeKey: "sub-c-bf5418c8-4fdf-11e9-aa90-a6f7447e8d57",
    ssl: true,
    uuid: "60a7e996-679a-449b-bf10-b5ceada949d4"
});

//PubNub channel
var channel = "LIGHT_CONTROL";
var slotStates = ['on', 'off'];
var topic = "TOPIC_LIGHT";
var lightSlotValue;

function controlCamera(direction){
    var message = "";
    if(direction == "right"){
      message = "cw"
    }
    else if(direction == "left"){
      message = "ccw"
    }
    pubnub.publish(
      {
          message: { 
              dir: message
          },
          channel: 'stepper',
      }, 
      function (status, response) {
          if (status.error) {
              console.log(status)
          } else {
            console.log("Success")
          }
      }
    );
  }

function turnOnLightSchedule(time){
    var splittedTime = time.split(":");
    var hour = splittedTime[0];
    var minute = splittedTime[1];
    // 30 12 * * ? *
    var cronExpression = "cron(" + minute + " " + hour + " * * ? *)";
    var params = {
      Name: 'turnOnLightCloudWatch',
      Description: 'set schedule to turn on the light',
      ScheduleExpression: cronExpression,
      State: "ENABLED",
    };
    
    cloudwatchevents.putRule(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
}

function turnOffLightSchedule(time){
    var splittedTime = time.split(":")
    var hour = splittedTime[0];
    var minute = splittedTime[1];
    // 30 12 * * ? *
    var cronExpression = "cron(" + minute + " " + hour + " * * ? *)";
    var params = {
      Name: 'turnOffLightCloudWatch',
      Description: 'set schedule to turn off the light',
      ScheduleExpression: cronExpression,
      State: "ENABLED",
    };
    
    cloudwatchevents.putRule(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
}


function disableTurnOnLightSchedule(){
    var params = {
        Name: 'turnOnLightCloudWatch'
      };

    cloudwatchevents.disableRule(params, function(err, data) {
      if (err) console.log(err, err.stack); 
      else     console.log(data);           
    });
}

function disableTurnOffLightSchedule(){
    var params = {
        Name: 'turnOffLightCloudWatch'
      };

    cloudwatchevents.disableRule(params, function(err, data) {
      if (err) console.log(err, err.stack); 
      else     console.log(data);           
    });
}

function sendMessage(lightValue) {
    var pubConfig = {
        channel: channel,
        message : {
            "topic": topic,
            "command": lightValue
        }
    };

    pubnub.publish(pubConfig,
        function(status, response){
            if (status.error) {
                console.log(status);
                return false;
            } else {
                console.log("message Published w/ timetoken", response.timetoken);
            }
        }
    );

    return true;
} 

const LaunchHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest'
    },
    handle(handlerInput) {
        const speechOutput = "Welcome to Home Automation Skill. What would you like to do?";
        return handlerInput.responseBuilder.speak(speechOutput).reprompt("I'm ready").getResponse();
    }
}

const LightScheduleHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return (request.type === 'IntentRequest' && request.intent.name === 'ScheduleLightIntent');
    },
    handle(handlerInput) {
        var state = handlerInput.requestEnvelope.request.intent.slots.state.value;
        var time = handlerInput.requestEnvelope.request.intent.slots.time.value;
        if(state == "on"){
            turnOnLightSchedule(time);
        }
        else if(state == "off"){
            turnOffLightSchedule(time);
        }

        const speechOutput = "The schedule has been set succesfully. The light will be turned " + state + " at " + time;

        return handlerInput.responseBuilder.speak(speechOutput).getResponse();
    }
};

const DisableLightScheduleHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return (request.type === 'IntentRequest' && request.intent.name === 'DisableScheduleLightIntent');
    },
    handle(handlerInput) {
        var state = handlerInput.requestEnvelope.request.intent.slots.state.value;
        if(state == "on"){
            disableTurnOnLightSchedule();
        }
        else if(state == "off"){
            disableTurnOffLightSchedule();
        }

        const speechOutput = "The turning light " + state + " schedule has been removed succesfully.";

        return handlerInput.responseBuilder.speak(speechOutput).getResponse();
    }
};

const CameraHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return (request.type === 'IntentRequest'
            && request.intent.name === 'CameraIntent');
    },
    handle(handlerInput) {
        var direction = handlerInput.requestEnvelope.request.intent.slots.direction.value;
        controlCamera(direction)
        const speechOutput = "Succeed turning " + direction + " the camera";
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .getResponse();
    }
};

const LightHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        var lightSlot = request.intent.slots.light;
        lightSlotValue = lightSlot ? lightSlot.value : "";

        return (request.type === 'IntentRequest'
            && request.intent.name === 'LightIntent'
            && slotStates.indexOf(lightSlotValue.toLowerCase()) > -1);
    },
    handle(handlerInput) {
        const speechOutput = "The light is turn " + lightSlotValue;
        //var publishSuccessStatus = true;
        var publishSuccessStatus = sendMessage(lightSlotValue);

        if(publishSuccessStatus) {
            return handlerInput.responseBuilder.speak(speechOutput).getResponse();
        } else {
            return handlerInput.responseBuilder.speak("Sorry, I can't perform this action right now.").getResponse();
        }
    }
};


const HelpHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(HELP_MESSAGE)
            .reprompt(HELP_REPROMPT)
            .getResponse();
    },
};

const ExitHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && (request.intent.name === 'AMAZON.CancelIntent'
                || request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(STOP_MESSAGE)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak('Sorry, an error occurred.')
            .reprompt('Sorry, an error occurred.')
            .getResponse();
    },
};


const HELP_MESSAGE = 'You can say tell me to control the light, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';


const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchHandler,
        CameraHandler,
        LightScheduleHandler,
        DisableLightScheduleHandler,
        LightHandler,
        HelpHandler,
        ExitHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();

