var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/sms', function(req, res, next) {
  console.log(req.body);
  res.send("<Response><Message>Hello</Message></Response>");
});

module.exports = router;
