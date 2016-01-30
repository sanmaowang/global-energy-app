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