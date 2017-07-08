var bus_timer = require('./bus_timer.js');
//var assert = require('assert');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var should = chai.should();

describe('bus timer tests', function() {
    it ('should return a time with a stop, route, and no direction', function() {        
        bus_timer.getPrediction("426", "market street at commuter rail", undefined, process.env['mbta_api'])
            .should.eventually.not.equal(undefined);        
    });
    it ('should return a time with a stop, route, and direction', function() {        
        return bus_timer.getPrediction("1", "Washington Street at Ruggles Sreet", "outbound", process.env['mbta_api'])
            .should.eventually.not.equal(undefined);        
    });
})