// app.states.js
(function() {
    angular
        .module('energy')
        .config(configBlock);

    configBlock.$inject = ['$stateProvider', '$urlRouterProvider'];

    function configBlock($stateProvider, $urlRouterProvider){
        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: 'templates/home.html'
            })
            .state('details', {
                url: '/details/:type/:id',
                templateUrl: 'templates/details.html'
            })
            .state('compare_type', {
                url: '/compare_type/:func/:type/:id',
                templateUrl: 'templates/compare_type.html'
            })
            .state('compare_list', {
                url: '/compare_list/:func/:type1/:id1/:type2',
                templateUrl: 'templates/compare_list.html'
            })
            .state('development', {
                url: '/development/:type/:id/:pane',
                templateUrl: 'templates/development.html'
            })
            .state('map', {
                url: '/map/:type1/:id1/:type2/:id2',
                templateUrl: 'templates/map.html'
            })
            .state('graph', {
                url: '/graph/:type1/:id1/:type2/:id2',
                templateUrl: 'templates/graph.html'
            });

        $urlRouterProvider.otherwise('/home');
    }

})();