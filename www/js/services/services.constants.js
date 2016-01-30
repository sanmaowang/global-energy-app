//services.constants.js
(function(){
    angular
        .module('energy.services')
        .constant('DATABASE_PARAMS', {
            'name': 'energy.db',
            'displayName': 'Energy Data',
            'version': '1.0',
            'maxSize': 5 * 1024 * 1024
        });
})();