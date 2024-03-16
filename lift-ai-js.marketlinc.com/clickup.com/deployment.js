var client_view_id = "12726977";

function loadLiftAI() {
    var c = document.createElement("script");
    c.type = "text/javascript";
    c.src = "https://lift-ai-js.marketlinc.com/clickup.com/snippet.js?viewId\x3d" + client_view_id;
    c.id = "vs_snippet_script_id";
    document.getElementsByTagName("head")[0].appendChild(c)
}
try {
    loadLiftAI()
} catch (c) {}



var ML_getCookie = function(ckname) {
    var ml_ckname = ckname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(ml_ckname) == 0) {
            return c.substring(ml_ckname.length, c.length);
        }
    }
    return "";
};

var ML_setCookie = function(ckname, ckvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = ckname + "=" + ckvalue + ";domain=.clickup.com;" + expires + ";path=/";
};

function ML_getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};


/*
 * Get Google Visitor ID
 * using function same as Middleware
 */

function ML_getClientId() {
    try {
        var ML_tracker = ga.getAll()[0];
    } catch (e) {

    }
    if (ML_tracker !== undefined) {
        return ML_tracker.get('clientId');
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

var ml_ga_load_count = 0;
var ml_ga_load_Interval = setInterval(function() {
    if ("ga" in window || "gtag" in window || ml_ga_load_count > 8) {
        clearInterval(ml_ga_load_Interval)
        var ml_cstatus = ML_getCookie('vs_conv_ai')
        var ml_score_int = parseInt(ml_cstatus.split('-')[1])
        var ml_vs_band = ""
        if (ml_score_int > 60) {
            ml_vs_band = "High Intent"
        } else if (ml_score_int > 30 && ml_score_int <= 60) {
            ml_vs_band = "Mid Intent"
        } else {
            ml_vs_band = "Low Intent"
        }

        var ML_vs_vid = ML_getCookie('vs_vid')
        setTimeout(function() {
            try {
                window.ml_tracker = ga.getAll()[0];

                ml_tracker.send("event", "Lift AI Score", ml_vs_band, ml_cstatus, {
                    nonInteraction: true
                });
                ml_tracker.send("event", "Lift AI VID", ML_vs_vid, {
                    nonInteraction: true
                });
            } catch (error) {}
        }, 3000);
        setTimeout(function() {
            //GA4 Event Tracking - G-CMNNJGSJVV
            if (window.gtag) {
                gtag("config", "G-CMNNJGSJVV", {
                    "send_page_view": false
                })
                gtag("event", "Lift AI Score", {
                    "lai_intent": ml_vs_band,
                    "lai_score": ML_getCookie("vs_conv_ai"),
                    "lai_vid": ML_vs_vid.toString(),
                    "send_to": "G-CMNNJGSJVV"
                });
            }
        }, 3000)
    }
    ml_ga_load_count++;
}, 1000)


/*
 * Custom code for other custom events
 * GA events are captured using template js file from lift-ai-js
 * @date: Oct 26, 2022: adding code for qualified chat and contact form click events. -v2
 */

var ml_qualified_count = 0;
//window.ml_q_cookie = ""
var ml_qualified = setInterval(function() {
    if ((document.querySelector("#q-messenger-frame") != null && ML_getCookie("ml_qc") == "") || (ml_qualified_count > 10)) {
        clearInterval(ml_qualified);
        scoring.tracking.pageEvents({
            "event": "QUALIFIED-CHAT-IMPRESSION"
        });
        ML_setCookie("ml_qc", 1)
        //	window.ml_q_cookie = ML_getCookie("__q_state_2qYJ2dzsqrwWZnjR")
    }

    /*
    	if(ml_qualified_count>15||ML_getCookie("ml_qca") != ""){
    		clearInterval(ml_qualified);
    	}
    	if(ML_getCookie("ml_qca") == ""){
    		var ml_q_accepted = ML_getCookie("__q_state_2qYJ2dzsqrwWZnjR")
    		if(window.ml_q_cookie !=  ml_q_accepted){
    			clearInterval(ml_qualified);
    			scoring.tracking.pageEvents({
    			     "event": "QUALIFIED-CHAT-ACCEPT"
    			});
    			ML_setCookie("ml_qca",1)
    		}
    	}
    */

    ml_qualified_count++;
}, 2000)

setTimeout(function() {
    var ml_contact_form =
        document.querySelector("#header > div > nav > div > button") != null ? document.querySelector("#header > div > nav > div > button") : document.querySelector("#off-canvas > nav > button:nth-child(7)")

    if (ml_contact_form != null) {
        ml_contact_form.addEventListener("click", function() {
            scoring.tracking.pageEvents({
                "event": "CONTACT-SALES"
            });
        })
    }

    var ml_contact_phone = document.querySelector("#product-menu > div.navigation__dropdown-section.navigation__dropdown-section--help.w-100 > ul > li > a"); //document.querySelector("#solutions-menu > div.navigation__dropdown-section.navigation__dropdown-section--help.w-100")
    if (ml_contact_phone != null) {
        ml_contact_phone.addEventListener("click", function() {

            scoring.tracking.pageEvents({
                "event": "CONTACT-HELP"
            });
        })
    }
}, 3000)