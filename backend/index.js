var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var mongoCreds = require('./cred.json');
mongoose.connect('mongodb://' + mongoCreds.username + ':' + mongoCreds.password + '@ds025469.mlab.com:25469/coffee-store');
var cors = require('cors');
var bcrypt = require('my-bcrypt');
var User = require("./usermodel");
var randtoken = require('rand-token');
var stripe = require('stripe')('sk_test_T8RSd0lfz4iE7qT93n7JT0Wh');
var app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/options', function(request, response) {
  response.json ([
    'Extra coarse',
    'Coarse',
    'Medium coarse',
    'Medium',
    'Medium-Fine',
    'Fine',
    'Extra Fine'
  ]);
});

app.post("/signup", function(request, response){
  var userInfo = request.body;
  bcrypt.hash(userInfo.password, 10, function(err, hash){
    if (err) {
      console.log(err.message);
      return;
    }
    var user = new User({
      _id: userInfo.username,
      encrpytedPassword: hash
    });
    user.save(function(err){
      if(err){
        console.log(err.message);
        response.status(409);
        response.status(401).json({
          status: "fail",
          message:"Username has been taken"
        });
        return;
      }
      response.json({
        status:"OK"
      });
    });
  });
});

app.post('/login', function(request, response){
  var userInfo = request.body;
  User.findById(userInfo.username, function(err, user){
    console.log(user);
    if(err || !user){
      response.status(401).json({
        status: "fail",
        message: "Invalid username or password"
      });
      return;
    }

    bcrypt.compare(userInfo.password, user.encrpytedPassword, function(err, res){
      if(err || !res){
        response.status(401).json({
          status: "fail",
          message: "Invalid username or password"
        });
        return;
      } else if (res === true) {
        var token = randtoken.generate(64);
        User.update(
          { _id: userInfo.username},
          { $push: { authenticationTokens: token } }, {upsert: true},
          function(err, reply){
            if (err) {
              response.status(401).json({
                status: "fail",
                message: "Invalid username or password"
              });
              return;
            }
            console.log('Update succeeded', reply);
          }
        );
        response.json({
          status: "OK",
          token: token
        });
      }
    });
  });
});

app.post('/orders', function(request, response){
  var stripeToken = request.body.token;
  var amount = request.body.amount;
  var userData = request.body.order;
  console.log("This is the data: ", userData);
  console.log('order submitted');
  var charge = stripe.charges.create({
    amount: amount,
    currency: "usd",
    source: stripeToken,
    description: "Example charge"
  }, function(err, charge) {
    if (err && err.type === 'StripeCardError') {
      console.log("This card has been declined");
      response.json({
        status: 'fail',
        error: err.message
      });
      return;
    }
    saveOrder(userData, function(err) {
      if (err) {
        response.json({ status: "Fail", error: err.message });
        return;
      }
      response.json({ status: 'ok', charge: charge });
    });
  });
});

app.get('/orders', function(request, response){
  var userInfo = request.query;
  var token = userInfo.token;
  console.log(token);
  User.findOne({authenticationTokens: token}, function(err, user){
    if (err){
      console.log(err.message);
      return;
    }
    response.json({orders: user.orders});
  });
});

function saveOrder(request, callback) {
  var userInfo = request;
  console.log(userInfo);
  var token = userInfo.token;
  User.findOne({ authenticationTokens: token}, function(err, user){
    if (!user) {
      callback(new Error("User is not authorized"));
      return;
    }
    user.orders.push(userInfo.order);
    user.save(function(err){
      if (err) {
        var validationErrors = [];
        for (var key in err.errors) {
          validationErrors.push(err.errors[key].message);
        }
        var errMsg = 'Order failed. ' + err.message + '. ' + validationErrors.join(' ');
        callback(new Error(errMsg));
        return;
      }
      callback(null);
    });
  });
}
app.listen(8000, function(){
  console.log('Listening on port 8000');
});
