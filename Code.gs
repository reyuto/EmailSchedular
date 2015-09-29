// get the data
// get the settings
// find the modertors and reviewers
// get date, time and duration for the event
// compose the message
// update settings
// create the event

var MESSAGE_FOOTER = "Please find a replacement if you can't make it";
var MESSAGE_TITLE = "Moderate Front-End Code Workshop";
var CALENDAR_ID = "The ID to your calendar";

function getData() {
  var data = SpreadsheetApp.getActiveSheet().getRange(2, 1, 20, 2).getValues();
  var userData = [];
  for (var i = 0; i < data.length; ++i) {
    var row = data[i];
    userData.push({'name': row[0], 'email': row[1]});    
  }
  return userData;
}

function getSettings() {
  var data = SpreadsheetApp.getActiveSheet().getRange(2, 5, 9, 2).getValues();
  var settings = {};
  for (var i = 0; i < data.length; ++i) {
    var row = data[i];
    settings[row[0]] = row[1];
  }
  return settings;
}

function giveMeTheNextDataRow(dataLength, rowNumber) {
  return (dataLength - 1) === rowNumber ? 0 : rowNumber+1;
}

function getModerators(data, nextModerator, nextReviewer) {
  var moderator = data[nextModerator];
  var reviewer_1 = data[nextReviewer];
  var reviewer_2 = data[giveMeTheNextDataRow(data.length, nextReviewer)];
  return {
    'moderator': moderator,
    'reviewers': [reviewer_1, reviewer_2] 
  };
}

function lpad(str, padString, length) {
	while (str.length < length)
        str = padString + str;
    return str;
};

function getFormattedDate(date) {
  return lpad((date.getMonth()+1),'0', 2)
                           + '/' + lpad(date.getDate(), '0', 2)
                           + '/' + date.getFullYear();
}

// Debug this code
function getEventDetails() {
  var data = getSettings(); // get the settings section from the sheet
  var nextMeeting = new Date(data['nextMeeting']);
  
  // start date
  var date = data['startTime'].split(':');
  var startDateTime = new Date(nextMeeting.getTime() + (parseInt(date[0]) * 3600 + parseInt(date[1]) * 60 + parseInt(date[2])) * 1000);

  // end date
  date = data['endTime'].split(':');
  var endDateTime = new Date(nextMeeting.getTime() + (parseInt(date[0]) * 3600 + parseInt(date[1]) * 60 + parseInt(date[2])) * 1000);
  
  // get next meeting info
  var nextToNextMeeting = new Date(new Date(nextMeeting).getTime() + data['intervalInDays'] * 24 * 3600 * 1000);
  var dateForNextMeeting = getFormattedDate(nextToNextMeeting);
  
  // update the sheets
  SpreadsheetApp.getActiveSheet().getRange(3, 11).setValue(dateForNextMeeting);
  SpreadsheetApp.flush();

  return {
    start: startDateTime,
    end: endDateTime
  };
}
  
function updateSettings(settings, dataLength) {
  var nextModerator = giveMeTheNextDataRow(dataLength, settings['nextModerator']);
  var nextReviewer = giveMeTheNextDataRow(dataLength, settings['nextReviewer']+1);
  var nextToNextReviewer = giveMeTheNextDataRow(dataLength, nextReviewer);
  if (nextModerator === nextReviewer) {
    nextReviewer = nextToNextReviewer;
  } else if (nextModerator === nextToNextReviewer) {
    nextReviewer = giveMeTheNextDataRow(dataLength, nextToNextReviewer);
  }
  
  // update the sheets
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.getRange(7, 6).setValue(nextModerator);
  sheet.getRange(8, 6).setValue(nextReviewer);
  SpreadsheetApp.flush();
}

function composeMessage() {
  var data = getData();
  var settings = getSettings(); // get the settings section from the sheet
  var people = getModerators(data, settings['nextModerator'], settings['nextReviewer']);
  
  // update settings
  updateSettings(settings, data.length);
  
  var moderator = people['moderator'];
  var reviewers = people['reviewers'];
  
  return '\nModerator: ' + moderator['name'] 
  + '\nReviewer: ' + reviewers[0]['name'] + ', ' + reviewers[1]['name']
  + '\n\nLink: ' + settings['https://cloud.box.com/s/rmqjhfnl0auz1cgmkc58']
  + '\n\n' + MESSAGE_FOOTER;
}
  
function getInvitees() {
  var data = getData();
  var settings = getSettings(); // get the settings section from the sheet
  var people = getModerators(data, settings['nextModerator'], settings['nextReviewer']);
  var invitees = [];
  invitees.push(people.moderator.email)
  invitees.push(people.reviewers[0].email)
  invitees.push(people.reviewers[1].email);
  return invitees;
}

function createEvent() {
  var calendar = CalendarApp.getOwnedCalendarById(CALENDAR_ID);
  var settings = getSettings(); // get the settings section from the sheet
  var title = settings['eventTitle'];
  var eventDetails = getEventDetails();
  
  var startTime = eventDetails.start;
  var endTime = eventDetails.end;
  
  Logger.log(startTime);
  Logger.log(endTime);

  var options = {
    'description': composeMessage(),
    'guests': getInvitees().join(','),
    'sendInvites': false
  };
  
  return calendar.createEvent(title, startTime, endTime, options);
}
