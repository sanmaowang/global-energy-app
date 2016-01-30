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