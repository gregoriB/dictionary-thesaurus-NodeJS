require('dotenv').config();
const express   = require('express');
const app       = express();
const request   = require('request');

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

let inflection;

let options = {
  url: '',
  headers: {
    "Accept": "application/json",
    "app_id": process.env.DB_ID,
    "app_key": process.env.DB_KEY
  }
}

let results = {
  inflectionOf: undefined,
  word: '', 
  definitions: '',
  thesaurus: '',
  types: ''
}

let obj;

app.get('/', (req, res) => res.render('home'));

app.post('/results', (req, res) => {
  const input = req.body.input;
  options.url = 'https://od-api.oxforddictionaries.com:443/api/v1/inflections/en/' + input;
  inflectionRequest(input, res).then(() => definitionRequest(input, res)).then(() => thesaurusRequest(input, res));
});

const inflectionRequest = (input, res) => {
  return new Promise((resolve, reject) => {
    request(options, (errInflection, responseInflection, bodyInflection) => {
      const status = responseInflection.statusCode;
      if (status !== 200) {
        return res.render('error', {status: status});
      }
      if (errInflection) {
        console.log('error: ', errInflection);
        throw errInflection;
      };
      let parsed = JSON.parse(bodyInflection);
      const inflectionOf = parsed.results[0].lexicalEntries[0].inflectionOf[0].text.toLowerCase();
      options.url = 'https://od-api.oxforddictionaries.com:443/api/v1/entries/en/' + inflectionOf;
      inflection = inflectionOf !== input ? inflectionOf : undefined;
      resolve();
    });
  });
}

const definitionRequest = (input, res) => {
  return new Promise((resolve, reject) => {
    request(options, (errDefinition, responseDefinition, bodyDefinition) => {
      if (errDefinition) {
        console.log('error');
        throw errDefinition;
      }
      parsed = JSON.parse(bodyDefinition);
      results = {
        word: input, 
        definitions: parsed.results[0].lexicalEntries[0].entries[0].senses,
        types: parsed.results[0].lexicalEntries
      }
      obj = parsed;
      if (inflection) {
        results.inflectionOf = inflection;
      }
      resolve();
    });
  });
}

const thesaurusRequest = (input, res) => {
  return new Promise((resolve, reject) => {
    options.url = options.url + '/synonyms;antonyms'
    request(options, (errThesaurus, responseThesaurus, bodyThesaurus) => {
      const status = responseThesaurus.statusCode;
      if (status !== 200) {
        return res.render('error', {status: status});
      }
      if (errThesaurus) {
        console.log('error');
        throw errThesaurus;
      }
      parsed = JSON.parse(bodyThesaurus);
      results.thesaurus = parsed.results[0].lexicalEntries[0].entries[0].senses
      res.render('results', {results});
      // res.send(results.thesaurus)
      resolve();
    });
  });
}

const listener = app.listen(8080, () => {
  console.log('app listening on port: ' + listener.address().port);
});