var mongoose = require('mongoose');

var User = mongoose.model('User', {
  _id: {type: String, required: true},
  encrpytedPassword: { type: String, required: true},
  authenticationTokens: [String],
  orders: [
    {
      'options':{
        "grind": {type: String, required: true},
        "quantity": {type: Number, required: true}
      },
      "address":{
        "name":{type: String, required: true},
        "address":{type: String, required: true},
        "address2":String,
        "city":{type: String, required: true},
        "state":{type: String, required: true},
        "zipcode":{type: String, required: true},
        "deliverydate":{type: String, required: true}
      }
    }
  ]
});
module.exports = User;
