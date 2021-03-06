const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), listEmployees);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function listEmployees(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '19KclRw6o_ir8PpnEoi53p60BiAc1s8xmX_zRdmHh-bI',
    range: 'Sayfa1!A3:E',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('No, Name, Title, Email:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        // console.log(`${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}`);
        outputEmployeeHTML(row[0], row[1], row[2], row[3]);
      });
    } else {
      console.log('No data found.');
    }
  });
}

function outputEmployeeHTML(no, name, title, email) {
  // If encoding(second parameter) is not specified, readFile outputs Buffer
  fs.readFile('./email-template.html', "utf8", (err, html) => {
    if(err) console.log(err);

    let employeeHTML = html;
    const employeeData = {
      '{NAME}': name,
      '{TITLE}': title,
      '{EMAIL}': email
    };
    employeeHTML = employeeHTML.replace(/{NAME}|{TITLE}|{EMAIL}/gi, function(matched){
      return employeeData[matched];
    });

    const signaturesDirectory = './signatures';

    if (!fs.existsSync(signaturesDirectory)){
      fs.mkdirSync(signaturesDirectory);
    }

    if(no !== undefined) {
      fs.writeFile(`${signaturesDirectory}/${name}.htm`, employeeHTML, 'utf8', (err) => {
        if(err) throw err;
        console.log(`File ${no} is saved.`);
      });
    }
  });
}