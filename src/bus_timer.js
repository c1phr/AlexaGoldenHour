'use strict';
var request = require('request-promise-native');

const mbtaApi = 'http://realtime.mbta.com/developer/api/v2/';
var api_key;

var getPrediction = function(route, stop, direction, apiKey) {
    console.log("Get Prediction called with Route: " + route + " Stop: " + stop + " Direction: " + direction);    
    api_key = apiKey;
    var routeId = getRouteId(route);    
    return getStopId(routeId, stop, direction).then(function(stopId) {        
        return getTime(routeId, stopId);
    });    
}

var getTime = function(route, stop) {
    if (route === undefined) {
        throw Error("ROUTE");
    }
    if (stop === undefined) {
        throw Error("STOP");
    }
    var predictionOpts = {
        uri: mbtaApi + 'predictionsbystop',
        qs: {            
            stop: stop            
        }        
    };
    return httpGet(predictionOpts).then(function(predictionData) {
        if (predictionData.mode === undefined) {
            return undefined;
        }
        var predictedMinutes = Math.floor(predictionData.mode[0].route[0].direction[0].trip[0].pre_away / 60);
        return predictedMinutes;
    });
}

var getRouteId = function(routeName) {
    if (isNumber(routeName)) { // Short circuit for bus route inputs (id === route number for MBTA)
        return parseInt(routeName);
    }
    var routeOpts = {
        uri: mbtaApi + 'routes'        
    }
    return httpGet(routeOpts).then(function(routeData) {        
        var possibleRoutes = [];
        routeData.forEach(function(modeElem) {
            modeElem.route.forEach(function(routeElem) {
                var matchConfidence = fuzzyMatch(routeName, routeElem.route_name);
                if (matchConfidence > 0) {
                    possibleRoutes.push({route: routeElem, confidence: matchConfidence});
                }
            });
        });

        possibleRoutes.sort(function(a, b) {
            return b.confidence - a.confidence;
        });
        return possibleRoutes.length > 0 ? possibleRoutes[0].route.route_id : undefined;
    });
}

var getStopId = function(route, stopName, directionName) {
    var stopOpts = {
        uri: mbtaApi + 'stopsbyroute',
        qs: {
            route: route
        }
    };
    stopName = stopName.toLowerCase();
    return httpGet(stopOpts).then(function(directionData) {
        var possibleStops = [];        
        directionData.direction.forEach(function(direction) {                   
            if (directionName === undefined || direction.direction_name.toLowerCase() === directionName.toLowerCase()) {
                direction.stop.forEach(function(stop) {
                    var matchConfidence = fuzzyMatch(stopName, stop.stop_name.toLowerCase());
                    if (matchConfidence > 0) {
                        possibleStops.push({stop: stop, confidence: matchConfidence});
                    }
                });
            }
        });        
        possibleStops.sort(function(a, b) {
            return b.confidence - a.confidence;
        });                        
        return possibleStops.length > 0 ? possibleStops[0].stop.stop_id : undefined;
    });
}

// Helpers

var fuzzyMatch = function(source, toMatch) {
    var sourceSplit = source.split(' ');
    var matchSplit = toMatch.split(' ');
    var confidence = 0;
    sourceSplit.forEach(function(sourceWord) {
        if (matchSplit.indexOf(sourceWord) > -1) {
            confidence++;
        }
    });
    return confidence / matchSplit.length;
}

var httpGet = function(opts, callback) {
    opts.qs.api_key = api_key;
    opts.qs.format = 'json';
    opts.json = true;    
    return request(opts);    
}

var isNumber = function(input) {
    return !isNaN(parseInt(input)) && isFinite(input);
}

exports.getPrediction = getPrediction;

// getPrediction("426", "Salem St @ Cutler Highway", "Inbound").then(function(prediction) {
//     console.log(prediction);
// });