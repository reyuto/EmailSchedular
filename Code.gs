// get the data
// get the settings
// find the modertors and reviewers
// get date, time and duration for the event
// compose the message
// update settings
// create the event
var CAL_ID = 'id_of_the_calendar';
var MESSAGE_FOOTER = "Please find a replacement if you can't make it";
var DATA_ROW_START = 2;
var DATA_ROW_LENGTH = 21;
var DATA_COLUMN_START = 1;
var DATA_COLUMN_LENGTH = 2;
var SETTINGS_ROW_START = 2;
var SETTINGS_ROW_LENGTH = 9;
var SETTINGS_COLUMN_START = 5;
var SETTINGS_COLUMN_LENGTH = 2;
var HALF_A_DAY = 12 * 3600 * 1000;

function nextNumberOnLIst(dataLength, rowNumber) {
  var lastRecordIndex = dataLength - 1;
  var nextRowNumber = rowNumber + 1;
  return (lastRecordIndex >= nextRowNumber) ? nextRowNumber : 0;
}

function getModerators_(data, nextModerator, nextReviewer) {
  var moderator = data[nextModerator];
  var reviewer_1 = data[nextReviewer];
  var reviewer_2 = data[nextNumberOnLIst(data.length, nextReviewer)];
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
  if (date && date.getMonth && date.getDate && date.getFullYear) {
    return lpad((date.getMonth() + 1), '0', 2) + '/' + lpad(date.getDate(), '0', 2) + '/' + date.getFullYear();
  }
}

// Debug this code
function getEventDetails_(settings) {
  var nextMeeting = new Date(settings['nextMeeting']);

  // start date
  var date = settings['startTime'].split(':');
  var startDateTime = new Date(nextMeeting.getTime() + (parseInt(date[0]) * 3600 + parseInt(date[1]) * 60 + parseInt(
    date[2])) * 1000);

  // end date
  date = settings['endTime'].split(':');
  var endDateTime = new Date(nextMeeting.getTime() + (parseInt(date[0]) * 3600 + parseInt(date[1]) * 60 + parseInt(date[
    2])) * 1000);

  return {
    start: startDateTime,
    end: endDateTime
  };
}

function composeMessage_(data, settings) {
  var people = getModerators_(data, settings['nextModerator'], settings['nextReviewer']);

  var moderator = people['moderator'];
  var reviewers = people['reviewers'];

  // use an html template instead
  return '\nModerator: ' + moderator['name'] + '\nReviewer: ' + reviewers[0]['name'] + ', ' + reviewers[1]['name'] +
    '\n\nLink: ' + settings['moreInfoLink'] + '\n\n' + MESSAGE_FOOTER;
}

function getInvitees_(data, settings) {
  var people = getModerators_(data, settings['nextModerator'], settings['nextReviewer']);
  var invitees = [];
  invitees.push(people.moderator.email)
  invitees.push(people.reviewers[0].email)
  invitees.push(people.reviewers[1].email);
  return invitees;
}

function updateSettings_(settings, dataLength) {
  var nextModerator = nextNumberOnLIst(dataLength, settings['nextModerator']);
  var nextReviewer = nextNumberOnLIst(dataLength, settings['nextReviewer'] + 1); // two reviewers at a time
  var nextToNextReviewer = nextNumberOnLIst(dataLength, nextReviewer);
  if (nextModerator === nextReviewer) {
    nextReviewer = nextToNextReviewer;
  } else if (nextModerator === nextToNextReviewer) {
    nextReviewer = nextNumberOnLIst(dataLength, nextToNextReviewer);
  }

  // update the sheets
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.getRange(7, 6)
    .setValue(nextModerator);
  sheet.getRange(8, 6)
    .setValue(nextReviewer);

  // get next meeting info
  var nextMeeting = new Date(settings['nextMeeting']);
  // Adding half a day to prevent daylight savings from screwing up the numbers
  var nextToNextMeeting = new Date(new Date(nextMeeting)
    .getTime() + settings['intervalInDays'] * 24 * 3600 * 1000 +
    HALF_A_DAY);
  var dateForNextMeeting = getFormattedDate(nextToNextMeeting);

  // update the sheets
  sheet.getRange(3, 11)
    .setValue(dateForNextMeeting);

  // flush the sheet so that errors dont prevent the writes from getting persisted
  SpreadsheetApp.flush();
}

function getSettings_() {
  var data = SpreadsheetApp.getActiveSheet()
    .getRange(SETTINGS_ROW_START, SETTINGS_COLUMN_START, SETTINGS_ROW_LENGTH, SETTINGS_COLUMN_LENGTH)
    .getValues();
  var settings = {};
  for (var i = 0; i < data.length; ++i) {
    var row = data[i];
    settings[row[0]] = row[1];
  }
  return settings;
}

function getData_() {
  var data = SpreadsheetApp.getActiveSheet()
    .getRange(DATA_ROW_START, DATA_COLUMN_START, DATA_ROW_LENGTH, DATA_COLUMN_LENGTH)
    .getValues();
  var userData = [];
  for (var i = 0; i < data.length; ++i) {
    var row = data[i];
    userData.push({
      'name': row[0],
      'email': row[1]
    });
  }
  return userData;
}

function createEvent() {
  var calendar = CalendarApp.getOwnedCalendarById(CAL_ID);
  var data = getData_();
  var settings = getSettings_(); // get the settings section from the sheet

  var title = settings['eventTitle'];
  var eventDetails = getEventDetails_(settings);

  var startTime = eventDetails.start;
  var endTime = eventDetails.end;

  Logger.log(startTime);
  Logger.log(endTime);

  var options = {
    'description': composeMessage_(data, settings),
    'guests': getInvitees_(data, settings)
      .join(','),
    'sendInvites': false
  };

  // create the event
  var event = calendar.createEvent(title, startTime, endTime, options);
  Logger.log(event.getId());

  // update settings
  updateSettings_(settings, data.length);
}
