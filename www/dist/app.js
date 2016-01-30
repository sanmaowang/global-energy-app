//services.js
(function(){
    angular.module('energy.services', ['ionic']);
})();
// directives.js
(function() {
    angular.module('energy.directives', ['ionic']);
})();
// filters.js
(function() {
    angular.module('energy.filters', ['ionic']);
})();
//controllers.js
(function(){
    angular.module('energy.controllers', ['ionic']);
})();
//dataloader.js
(function(){
    angular
        .module('energy.services')
        .factory('$dataLoader', $dataLoader);

    $dataLoader.$inject = ['DATABASE_PARAMS', '$window'];

    function $dataLoader(DATABASE_PARAMS, $window){

        function initDatabase(dbName, version, display, size){
            return $window.openDatabase(dbName, version, display, size);
        }
        function fetchData(url, context, callback){
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                callback(context, xhr.responseText);
              }
            };
            xhr.open("GET", url, true);
            xhr.send();
        }
        function readLineByLine(text, processLine){
            var start = 0;
            var cursorPosition = 0;
            var length = text.length;
            var line;
            while(cursorPosition < length){
                if(text.charAt(cursorPosition) == '\n'){
                    line = text.substring(start, cursorPosition);
                    start = cursorPosition + 1;
                    processLine(line);
                }
                cursorPosition++;
            }
        }

        var buffer = "";
        var db = initDatabase(DATABASE_PARAMS.name, DATABASE_PARAMS.version, DATABASE_PARAMS.displayName, DATABASE_PARAMS.maxSize);
        var insertionCount = 0;
        var dataFileFinishedStates = {};
        var currentDataFile;
        var loaderCallback;
        var DATA_DIR = 'data';
        var JSON_DATA = [
            'country0.json',
            'country_data_meta0.json',
            'organization0.json',
            'country_org_rel0.json',
            'country_data0.json',
            'country_data1.json',
            'country_data2.json',
            'country_data3.json',
            'country_data4.json',
            'country_data5.json'
        ];
        function makeProcessLineCallback(processSql){
            return function(line){
                if(line.length > 0){
                    if(line[0] == '/' && line[1] == '*'){
                        // this is where /* STATEMENT_BOUNDARY */ is
                        if(buffer.length > 0){
                            processSql(buffer);
                        }
                        buffer = "";
                    }else{
                        buffer = buffer.concat(line);
                    }
                }
                // console.log(line);
            }
        }
        function makeProcessSqlCallback(transaction){
            return function(sql){
                console.log('extracted sql', sql.length);
                transaction.executeSql(sql, [], createTableSucceed(sql), createTableFailed(sql));
            }
        }
        function createTableSucceed(sql){
            // console.log('sql execution succeeded', result);
            return function(tx, result){
                console.log('executed sql successfully: ', sql);
            }
        }
        function createTableFailed(tx, error){
            // console.log('sql execution failed', error);
            return function(tx, result){
                console.log('executed sql failed: ', sql);
            }
        }
        function createTable(callback){
            fetchData('create_table.sql', null, function(context, response){
                console.log('fetched script length:' + response.length );
                db.transaction(function(tx){
                    var processSql = makeProcessSqlCallback(tx);
                    var processLine = makeProcessLineCallback(processSql);
                    readLineByLine(response, processLine);
                });
                callback();
            });
        }
        function insertData(tx, table, obj){
            var sql = "INSERT INTO " + table + " ";
            var columnNames = [];
            var values = [];
            for(var key in obj){
                // console.log('key: ' + key + " value: " + obj[key]);
                var columnName = "`" + key + "`";
                var value = obj[key];
                if(typeof(value) == 'string'){
                    value = value.replace('\'','\'\'');
                    value = "'" + value + "'";
                }else if(value == null){
                    value = "null";
                }
                columnNames.push(columnName);
                values.push(value);
            }
            sql = sql + '('+ columnNames.join(',') + ') VALUES (' + values.join(',') + ')';
            tx.executeSql(sql, [], checkAllInsertFinished, checkAllInsertFinished);
        }
        function checkAllInsertFinished(tx, result){
            insertionCount--;
            if(insertionCount <= 0){
                dataFileFinishedStates[currentDataFile] = true;
                console.log('finished loading file ' + currentDataFile);
                checkAllFileFinishedStates();
            }
        }
        function checkAllFileFinishedStates(){
            var allFinished = true;
            JSON_DATA.forEach(function(dataFile){
                var thisFileFinished = dataFileFinishedStates[dataFile] == undefined ? false: true;
                allFinished = allFinished && thisFileFinished;
            });
            if(allFinished && loaderCallback != undefined && typeof(loaderCallback) == 'function'){
                loaderCallback('done');
            }
        }
        function importData(){
            // After creating table, import data
            JSON_DATA.forEach(function(dataFile, index){
                fetchData(DATA_DIR + '/' + dataFile, index, function(index, response){
                    db.transaction(function(tx){
                        var dataArray = JSON.parse(response);
                        insertionCount = dataArray.length;
                        currentDataFile = dataFile;
                        console.log('fetched ' + dataArray.length + ' rows of data');
                        dataArray.forEach(function(dataObj){
                            switch(index){
                                case 0: {
                                    // country0.json
                                    insertData(tx, 'country', dataObj);
                                    break;
                                }
                                case 1: {
                                    // country_data_meta0.json
                                    insertData(tx, 'country_data_meta', dataObj);
                                    break;
                                }
                                case 2: {
                                    // organization0.json
                                    insertData(tx, 'organization', dataObj);
                                    break;
                                }
                                case 3: {
                                    // country_org_rel0.json
                                    insertData(tx, 'country_org_rel', dataObj);
                                    break;
                                }
                                case 4:
                                case 5:
                                case 6:
                                case 7:
                                case 8:
                                case 9:{
                                    // country_data0.json ~ country_data5.json
                                    insertData(tx, 'country_data', dataObj);
                                    break;
                                }
                            }
                        });
                    });

                });
            });
        }

        return {
            startLoading: function(){
                createTable(importData);
            },
            setListener: function(callback){
                loaderCallback = callback;
            }
        }
    }
})();
//energy_dao.js
(function(){
    angular
        .module('energy.services')
        .factory('$energyDao' , $energyDao);

    $energyDao.$inject = [ 'DATABASE_PARAMS', '$window', '$q' ];

    function $energyDao(DATABASE_PARAMS, $window, $q){
        // stats aggragators, TODO: move them into a seperate component
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
        function EnergyDao(){
            this._db = $window.openDatabase(DATABASE_PARAMS.name, DATABASE_PARAMS.version, DATABASE_PARAMS.displayName, DATABASE_PARAMS.maxSize);
            this._get_stats_meta_data_map();
            this._org_property_meta_data_map = {
                'founding_year' : '成立于',
                'initiating_country' : '发起国',
                'funding_model': '出资模式',
                'top_funding_country' : '最大出资国',
                'responsible_person' : '负责人'
            };
            this._country_property_meta_data_map = {
                'name_offiction' : '官方名称',
                'flag' : '国旗',
                'code2l' : '国家名2位缩写',
                'code3l' : '国家名3位缩写',
                // 'latitude' : '纬度',
                // 'longitude' : '经度',
            };
            this._stats_aggregators = {
                'EG.ELC.ACCS.ZS' : average,
                'EG.IMP.CONS.ZS' : average,
                'EG.USE.COMM.CL.ZS' : average,
                'EG.USE.PCAP.KG.OE' : average,
                'EN.ATM.CO2E.KT' : sum,
                'EN.ATM.CO2E.PC' : average,
                'NY.GDP.MKTP.CD' : sum,
                'SP.POP.TOTL' : sum
            };
        }
        EnergyDao.prototype = {
            runQuery: function(sql, params){
                var deferred = $q.defer();
                this._db.transaction(function(tx){
                    tx.executeSql(sql, params, function(tx, result){
                        deferred.resolve(result);
                    }, function(tx, error){
                        deferred.reject(error);
                    });
                });
                return deferred.promise;
            },
            searchOrganizationName: function(text){
                var text = "%" + text + "%";
                var sql = "SELECT * FROM organization WHERE name LIKE ?";
                return this.runQuery(sql ,[text]);
            },
            searchCountryName: function(text){
                var text = "%" + text + "%";
                var sql = "SELECT * FROM country WHERE name LIKE ?";
                return this.runQuery(sql, [text]);
            },
            aggregateCountryStats: function(members){
                this._current_aggregation_deferred = $q.defer();
                this._total_aggregations_count  = members.length;
                this._aggregated_stats = {};
                this._current_aggregation_count = 0;
                var that = this;
                members.forEach(function(member){
                    that.getCountryLatestStats(member.id)
                        .then(that._on_country_stats.bind(that),
                              that._on_aggregation_error.bind(that));
                });
                return this._current_aggregation_deferred.promise;
            },
            getOrganizationById: function(orgId){
                var sql = "SELECT * FROM organization WHERE id=?";
                return this.runQuery(sql, [orgId]);
            },
            getAllOrganizations: function(){
                var sql = "SELECT * FROM organization"
                return this.runQuery(sql, []);
            },
            getOrganizationMemberById: function(orgId){
                var sql = "SELECT country.* from country_org_rel LEFT JOIN country ON country.id=country_org_rel.country_id WHERE country_org_rel.org_id=? AND country_org_rel.type=1";
                return this.runQuery(sql, [orgId]);
            },
            getOrganizationAllStatsAggregated: function(orgId){
                var sql = "SELECT * FROM country_data WHERE country_data.country_id IN (SELECT country_id from country_org_rel where org_id=? AND type=1)";
                var deferred = $q.defer();
                this.runQuery(sql, [orgId])
                    .then(this._make_aggregate_org_stats_callback(deferred),
                          this._aggregate_org_stats_error.bind(this));
                return deferred.promise;
            },
            getCountryByOfficialNameOrEngName: function(countryName){
                var sql = "SELECT * FROM country WHERE name_official=? OR name_english=?";
                return this.runQuery(sql, [countryName, countryName]);
            },
            getCountryById: function(countryId){
                var sql = "SELECT * FROM country WHERE id=?";
                return this.runQuery(sql, [countryId]);
            },
            getAllCountries: function(){
                var sql = "SELECT * FROM country;"
                return this.runQuery(sql, []);
            },
            getCountryAllStats: function(countryId){
                var sql = "SELECT * FROM country_data WHERE country_id=? ORDER BY data_version ASC";
                return this.runQuery(sql, [countryId]);
            },
            getCountryAllStatsGroupped: function(countryId){
                var deferred = $q.defer();
                this.getCountryAllStats(countryId)
                    .then(this._make_group_one_country_stats_callback(deferred),
                          this._group_one_country_stats_error.bind(this));
                return deferred.promise;
            },
            getCountryLatestStats: function(countryId){
                var sql = "SELECT *, max(data_version) FROM country_data WHERE country_data.country_id=? GROUP BY country_data.data_key;"
                return this.runQuery(sql, [countryId]);
            },
            getStatsMetaDataMap: function(){
                return this._stats_meta_data_map;
            },
            getOrgPropertyMetaDataMap: function(){
                return this._org_property_meta_data_map;
            },
            getCountryPropertyMetaDataMap: function(){
                return this._country_property_meta_data_map;
            },
            // private methods
            _get_stats_meta_data_map: function(){
                var sql = "SELECT indicator_code, indicator_name_cn FROM country_data_meta";
                var that = this;
                var metaDataMap = {};
                this.runQuery(sql, [])
                    .then(function(result){
                        var rows = result.rows;
                        for(var i = 0; i < rows.length; i++){
                            var item = rows.item(i);
                            metaDataMap[item.indicator_code] = item.indicator_name_cn;
                        }
                        that._stats_meta_data_map = metaDataMap;
                        console.log('fetched meta data map: ', metaDataMap);
                    });
            },
            _on_aggregation_error: function(error){
                console.log('error aggregating country stats', error);
            },
            _on_country_stats: function(result){
                var rows = result.rows;
                var metaDataMap = this.getStatsMetaDataMap();
                var aggregatedStats = this._aggregated_stats;
                var statsAggregators = this._stats_aggregators;
                var parseFloat = window.parseFloat || Number.parseFloat;
                for(var i = 0; i < rows.length; i++){
                    var item = rows.item(i);
                    var rawKey = item.data_key;
                    var value = parseFloat(item.data_value);
                    var version = item.data_version;
                    if(rawKey in aggregatedStats){
                        var aggregator = statsAggregators[rawKey];
                        var currentVal = aggregatedStats[rawKey].value;
                        var currentVersion = aggregatedStats[rawKey].version;
                        if(aggregator != undefined){
                            var aggreagtedVal = aggregator.aggregate(currentVal, value);
                            var aggreagtedVersion = Math.max(currentVersion, version);
                            aggregatedStats[rawKey].value = aggreagtedVal;
                            aggregatedStats[rawKey].version = aggreagtedVersion;
                            // console.log('aggregator', aggregator);
                        }
                    }else{
                        aggregatedStats[rawKey] = {
                            value: value,
                            version: version
                        }
                    }
                    // console.log('aggregating data: ', aggregatedStats);
                }
                this._current_aggregation_count++;
                if(this._current_aggregation_count == this._total_aggregations_count){
                    // final aggregation
                    for(var rawKey in aggregatedStats){
                        var aggregator = statsAggregators[rawKey];
                        var finalVal = aggregatedStats[rawKey].value;
                        var count = this._total_aggregations_count;
                        if(aggregator != undefined){
                            console.log('final aggregating', finalVal, count);
                            aggregatedStats[rawKey].value = aggregator.finalAggregate(finalVal, count);
                            console.log('final aggregating result', aggregatedStats[rawKey]);
                        }
                    }
                    this._current_aggregation_deferred.resolve(aggregatedStats);
                }
            },
            _make_group_one_country_stats_callback: function(deferred){
                return function(result){
                    console.log('_group_one_country_stats_callback', result);
                    var grouppedCountryStats = {};
                    var rows = result.rows;
                    for(var i = 0; i < rows.length; i++){
                        var item = rows.item(i);
                        var key = item.data_key;
                        var value = item.data_value;
                        var version = item.data_version;
                        var currentData = grouppedCountryStats[key];
                        if(currentData == undefined){
                            grouppedCountryStats[key] = {};
                        }
                        grouppedCountryStats[key][version] = value;
                    }
                    deferred.resolve(grouppedCountryStats);
                }
            },
            _make_aggregate_org_stats_callback: function(deferred){
                var statsAggregators = this._stats_aggregators;
                var parseFloat = window.parseFloat || Number.parseFloat;
                return function(result){
                    var grouppedOrgStats = {};
                    var aggregatedStats = {};
                    var rows = result.rows;
                    for(var i = 0; i < rows.length; i++){
                        var item = rows.item(i);
                        var key = item.data_key;
                        var value = item.data_value;
                        var version = item.data_version;
                        var countryId = item.country_id;
                        if(grouppedOrgStats[key] == undefined){
                            grouppedOrgStats[key] = {};
                        }
                        if(grouppedOrgStats[key][version] == undefined){
                            grouppedOrgStats[key][version] = {};
                        }
                        grouppedOrgStats[key][version][countryId] = parseFloat(value);
                    }
                    for(var key in statsAggregators){
                        var aggregator = statsAggregators[key];
                        var stat = grouppedOrgStats[key];
                        var currentAggregatedStat = aggregatedStats[key] = {};
                        for(var version in stat){
                            var group = stat[version];
                            var count = 0;

                            for(var countryId in group){
                                var currentVal = currentAggregatedStat[version] || 0;
                                var value = group[countryId];
                                currentAggregatedStat[version] = aggregator.aggregate(currentVal, value);
                                count++;
                            }
                            var currentVal = currentAggregatedStat[version] || 0;
                            currentAggregatedStat[version] = aggregator.finalAggregate(currentVal, count);
                        }
                    }
                    console.log('aggregated orgnization stats', aggregatedStats);
                    deferred.resolve(aggregatedStats);
                }
            },
            _group_one_country_stats_error: function(error){
                console.log('error trying to group country stats', error);
            },
            _aggregate_org_stats_error: function(error){
                console.log('error trying to group organization stats', error);
            }
        }
        return new EnergyDao();
    }
})();
//services.js
(function(){
    angular
        .module('energy.services')
        .factory('$localStorage', $localStorage);

    $localStorage.$inject = ['$window'];

    function $localStorage($window){
        return $window.localStorage;
    }
})();
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
// chart.js
(function() {
    angular
        .module('energy.directives')
        .directive('chart', chart);

    function chart(){
        return {
            restrict: 'E',
            scope: {
                'chartTitle' : '=chartTitle',
                'data1' : '=data1',
                'data1Legend' : '=data1Legend',
                'data2' : '=data2',
                'data2Legend' : '=data2Legend',
                'labels' : '=labels'
            },
            link: function(scope, element){
                require([
                    'echarts',
                    'echarts/chart/bar'
                ], renderChart);

                function renderChart(ec){
                    // function initChart(){
                        var MAX_INITIAL_ZOOMED_ITEMS = 10;
                        var myChart = ec.init(element[0]);
                        var data1Legend = scope.data1Legend;
                        var data2Legend = scope.data2Legend;
                        var data1 = scope.data1;
                        var data2 = scope.data2;
                        var labels = scope.labels;
                        var chartTitle = scope.chartTitle;
                        console.log('renderChart labels', scope.labels);
                        console.log('renderChart data1', scope.data1);
                        console.log('renderChart data2', scope.data2);
                        console.log('renderChart data1Legend', scope.data1Legend);
                        console.log('renderChart data2Legend', scope.data2Legend);

                        var dataLength = labels.length;
                        var zoomStart = 0;
                        var zoomEnd = 100;
                        if(dataLength > MAX_INITIAL_ZOOMED_ITEMS){
                            var displayPercentage = MAX_INITIAL_ZOOMED_ITEMS / dataLength * 100;
                            zoomStart = 100 - displayPercentage;
                        }
                        var option = {
                            title : {
                                text: chartTitle
                            },
                            legend: {
                                data:[data1Legend,data2Legend],
                                y: 'bottom'
                            },
                            toolbox: {
                                show : false
                            },
                            grid: {
                                x: 60,
                                y: 80,
                                x2: 10,
                                y2: 60
                            }, 
                            dataZoom : {
                                show : true,
                                realtime : true,
                                //orient: 'vertical',   // 'horizontal'
                                //x: 0,
                                y: 36,
                                //width: 400,
                                height: 40,
                                //backgroundColor: 'rgba(221,160,221,0.5)',
                                //dataBackgroundColor: 'rgba(138,43,226,0.5)',
                                //fillerColor: 'rgba(38,143,26,0.6)',
                                //handleColor: 'rgba(128,43,16,0.8)',
                                //xAxisIndex:[],
                                //yAxisIndex:[],
                                start : zoomStart,
                                end : zoomEnd
                            },
                            xAxis : [
                                {
                                    type : 'category',
                                    data : labels,
                                    // data : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
                                    axisLabel: {
                                        interval: 0
                                    },
                                    axisLine : {
                                        show: true,
                                        lineStyle: {
                                            color: '#ccc',
                                            type: 'solid',
                                            width: 1
                                        }
                                    },
                                    axisTick : {    // 轴标记
                                        show:true,
                                        length: 10,
                                        lineStyle: {
                                            color: '#ccc',
                                            type: 'solid',
                                            width: 1
                                        }
                                    }
                                }
                            ],
                            yAxis : [
                                {
                                    type : 'value',
                                    axisLine : {
                                        show: true,
                                        lineStyle: {
                                            color: '#ccc',
                                            type: 'solid',
                                            width: 1
                                        }
                                    }
                                }
                            ],
                            series : [
                                {
                                    name:data1Legend,
                                    type:'bar',
                                    data:data1,
                                    // data:[2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3],
                                    itemStyle: {
                                        normal: {
                                            color: '#F1F1F1',
                                            barBorderColor: '#E2E2E2',
                                            barBorderWidth: 1
                                        },
                                        emphasis: {
                                            color: '#F1F1F1',
                                            barBorderColor: '#E2E2E2',
                                            barBorderWidth: 1
                                        }
                                    }
                                },
                                {
                                    name:data2Legend,
                                    type:'bar',
                                    data:data2,
                                    // data:[2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3],
                                    itemStyle: {
                                        normal: {
                                            color: '#D2E2E9',
                                            barBorderColor: '#A9BFC6',
                                            barBorderWidth: 1
                                        },
                                        emphasis: {
                                            color: '#D2E2E9',
                                            barBorderColor: '#A9BFC6',
                                            barBorderWidth: 1
                                        }
                                    }
                                }
                            ]
                        };
                        myChart.setOption(option);
                    // }
                }
            }
        }
    }
})();
// map3d.js
(function() {
    angular
        .module('energy.directives')
        .directive('map3d', map3d);

    function map3d(){
        return {
            restrict: 'E',
            scope: {
                'onSelection' : '&onSelection',
                'chartRef' : '=chartRef'
            },
            link: function(scope, element){
                // 然后就可以动态加载图表进行绘制啦
                require([
                    'echarts',
                    'echarts/config',
                    'echarts-x',
                    // ECharts-X 中 map3d 的地图绘制基于 ECharts 中的 map。
                    'echarts/chart/map',
                    'echarts-x/chart/map3d'
                ], renderMap3d);

                function renderMap3d(ec, ecConfig){
                    var chart = ec.init(element[0]);
                    var onSelection = scope.onSelection;
                    var chatOptions = {
                        series: [{
                            type: 'map3d',
                            baseLayer: {
                                backgroundColor: 'rgba(0, 0, 0, 0.3)'
                            },
                            mapLocation: {
                                x: 0,
                                y: 0,
                                width: "100%",
                                height: "100%"
                            },
                            roam: {
                                autoRotate: true,
                                preserve: false
                            },
                            minZoom: 1,
                            maxZoom: 3,
                            // Empty data
                            data: [{}]
                        }]
                    };
                    chart.setOption(chatOptions);
                    chart.on(ecConfig.EVENT.CLICK, function(e){
                        onSelection({
                            $event: e
                        });
                    });
                    scope.chartRef.ref = chart;
                }
            }
        }
    }
})();
// with_unit.js
(function() {
    angular.module('energy.filters')
        .filter('withUnit', withUnit);

    withUnit.$inject = [ '$filter' ];

    function withUnit($filter){
        return function(input, unit, precision){
            var precision = precision || 0;
            var parseFloat = window.parseFloat || Number.parseFloat;
            var output;
            if(typeof(input) == 'string'){
                output = parseFloat(input.replace(/,/gi, ''));
            }else{
                output = parseFloat(input);
            }
            if(unit == '万'){
                output = output / 10000;
                output = $filter('number')(output, precision);
                output = output + unit;
            }else if(unit == '亿'){
                output = output / 100000000;
                output = $filter('number')(output, precision);
                output = output + unit;
            }else{
                output = $filter('number')(output, precision);
            }
            return output;
        }
    }
})();
//compare_list.js
(function(){
    angular
        .module('energy.controllers')
        .controller('CompareListController', CompareListController);

    CompareListController.$inject = ['$scope', '$state', '$stateParams', '$energyDao'];

    function CompareListController($scope, $state, $stateParams, $energyDao){
        var type1, id1, type2;
        var selections;
        $scope.$on('$ionicView.enter', function(){
            type1 = $stateParams.type1;
            id1 = $stateParams.id1;
            type2 = $stateParams.type2;
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
            $state.go('graph', {
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
//graph.js
(function(){
    angular
        .module('energy.controllers')
        .controller('GraphController', GraphController);

    GraphController.$inject = ['$scope', '$stateParams', '$energyDao'];

    function GraphController($scope, $stateParams, $energyDao){
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
            for(var i = 0; i < rows.length; i++){
                var item = rows.item(i);
                var rawKey = item.data_key;
                // Get chinese name from meta data map
                var key = metaDataMap[rawKey];
                stats[key] = {
                    value: item.data_value,
                    version: item.data_version
                }
                if(rawKey in units){
                    stats[key].unit = units[rawKey];
                }
                console.log(JSON.stringify(item));
            }
            $scope.selectedItemStat = stats;
        }

        function onCountryStatsError(error){
            console.log('Something went wrong when getting coutry stats: ', error);
        }
    }
})();
// app.js
(function() {
    angular
        .module('energy', [
            'ionic',
            'ngAnimate',
            'energy.services',
            'energy.directives',
            'energy.filters',
            'energy.controllers',
        ])
        .constant('LOCAL_STORAGE_KEY_APP_INIT' , 'APP_INIT')
        .run(runBlock);

    runBlock.$inject = ['LOCAL_STORAGE_KEY_APP_INIT', '$localStorage', '$dataLoader', '$window', '$timeout', '$ionicPlatform', '$ionicLoading'];

    function runBlock(LOCAL_STORAGE_KEY_APP_INIT, $localStorage, $dataLoader, $window, $timeout, $ionicPlatform, $ionicLoading){

        // 配置echarts
        require.config({
            paths: {
                'echarts': 'lib/echarts',
                'echarts-x': 'lib/echarts-x'
            }
        });

        $ionicPlatform.ready(platformReady);

        function platformReady() {
            if(window.cordova && window.cordova.plugins.Keyboard) {
                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

                // Don't remove this line unless you know what you are doing. It stops the viewport
                // from snapping when text inputs are focused. Ionic handles this internally for
                // a much nicer keyboard experience.
                cordova.plugins.Keyboard.disableScroll(true);
            }

            if(!$localStorage[LOCAL_STORAGE_KEY_APP_INIT]){
                showLoading();
                $dataLoader.setListener(onLoaderMessage);
                $dataLoader.startLoading();
            }
        }

        function showLoading(){
            $ionicLoading.show({
                template: "正在加载数据..."
            });
        }
        function hideLoading(){
            $ionicLoading.hide();
        }

        function onLoaderMessage(result){
            if(result = 'done'){
                console.log('loader has finished');
                $localStorage[LOCAL_STORAGE_KEY_APP_INIT] = true;
                hideLoading();

                // Restart for sql data to be committed
                $timeout(function(){
                    window.location.reload();
                }, 300, false)
            }
        }
    }

})();
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
                url: '/compare_type/:type/:id',
                templateUrl: 'templates/compare_type.html'
            })
            .state('compare_list', {
                url: '/compare_list/:type1/:id1/:type2',
                templateUrl: 'templates/compare_list.html'
            })
            .state('graph', {
                url: '/graph/:type1/:id1/:type2/:id2',
                templateUrl: 'templates/graph.html'
            });

        $urlRouterProvider.otherwise('/home');
    }

})();