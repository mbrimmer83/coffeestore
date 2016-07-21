var app = angular.module('coffee-app', ['ngRoute', 'ngCookies']);

app.config(function($routeProvider){
  $routeProvider
    .when('/', {
      controller: 'MainController',
      templateUrl: '/home.html'
    })
    .when('/signup', {
      controller: 'MainController',
      templateUrl: '/signup.html'
    })
    .when('/login', {
      controller: 'MainController',
      templateUrl: '/login.html'
    })
    .when('/options', {
      controller: 'MainController',
      templateUrl: '/options.html'
    })
    .when('/delivery', {
      controller: 'MainController',
      templateUrl: '/delivery.html'
    })
    .when('/payment', {
      controller: 'PaymentController',
      templateUrl: '/payment.html'
    })
    .when('/thankyou', {
      controller: 'MainController',
      templateUrl: '/thankyou.html'
    });
});

app.run(function($rootScope, $location, $cookies) {
  $rootScope.$on('$locationChangeStart', function(event, nextUrl, currentUrl) {
    var token = $cookies.get('token');
    nextUrl = nextUrl.split("/");
    nextUrl = nextUrl[nextUrl.length - 1];
    if(!token && (nextUrl === "options" || nextUrl === "delivery" || nextUrl === "payment")) {
      $cookies.put('urlRedirect', nextUrl);
      $location.path('/login');
    }
    if (!token) {
      $rootScope.userButton = true;
    } else {
      $rootScope.userButton = false;
    }
  });
  $rootScope.logout = function() {
    $cookies.remove('token');
    $rootScope.userButton = true;
    $location.path('/');
  };
});

var API = 'http://localhost:8000';

// Ajax service calls - using promises
app.factory('backEnd', function($http) {
  return {
    getSignUp: function(data) {
      return $http({
        method: 'POST',
        url: API + '/signup',
        data: data
      });
    },
    getLogin: function(data) {
      return $http({
        method: 'POST',
        url: API + '/login',
        data: data
      });
    },
    getOptions: function() {
      return $http({
        method: 'GET',
        url: API + '/options'
      });
    },
    getOrders: function(data) {
      return $http({
        method: 'POST',
        url: API + '/orders',
        data: data
      });
    }
  };
});

app.service('userAddress', function() {
  var userData = {};
  this.saveData = function(data){
    this.userData = data;
  };
  this.getData = function(){
    return this.userData;
  };
});

app.factory('flash', function($rootScope, $timeout) {
  function setMessage(message) {
    $rootScope.flashMessage = message;
    $timeout(function() {
      $rootScope.flashMessage = null;
    }, 5000);
  }
  return {
    setMessage: setMessage
  };
});

app.controller('PaymentController', function($http, $scope, backEnd, userAddress, $cookies, $location, flash) {
  var data = userAddress.getData();
  $scope.data = data;

  var grind = $cookies.get('grind');
  $scope.grind = grind;
  var quantity = $cookies.get('quantity');
  $scope.quantity = quantity;

  $scope.submitOrder = function() {
  var data = userAddress.getData();
  var userInfo = {
    token: $cookies.get('token'),
    order: {
      "options": {
        "grind": $cookies.get('grind'),
        "quantity": $cookies.get('quantity')
      },
      "address": {
        "name": data.name,
        "address": data.address1,
        "address2": data.address2,
        "city": data.city,
        "state": data.state,
        "zipcode": data.zipcode,
        "deliverydate": data.date
      }
    }
  };
  return userInfo;
};

$scope.pay = function() {
  var userInfo = $scope.submitOrder();
  var amount = $cookies.get('quantity') * 20 * 100;
  var handler = StripeCheckout.configure({
    key: 'pk_test_ISLIYCpMacLsF9M5isdQ5JiF',
    locale: 'auto',
    token: function(token) {
      var tokenId = token.id;
      return $http({
        url: API + '/orders',
        method: 'POST',
        data: {
          amount: amount,
          token: tokenId,
          order: userInfo
        }
      })
      .then(function(data) {
        flash.setMessage('You were charged $' + (data.data.charge.amount / 100));
        $location.path('/thankyou');
      });
    }
  });
  handler.open({
    name: 'DC Roasters',
    description: 'Use Test Card: 4242 4242 4242 4242',
    amount: amount
  });
};
});

app.controller('MainController', function($http, $scope, backEnd, userAddress, $cookies, $location, flash) {

  backEnd.getOptions()
    .then(function(data) {
      $scope.data = data.data;
  });

  $scope.saveUserInfo = function() {
    userAddress.saveData({
      name: $scope.name,
      address1: $scope.address1,
      address2: $scope.address2,
      city: $scope.city,
      state: $scope.state,
      zipcode: $scope.zipcode,
      date: $scope.date
    });
    $location.path('/payment');
  };

  $scope.signUp = function() {
    var signUpInfo = {
      username: $scope.username,
      password: $scope.password
    };
    backEnd.getSignUp(signUpInfo)
    .then(function(res) {
      $location.path('/options');
    }).catch(function(err){
      flash.setMessage(err.data.message);
    });
  };

  $scope.login = function() {
    var loginInfo = {
      username: $scope.username,
      password: $scope.password
    };
    backEnd.getLogin(loginInfo)
    .then(function(res) {
      $cookies.put('token', res.data.token);
      flash.setMessage("Welcome " + loginInfo.username + "!");
      var nextUrl = $cookies.get('urlRedirect');
      if (!nextUrl) {
        $location.path('/options');
      } else {
        $location.path('/' + nextUrl);
        $cookies.remove('urlRedirect');
      }
    }).catch(function(err){
      flash.setMessage(err.data.message);
    });
  };

  $scope.order = function(grind, quantity) {
    $cookies.put('grind', grind);
    $cookies.put('quantity', quantity);
    $location.path('/delivery');
  };
});
