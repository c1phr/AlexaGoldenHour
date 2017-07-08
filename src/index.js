'use strict';
var AWS = require('aws-sdk');
var AlexaSkill = require('./AlexaSkill.js');
const APP_ID = process.env['app_id'];
const GoldenHourCalc = require('js-golden-hour');
const request = require('request-promise-native')

var zipcode;

var AlexaGoldenHour = function (callback) {
    this.callback = callback;
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
AlexaGoldenHour.prototype = Object.create(AlexaSkill.prototype);
AlexaGoldenHour.prototype.constructor = AlexaGoldenHour;

AlexaGoldenHour.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("AlexaGoldenHour onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

AlexaGoldenHour.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("AlexaGoldenHour onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "Which bus and stop would you like to know about?";
    var repromptText = "Ask about a Boston area bus";
    response.ask(speechOutput, repromptText);
};

AlexaGoldenHour.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("AlexaGoldenHour onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

AlexaGoldenHour.prototype.intentHandlers = {
    // register custom intent handlers
    "GetGoldenHourIntent": function (intent, session, response) {        
        const responses = getGoldenHourResponse(zipcode)
        response.tell(responses.combinedResponses)       
    },
    'GetGoldenHourForZipIntent': function(intent, session, response) {
        var spokenZip = intent.slots.Zipcode.value;
        if (spokenZip === undefined) {
            spokenZip = zipcode
        }
        const responses = getGoldenHourResponse(zipcode)
        response.tell(responses.combinedResponses)
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("I can tell you what time the next golden hour will be in your location.");
    },
    "AMAZON.StopIntent": function(intent, session, response) {
        response.cancel();
    },
    "AMAZON.CancelIntent": function(intent, session, response) {
        response.cancel();
    },
    "AMAZON.NoIntent": function(intent, session, response) {
        response.cancel();
    }
}; 
 
function processEvent(event, context, callback) {
    var AlexaGoldenHour = new AlexaGoldenHour();
    const deviceId = context.System.device.deviceId;
    const consentToken = context.System.user.permissions.consentToken;
    getZipcode(deviceId, consentToken).then(function(data) {
        zipcode = data.postalCode;
        AlexaGoldenHour.execute(event, context);
    })    
}

function getZipcode(deviceId, consentToken) {
    const options = {
        uri: 'https://api.amazonalexa.com/v1/devices/' + deviceId + '/settings/address/countryAndPostalCode',
        headers: {
            'Authorization': 'Bearer ' + consentToken,
            'Accept': 'application/json'
        }
    }
    return request(opts);    
}

function getGoldenHourResponse(zipcode) {
    const goldenHour = new GoldenHourCalc(zipcode)
        const location = goldenHour.location
        const morning = goldenHour.goldenHourMorning()
        const evening = goldenHour.goldenHourEvening()
        const morningResponse = "The next morning golden hour will start at " + morning.start + " and end at " + morning.end + ". ";
        const eveningResponse = "The next evening golden hour will start at " + evening.start + " and end at " + evening.end + ".";
        return {
            morningResponse: morningResponse,
            eveningResponse: eveningResponse,
            combinedResponses: morningResponse + eveningResponse
        }
}

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);   
};