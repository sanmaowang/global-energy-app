//compare_list.js
(function(){
    angular
        .module('energy.controllers')
        .controller('CompareListController', CompareListController);

    CompareListController.$inject = ['$scope', '$state', '$stateParams', '$energyDao'];

    function CompareListController($scope, $state, $stateParams, $energyDao){
        var type1, id1, type2, func;
        var selections;
        $scope.$on('$ionicView.enter', function(){
            type1 = $stateParams.type1;
            id1 = $stateParams.id1;
            type2 = $stateParams.type2;
            func = $stateParams.func;
            $scope.type2 = type2;
            selections = [];

            if(type1 == 'country'){
                $energyDao.getCountryById(id1)
                    .then(onItem1Properties, onItem1PropertiesError);
            }else if(type1 == 'organization'){
                $energyDao.getOrganizationById(id1)
                    .then(onItem1Properties, onItem1PropertiesError);
            }
            if(type2 == 'country'){
                $energyDao.getAllCountries()
                    .then(onSelectionsProperties, onSelectionsPropertiesError);
            }else if(type2 == 'organization'){
                $energyDao.getAllOrganizations()
                    .then(onSelectionsProperties, onSelectionsProperties);
            }
        });

        $scope.filterNames = function(searchText){
            if(searchText.length == 0){
                $scope.selections = selections;
                return;
            }
            $scope.selections = selections.filter(function(selection){
                return selection.name.indexOf(searchText) >= 0;
            });
        }

        $scope.gotoGraph = function(selection){
            $state.go(func, {
                type1: type1,
                id1: id1,
                type2: type2,
                id2: selection.id
            });
        }

        function onItem1Properties(result){
            var rows = result.rows;
            if(rows != undefined && rows.length > 0){
                $scope.item = rows.item(0);
            }else{
                onItemPropertiesError(new Error('item1 does not exist'));
            }
        }

        function onItem1PropertiesError(error){
            console.log('error getting item1 properties', error);
        }

        function onSelectionsProperties(result){
            var rows = result.rows;
            var items = [];
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                items.push(item);
            }
            $scope.selections = selections = items;
        }

        function onSelectionsPropertiesError(error){
            console.log('error getting item properties', error);
        }
    }
})();