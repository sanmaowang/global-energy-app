//details.js
(function(){
    angular
        .module('energy.controllers')
        .controller('DetailsController', DetailsController);

    DetailsController.$inject = ['$scope', '$state', '$stateParams', '$energyDao'];

    function DetailsController($scope, $state, $stateParams, $energyDao){
        var metaDataMap;
        var orgMetaDataMap = $energyDao.getOrgPropertyMetaDataMap();
        var countryMetaDataMap = $energyDao.getCountryPropertyMetaDataMap();
        var aggregatedStats = {};
        var currrentAggregationsCount = 0;
        var totalAggregationsCount = 0;
        var sum = {
            aggregate: function(val1, val2){
                return val1 + val2;
            },
            finalAggregate: function(finalVal, count){
                return finalVal;
            }
        }
        var average = {
            aggregate: function(val1, val2){
                return val1 + val2;
            },
            finalAggregate: function(finalVal, count){
                return finalVal / count;
            }
        }
        var statsAggregators = {
            'EG.ELC.ACCS.ZS' : average,
            'EG.IMP.CONS.ZS' : average,
            'EG.USE.COMM.CL.ZS' : average,
            'EG.USE.PCAP.KG.OE' : average,
            'EN.ATM.CO2E.KT' : sum,
            'EN.ATM.CO2E.PC' : average,
            'NY.GDP.MKTP.CD' : sum,
            'SP.POP.TOTL' : sum
        };
        var units = {
            'NY.GDP.MKTP.CD' : '亿',
            'SP.POP.TOTL' : '万'
        }


        var parseInt = window.parseInt || Number.parseInt;
        var itemId;
        $scope.$on('$ionicView.enter', function(){
            $scope.itemType = $stateParams.type;
            itemId = $stateParams.id;

            if($scope.itemType == 'organization'){
                $energyDao.getOrganizationById(itemId)
                    .then(onOrganizationProperties, onOrganizationPropertiesError);
                $energyDao.getOrganizationMemberById(itemId)
                    .then(onMembers, onMembersError)
                    .then($energyDao.aggregateCountryStats.bind($energyDao))
                    .then(onOrganizationStats, onOrganizationStatsError);
            }else if($scope.itemType == 'country'){
                $energyDao.getCountryById(itemId)
                    .then(onCountryProperties, onCountryPropertiesError);
                $energyDao.getCountryLatestStats(itemId)
                    .then(onCountryStats, onCountryStatsError);
            }
        });
        $scope.goChooseCompareType = function(){
            $state.go('compare_type', {
                func:'graph',
                type: $scope.itemType,
                id: $scope.item.id
            });
        }
        $scope.goChooseMapCompareType = function(){
            $state.go('compare_type', {
                func:'map',
                type: $scope.itemType,
                id: $scope.item.id
            });
        }

        // function getCountryStats(members){
        //     totalAggregationsCount  = members.length;
        //     members.forEach(function(member){
        //         $energyDao.getCountryLatestStats(member.id)
        //             .then(aggregateCountryStats, onCountryStatsError);
        //     });
        // }
        // function aggregateCountryStats(result){
        //     var rows = result.rows;
        //     if(metaDataMap == undefined){
        //         metaDataMap = $energyDao.getStatsMetaDataMap();
        //     }
        //     for(var i = 0; i < rows.length; i++){
        //         var item = rows.item(i);
        //         var rawKey = item.data_key;
        //         var value = parseInt(item.data_value);
        //         var version = item.data_version;
        //         if(rawKey in aggregatedStats){
        //             var aggregator = statsAggregators[rawKey];
        //             var currentVal = aggregatedStats[rawKey].value;
        //             var currentVersion = aggregatedStats[rawKey].version;
        //             if(aggregator != undefined){
        //                 var aggreagtedVal = aggregator.aggregate(currentVal, value);
        //                 var aggreagtedVersion = Math.max(currentVersion, version);
        //                 aggregatedStats[rawKey].value = aggreagtedVal;
        //                 aggregatedStats[rawKey].version = aggreagtedVersion;
        //                 // console.log('aggregator', aggregator);
        //             }
        //         }else{
        //             aggregatedStats[rawKey] = {
        //                 value: value,
        //                 version: version
        //             }
        //         }
        //         // console.log('aggregating data: ', aggregatedStats);
        //     }
        //     currrentAggregationsCount++;
        //     if(currrentAggregationsCount == totalAggregationsCount){
        //         // final aggregation
        //         var translatedStats = {};
        //         for(var rawKey in aggregatedStats){
        //             var aggregator = statsAggregators[rawKey];
        //             var finalVal = aggregatedStats[rawKey].value;
        //             var count = totalAggregationsCount;
        //             if(aggregator != undefined){
        //                 console.log('final aggregating', finalVal, count);
        //                 aggregatedStats[rawKey].value = aggregator.finalAggregate(finalVal, count);
        //                 console.log('final aggregating result', aggregatedStats[rawKey]);
        //             }
        //             // translate keys into Chinese to display
        //             var translatedKey = metaDataMap[rawKey];
        //             translatedStats[translatedKey] = aggregatedStats[rawKey];
        //         }
        //         // set $scope property to update ui
        //         $scope.stats = translatedStats;
        //     }
        // }
        function onOrganizationStats(stats){
            console.log('onOrganizationStats', stats);
            var translatedStats = {};
            if(metaDataMap == undefined){
                metaDataMap = $energyDao.getStatsMetaDataMap();
            }
            for(var rawKey in stats){
                // translate keys into Chinese to display
                var translatedKey = metaDataMap[rawKey];
                translatedStats[translatedKey] = stats[rawKey];
                if(rawKey in units){
                    translatedStats[translatedKey].unit = units[rawKey];
                }
            }
            $scope.stats = translatedStats;
        }
        function onOrganizationStatsError(error){
            console.log('error getting organization stats', error);
        }
        function onOrganizationProperties(result){
            console.log('Organization properties result: ', result);
            var rows = result.rows;
            if(rows.length > 0){
                var item = $scope.item = rows.item(0);
                var properties = {};
                for(var attr in item){
                    if(attr in orgMetaDataMap){
                        var key = orgMetaDataMap[attr];
                        properties[key] = item[attr];
                        // console.log(key + ':' + item[attr]);
                    }
                }
                $scope.properties = properties;
            }else{
                onOrganizationPropertiesError(new Error("no organization found"));
            }
        }
        function onOrganizationPropertiesError(error){
            console.log('error fetching organization', error);
        }
        function onMembers(result){
            console.log('onMembers', result);
            var rows = result.rows;
            var members = [];
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                members.push(item);
            }
            $scope.members = members;
            return members;
        }
        function onMembersError(error){
            console.log('error fetching organization members', error);
        }

        function onCountryProperties(result){
            console.log('Country properties result:', result);
            var rows = result.rows;
            if(rows.length > 0){
                var item = $scope.item = rows.item(0);
                var properties = {};
                for(var attr in item){
                    if(attr in countryMetaDataMap){
                        var key = countryMetaDataMap[attr];
                        properties[key] = item[attr];
                    }
                }
                $scope.properties = properties;
            }else{
                onOrganizationPropertiesError(new Error("no country found"));
            }
        }
        function onCountryPropertiesError(error){
            console.log('error fetching country properties', error);
        }
        function onCountryStats(result){
            var rows = result.rows;
            var stats = {};
            console.log('Country stats results: ', result);
            if(metaDataMap == undefined){
                metaDataMap = $energyDao.getStatsMetaDataMap();
            }
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                // Get chinese name from meta data map
                var key = metaDataMap[item.data_key];
                stats[key] = {
                    value: item.data_value,
                    version: item.data_version
                }
                if(item.data_key in  units){
                    stats[key].unit = units[item.data_key];
                }
                console.log(JSON.stringify(item));
            }
            $scope.stats = stats;
        }
        function onCountryStatsError(error){
            console.log('error fetching country stats', error);
        }
    }
})();