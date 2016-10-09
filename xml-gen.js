var incidentId = '234'; //session
var x = '0.571772'; //lat
var y = '38.380356'; //long
var currentDateTime = new Date(); // date time of incident submission
var message = 'There are people with guns in the lion preserve'; // sms message to search
var people = true;
var trapTypes = ['humanactivity.weaponsequipment.firearmsammunition.firearms'];
var animalTypes = ['chordata_rl.mammalia_rl.carnivora_rl.felidae_rl.panthera_rl.leo_rl'];


var smartXmlOutput = [];
smartXmlOutput.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Waypoint xmlns="http://www.smartconservationsoftware.org/xml/1.0/independentincident" id="');
smartXmlOutput.push(incidentId);
smartXmlOutput.push('" x="');
smartXmlOutput.push(x);
smartXmlOutput.push('" y="');
smartXmlOutput.push(y);
smartXmlOutput.push('" dateTime="');
smartXmlOutput.push(currentDateTime.toISOString());
smartXmlOutput.push('"><comment>');
smartXmlOutput.push(message);
smartXmlOutput.push('</comment>');

// add people
if (people) {
smartXmlOutput.push('<observations categoryKey="humanactivity.people"></observations>');
}

// add weapons or traps that were mentioned in message
for (i = 0; i < trapTypes.length; i++) { 
    smartXmlOutput.push('<observations categoryKey="humanactivity.weaponsequipment.trap."><attributes attributeKey="typeoftrap"><itemKey>');
    smartXmlOutput.push(trapTypes[i])
    smartXmlOutput.push('</itemKey></attributes></observations>');
}

// Add animales that were mentioned
for (i = 0; i < animalTypes.length; i++) { 
    smartXmlOutput.push('<observations categoryKey="animals.liveanimals."><attributes attributeKey="species"><itemKey>');
    smartXmlOutput.push(animalTypes[i])
    smartXmlOutput.push('</itemKey></attributes></observations>');
}

smartXmlOutput.push('</Waypoint>');

var xmlOutput = smartXmlOutput.join('');

console.log(xmlOutput);