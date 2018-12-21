const express   = require('express'),
      app       = express(),
      dotenv    = require('dotenv').config(),
      request   = require('request');

app.set('view engine', 'ejs');
app.use(express.static('public'));

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
      const parsed = JSON.parse(body);
      // res.send(parsed.results[0].lexicalEntries[0].inflectionOf[0].text)
      let inflection = input;
      if ((input[input.length - 1].toLowerCase() === 'd' && input[input.length - 2].toLowerCase() === 'e')  || 
          (parsed.results[0].lexicalEntries[0].grammaticalFeatures[0].text.toLowerCase() === 'plural')      || 
          (parsed.results[0].lexicalEntries[0].grammaticalFeatures[0].type.toLowerCase() === 'number')) {

        inflection = parsed.results[0].lexicalEntries[0].inflectionOf[0].text.toLowerCase()
      }
      options.url = 'https://od-api.oxforddictionaries.com:443/api/v1/entries/en/' + inflection;
      results.inflectionOf = undefined;
      if (inflection !== input) {
        results = {
          inflectionOf: inflection,
          tense: parsed.results[0].lexicalEntries[0].grammaticalFeatures[0].text
        } 
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
      }     
      const parsed = JSON.parse(body);
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
      }      
      const parsed = JSON.parse(body);
      results.thesaurus = parsed.results[0].lexicalEntries[0].entries[0].senses
      res.render('results', {results});
      resolve();
    });
  });
}

app.get('/results', (req, res) => {
  const input = req.query.search;
  options.url = 'https://od-api.oxforddictionaries.com:443/api/v1/inflections/en/' + input;
  inflectionRequest(input, res)
  .then(() => definitionRequest(input, res))
  .then(() => thesaurusRequest(input, res));
});

app.get('*', (req, res) => {
  res.render('error', {status: 'PAGE NOT FOUND'});
});

const listener = app.listen(8080, () => {
  console.log('app listening on port: ' + listener.address().port);
});