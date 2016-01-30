//compare_type.js
(function(){
    angular
        .module('energy.controllers')
        .controller('CompareTypeController', CompareTypeController);

    CompareTypeController.$inject = ['$scope', '$state', '$stateParams', '$energyDao'];

    function CompareTypeController($scope, $state, $stateParams, $energyDao){
        var selectedType, selectedId;
        $scope.$on('$ionicView.enter', function(){
            selectedType = $stateParams.type;
            selectedId = $stateParams.id;
            if(selectedType == 'country'){
                $energyDao.getCountryById(selectedId)
                    .then(onItemProperties, onItemPropertiesError);
            }else if(selectedType == 'organization'){
                $energyDao.getOrganizationById(selectedId)
                    .then(onItemProperties, onItemPropertiesError);
            }
        });

        $scope.chooseType = function(type2){
            $state.go('compare_list', {
                type1: selectedType,
                id1: selectedId,
                type2: type2
            });
        };

        function onItemProperties(result){
            var rows = result.rows;
            if(rows != undefined && rows.length > 0){
                $scope.item = rows.item(0);
            }else{
                onItemPropertiesError(new Error('item does not exist'));
            }
        }

        function onItemPropertiesError(error){
            console.log('error getting item properties', error);
        }
    }
})();