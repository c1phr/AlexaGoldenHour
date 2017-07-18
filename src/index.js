'use strict';
var Alexa = require('alexa-sdk');
const GoldenHourCalc = require('js-golden-hour');
const request = require('request-promise-native');
var APP_ID = process.env['app_id'];
var zipcode;
var consentToken = null;
var deviceId = null;

const SKILL_NAME = "Golden Hour";
const PERMISSION_ERROR_MESSAGE = "I'm sorry, I require access to your location to use that functionality. Please allow access to location in the Alexa app."
const LOCATION_ERROR_MESSAGE = "I'm sorry, I was unable to get your location."
const SPOKEN_LOCATION_ERROR_MESSAGE = "I'm sorry, I was unable to find that location. Please say a valid US zip code."
const HELP_MESSAGE = "You can ask me when you should take photos, or when the next golden hour is in a particular zip code.";
const HELP_REPROMPT = "What can I help you with?";
const STOP_MESSAGE = "Goodbye!";

var getGoldenHourResponse = function(zipcode) {
    // return {
    //     combinedResponses: "test string"
    // }
    
    console.log("Getting golden hour responses for " + zipcode)
    const goldenHour = new GoldenHourCalc(zipcode)
    const location = goldenHour.location
    const locationString = "In " + location.city + ", "
    const morning = goldenHour.goldenHourMorning()
    const evening = goldenHour.goldenHourEvening()
    const morningResponse = "The next morning golden hour will start at " + morning.start.format('h:mm a') + " and end at " + morning.end.format('h:mm a') + ". ";
    const eveningResponse = "The next evening golden hour will start at " + evening.start.format('h:mm a') + " and end at " + evening.end.format('h:mm a') + ".";
    return {
        morningResponse: morningResponse,
        eveningResponse: eveningResponse,
        combinedResponses: locationString + morningResponse + eveningResponse
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
    return request(options)
}

exports.handler = function(event, context, callback) {
    console.log("Starting Golden Hour Skill");
    console.log("EVENT: ", event);
    console.log("CONTEXT: ", context);
    var alexa = Alexa.handler(event, context);
    if (event.context) {
        if (event.context.System) {
            deviceId = event.context.System.device.deviceId;
            consentToken = event.context.System.user.permissions.consentToken;
        }
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
        const alexaHandler = this
        if (deviceId === null || consentToken === null) {
            alexaHandler.emit(':tell', PERMISSION_ERROR_MESSAGE)
            return
        }
        
        return getZipcode(deviceId, consentToken).then(function(data) { 
            console.log("ZIP Response: " + data)
            zipcode = JSON.parse(data).postalCode
            console.log("Getting golden hour for zipcode: " + zipcode)
            const responses = getGoldenHourResponse(zipcode)
            alexaHandler.emit(':tell', responses.combinedResponses) 
            return responses
        })
        .catch(function(err){
            console.log(err);
            alexaHandler.emit(':tell', LOCATION_ERROR_MESSAGE)
        })
        
    },
    'GetGoldenHourForZipIntent': function() {
        var spokenZip = this.event.request.intent.slots.Zipcode.value;
        if (!(/(^\d{5}$)/.test(spokenZip))) {
            this.emit(":tell", SPOKEN_LOCATION_ERROR_MESSAGE)
        }
        console.log("Getting golden hour for spoken zip: " + spokenZip)
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