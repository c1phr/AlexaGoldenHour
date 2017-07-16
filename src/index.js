'use strict';
var Alexa = require('alexa-sdk');
const GoldenHourCalc = require('js-golden-hour');
const request = require('request-promise-native');
var APP_ID = process.env['app_id'];
var zipcode = "02151";
var consentToken = null;
var deviceId = null;

const SKILL_NAME = "Golden Hour";
const GET_FACT_MESSAGE = "Here's your fact: ";
const HELP_MESSAGE = "You can say tell me a space fact, or, you can say exit... What can I help you with?";
const HELP_REPROMPT = "What can I help you with?";
const STOP_MESSAGE = "Goodbye!";

var getGoldenHourResponse = function(zipcode) {
    // return {
    //     combinedResponses: "test string"
    // }
    
    console.log("Getting golden hour responses for " + zipcode)
    const goldenHour = new GoldenHourCalc(zipcode)
    const location = goldenHour.location
    const morning = goldenHour.goldenHourMorning()
    const evening = goldenHour.goldenHourEvening()
    const morningResponse = "The next morning golden hour will start at " + morning.start.format('h:mm a') + " and end at " + morning.end.format('h:mm a') + ". ";
    const eveningResponse = "The next evening golden hour will start at " + evening.start.format('h:mm a') + " and end at " + evening.end.format('h:mm a') + ".";
    return {
        morningResponse: morningResponse,
        eveningResponse: eveningResponse,
        combinedResponses: morningResponse + eveningResponse
    }
}

var getZipcode = function(deviceId, consentToken) {
    
    console.log("GETTING ZIPCODE: " + deviceId + " | " + consentToken)
    const options = {
        uri: 'https://api.amazonalexa.com/v1/devices/' + deviceId + '/settings/address/countryAndPostalCode',
        headers: {
            'Authorization': 'Bearer ' + consentToken,
            'Accept': 'application/json'
        }
    }
    return request(options).then(function(data){
        return data.postalCode
    })    
}

exports.handler = function(event, context, callback) {
    console.log("Starting Golden Hour Skill");
    console.log("EVENT: ", event);
    console.log("CONTEXT: ", context);
    var alexa = Alexa.handler(event, context);
    if (context.System) {
        deviceId = context.System.device.deviceId;
        consentToken = context.System.user.permissions.consentToken;
    }    
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('GetGoldenHourIntent');
    },
    "GetGoldenHourIntent": function () {
        if (deviceId === null || consentToken === null) {
            response.tell("I'm sorry, I require access to your location to use that functionality. Please allow access to location in the Alexa app.")
            return
        }
        return getZipcode(deviceId, consentToken).then(function(zipcode) { 
            console.log("Getting golden hour for zipcode: " + zipcode)
            const responses = getGoldenHourResponse(zipcode)
            this.emit(':tell', responses.combinedResponses) 
            return responses
        })
        .catch(function(err){
            console.log(err);
            response.tell("I'm sorry, I require access to your location to use that functionality. Please allow access to location in the Alexa app.")
        })
        
    },
    'GetGoldenHourForZipIntent': function() {
        var spokenZip = this.event.request.intent.slots.Zipcode.value;
        console.log("Getting golden hour for spoken zip: " + spokenZip)
        if (spokenZip === undefined) {
            spokenZip = zipcode
        }
        const responses = getGoldenHourResponse(spokenZip)
        console.log("Responding with: " + responses.combinedResponses)
        this.emit(':tell', responses.combinedResponses)
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = HELP_MESSAGE
        var reprompt = HELP_REPROMPT
        this.emit(':ask', speechOutput, reprompt)
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE)
    }
};