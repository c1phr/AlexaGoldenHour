'use strict';
var Alexa = require('alexa-sdk');
const GoldenHourCalc = require('js-golden-hour');
const request = require('request-promise-native');

var APP_ID = process.env['app_id'];
var zipcode;
var consentToken;
var deviceId;

var SKILL_NAME = "Golden Hour";
var GET_FACT_MESSAGE = "Here's your fact: ";
var HELP_MESSAGE = "You can say tell me a space fact, or, you can say exit... What can I help you with?";
var HELP_REPROMPT = "What can I help you with?";
var STOP_MESSAGE = "Goodbye!";

//=========================================================================================================================================
//Editing anything below this line might break your skill.  
//=========================================================================================================================================
exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    deviceId = context.System.device.deviceId;
    consentToken = context.System.user.permissions.consentToken;
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('GetGoldenHourIntent');
    },
    "GetGoldenHourIntent": function (intent, session, response) {        
        getZipcode(deviceId, consentToken).then(function(data) {
            zipcode = data.postalCode;            
            console.log("Getting golden hour for zipcode: " + zipcode)
            const responses = getGoldenHourResponse(zipcode)
            response.tell(responses.combinedResponses)       
        })
        .catch(function(err){
            console.log(err);
            response.tell("I'm sorry, I require access to your location to use that functionality. Please allow access to location in the Alexa app.")
        })
        
    },
    'GetGoldenHourForZipIntent': function(intent, session, response) {
        var spokenZip = intent.slots.Zipcode.value;
        console.log("Getting golden hour for spoken zip: " + spokenZip)
        if (spokenZip === undefined) {
            spokenZip = zipcode
        }
        const responses = getGoldenHourResponse(zipcode)
        response.tell(responses.combinedResponses)
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = HELP_MESSAGE;
        var reprompt = HELP_REPROMPT;
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    }
};

function getZipcode(deviceId, consentToken) {
    const options = {
        uri: 'https://api.amazonalexa.com/v1/devices/' + deviceId + '/settings/address/countryAndPostalCode',
        headers: {
            'Authorization': 'Bearer ' + consentToken,
            'Accept': 'application/json'
        }
    }
    return request(options);    
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