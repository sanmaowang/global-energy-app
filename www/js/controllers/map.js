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
        var units = {
            'EN.ATM.CO2E.KT' : {
                unit: '万',
                divideBy: 10000
            },
            'NY.GDP.MKTP.CD' : {
                unit: '亿',
                divideBy: 100000000
            },
            'SP.POP.TOTL' : {
                unit: '万',
                divideBy: 10000
            }
        };
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
                var callback = makeItemGrouppedStatsCallback(index);
                var countryPropertiesCallback = makeItemPropertiesCallback(index);
                $energyDao.getCountryById(id)
                    .then(countryPropertiesCallback, onCountryPropertiesError);
                $energyDao.getCountryAllStatsGroupped(id)
                    .then(callback);
            }else if(type = 'organization'){
                var callback = makeItemGrouppedStatsCallback(index);
                var organizationPropertiesCallback = makeItemPropertiesCallback(index);
                $energyDao.getOrganizationById(id)
                    .then(organizationPropertiesCallback, onOrganizationPropertiesError);
                $energyDao.getOrganizationAllStatsAggregated(id)
                    .then(callback);
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

        function onCountryPropertiesError(error){
            console.log('error fetching country properties', error);
        }
        function onOrganizationPropertiesError(error){
            console.log('error fetching organization properties', error);
        }

        function makeItemGrouppedStatsCallback(index){
            return function(stats){
                var scopeStats = $scope.stats;
                console.log('fetched groupped item stats for index ' + index, stats);
                for(var key in stats){
                    var stat = stats[key];
                    if(tempGrouppedStats[key] == undefined){
                        tempGrouppedStats[key] = [];
                    }
                    tempGrouppedStats[key][index] = stat;
                }
                statsFetched[index] = true;
                if(statsFetched[0] && statsFetched[1]){
                    if(metaDataMap == undefined){
                        metaDataMap = $energyDao.getStatsMetaDataMap();
                    }
                    var mergedGrouppedStats = mergeTempGrouppedStats(tempGrouppedStats);
                    console.log('mersgedStats:', mergedGrouppedStats);
                    var displayStats = {};
                    // convert to specified units
                    for(var rawKey in mergedGrouppedStats){
                        var stat = mergedGrouppedStats[rawKey];
                        var values1 = stat.values1;
                        var values2 = stat.values2;
                        if(rawKey in units){
                            var unit = units[rawKey];
                            stat.unit = unit.unit;
                            for(var i = 0; i < values1.length; i++){
                                values1[i] /= unit.divideBy;
                            }
                            for(var i = 0; i < values2.length; i++){
                                values2[i] /= unit.divideBy;
                            }
                        }
                    }
                    for(var rawKey in mergedGrouppedStats){
                        var key = metaDataMap[rawKey];
                        displayStats[key] = mergedGrouppedStats[rawKey];
                    }
                    $scope.stats = displayStats;
                    // for(var key in $scope.stats){
                    //     console.log('broadcasting ' + key);
                    //     $scope.$broadcast('$chartDataReady', key);
                    // }
                }
            }
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

        function mergeGrouppedStats(grouppedStat1, grouppedStat2){
            var versions = [];
            // get all distinct data versions from grouppedStat1 and grouppedStat2
            for(var version in grouppedStat1){
                var doesVersionAlreadyExist = isValueInArray(version, versions)
                if(!doesVersionAlreadyExist){
                    versions.push(version);
                }
            }
            for(var version in grouppedStat2){
                var doesVersionAlreadyExist = isValueInArray(version, versions)
                if(!doesVersionAlreadyExist){
                    versions.push(version);
                }
            }
            // sort version array
            versions = versions.sort();
            var values1 = [];
            var values2 = [];
            for(var i = 0; i < versions.length; i++){
                var version = versions[i];
                var value1 = grouppedStat1[version] || 0;
                var value2 = grouppedStat2[version] || 0;
                values1[i] = value1;
                values2[i] = value2;
            }
            return {
                versions: versions,
                values1: values1,
                values2: values2
            }
        };

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