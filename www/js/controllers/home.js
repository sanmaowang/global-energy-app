//home.js
(function(){
    angular
        .module('energy.controllers')
        .controller('HomeController', HomeController);

    HomeController.$inject = ['$scope', '$state', '$energyDao'];

    function HomeController($scope, $state, $energyDao){
        var metaDataMap;
        var orgMetaDataMap = $energyDao.getOrgPropertyMetaDataMap();
        var units = {
            'NY.GDP.MKTP.CD' : '亿',
            'SP.POP.TOTL' : '万'
        };
        var tempSelectedItemNameForMap3d;
        var selectedItemName;
        $scope.suggestions = [];
        $scope.chartRef = {};
        $scope.showCard = false;
        $scope.autoComplete = function(input){
            if(input == undefined || input.length == 0){
                if($scope.suggestions.length > 0){
                    $scope.suggestions = [];
                    $scope.selectedItem = undefined;
                    $scope.selectedItemStat = undefined;
                }
                return;
            }
            $scope.suggestions = [];
            $energyDao.searchCountryName(input)
                .then(onCountrySearchResult, onSearchError);
            $energyDao.searchOrganizationName(input)
                .then(onOrgSearchResult, onSearchError);
        }
        $scope.showDetails = function(item){
            if(item == undefined){
                return;
            }
            var chart = $scope.chartRef.ref;
            if(item.type == 'country'){
                $scope.selectedItem = item;
                $energyDao.getCountryLatestStats(item.id)
                    .then(onCountryStats, onCountryStatsError);
                selectedItemName = tempSelectedItemNameForMap3d || item.name_english;
                tempSelectedItemNameForMap3d = undefined;
                // focus on the selected country
                chart.setOption({
                    series: [{
                        type: 'map3d',
                        data: [{
                            name: selectedItemName,
                            selected: true
                        }],
                        roam: {
                            focus: selectedItemName
                        }
                    }]
                });
            }else if(item.type == 'organization'){
                $scope.selectedItem = item;
                console.log(item);
                $energyDao.getOrganizationMemberById(item.id)
                        .then(onOrgMap,onOrgMapError);
                var stat = {};
                for(var attr in item){
                    if(attr in orgMetaDataMap){
                        var key = orgMetaDataMap[attr];
                        stat[key] = {
                            value: item[attr]
                        };
                        // console.log(key + ':' + item[attr]);
                    }
                }
                $scope.selectedItemStat = stat;
            }
            $scope.showCard = true;
        }
        $scope.onMap3dSelection = function($event, $chart){
            console.log('onMap3dSelection', $event);
            tempSelectedItemNameForMap3d = $event.name;
            $energyDao.getCountryByOfficialNameOrEngName($event.name)
                .then(onMap3dSelectionResult, onMap3dSelectionResultError);
        }
        $scope.gotoDetails = function(item){
            $state.go('details', {
                type: item.type,
                id: item.id
            });
        }
        $scope.goChooseCompareType = function(item){
            $state.go('compare_type', {
                func:'graph',
                type: item.type,
                id: item.id
            });
        }
        $scope.goChooseMapCompareType = function(item){
            $state.go('compare_type', {
                func:'map',
                type: item.type,
                id: item.id
            });
        }
        $scope.clearSelection = function($event){
            $event.preventDefault();
            $event.stopPropagation();
            var chart = $scope.chartRef.ref;
            chart.setOption({
                series: [{
                    type: 'map3d',
                    data: [{
                        name: selectedItemName,
                        selected: false
                    }],
                    roam: {}
                }]
            });
            // $scope.selectedItem = undefined;
            $scope.searchText = undefined;
            $scope.suggestions = [];
            $scope.showCard = false;
            cordova.plugins.Keyboard.close();
        }

        function mapData(arr) {
            var newArr = [];
            for(var i = 0; i < arr.length; i++){
              var obj = {};
              obj.name = arr[i].name_english;
              obj.selected = true;
              newArr.push(obj);
            }
            return newArr;
        };
        function onCountrySearchResult(result){
            var rows = result.rows;
            var suggestions = $scope.suggestions || [];
            console.log('Autocompletion results: ');
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                item.type = 'country';
                suggestions.push(item);
                console.log(JSON.stringify(item));
            }
            $scope.suggestions = suggestions;
        }
        function onOrgSearchResult(result){
            var rows = result.rows;
            var suggestions = $scope.suggestions || [];
            console.log('Autocompletion results: ');
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                item.type = 'organization';
                suggestions.push(item);
                console.log(JSON.stringify(item));
            }
            $scope.suggestions = suggestions;
        }
        function onSearchError(error){
            console.log('Something went wrong when doing autocompletion: ', error);
        }

        function onMap3dSelectionResult(result){
            var rows = result.rows;
            console.log('onMap3dSelectionResult', result);
            if(rows != undefined && rows.length > 0){
                var item = rows.item(0);
                item.type = 'country';
                $scope.showDetails(item);
            }
        }
        function onMap3dSelectionResultError(error){
            console.log('something went wrong when getting map3d selection result', error);
        }

        function onCountryStats(result){
            var rows = result.rows;
            var stats = {};
            console.log('Country stats results: ');
            if(metaDataMap == undefined){
                metaDataMap = $energyDao.getStatsMetaDataMap();
            }
            //which data should be shown 
            var meta = ['EG.ELC.ACCS.ZS','EG.IMP.CONS.ZS','EG.USE.COMM.CL.ZS','EG.USE.PCAP.KG.OE','EN.ATM.CO2E.KT'];
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                var rawKey = item.data_key;
                if(meta.indexOf(rawKey) > 0){
                    // Get chinese name from meta data map
                    var key = metaDataMap[rawKey];
                    stats[key] = {
                        value: item.data_value,
                        version: item.data_version
                    }
                    if(rawKey in units){
                        stats[key].unit = units[rawKey];
                    }
                }

                console.log(JSON.stringify(item));
            }
            $scope.selectedItemStat = stats;
        }

        function onOrgMap(result){
            var _orgs = mapData(result.rows);
            var chart = $scope.chartRef.ref;
            chart.setOption({
                series: [{
                    type: 'map3d',
                    data: _orgs,
                    roam: {
                        // focus: map3d(_orgs)
                    }
                }]
            });
        }

        function onOrgMapError(error){
            console.log('Something went wrong when getting coutry stats: ', error);
        }

        function onCountryStatsError(error){
            console.log('Something went wrong when getting coutry stats: ', error);
        }
    }
})();