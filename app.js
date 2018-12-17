const express   = require('express'),
      app       = express(),
      dotenv    = require('dotenv').config();
      ejs       = require('ejs'),
      request   = require('request')

ejs.delimiter = '?';

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => res.render('home'));

let results = {}
let options = {
  url: '',
  headers: {
    "Accept": "application/json",
    "app_id": process.env.APP_ID,
    "app_key": process.env.APP_KEY
  }
}

const inflectionRequest = (input, res) => {
  return new Promise((resolve, reject) => {
    request(options, (err, response, body) => {
      const status = response.statusCode;
      if (err) throw err;
      if (status !== 200) {
        return res.render('error', {status: status});
      }
      let parsed = JSON.parse(body);
      const inflection = parsed.results[0].lexicalEntries[0].inflectionOf[0].text.toLowerCase();
      options.url = 'https://od-api.oxforddictionaries.com:443/api/v1/entries/en/' + inflection;
      if (inflection !== input) {
        results = {
          inflectionOf: inflection,
          tense: parsed.results[0].lexicalEntries[0].grammaticalFeatures[0].text
        } 
      } else {
        results.inflectionOf = undefined;
      }
      resolve();
    });
  });
}

const definitionRequest = (input, res) => {
  return new Promise((resolve, reject) => {
    request(options, (err, response, body) => {
      const status = response.statusCode;
      if (err) throw err;
      if (status !== 200) {
        return res.render('error', {status: status});
      }      let parsed = JSON.parse(body);
      results.word = input;
      results.definitions = parsed.results[0].lexicalEntries[0].entries[0].senses;
      results.types = parsed.results[0].lexicalEntries;
      results.pronunciations = parsed.results[0].lexicalEntries[0].pronunciations[0].audioFile;
      resolve();
    });
  });
}

const thesaurusRequest = (input, res) => {
  return new Promise((resolve, reject) => {
    options.url = options.url + '/synonyms;antonyms'
    request(options, (err, response, body) => {
      const status = response.statusCode;
      if (err) throw err;
      if (status !== 200) {
        return res.render('error', {status: status});
      }      let parsed = JSON.parse(body);
      results.thesaurus = parsed.results[0].lexicalEntries[0].entries[0].senses
      res.render('results', {results});
      resolve();
    });
  });
}

app.post('/results', (req, res) => {
  const input = req.body.input;
  options.url = 'https://od-api.oxforddictionaries.com:443/api/v1/inflections/en/' + input;
  inflectionRequest(input, res)
  .then(() => definitionRequest(input, res))
  .then(() => thesaurusRequest(input, res));
});

const listener = app.listen(8080, () => {
  console.log('app listening on port: ' + listener.address().port);
});