// back_button.js
(function() {
    angular.module('energy.directives')
        .directive('backButton', backButton);

    backButton.$inject = ['$ionicHistory'];
    function backButton($ionicHistory){
        return {
            restrict: 'A',
            link: function(scope, element, attrs){
                element.on('click', function(){
                    $ionicHistory.goBack();
                });
            }
        }
    }
})();