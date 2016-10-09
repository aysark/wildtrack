const express = require('express');
const router = express.Router();
const session = require('express-session');
const uuid = require('uuid');
const request = require('request');
const fs = require('fs');
const csvParse = require('csv-parse');

const twilio = require('twilio');

const redis = require("redis");
const client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

/* GET home page. */
router.get('/incidents', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

function detectLanguage(text) {
  var options = {
    url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/languages',
    headers: {
      'Ocp-Apim-Subscription-Key': '128fa6ebe0e749cca983096e5ca61930'
    },
    method: "POST",
    json: {
      "documents" : [ {
        "id":"1",
        "text":text
      }]
    }
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      return body.documents[0].detectedLanguages[0].name
    } else {
      console.err(body);
    }
  }

  request(options, callback);
}

function createOrUpdateIncident(req, data) {
  let profileId = "profile_"+req.body.From;
  client.hgetall(profileId, function(err, reply) {
    if (reply) {
      // TODO
    } else {
      const profile = {
        country: req.body.FromCountry,
        state: req.body.FromState,
        city: req.body.FromCity
      }
      client.hmset(profileId, profile);
    }
  });

  let incidentId = "incident_"+req.body.From+"_"+req.session.identifier;
  client.hgetall(incidentId, function(err, reply) {
    if (reply) {
      const incident = {
        longitude: data.longitude,
        latitude: data.latitude,
        humanActivity: reply.humanActivity ? reply.humanActivity+data.humanActivity : "",
        animals: reply.animals ? reply.animals+data.animals : "",
        language: data.language
      };
      client.hmset(incidentId, incident, redis.print);
    } else {
      const incident = {
        timestamp: Date.now(),
        longitude: data.longitude,
        latitude: data.latitude,
        humanActivity: data.humanActivity,
        animals: data.animals,
        language:data.language
      };
      client.hmset(incidentId, incident, redis.print);
    }
  });
}

function determineConversationState(req) {
  let stateWhat = req.session.stateWhat || 0;
  let stateWhere = req.session.stateWhere || 0;
  let stateAnon = req.session.stateAnon || 0;

  const localization = {
    "stateWhat": {
      "English" : "What do you see?",
      "Swahili" : "Unaona nini? Je, unahitaji kuzungumza na mgambo?"
    },
    "stateWhere": {
      "English" : "Please describe the exact location or send GPS Coordinates",
      "Swahili" : "Kuelezea eneo halisi"
    },
    "stateAnon": {
      "English": "Thank you! Your report is anonymous unless you reply YES to opt out",
      "Swahili": "Asante! ripoti yako ni bila majina isipokuwa wewe kujibu NDIYO kwa kujiunga na mpango tuzo"
    },
    "stateAnonNo": {
      "English": "Welcome to the rewards program!",
      "Swahili": "Karibu mpango tuzo!"
    },
    "done": {
      "English": "Incident reported.",
      "Swahili": "ripoti kukamilika"
    }
  };

  if (stateWhat == 0) {
    stateWhat = 1;
    messageStr = localization["stateWhat"][(req.session.language)];
  } else if (stateWhere == 0) {
    stateWhere = 1;
    messageStr = localization["stateWhere"][(req.session.language)];
  } else if (stateAnon == 0) {
    stateAnon = 1;
    messageStr = localization["stateAnon"][(req.session.language)];
  } else {
    if (stateAnon == 1 && req.body.Body === "YES") {
      messageStr = localization["stateAnonNo"][(req.session.language)];
    } else {
      messageStr = localization["done"][(req.session.language)];
    }
  }
  return {
    "stateWhat" : stateWhat,
    "stateWhere" : stateWhere,
    "stateAnon" : stateAnon,
    message: messageStr
  }
}

function checkForLocationStopword(req) {
  let content = fs.readFileSync('./locations.csv');
  let csvParser = new csvParse.Parser({delimiter: ','});
  csvParser.write(content, true);
  let chunk;
  let r = {
    latitude:"",
    longitude:""
  };
  while(chunk = csvParser.read()){
    if (req.body.Body.toLowerCase().includes(chunk[0].toLowerCase())) {
        r = {
          latitude:chunk[1],
          longitude:chunk[2]
        };
    }
  }
  return r;
}

function checkForHumanActivityStopword(req) {
  let content = fs.readFileSync('./human-activities.csv');
  let csvParser = new csvParse.Parser({delimiter: ','});
  csvParser.write(content, true);
  let chunk;
  let r = "";
  while(chunk = csvParser.read()){
    let stopword = chunk[1];
    if (req.session.language !== "English") {
      stopword = chunk[2];
    }
    if (stopword.length > 0 &&
      req.body.Body.toLowerCase().includes(stopword.toLowerCase())) {
        r += chunk[0] + ", ";
    }
  }
  return r;
}

function checkForAnimalStopword(req) {
  let content = fs.readFileSync('./animals.csv');
  let csvParser = new csvParse.Parser({delimiter: ','});
  csvParser.write(content, true);
  let chunk;
  let r = "";
  while(chunk = csvParser.read()){
    let stopword = chunk[1];
    if (req.session.language !== "English") {
      stopword = chunk[2];
    }
    if (stopword.length > 0 &&
      req.body.Body.toLowerCase().includes(stopword.toLowerCase())) {
        r += chunk[0] + ", ";
    }
  }
  return r;
}

router.post('/sms', function(req, res, next) {
  // console.log(req.body);
  // console.log(req.session);

  const twiml = new twilio.TwimlResponse();
  let photoIncluded = req.session.photoIncluded || 0;
  let textIncluded = req.session.textIncluded || 0;
  let sessionId = req.session.identifier || uuid.v4();

  const minute = 120000;
  req.session.cookie.expires = new Date(Date.now() + minute);
  req.session.cookie.maxAge = minute;
  req.session.identifier = sessionId;

  // determine language
  let language = "English";

  if (req.session.language == null && req.body.Body.length >= 3) {
    var options = {
      url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/languages',
      headers: {
        'Ocp-Apim-Subscription-Key': '128fa6ebe0e749cca983096e5ca61930'
      },
      method: "POST",
      json: {
        "documents" : [ {
          "id":"1",
          "text":req.body.Body
        }]
      }
    };

    function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
        language = body.documents[0].detectedLanguages[0].name;
        req.session.language = language;

        const s = determineConversationState(req);
        let message = s.message;
        req.session.stateWhat = s.stateWhat;
        req.session.stateWhere = s.stateWhere;
        req.session.stateAnon = s.stateAnon;

        const location = checkForLocationStopword(req);
        const humanActivity = checkForHumanActivityStopword(req);
        const animals = checkForAnimalStopword(req);

        createOrUpdateIncident(req, {
          longitude: location.longitude,
          latitude: location.latitude,
          humanActivity: humanActivity,
          animals: animals,
          language: language
        });

        if (message.length >= 3) {
          twiml.message(message);
          res.writeHead(200, {'Content-Type': 'text/xml'});
          res.end(twiml.toString());
        }
      } else {
        console.err(body);
      }
    }
    request(options, callback);
  } else {
    language = req.session.language;

    const s = determineConversationState(req);
    let message = s.message;
    req.session.stateWhat = s.stateWhat;
    req.session.stateWhere = s.stateWhere;
    req.session.stateAnon = s.stateAnon;

    const location = checkForLocationStopword(req);
    const humanActivity = checkForHumanActivityStopword(req);
    const animals = checkForAnimalStopword(req);

    createOrUpdateIncident(req, {
      longitude: location.longitude,
      latitude: location.latitude,
      humanActivity: humanActivity,
      animals: animals,
      language: language
    });

    if (message.length >= 3) {
      twiml.message(message);
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(twiml.toString());
    }
  }
});

module.exports = router;
