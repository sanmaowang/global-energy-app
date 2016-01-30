//services.js
(function(){
    angular
        .module('energy.services')
        .factory('$localStorage', $localStorage);

    $localStorage.$inject = ['$window'];

    function $localStorage($window){
        return $window.localStorage;
    }
})();