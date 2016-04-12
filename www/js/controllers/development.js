//details.js
(function(){
    angular
        .module('energy.controllers')
        .controller('DevelopmentController', DevelopmentController);

    DevelopmentController.$inject = ['$scope', '$state', '$stateParams', '$energyDao'];

    function DevelopmentController($scope, $state, $stateParams, $energyDao){
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
            'NY.GDP.MKTP.CD' : sum,
            'SP.POP.TOTL' : sum
        };
        var statAlias = {
            'co2':'EN.ATM.CO2E.KT',
            'gdp':'NY.GDP.MKTP.CD' ,
            'population':'SP.POP.TOTL'
        };
        var units = {
            'NY.GDP.MKTP.CD' : '亿',
            'SP.POP.TOTL' : '万'
        }
        $scope.mapData;

        var parseInt = window.parseInt || Number.parseInt;
        var itemId;
        $scope.$on('$ionicView.enter', function(){
            $scope.itemType = $stateParams.type;
            itemId = $stateParams.id;
            $scope.pane = $stateParams.pane;
            $scope.dataKey = statAlias[$stateParams.pane];

            if($scope.itemType == 'organization'){
                $energyDao.getOrganizationById(itemId)
                    .then(onOrganizationProperties, onOrganizationPropertiesError);
                $energyDao.getOrganizationMemberById(itemId)
                    .then(onMembers, onMembersError)
                    .then($energyDao.getMemberCountryStats.bind($energyDao))
                    .then(onOrganizationCountryStats, onOrganizationStatsError);
            }else if($scope.itemType == 'country'){
                $energyDao.getCountryById(itemId)
                    .then(onCountryProperties, onCountryPropertiesError);
                $energyDao.getCountryLatestStats(itemId)
                    .then(onCountryStats, onCountryStatsError);
            }
        });
        $scope.select = function(res){
            $state.go('development', {
                type: $scope.itemType,
                id: $scope.item.id,
                pane: res
            });
        }
        $scope.back = function(){
            $state.go('details', {
                type: $scope.itemType,
                id: $scope.item.id,
            });
        }
        
        function onOrganizationCountryStats(result){
            var members = $scope.members;
            var _start_year = parseInt($scope.item.founding_year.slice(0,4));
            var _years = [];
            var _year = '';
            var _obj = {};
            var _min = 0,_max = 0;
            
            for(var i = _start_year; i <= 2014; i=i+3){
                _years.push(''+i);
            }
            if(_years[_years.length - 1] < 2014){
                _years.push('2014');
            }

            for(var key in members){
                var _key = members[key].id;
                if(typeof result[_key] != "undefined"){
                    result[_key].name = members[key].name;
                    result[_key].name_english = members[key].name_english;
                    result[_key].name_official = members[key].name_official;
                }
            }

            for(var key1 in result){
                var _source = result[key1].source;
                for(var key2 in _source){
                    _year = _source[key2].data_version;
                    if(_years.indexOf(_year) > -1){
                        if(typeof _obj[_year] == 'undefined'){
                            _obj[_year] = [];
                        }
                        var _data = {};
                        _data.name = result[key1].name_english;
                        _data.value = parseFloat(_source[key2].data_value);
                        if(_min == 0 && _max == 0){
                            _min = _data.value;
                            _max = _data.value;
                        }else if(_data.value > _max){
                            _max = _data.value;
                        }else if(_data.value < _min){
                            _min = _data.value;
                        }
                        _obj[_year].push(_data);
                    }
                }
            }
            $scope.mapData = _obj;
            $scope._min = _min;
            $scope._max = _max;
            $scope.years = _years;
            console.log('onOrganizationStats',$scope.mapData);
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
            var data = {};
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                members.push(item);
            }
            $scope.members = members;
            data.members = members;
            data.data_key = $scope.dataKey;
            return data;
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