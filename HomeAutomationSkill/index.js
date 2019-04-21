const Alexa = require('ask-sdk');
const PubNub = require('pubnub');
const aws = require('aws-sdk');
var cloudwatchevents = new aws.CloudWatchEvents({ apiVersion: '2015-10-07' });

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


function controlCamera(direction) {
    var message = "";
    if (direction == "right") {
        message = "cw"
    }
    else if (direction == "left") {
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
                console.log(status);
            } else {
                console.log("Success");
            }
        });

}


function turnOnLightSchedule(hour, minute) {
    // 30 12 * * ? *
    var cronExpression = `cron(${minute} ${hour} * * ? *)`;
    var params = {
        Name: 'turnOnLightCloudWatch',
        Description: 'set schedule to turn on the light',
        ScheduleExpression: cronExpression,
        State: "ENABLED",
    };

    cloudwatchevents.putRule(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data);           // successful response
    });
}

function turnOffLightSchedule(hour, minute) {
    // 30 12 * * ? *
    var cronExpression = `cron(${minute} ${hour} * * ? *)`;

    var params = {
        Name: 'turnOffLightCloudWatch',
        Description: 'set schedule to turn off the light',
        ScheduleExpression: cronExpression,
        State: "ENABLED",
    };

    cloudwatchevents.putRule(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data);           // successful response
    });
}


function disableTurnOnLightSchedule() {
    var params = {
        Name: 'turnOnLightCloudWatch'
    };

    cloudwatchevents.disableRule(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log(data);
    });
}

function disableTurnOffLightSchedule() {
    var params = {
        Name: 'turnOffLightCloudWatch'
    };

    cloudwatchevents.disableRule(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log(data);
    });
}

function sendMessage(lightValue) {
    var pubConfig = {
        channel: channel,
        message: {
            "topic": topic,
            "command": lightValue
        }
    };

    pubnub.publish(pubConfig,
        function (status, response) {
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
        var splittedTime = time.split(":");
        var hour = splittedTime[0];
        var minute = splittedTime[1];
        timezoneHour = parseInt(hour) - 7;
        if (timezoneHour <= 0) {
            timezoneHour = timezoneHour + 24;
        }

        console.log(timezoneHour)

        if (state == "on") {
            turnOnLightSchedule(timezoneHour, minute);
        }
        else if (state == "off") {
            turnOffLightSchedule(timezoneHour, minute);
        }

        const speechOutput = `The schedule has been set succesfully. The light will be turned ${state} at ${time}`;

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
        if (state == "on") {
            disableTurnOnLightSchedule();
        }
        else if (state == "off") {
            disableTurnOffLightSchedule();
        }

        const speechOutput = "The turning light " + state + " schedule has been removed succesfully.";

        return handlerInput.responseBuilder.speak(speechOutput).getResponse();
    }
};


function listenToCameraStatus(direction) {
    return new Promise(function (resolve, reject) {
        pubnub.subscribe({ channels: ['stepper'] });
        pubnub.addListener({
            message: function (m) {
                // handle message
                var channelName = m.channel; // The channel for which the message belongs
                var msg = m.message; // The Payload
                if (channelName === 'stepper' && msg.value == "notLimited") {
                    pubnub.stop();
                    return resolve(`Succeed turning ${direction} the camera`);

                } else if (channelName === 'stepper' && msg.value == "limitReached") {
                    pubnub.stop();

                    return resolve(`The camera has reached the ${direction} limit. Please try again.`);
                }
            }
        });
    });
}


const CameraHandler = {
    canHandle(handlerInput) {
        console.log("Camera handler " + handlerInput.requestEnvelope)
        const request = handlerInput.requestEnvelope.request;
        return (request.type === 'IntentRequest'
            && request.intent.name === 'CameraIntent');
    },
    async handle(handlerInput) {
        try {
            await callDirectiveService(handlerInput, "Ok, please wait for me to send the request.");
        } catch (err) {
            console.log(err);
        }

        var direction = handlerInput.requestEnvelope.request.intent.slots.direction.value;
        controlCamera(direction);

        var speech = "";
        listenToCameraStatus(direction).then(function (value) {
            speech = value;
        })
        await sleep(1000);
        return handlerInput.responseBuilder.speak(speech).getResponse();
    }
};

function callDirectiveService(handlerInput, speech) {
    const requestEnvelope = handlerInput.requestEnvelope;
    const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();

    const requestId = requestEnvelope.request.requestId;
    const endpoint = requestEnvelope.context.System.apiEndpoint;

    const token = requestEnvelope.context.System.apiAccessToken;

    const directive = {
        header: {
            requestId,
        },
        directive: {
            type: 'VoicePlayer.Speak',
            speech: speech,
        },
    };
 
    return directiveServiceClient.enqueue(directive, endpoint, token);
}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

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
        var publishSuccessStatus = sendMessage(lightSlotValue);

        if (publishSuccessStatus) {
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


const skillBuilder = Alexa.SkillBuilders.custom();

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
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();

