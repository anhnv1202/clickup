RECALCULATION_TIMEOUT = 10000; // ms before send recalculation request
ML_VS_BASE_URL = "https://visitor-scoring-c.marketlinc.com";
cookies = {
    PREFIX: "cookie_",
    VISITOR_ID_COOKIE_NAME: "vs_vid",
    SESSION_ID_COOKIE_NAME: "vs_sid",
    VISITOR_FIRST_SESSION_COOKIE_NAME: "vs_vfs",
    CONVERSATION_PROBABILITY_COOKIE_NAME: "vs_conv_ai",
    UPLIFT_PROBABILITY_COOKIE_NAME: "vs_lift_ai",
    PERSISTED_COOKIE_EXPIRATION: 365 * 10,
    ENGAGEMENT_GROUP_COOKIE_NAME: "vs_eg",
    SESSION_RANDOM_NUMBER_COOKIE_NAME: "vs_srn",

    get: function(name) {
        return utils.getParam(document.cookie, name, ";");
    },

    set: function(name, value, options) {
        options = options || {};

        var expires = options.expires;
        if (typeof expires == "number" && expires) {
            var date = new Date();
            date.setDate(date.getDate() + expires);
            expires = options.expires = date;
        }

        if (expires && expires.toUTCString) {
            options.expires = expires.toUTCString();
        }

        if (!options.path) {
            options.path = "/";
        }

        if (!options.domain) {
            options.domain = utils.resolveDomain(window.location.hostname)
        }

        value = encodeURIComponent(value);
        var updatedCookie = name + "=" + value;
        for (var option in options) {
            if (options.hasOwnProperty(option)) {
                updatedCookie += "; " + option;
                var optionValue = options[option];
                if (optionValue !== true) {
                    updatedCookie += "=" + optionValue;
                }
            }
        }
        document.cookie = updatedCookie;
    },

    //set cookies parameter if is absent
    setIfAbsent: function(name, value, options) {
        if (cookies.get(name) == null) {
            cookies.set(name, value, options);
        }
    },

    clear: function(name) {
        var domain = utils.resolveDomain(document.location.hostname);
        document.cookie = name + "=; path=/; " + "domain=" + domain + ";expires=Thu, 01 Jan 1970 00:00:00 UTC";
        document.cookie = name + "=; path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC";
    }
};

utils = {
    //get parameters
    getParam: function(source, name, delimiter) {
        var param;
        var params = source.split(delimiter);
        for (var i = 0, length = params.length; i < length; ++i) {
            param = params[i].replace(/^\s+|\s+$/g, "");
            if (param.indexOf(name + "=") == 0) {
                return param.substr(name.length + 1);
            }
        }
        return null;
    },

    //resolve domain
    resolveDomain: function(hostname) {
        if (hostname == "localhost") {
            return ""
        } else {
            dom_periods = hostname.split(".")
            if (dom_periods[dom_periods.length - 1].match(/com|ca|ai|in|io|org|net/g))
                tld_domain = "." + dom_periods.splice(-2).join(".")
            else
                tld_domain = "." + dom_periods.splice(-3).join(".")
            return tld_domain;
        }
    }
};

var GLOBAL_VARIABLE = {
    PREFIX: "global_",

    PARAMETERS: [
        "ml_mwbc1",
        "ml_mwbc2",
        "ml_mwbc3",
        "ml_mwbc4"
    ]
};

//implements logging functions
logger = function() {
    var enabled = false;

    return {
        //switch on enable logging variable
        enableLogging: function() {
            enabled = true;
        },

        //checks the url is logging enabled
        checkUrlOnLoggingEnabled: function() {
            var url = window.location.href;
            if (url.indexOf("log_enabled=true") != -1) {
                return true;
            } else {
                return false;
            }
        },
        //print log message to console
        log: function(message) {
            if (enabled && window.console) {
                console.log("VISITOR SCORING: " + message);
            }
        }
    }
}();

requestQueue = function() {

    var RETRY_INTERVAL = 3000;
    var MAX_RETRIES = 3;

    var _queue = [];
    var _requestActive = false;

    var _processJob = function() {
        if (!_requestActive && _queue.length > 0) {
            var job = _queue.shift();
            job();
        }
    };

    var _enqueue = function(url, body, callback, allowBeacon, metadata) {
        // Wrapper on the provided optional callback, so we can hook in processing state as well
        var callbackWrapper = function(xhr) {
            try {
                if (xhr.status === 200 && callback instanceof Function) {
                    callback(xhr);
                } else if ([500, 502, 503].includes(xhr.status)) {
                    if (metadata == null || metadata.retryAttempts < MAX_RETRIES) {
                        if (metadata == null) {
                            metadata = {};
                            metadata.retryAttempts = 0;
                        }

                        metadata.retryAttempts++;
                        setTimeout(function() {
                            _enqueue(url, body, callback, allowBeacon, metadata)
                        }, RETRY_INTERVAL);
                    }
                }
            } catch (e) {} finally {
                requestActive = false;
                _processJob();
            }
        }

        // Generic "post to this URL" job template
        var postFunction = function() {
            if (allowBeacon && "sendBeacon" in window.navigator) {
                navigator.sendBeacon(url, JSON.stringify(body));
            } else {
                var xhr = new(window.ActiveXObject || XMLHttpRequest)("Microsoft.XMLHTTP");
                xhr.onload = function() {
                    callbackWrapper(xhr)
                };
                xhr.open("POST", url, true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(JSON.stringify(body));
            }
        }

        // Push job and process the first job in the queue
        _queue.push(function() {
            requestActive = true;
            postFunction();
        });

        _processJob();
    }

    return {
        enqueue: function(url, body, callback, allowBeacon, metadata) {
            return _enqueue(url, body, callback, allowBeacon, metadata);
        }
    }
}();

//js for getting scoring
window.scoring = function() {

    var middlewareBaseUrl;
    var dataCollector;
    var visitorArrivesPageTime = new Date();
    var pageVisible;
    var isFirstPageView = false;
    var heartBeatIntervalId = 0;

    var HEARTBEAT_INTERVAL = 15000000;

    var documentIsVisible = function() {
        // If the browser is sufficiently old, then document.visibilityState
        // will be undefined. By checking if the value is not hidden, we will default
        // to the document always being visible for these old browsers.
        return document.visibilityState !== 'hidden';
    }

    var timer = function() {
        var _totalTime;
        var _startDate;

        return {
            init: function() {
                _totalTime = 0;
                _startDate = (pageVisible) ? new Date() : null
            },

            getTime: function() {
                var calculatedTime = _totalTime;

                if (_startDate) {
                    // calculate the total time, which is the previous
                    // slices + the new slice.
                    calculatedTime += (new Date() - _startDate);
                }

                return calculatedTime / 1000;
            },

            stop: function() {
                if (_startDate) {
                    _totalTime += new Date() - _startDate;
                    _startDate = null;
                }
            },

            start: function() {
                if (!_startDate) {
                    _startDate = new Date();
                }
            }
        }
    }();

    //gets url parameter value
    function getParamValue(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)', "i").exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
    }

    function getParam(paramName) {
        var paramValue = getParamValue(paramName);
        return (paramValue) ? "&" + paramName + '=' + paramValue : ''
    }

    //gets cookies
    function getCookies() {
        var result = {};
        document.cookie.split(/;\s*/).forEach(function(part) {
            var cookie = part.split("=");
            result[cookies.PREFIX + cookie[0]] = encodeURIComponent(cookie[1]);
        });
        return result;
    }

    //checks value is primitive
    function isPrimitive(value) {
        return typeof value == "string" || typeof value == "number" || typeof value == "boolean";
    }

    //gets global variable value
    function getGlobalVariableValue(name) {
        var value = "";
        try {
            value = eval(name);
        } catch (e) {}
        return isPrimitive(value) ? encodeURIComponent(value) : "";
    }

    //gets global variables
    function getGlobalVariables() {
        var result = {};
        var variables = GLOBAL_VARIABLE.PARAMETERS;
        for (var key in variables) {
            if (variables.hasOwnProperty(key)) {
                var name = variables[key];
                result[GLOBAL_VARIABLE.PREFIX + name] = getGlobalVariableValue(name);
            }
        }
        return result;
    }

    //gets url parameters
    function getUrlParameters(query) {
        var result = {};
        query.split("&").forEach(function(part) {
            var item = part.split("=");
            result[item[0]] = decodeURIComponent(item[1]);
        });
        return result;
    }

    //update visitor parameters in cookies
    function updateCookies(visitorId, sessionId, conversionProbability, upliftProbability) {
        if (cookies.get(cookies.VISITOR_ID_COOKIE_NAME) == null) {
            cookies.set(cookies.VISITOR_ID_COOKIE_NAME, visitorId, {
                expires: cookies.PERSISTED_COOKIE_EXPIRATION
            });
            // cookie which said that this is first session (visitor type eq NEW)
            cookies.set(cookies.VISITOR_FIRST_SESSION_COOKIE_NAME, "1");
        }

        cookies.setIfAbsent(cookies.SESSION_ID_COOKIE_NAME, sessionId);
        cookies.set(cookies.CONVERSATION_PROBABILITY_COOKIE_NAME,
            convertProbabilityToRange(conversionProbability));
        cookies.set(cookies.UPLIFT_PROBABILITY_COOKIE_NAME,
            convertProbabilityToRange(upliftProbability));
    }

    //Returns range of probability as String calculated from gotten probability value.
    //Step of definition is 0.05(from 0 to 1).
    function convertProbabilityToRange(probability) {
        if (typeof probability != "number" || probability < 0.05) {
            return "0-4"
        }
        if (probability >= 0.95) {
            return "95-100"
        }

        //translate probability to percent.
        var probabilityInPercent = probability * 100;

        //tens of digits.
        var divValue = Math.floor(probabilityInPercent / 10);

        //units of digit.
        var modValue = probabilityInPercent % 10;

        //calculate probability lower range limit.
        var lowerRangeLimit = modValue >= 5 ? divValue * 10 + 5 : divValue * 10;

        //returns probability string representation in percent according to gotten probability, e.g. 0.03 => "0-4"
        return lowerRangeLimit + "-" + (lowerRangeLimit + 4);
    }

    function getClientId() {
        try {
            var tracker = ga.getAll()[0];
        } catch (e) {

        }
        if (tracker !== undefined) {
            return tracker.get('clientId');
        } else {
            try {
                var name = "_ga";
                var matches = document.cookie.match(new RegExp(
                    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
                ));
                var cidLong = matches ? decodeURIComponent(matches[1]) : undefined;
                var tmp = cidLong.split('.');
                var cid = tmp[2] + '.' + tmp[3];
                if (cid !== null | cid !== undefined | cid !== "") {
                    return cid;
                } else {
                    console.log("ERROR! Can't get clientId.")
                }
            } catch (e) {

            }
        }
    }

    //get page viewId
    function getViewId() {
        var url = document.getElementById("vs_snippet_script_id").src;
        return getUrlParameters(url.split("?")[1])["viewId"];
    }

    //creates POST request with sessionId, pageViewId, timeSpent
    function sendPostRequest(url, body, callback, allowBeacon) {
        requestQueue.enqueue(url, body, callback, allowBeacon);
    }

    var sendTimeOnPage = function(isHeartbeat) {
        var url = middlewareBaseUrl + "/time-on-page";

        var body = {
            sessionId: dataCollector.sessionId,
            visitorId: dataCollector.visitorId,
            pageViewId: dataCollector.pageViewId,
            timeSpent: timer.getTime()
        };

        if (isHeartbeat) {
            body.isHeartbeat = true;
        }

        sendPostRequest(url, body, function() {}, true);
    }

    function sendRecalculationRequest() {
        var currentDate = new Date();
        var url = middlewareBaseUrl + "/visitor-scoring/recalculate";

        var body = {
            visitorId: dataCollector.visitorId,
            sessionId: dataCollector.sessionId,
            pageViewId: dataCollector.pageViewId,
            timeSpent: (currentDate - visitorArrivesPageTime) / 1000,
            viewId: getViewId()
        };

        // collect visitor data into datacollector object-variable from json response
        var callbackFunction = function(xhr) {
            var jsonResponse = JSON.parse(xhr.response);
            updateCookies(jsonResponse.visitorId, jsonResponse.sessionId,
                jsonResponse.conversionProbability, jsonResponse.upliftProbability);
            dataCollector = jsonResponse;
        };

        sendPostRequest(url, body, callbackFunction);
    }

    var onPageVisibilityChange = function() {
        pageVisible = documentIsVisible();

        if (pageVisible) {
            timer.start();
        } else {
            timer.stop();
        }
    }

    //create event window.onBeforeUnload before page'll be closed after user close the page
    function addEventListeners() {
        window.onbeforeunload = function() {
            if (heartBeatIntervalId) {
                clearInterval(heartBeatIntervalId);
            }
            sendTimeOnPage();
        }

        document.addEventListener("visibilitychange", onPageVisibilityChange);
    }



    //creates POST request with visitor parameters
    function sendRequestToGetPrediction() {
        try {
            // build segment request
            var url = middlewareBaseUrl + "/visitor-scoring";
            var visitorParameters = getVisitorParameters();

            // collect visitor data into datacollector object-variable from json response
            var callbackFunction = function(xhr) {
                var jsonResponse = JSON.parse(xhr.response);
                updateCookies(jsonResponse.visitorId, jsonResponse.sessionId,
                    jsonResponse.conversionProbability, jsonResponse.upliftProbability);
                dataCollector = jsonResponse;
                if (isFirstPageView) setTimeout(sendRecalculationRequest, RECALCULATION_TIMEOUT);

                // set up a heartbeat
                heartBeatIntervalId = setInterval(function() {
                    sendTimeOnPage(true)
                }, HEARTBEAT_INTERVAL);
            };

            sendPostRequest(url, visitorParameters, callbackFunction);
        } catch (e) {
            debugger;
            /* the endpoint is not available, do nothing */
        }
    }

    //check GA parametrs exist, send request
    function checkGAParametersExistThenSendRequest() {
        if ("undefined" !== typeof(getCookies()["cookie__ga"])) {
            sendRequestToGetPrediction();
        } else {
            setTimeout(sendRequestToGetPrediction, 500);
        }
    }

    //creates visitor parameters
    function getVisitorParameters() {
        return {
            referrer: encodeURIComponent(document.referrer),
            interactionType: getParamValue("interaction_type"),
            customerId: getParamValue("customerId"),
            pageName: encodeURIComponent(window.location.pathname.split("/").pop()),
            pageTitle: encodeURIComponent(document.title),
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            timezoneOffset: new Date().getTimezoneOffset(),
            deploymentParameters: {
                url: document.location.href,
                urlParameters: getUrlParameters(location.search.substr(1)),
                cookies: getCookies(),
                globalVariables: getGlobalVariables()
            },
            clientId: getClientId(),
            viewId: getViewId()
        };
    }


    return {
        tracking: {
            pageEvents: function(customData) {
                var url = middlewareBaseUrl + "/tracking-event";
                var eventTrackingData = {
                    customData: JSON.stringify(customData),
                    visitorParameters: getVisitorParameters(),
                    pageViewId: dataCollector.pageViewId
                }
                sendPostRequest(url, eventTrackingData);
            }
        },

        init: function(baseUrl) {
            middlewareBaseUrl = baseUrl;
            pageVisible = documentIsVisible();
            timer.init();
            addEventListeners();
        },

        start: function() {
            if (logger.checkUrlOnLoggingEnabled()) {
                logger.enableLogging();
            }
            if (cookies.get(cookies.VISITOR_ID_COOKIE_NAME) == null) {
                isFirstPageView = true;
            }
            checkGAParametersExistThenSendRequest();
        }
    }
}();

// main init script method
function loadVSScript() {
    var script = document.getElementById("vs_snippet_script_id");
    window.scoring.init(ML_VS_BASE_URL);
    window.scoring.start();
}

try {

    //run main init script method
    loadVSScript();
} catch (e) { /* snippet not found, do nothing */ }