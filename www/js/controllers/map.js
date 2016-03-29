//graph.js
(function(){
    angular
        .module('energy.controllers')
        .controller('MapController', MapController);

    MapController.$inject = ['$scope', '$stateParams', '$energyDao'];

    function MapController($scope, $stateParams, $energyDao){
        var type1,id1,type2,id2;
        var metaDataMap;
        var tempGrouppedStats = {};
        var statsFetched = [false, false];
        
        $scope.$on('$ionicView.enter', onViewEnter);

        function onViewEnter(){
            $scope.stats = {};
            type1 = $stateParams.type1;
            id1 = $stateParams.id1;
            type2 = $stateParams.type2;
            id2 = $stateParams.id2;
            fetchGrouppedItemStats(type1, id1, 0);
            fetchGrouppedItemStats(type2, id2, 1);
        }

        function fetchGrouppedItemStats(type, id, index){
            if(type == 'country'){
                // var callback = makeItemGrouppedStatsCallback(index);
                var countryPropertiesCallback = makeItemPropertiesCallback(index);
                $energyDao.getCountryById(id)
                    .then(countryPropertiesCallback, onCountryPropertiesError);
            }else if(type = 'organization'){
                // var callback = makeItemGrouppedStatsCallback(index);
                var organizationPropertiesCallback = makeItemPropertiesCallback(index);
                var membersCallback = makeMembersCallback(index);
                $energyDao.getOrganizationById(id)
                    .then(organizationPropertiesCallback, onOrganizationPropertiesError);
                $energyDao.getOrganizationMemberById(id)
                    .then(membersCallback, onMembersCallbackError).then(membersDiffCallback,function(error){console.log(error)});
                
                // $energyDao.getOrganizationAllStatsAggregated(id)
                //     .then(callback);
            }
        }

        function makeItemPropertiesCallback(index){
            return function(result){
                var rows = result.rows;
                if(rows != undefined && rows.length > 0){
                    if(index == 0){
                        $scope.item1 = rows.item(0);
                        console.log("$scope.item1", $scope.item1);
                    }else if(index == 1){
                        $scope.item2 = rows.item(0);
                        console.log("$scope.item2", $scope.item2);
                    }
                }
            }
        }

        function makeMembersCallback(index){
            return function(result){
                var rows = result.rows;
                if(rows != undefined && rows.length > 0){
                    if(index == 0){
                        var members = [];
                        for(var i = 0; i < rows.length; i++){
                            var item = rows.item(i);
                            members.push(item);
                        }
                        $scope.members1 = members;
                        console.log("$scope.members1", $scope.members1);
                    }else if(index == 1){
                        var members = [];
                        for(var i = 0; i < rows.length; i++){
                            var item = rows.item(i);
                            members.push(item);
                        }
                        $scope.members2 = members;
                        console.log("$scope.members2", $scope.members2);
                    }
                }
            }
        }

        function membersDiffCallback(){
            $scope.$watch(['members1','members2'],function(){
                if($scope.members2 && $scope.members1){
                    var members3 = [];
                    for(var i = 0; i < $scope.members1.length; i++){
                        for(var j = 0; j < $scope.members2.length; j++){
                            if($scope.members1[i].code2l === $scope.members2[j].code2l){
                                members3.push($scope.members1[i]);
                            }
                        }
                    }
                    $scope.members3 = members3;
                    console.log("$scope.members3", $scope.members3);
                }
            });
        }

        
        function onMembersCallbackError(error){
            console.log('error fetching organization members', error);
        }

        function onCountryPropertiesError(error){
            console.log('error fetching country properties', error);
        }
        function onOrganizationPropertiesError(error){
            console.log('error fetching organization properties', error);
        }

        

        function mergeTempGrouppedStats(tempGrouppedStats){
            var mergedGrouppedStats = {};
            for(var key in tempGrouppedStats){
                var grouppedStats = tempGrouppedStats[key];
                var grouppedStat1 = grouppedStats[0] || {};
                var grouppedStat2 = grouppedStats[1] || {};
                mergedGrouppedStats[key] = mergeGrouppedStats(grouppedStat1, grouppedStat2);
            }
            return mergedGrouppedStats;
        }


        function isValueInArray(value, array){
            for(var i = 0; i < array.length; i++){
                if(array[i] == value){
                    return true;
                }
            }
            return false;
        }
    }
})();